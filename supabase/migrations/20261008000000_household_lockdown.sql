-- Household lockdown (audit 8 October 2026, SEC-01, SEC-06, SEC-20, SEC-21).
-- NOT APPLIED to the live project: Lachlan applies it after review (docs/HOUSEHOLD.md).
--
-- SEC-01: the "members rename themselves" policy checked only user_id, and
-- Supabase's default grants let `authenticated` update every column, so a
-- member could move their own row into any household by its id. Now only the
-- name can change, and a trigger refuses any other change even if a grant or
-- policy is loosened later. Households likewise: members can rename, nothing else.

revoke update on public.household_members from authenticated, anon;
grant update (display_name) on public.household_members to authenticated;
revoke update on public.households from authenticated, anon;
grant update (name) on public.households to authenticated;

create or replace function public.household_members_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.household_id is distinct from old.household_id
    or new.user_id is distinct from old.user_id
    or new.joined_at is distinct from old.joined_at then
    raise exception 'membership-is-read-only' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger household_members_guard
  before update on public.household_members
  for each row execute function public.household_members_guard();

create or replace function public.households_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'household-is-read-only' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger households_guard
  before update on public.households
  for each row execute function public.households_guard();

revoke all on function public.household_members_guard() from public, anon, authenticated;
revoke all on function public.households_guard() from public, anon, authenticated;

-- SEC-20: least privilege stated, not inherited from Supabase's defaults. Row
-- security already blocks `anon`; this makes it plain. Invites are reached
-- only through the functions. No one deletes or truncates rows directly.
revoke all on public.households, public.household_members, public.household_invites, public.household_rows from anon;
revoke all on public.profiles, public.account_rows from anon;
revoke all on public.household_invites from authenticated;
revoke delete, truncate, references, trigger on public.households, public.household_members, public.household_rows from authenticated;
revoke delete, truncate, references, trigger on public.profiles, public.account_rows from authenticated;
revoke all on function public.household_rows_keep_newest() from public, anon, authenticated;

-- SEC-21: two joins at once could both pass the "fewer than 8" check. The
-- household row is locked first, so joins to one household take turns.
create or replace function public.join_household(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not-signed-in'; end if;
  select household_id into h from public.household_invites
    where code = upper(trim(p_code)) and expires_at > now();
  if h is null then raise exception 'invite-not-found'; end if;
  perform 1 from public.households where id = h for update;
  if exists (select 1 from public.household_members where user_id = auth.uid() and household_id = h) then return h; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then raise exception 'already-in-household'; end if;
  if (select count(*) from public.household_members where household_id = h) >= 8 then raise exception 'household-full'; end if;
  insert into public.household_members (household_id, user_id, display_name) values (h, auth.uid(), trim(p_display_name));
  return h;
end;
$$;

-- SEC-06: Realtime sends the keys of deleted rows to any subscriber, whatever
-- row security says, so a member leaving told every signed-in user a live
-- household id. The app no longer listens to the member list; it re-reads it
-- when the app comes to the front and when another member's row arrives.
alter publication supabase_realtime drop table public.household_members;
