# Handoff: Pantry fixes, 17 Oct 2026

Work for Lachlan's Telegram msg 1498 ("fix everything... all the recipes up on the Pantry with the fictional cooks... remove the API key"). Worktree: `~/Developer/the-pantry-v2-main` (branch `main`).

## Done

**API spend stopped (Supabase `the-pantry`, eozyhllkvajvrecojdxu)**
- `seed.config`: paused true, publishing false, monthly and first-run caps 0.
- `seed.start()` and `seed.tick()` now raise an error (remote migration `seed_kitchen_retired`; local copy `supabase/migrations/20261017000000_seed_kitchen_retired.sql`, the remote records it under its own timestamp).
- `cron.job` is empty. Only `postgres` can execute the seed functions.
- Edge function `seed-kitchen` redeployed as v9: a stub that returns 410 and calls nothing (JWT now required).
- No Anthropic key found in any local repo, `.env` or config file.
- **Not done:** the `ANTHROPIC_API_KEY` Edge Function secret still exists. The Supabase MCP can't delete secrets and there is no CLI login. Lachlan: Supabase dashboard > project the-pantry > Edge Functions > Secrets (or Project Settings > Edge Functions) > `ANTHROPIC_API_KEY` > Delete. Also revoke the key at console.anthropic.com > API Keys. Nothing can use it now (the only function that read it is a stub).

**Git (`main`, pushed to origin; tag `pre-merge-2026-10-17` = old origin/main 39ed760)**
- D-044/D-045 clash: main's Home ranking and RevenueCat entries renumbered D-051 and D-052 (D-046 to D-050 are used on other branches).
- Seed-kitchen v8 source and the two remote migrations committed under `supabase/`.
- Merged `house-recipes-batch-01` (150 drafts + photos) and `house-recipes-batch-03` (561 ai-assisted). Catalogue: 996 recipes.
- D-053: hard cheeses (animal rennet), gelatine, pesto not vegetarian (`non-vegetarian` group, `vegetarian-hard-cheese` ingredient); text-vs-tag check and "A or B" check (`scripts/recipe-text-checks.mts`, `catalogue:check-text`); batch-04's validator (`catalogue:validate`) brought in with a reviewed-exceptions list; food-safety notes, doneness cues (148 recipes, written by helpers), US terms, alternatives fixed.
- Results: `catalogue:validate -- --no-nutrition` 711/711 pass (745 warnings, report `docs/validator-all-batches-2026-10-17.txt`); check-house, check-text, check-ingredients pass; typecheck, lint, format pass; tests 374 domain + 110 Jest pass.
- Local only: `docs/launch/app-store-listing.md` and `APP-STORE-LISTING.md` are two tracked files that differ only by case (pre-existing); both are marked skip-worktree in this worktree.

**Supabase feed**
- Backups: in-database copies `backup.published_recipes_20261017` (604), `backup.ingredient_extras_20261017` (241), `backup.cooks_20261017` (100); local export of what the public API can read in `docs/backups/supabase-2026-10-17/` (592 published, 100 cooks, 228 extras).
- `ingredient_extras`: andouillette now meat, pork, gluten; Japanese curry roux block gluten, soy, dairy; junk links `whole`, `curry`, `vine` set to `rejected` (no feed row outside batch-03 links to them).
- 5 feed rows lost a wrong vegetarian tag (parmesan/pecorino): melanzane-alla-parmigiana, involtini-di-melanzane, cacio-e-pepe, tortelloni-di-ricotta-e-spinaci, pao-de-queijo. No published row deleted.

## Not done (needs Lachlan)

Pushing the cleaned content to the feed and publishing the 127 batch-01/02 recipes that aren't already in the feed under fictional cooks. Payloads are ready in `docs/backups/feed-payloads-2026-10-17/`:
- `feed-updates.json`: 565 rows (561 batch-03 rows replaced by their cleaned version, keyed by row id; 4 others with "A or B" and tag fixes).
- `feed-compact-updates.json`: the same, only the changed fields (506 rows: diets 20, notes 458, steps 293).
- `feed-inserts.json`: 127 new rows (slug, title, cuisine, meal types, diets, difficulty, minutes, recipe). Cook choice: an active persona whose cuisines include the recipe's and whose diet allows it, fewest recipes first; else the official cook. `review = 'auto-checked'`, no photo (the bundled Commons photos can't be uploaded without a storage key).
- `feed_payload.mts` rebuilds them.

The blocker is transport: the payloads total about 2.3 MB. The public API has no write access, there is no service-role key or DB password on the Mac, and a temporary anon-callable import function was refused by the safety classifier. Options:
1. Lachlan puts the service-role key (or DB connection string) in an untracked local file, e.g. `~/Developer/the-pantry-v2-main/.env.local` (never in chat), and a helper upserts by id / inserts with `on conflict do nothing`.
2. Lachlan approves a one-off import function (anon-callable, token-protected, dropped straight after).
3. Send the compact updates through the Supabase MCP in chunks (about 150k tokens of usage); inserts the same way (about 110k).

The 15 tag additions in the compact file (e.g. dosa no-gluten, karahi no-dairy) must go in together with their content changes, never alone.

## Other items for Lachlan
- Supabase advisory: RLS is off on the `seed.*` tables. Low risk (anon and authenticated have no usage on schema `seed`), but enabling RLS with no policies would close it.
- Fictional cooks, AI faces and seeded follows: fine for test builds only (App Store 5.1/2.3, ACL). Not changed.
- Higgsfield plan terms for the 418 AI images: unchecked.
- App-store builds, RevenueCat, paid services: untouched.
