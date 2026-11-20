-- Pull only what changed (K-36).
-- NOT APPLIED to the live project: Lachlan applies it after review.
--
-- Every return to the app pulled every row of the household and the account.
-- To ask "what changed since I last looked?", a phone needs a mark it can
-- trust, and `updated_at` isn't one: it's the writing phone's clock (brought
-- back if it's far ahead, but a slow clock still stamps the past). So the
-- server stamps each row with its own clock when it takes the row:
-- `received_at`, in milliseconds like `updated_at`. A phone keeps the newest
-- `received_at` it has seen and next time asks only for rows after it (less
-- an overlap: see src/domain/sync/cursor.ts).
--
-- The stamp is set by a trigger on every insert and update, so whatever a
-- phone sends for it is overwritten. A write the newest-wins trigger refuses
-- changes nothing, so it doesn't move the stamp either.

-- Rows already stored count as received now: phones without a mark pull everything anyway.
alter table public.household_rows
  add column received_at bigint not null default (extract(epoch from now()) * 1000)::bigint;
alter table public.account_rows
  add column received_at bigint not null default (extract(epoch from now()) * 1000)::bigint;

create or replace function public.rows_stamp_received() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.received_at := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  return new;
end;
$$;

-- Named to run after keep_newest and quota (before-triggers run in name order),
-- so a write those refuse never gets this far.
create trigger household_rows_stamp_received
  before insert or update on public.household_rows
  for each row execute function public.rows_stamp_received();
create trigger account_rows_stamp_received
  before insert or update on public.account_rows
  for each row execute function public.rows_stamp_received();
revoke all on function public.rows_stamp_received() from public, anon, authenticated;

-- The pull reads in (received_at, kind, key) order, a page at a time.
create index household_rows_received on public.household_rows (household_id, received_at, kind, key);
create index account_rows_received on public.account_rows (user_id, received_at, kind, key);

-- Rows received after a point, in order, at most 1,000 at a time. The point
-- is a whole position (stamp, kind, key), not just a stamp, so a page boundary
-- never skips or repeats a row, even when many rows share a millisecond or a
-- row changes while the pages are read (it moves to the end and comes then).
-- Security invoker: row-level security decides what each caller sees.
create function public.household_rows_since(
  p_household uuid, p_after bigint, p_kind text default '', p_key text default '', p_limit integer default 1000
) returns table (kind text, key text, data jsonb, deleted boolean, updated_at bigint, updated_by uuid, received_at bigint)
language sql stable security invoker set search_path = ''
as $$
  select r.kind, r.key, r.data, r.deleted, r.updated_at, r.updated_by, r.received_at
  from public.household_rows r
  where r.household_id = p_household and (r.received_at, r.kind, r.key) > (p_after, p_kind, p_key)
  order by r.received_at, r.kind, r.key
  limit least(greatest(p_limit, 1), 1000);
$$;

create function public.account_rows_since(
  p_user uuid, p_after bigint, p_kind text default '', p_key text default '', p_limit integer default 1000
) returns table (kind text, key text, data jsonb, deleted boolean, updated_at bigint, updated_by text, received_at bigint)
language sql stable security invoker set search_path = ''
as $$
  select r.kind, r.key, r.data, r.deleted, r.updated_at, r.updated_by, r.received_at
  from public.account_rows r
  where r.user_id = p_user and (r.received_at, r.kind, r.key) > (p_after, p_kind, p_key)
  order by r.received_at, r.kind, r.key
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.household_rows_since(uuid, bigint, text, text, integer) from public, anon;
revoke all on function public.account_rows_since(uuid, bigint, text, text, integer) from public, anon;
grant execute on function public.household_rows_since(uuid, bigint, text, text, integer) to authenticated;
grant execute on function public.account_rows_since(uuid, bigint, text, text, integer) to authenticated;
