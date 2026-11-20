-- Row level security on the three backup tables (deep audit 20 Nov 2026, S2-8).
-- They hold the 17 Oct copy of the feed (604 recipes, 100 cooks). anon and
-- authenticated have no usage on the `backup` schema, so this is the second
-- lock, with no policies: only the owner and the service role can read them.
-- The tables exist only on the live project (made by hand on 17 Oct), so each
-- is skipped where it isn't there (a fresh database, the PGlite tests).
do $$
declare t text;
begin
  foreach t in array array['backup.published_recipes_20261017', 'backup.ingredient_extras_20261017', 'backup.cooks_20261017'] loop
    if to_regclass(t) is not null then
      execute format('alter table %s enable row level security', t);
    end if;
  end loop;
end $$;
