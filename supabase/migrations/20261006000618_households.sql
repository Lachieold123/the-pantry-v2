-- Households (D-039): a few people who share one kitchen — the week's plan,
-- the shopping list's ticks, extras and removals, the cupboard, and any of
-- their own recipes that are planned. Everyone signs in anonymously (no
-- passwords); joining is by invite code.
--
-- Everything shared lives in one table of rows, one per record, so the app
-- syncs one thing: pull all rows, push changed ones, listen for changes.
-- Rows are never deleted, only marked deleted, so a removal syncs like any
-- other change. The newest `updated_at` (the phone's clock, in ms) wins.

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our kitchen' check (char_length(name) between 1 and 60),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null default auth.uid(),
  display_name text not null check (char_length(display_name) between 1 and 40),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
-- One household per person, which keeps "your kitchen" unambiguous.
create unique index household_members_one_each on public.household_members (user_id);

create table public.household_invites (
  code text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);

create table public.household_rows (
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null check (kind in ('plan', 'tick', 'removal', 'extra', 'cupboard', 'recipe')),
  key text not null check (char_length(key) between 1 and 200),
  data jsonb,
  deleted boolean not null default false,
  updated_at bigint not null,
  updated_by uuid not null default auth.uid(),
  primary key (household_id, kind, key),
  constraint household_rows_size check (pg_column_size(data) < 65536)
);
create index household_rows_updated on public.household_rows (household_id, updated_at);

-- Membership check used by every policy. Security definer so the policy on
-- household_members can call it without recursing into itself.
create function public.is_member(h uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.household_members m where m.household_id = h and m.user_id = auth.uid());
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.household_rows enable row level security;

create policy "members read their household" on public.households
  for select to authenticated using (public.is_member(id));
create policy "members rename their household" on public.households
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy "members see each other" on public.household_members
  for select to authenticated using (public.is_member(household_id));
create policy "members rename themselves" on public.household_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Invites are only made and used through the functions below.

create policy "members read shared rows" on public.household_rows
  for select to authenticated using (public.is_member(household_id));
create policy "members add shared rows" on public.household_rows
  for insert to authenticated with check (public.is_member(household_id) and updated_by = auth.uid());
create policy "members change shared rows" on public.household_rows
  for update to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id) and updated_by = auth.uid());

-- Start a household with yourself in it.
create function public.create_household(p_display_name text, p_name text default 'Our kitchen') returns uuid
language plpgsql security definer set search_path = ''
as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not-signed-in'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then raise exception 'already-in-household'; end if;
  insert into public.households (name, created_by) values (coalesce(nullif(trim(p_name), ''), 'Our kitchen'), auth.uid()) returning id into h;
  insert into public.household_members (household_id, user_id, display_name) values (h, auth.uid(), trim(p_display_name));
  return h;
end;
$$;

-- An invite code for your household: 8 letters and digits, none that look alike.
create function public.create_invite() returns text
language plpgsql security definer set search_path = ''
as $$
declare h uuid; c text; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  select household_id into h from public.household_members where user_id = auth.uid();
  if h is null then raise exception 'not-in-household'; end if;
  loop
    c := '';
    for i in 1..8 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.household_invites where code = c);
  end loop;
  insert into public.household_invites (code, household_id, created_by) values (c, h, auth.uid());
  return c;
end;
$$;

-- Join with a code. A household holds at most 8 people.
create function public.join_household(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not-signed-in'; end if;
  select household_id into h from public.household_invites
    where code = upper(trim(p_code)) and expires_at > now();
  if h is null then raise exception 'invite-not-found'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid() and household_id = h) then return h; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then raise exception 'already-in-household'; end if;
  if (select count(*) from public.household_members where household_id = h) >= 8 then raise exception 'household-full'; end if;
  insert into public.household_members (household_id, user_id, display_name) values (h, auth.uid(), trim(p_display_name));
  return h;
end;
$$;

-- Leave. The last person out takes the household (and its rows) with them.
create function public.leave_household() returns void
language plpgsql security definer set search_path = ''
as $$
declare h uuid;
begin
  delete from public.household_members where user_id = auth.uid() returning household_id into h;
  if h is not null and not exists (select 1 from public.household_members where household_id = h) then
    delete from public.households where id = h;
  end if;
end;
$$;

revoke all on function public.create_household(text, text) from public, anon;
revoke all on function public.create_invite() from public, anon;
revoke all on function public.join_household(text, text) from public, anon;
revoke all on function public.leave_household() from public, anon;
revoke all on function public.is_member(uuid) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
grant execute on function public.leave_household() to authenticated;
grant execute on function public.is_member(uuid) to authenticated;

-- Changes stream to the other phones in the household (RLS still applies).
alter publication supabase_realtime add table public.household_rows;
alter publication supabase_realtime add table public.household_members;
