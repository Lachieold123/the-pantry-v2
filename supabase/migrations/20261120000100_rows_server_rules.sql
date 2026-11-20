-- Row rules the server enforces (audit 8 October 2026, SEC-04, SEC-05, SEC-07, BUG-17, BUG-28).
-- NOT APPLIED to the live project: Lachlan applies it after review.
--
-- SEC-04 / BUG-17: "newest wins" trusted each phone's clock, so a row stamped
-- far in the future could never change again. A stamp more than five minutes
-- ahead of the server's clock is brought back to the server's time, on
-- inserts as well as updates. The app also stamps a change after the version
-- it replaced (src/domain/sync/limits.ts), so a slow clock no longer loses.
--
-- BUG-28: a same-millisecond tie went to the last writer here but to the
-- larger author id on the phones, so they could disagree for good. The server
-- now breaks the tie the way the phones do.

-- Old triggers off first: they would skip the clean-up below (it moves stamps back).
drop trigger household_rows_keep_newest on public.household_rows;
drop trigger account_rows_keep_newest on public.account_rows;

-- Rows already stamped more than five minutes ahead come back to now.
update public.household_rows set updated_at = (extract(epoch from clock_timestamp()) * 1000)::bigint
  where updated_at > (extract(epoch from clock_timestamp()) * 1000)::bigint + 300000;
update public.account_rows set updated_at = (extract(epoch from clock_timestamp()) * 1000)::bigint
  where updated_at > (extract(epoch from clock_timestamp()) * 1000)::bigint + 300000;

create or replace function public.household_rows_keep_newest() returns trigger
language plpgsql set search_path = ''
as $$
declare server_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if new.updated_at > server_ms + 300000 then new.updated_at := server_ms; end if;
  if tg_op = 'UPDATE' and (new.updated_at, new.updated_by::text collate "C") < (old.updated_at, old.updated_by::text collate "C") then
    return null;
  end if;
  return new;
end;
$$;

create or replace function public.account_rows_keep_newest() returns trigger
language plpgsql set search_path = ''
as $$
declare server_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if new.updated_at > server_ms + 300000 then new.updated_at := server_ms; end if;
  if tg_op = 'UPDATE' and (new.updated_at, new.updated_by collate "C") < (old.updated_at, old.updated_by collate "C") then
    return null;
  end if;
  return new;
end;
$$;

create trigger household_rows_keep_newest
  before insert or update on public.household_rows
  for each row execute function public.household_rows_keep_newest();
create trigger account_rows_keep_newest
  before insert or update on public.account_rows
  for each row execute function public.account_rows_keep_newest();

revoke all on function public.household_rows_keep_newest() from public, anon, authenticated;
revoke all on function public.account_rows_keep_newest() from public, anon, authenticated;

-- SEC-05: the shape of the rows another phone will read. A recipe without its
-- words, or a planned meal without a recipe, is refused here (check_violation,
-- which the app sets aside rather than retrying), so it never reaches anyone.
-- NOT VALID: rows already stored aren't re-checked; the app skips bad ones on reading.
alter table public.household_rows add constraint household_rows_shape check (
  deleted
  or coalesce(case kind
    when 'recipe' then jsonb_typeof(data) = 'object'
      and jsonb_typeof(data -> 'id') = 'string'
      and jsonb_typeof(data -> 'draft') = 'object'
      and jsonb_typeof(data -> 'draft' -> 'title') = 'string'
      and jsonb_typeof(data -> 'draft' -> 'ingredientsText') = 'string'
      and jsonb_typeof(data -> 'draft' -> 'methodText') = 'string'
      and jsonb_typeof(data -> 'draft' -> 'mealTypes') = 'array'
    when 'plan' then jsonb_typeof(data -> 'recipeId') = 'string' and jsonb_typeof(data -> 'servings') = 'number'
    when 'extra' then jsonb_typeof(data -> 'text') = 'string' and jsonb_typeof(data -> 'week') = 'string'
    else jsonb_typeof(data) = 'object'
  end, false)
) not valid;

alter table public.account_rows add constraint account_rows_shape check (
  deleted
  or coalesce(case kind
    when 'myrecipe' then jsonb_typeof(data) = 'object'
      and jsonb_typeof(data -> 'id') = 'string'
      and jsonb_typeof(data -> 'draft') = 'object'
      and jsonb_typeof(data -> 'draft' -> 'title') = 'string'
      and jsonb_typeof(data -> 'draft' -> 'ingredientsText') = 'string'
      and jsonb_typeof(data -> 'draft' -> 'methodText') = 'string'
      and jsonb_typeof(data -> 'draft' -> 'mealTypes') = 'array'
    when 'plan' then jsonb_typeof(data -> 'recipeId') = 'string' and jsonb_typeof(data -> 'servings') = 'number'
    when 'extra' then jsonb_typeof(data -> 'text') = 'string' and jsonb_typeof(data -> 'week') = 'string'
    else jsonb_typeof(data) = 'object'
  end, false)
) not valid;

-- SEC-07: account backup is for permanent sign-ins (the app never writes
-- account rows for the quiet anonymous user), so an anonymous script can't
-- fill the database through it.
alter policy "owners add their rows" on public.account_rows
  with check (user_id = (select auth.uid()) and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
alter policy "owners change their rows" on public.account_rows
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

-- SEC-07: a ceiling on rows per account and per household, far above real use
-- (a busy household writes a few thousand a year). Refused as a check
-- violation, so the app sets the row aside instead of retrying forever.
create or replace function public.rows_within_quota() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare n bigint;
begin
  -- An upsert of a row that's already there isn't a new row: a cheap key lookup first.
  if tg_table_name = 'account_rows' then
    perform 1 from public.account_rows where user_id = new.user_id and kind = new.kind and key = new.key;
  else
    perform 1 from public.household_rows where household_id = new.household_id and kind = new.kind and key = new.key;
  end if;
  if found then return new; end if;
  if tg_table_name = 'account_rows' then
    select count(*) into n from public.account_rows where user_id = new.user_id;
  else
    select count(*) into n from public.household_rows where household_id = new.household_id;
  end if;
  if n >= 50000 then raise exception 'too-many-rows' using errcode = '23514'; end if;
  return new;
end;
$$;

create trigger account_rows_quota before insert on public.account_rows
  for each row execute function public.rows_within_quota();
create trigger household_rows_quota before insert on public.household_rows
  for each row execute function public.rows_within_quota();
revoke all on function public.rows_within_quota() from public, anon, authenticated;
