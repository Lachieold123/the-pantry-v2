-- Finishes turning the seed kitchen off (retired 17 Oct 2026, see
-- 20261016204729_seed_kitchen_retired.sql). Deletes nothing: tables, rows,
-- cooks and published recipes all stay. Was _pending/20261021000000 until the
-- 20 Nov 2026 backend fix gave it its place in the apply order (supabase/APPLY-LIVE.md).

-- 1. Drop the cron job if it is still scheduled. Safe to run twice.
--    Two ifs, not one `and`: plpgsql plans the whole condition, and cron.job
--    doesn't exist where pg_cron isn't installed.
do $$
begin
  if to_regclass('cron.job') is not null then
    if exists (select 1 from cron.job where jobname = 'seed-kitchen') then
      perform cron.unschedule('seed-kitchen');
    end if;
  end if;
end $$;

-- 2. Row level security on every seed table, with no policies: nobody but the
--    service role (which bypasses RLS) and the table owner can read or write.
--    The schema already has usage revoked from anon and authenticated; this is the second lock.
alter table seed.config enable row level security;
alter table seed.personas enable row level security;
alter table seed.dishes enable row level security;
alter table seed.usage enable row level security;
alter table seed.runs enable row level security;
