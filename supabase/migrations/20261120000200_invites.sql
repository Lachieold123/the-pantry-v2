-- Invite codes and members (audit 8 October 2026, SEC-08, SEC-15, SEC-16, D-045).
-- NOT APPLIED to the live project: Lachlan applies it after review.
--
-- SEC-08: codes came from random(), lasted 14 days however often they were
-- used, couldn't be cancelled, and could be guessed without limit. Now:
-- - codes come from the cryptographic generator (pgcrypto);
-- - each code lets one person join and lasts 48 hours;
-- - a household keeps at most 5 live codes (the oldest goes);
-- - a phone that gets 10 codes wrong in an hour has to wait;
-- - any member can cancel the household's codes (revoke_invites).
-- SEC-15: any member can remove another (remove_member).
-- SEC-16: preview_invite shows which household a code is for, before joining.

create extension if not exists pgcrypto with schema extensions;

alter table public.household_invites
  add column used_by uuid,
  add column used_at timestamptz;
-- Codes made before this keep working until they expire, but not for 14 days.
update public.household_invites set expires_at = least(expires_at, now() + interval '48 hours');
alter table public.household_invites alter column expires_at set default now() + interval '48 hours';

-- Wrong codes, per person, for the attempt limit. Reached only through the functions.
create table public.household_join_attempts (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index household_join_attempts_by_user on public.household_join_attempts (user_id, at);
alter table public.household_join_attempts enable row level security;
revoke all on public.household_join_attempts from public, anon, authenticated;

-- True when this person has had 10 wrong codes in the last hour. Old attempts are tidied as it goes.
create function public.too_many_join_attempts() returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.household_join_attempts where at < now() - interval '1 day';
  return (select count(*) from public.household_join_attempts where user_id = auth.uid() and at > now() - interval '1 hour') >= 10;
end;
$$;

-- An invite code: 8 letters and digits, none that look alike, from the cryptographic generator.
create or replace function public.create_invite() returns text
language plpgsql security definer set search_path = ''
as $$
declare
  h uuid;
  c text;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  b int;
  i int;
begin
  select household_id into h from public.household_members where user_id = auth.uid();
  if h is null then raise exception 'not-in-household'; end if;
  loop
    c := '';
    while length(c) < 8 loop
      bytes := extensions.gen_random_bytes(16);
      for i in 0..15 loop
        b := get_byte(bytes, i);
        -- 248 is the largest multiple of 31 under 256: dropping the rest keeps every letter equally likely.
        if b < 248 and length(c) < 8 then c := c || substr(alphabet, 1 + b % 31, 1); end if;
      end loop;
    end loop;
    exit when not exists (select 1 from public.household_invites where code = c);
  end loop;
  insert into public.household_invites (code, household_id, created_by) values (c, h, auth.uid());
  -- At most 5 live codes per household: the oldest go.
  delete from public.household_invites where household_id = h and code in (
    select code from public.household_invites where household_id = h and used_at is null order by created_at desc offset 5
  );
  return c;
end;
$$;

-- Join with a code. One person per code; a household holds at most 8 people.
-- A wrong code answers null (not an error), so the wrong attempt is kept for the limit.
create or replace function public.join_household(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare h uuid; c text := upper(trim(p_code));
begin
  if auth.uid() is null then raise exception 'not-signed-in'; end if;
  if public.too_many_join_attempts() then raise exception 'too-many-attempts'; end if;
  select household_id into h from public.household_invites
    where code = c and expires_at > now() and used_at is null;
  if h is null then
    -- Already a member through this code (the answer to an earlier try was lost): that's fine.
    select i.household_id into h from public.household_invites i
      join public.household_members m on m.household_id = i.household_id and m.user_id = auth.uid()
      where i.code = c and i.used_by = auth.uid();
    if h is not null then return h; end if;
    insert into public.household_join_attempts (user_id) values (auth.uid());
    return null;
  end if;
  perform 1 from public.households where id = h for update;
  if exists (select 1 from public.household_members where user_id = auth.uid() and household_id = h) then return h; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then raise exception 'already-in-household'; end if;
  if (select count(*) from public.household_members where household_id = h) >= 8 then raise exception 'household-full'; end if;
  insert into public.household_members (household_id, user_id, display_name) values (h, auth.uid(), trim(p_display_name));
  update public.household_invites set used_by = auth.uid(), used_at = now() where code = c;
  return h;
end;
$$;

-- Which household a code is for: its name and how many people are in it. Nothing else
-- (no names), and a wrong code counts towards the attempt limit like a wrong join.
create function public.preview_invite(p_code text) returns table (household_name text, member_count int)
language plpgsql security definer set search_path = ''
as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not-signed-in'; end if;
  if public.too_many_join_attempts() then raise exception 'too-many-attempts'; end if;
  select household_id into h from public.household_invites
    where code = upper(trim(p_code)) and expires_at > now() and used_at is null;
  if h is null then
    insert into public.household_join_attempts (user_id) values (auth.uid());
    return;
  end if;
  return query
    select hh.name, (select count(*)::int from public.household_members m where m.household_id = h)
    from public.households hh where hh.id = h;
end;
$$;

-- Cancel every code for your household that hasn't been used yet.
create function public.revoke_invites() returns void
language plpgsql security definer set search_path = ''
as $$
declare h uuid;
begin
  select household_id into h from public.household_members where user_id = auth.uid();
  if h is null then raise exception 'not-in-household'; end if;
  delete from public.household_invites where household_id = h and used_at is null;
end;
$$;

-- Remove someone from your household (not yourself: that's leave_household).
-- Their codes go too. What they planned or ticked stays with the household.
create function public.remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare h uuid;
begin
  select household_id into h from public.household_members where user_id = auth.uid();
  if h is null then raise exception 'not-in-household'; end if;
  if p_user = auth.uid() then raise exception 'use-leave'; end if;
  delete from public.household_members where household_id = h and user_id = p_user;
  if not found then raise exception 'not-a-member'; end if;
  delete from public.household_invites where household_id = h and created_by = p_user and used_at is null;
end;
$$;

revoke all on function public.too_many_join_attempts() from public, anon, authenticated;
revoke all on function public.preview_invite(text) from public, anon;
revoke all on function public.revoke_invites() from public, anon;
revoke all on function public.remove_member(uuid) from public, anon;
revoke all on function public.create_invite() from public, anon;
revoke all on function public.join_household(text, text) from public, anon;
grant execute on function public.preview_invite(text) to authenticated;
grant execute on function public.revoke_invites() to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
