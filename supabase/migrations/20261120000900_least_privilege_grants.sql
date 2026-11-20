-- Least privilege on the feed tables (deep audit 20 Nov 2026, S2-15, SEC-20).
-- Supabase's default grants gave anon and authenticated every right on
-- cooks, published_recipes, follows and ingredient_extras. Row security
-- (select-only policies) is what blocked writes; now the grants block them
-- too, so one mistaken permissive policy can't make the feed writable.
-- The app only reads these four (src/lib/homeFeedReads.ts, src/lib/published.ts);
-- Follow and Unfollow are kept on the phone (src/store/homeEvents.ts).
-- The service role (the retired seed kitchen) keeps its own grants.
revoke insert, update, delete, truncate, references, trigger
  on public.cooks, public.published_recipes, public.follows, public.ingredient_extras
  from anon, authenticated;

-- Households and members are created only through create_household and
-- join_household (security definer), so the app never inserts them directly.
-- 20261120000000 already took delete, truncate and most updates.
revoke insert on public.households, public.household_members from authenticated;

-- pg_net (net.http_*) is owned and granted by supabase_admin, so a migration
-- run as postgres can't revoke it. Nothing calls it (cron.job is empty, the
-- seed kitchen is retired): the owner disables the extension in the dashboard
-- (supabase/APPLY-LIVE.md, owner steps).
