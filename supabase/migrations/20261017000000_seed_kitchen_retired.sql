-- The seed kitchen is retired (17 Oct 2026, Lachlan's Telegram msg 1498: no
-- API spend). Nothing is deleted: the tables, cooks and published recipes stay.
-- seed.start() and seed.tick() now refuse to run, the config is paused with a
-- zero spend cap, and the seed-kitchen edge function was replaced by a stub
-- that calls nothing (supabase/functions/seed-kitchen; old source kept in
-- supabase/functions/seed-kitchen-v8-retired).
update seed.config set value = 'true'::jsonb where key = 'paused';
update seed.config set value = 'false'::jsonb where key = 'publishing';
update seed.config set value = '0'::jsonb where key in ('monthly_cap_usd', 'first_run_cap_usd');

create or replace function seed.start() returns void
language plpgsql security definer set search_path = ''
as $$ begin raise exception 'seed kitchen is retired (17 Oct 2026); it no longer runs'; end; $$;

create or replace function seed.tick(stages text[] default null) returns bigint
language plpgsql security definer set search_path = ''
as $$ begin raise exception 'seed kitchen is retired (17 Oct 2026); it no longer runs'; end; $$;

revoke all on function seed.tick(text[]) from public, anon, authenticated;
revoke all on function seed.start() from public, anon, authenticated;
