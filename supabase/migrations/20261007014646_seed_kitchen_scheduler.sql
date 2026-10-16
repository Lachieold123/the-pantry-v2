-- Pulled from the remote project (supabase_migrations.schema_migrations) on
-- 17 Oct 2026 so it lives in git. Applied remotely on 7 Oct 2026.
-- Retired on 17 Oct 2026: see 20261017000000_seed_kitchen_retired.sql.
-- The seed kitchen's clock (D-044): pg_net calls the seed-kitchen edge
-- function with a shared secret kept in the vault. The cron job itself is
-- scheduled with seed.start() once the pilot has been reviewed.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

insert into seed.config (key, value) values ('publishing', 'false'), ('backlog_spread_days', '14')
on conflict (key) do nothing;
update storage.buckets set file_size_limit = 8388608 where id = 'avatars';

-- One tick, by hand or from cron. Returns the pg_net request id.
create or replace function seed.tick(stages text[] default null) returns bigint
language sql security definer set search_path = ''
as $$
  select net.http_post(
    url := 'https://eozyhllkvajvrecojdxu.supabase.co/functions/v1/seed-kitchen',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-seed-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'seed_cron_secret')),
    body := case when stages is null then '{}'::jsonb else jsonb_build_object('stages', to_jsonb(stages)) end,
    timeout_milliseconds := 150000
  );
$$;
revoke all on function seed.tick(text[]) from public, anon, authenticated;

-- Start and stop the every-minute schedule.
create or replace function seed.start() returns void
language sql security definer set search_path = ''
as $$ select cron.schedule('seed-kitchen', '* * * * *', 'select seed.tick()'); $$;
create or replace function seed.stop() returns void
language sql security definer set search_path = ''
as $$ select cron.unschedule('seed-kitchen'); $$;
revoke all on function seed.start() from public, anon, authenticated;
revoke all on function seed.stop() from public, anon, authenticated;
