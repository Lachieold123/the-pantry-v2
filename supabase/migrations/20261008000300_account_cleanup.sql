-- Deleting an account leaves nothing of you behind (audit 8 October 2026, SEC-13, SEC-14).
-- NOT APPLIED to the live project: Lachlan applies it after review.
--
-- SEC-13: when the household carries on without you, your own recipes that
-- were shared with it are removed, your invites go, and your user id is
-- taken off what you planned or ticked (those stay: they're the household's
-- plan and list now). The privacy policy says so (docs/launch, Lachlan).
--
-- Also used by a household-only phone (the quiet anonymous user, no
-- account): "Delete my household data" in Settings calls the same function.

create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  h uuid;
  nobody uuid := '00000000-0000-0000-0000-000000000000';
  server_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if me is null then raise exception 'not-signed-in'; end if;
  select household_id into h from public.household_members where user_id = me;
  if h is not null then
    -- Your recipes leave with you. Stamped now, so every phone takes the change.
    update public.household_rows
      set deleted = true, data = null, updated_at = greatest(updated_at + 1, server_ms), updated_by = nobody
      where household_id = h and kind = 'recipe' and updated_by = me and not deleted;
    -- What you planned or ticked stays the household's, without your id on it.
    update public.household_rows
      set updated_at = greatest(updated_at + 1, server_ms), updated_by = nobody
      where household_id = h and updated_by = me;
    update public.households set created_by = nobody where id = h and created_by = me;
    delete from public.household_invites where household_id = h and created_by = me;
    update public.household_invites set used_by = nobody where used_by = me;
  end if;
  perform public.leave_household();
  delete from public.household_join_attempts where user_id = me;
  delete from public.account_rows where user_id = me;
  delete from public.profiles where user_id = me;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- SEC-14: anonymous users that aren't in a household and haven't been seen
-- for 30 days are deleted. Run daily by pg_cron once Lachlan switches the
-- extension on in the dashboard (Database > Extensions); until then it can
-- be run by hand from the SQL editor. It never touches a permanent account.
create or replace function public.delete_stale_anonymous_users() returns integer
language plpgsql security definer set search_path = ''
as $$
declare gone integer;
begin
  delete from auth.users u
    where u.is_anonymous
      and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
      and not exists (select 1 from public.household_members m where m.user_id = u.id);
  get diagnostics gone = row_count;
  return gone;
end;
$$;

revoke all on function public.delete_stale_anonymous_users() from public, anon, authenticated;

-- To schedule, once pg_cron is on (Lachlan):
--   select cron.schedule('delete-stale-anonymous-users', '17 3 * * *', 'select public.delete_stale_anonymous_users()');
