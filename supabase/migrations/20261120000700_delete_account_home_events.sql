-- Deleting an account also deletes its Home event log (deep audit 20 Nov 2026, S2-5).
-- home_events.viewer_id has no foreign key to auth.users (events must survive
-- a cook's recipes being removed, not the viewer), so nothing cascades. The
-- app doesn't upload events yet; this keeps the promise for when it does.
-- Same body as 20261120000300_account_cleanup.sql plus the one delete.

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
  delete from public.home_events where viewer_id = me;
  delete from public.account_rows where user_id = me;
  delete from public.profiles where user_id = me;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
