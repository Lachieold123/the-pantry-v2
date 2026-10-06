-- Accounts (D-043, docs/ACCOUNTS.md): Sign in with Apple or a 6-digit email
-- code turns a phone's anonymous user into a permanent one, and the account
-- keeps everything: Cookmarks, collections, your recipes, recently viewed,
-- the cooking log, settings, and the kitchen while you're not in a household.
--
-- Like household_rows, everything lives in one table of rows, one per record,
-- never deleted, only marked deleted, so a removal syncs like any other change.
-- The newest `updated_at` (the phone's clock, in ms) wins. `updated_by` names
-- the phone that wrote it (text, not the user: one user has several phones,
-- and the phone's name is what breaks a tie the same way everywhere).

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.account_rows (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (
    kind in ('plan', 'tick', 'removal', 'extra', 'cupboard', 'bookmark', 'collection', 'hidden', 'myrecipe', 'recent', 'cooklog', 'prefs')
  ),
  key text not null check (char_length(key) between 1 and 200),
  data jsonb,
  deleted boolean not null default false,
  updated_at bigint not null,
  updated_by text not null check (char_length(updated_by) between 1 and 80),
  primary key (user_id, kind, key),
  constraint account_rows_size check (pg_column_size(data) < 65536)
);
create index account_rows_updated on public.account_rows (user_id, updated_at);

alter table public.profiles enable row level security;
alter table public.account_rows enable row level security;

-- Owner only. `(select auth.uid())` is evaluated once per statement, not per row.
create policy "owners read their profile" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "owners add their profile" on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners change their profile" on public.profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "owners read their rows" on public.account_rows
  for select to authenticated using (user_id = (select auth.uid()));
create policy "owners add their rows" on public.account_rows
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners change their rows" on public.account_rows
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- No delete policy: rows are marked deleted, and only delete_account() removes them.

-- A write that arrives late (a phone that was offline) must not overwrite a
-- newer one: an update with an older updated_at is skipped. As for household_rows.
create function public.account_rows_keep_newest() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  return new;
end;
$$;

create trigger account_rows_keep_newest
  before update on public.account_rows
  for each row execute function public.account_rows_keep_newest();

-- Delete your account (Apple requires it). Acts only on the caller: leaves
-- any household first (the last one out takes the household with them, as
-- leave_household always does), deletes the rows and profile, then the auth
-- user itself. The cascades would remove rows and profile too; deleting them
-- first keeps this correct even if a cascade is ever dropped.
create function public.delete_account() returns void
language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not-signed-in'; end if;
  perform public.leave_household();
  delete from public.account_rows where user_id = me;
  delete from public.profiles where user_id = me;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
revoke all on function public.account_rows_keep_newest() from public, anon, authenticated;

-- Changes stream to the account's other phones (RLS still applies).
alter publication supabase_realtime add table public.account_rows;
