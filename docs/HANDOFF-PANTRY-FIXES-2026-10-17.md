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

## Feed publish via Supabase MCP (option 3) - progress log
- Backups confirmed in DB (604/241/100) and docs/backups. Table public.published_recipes matches payload keys (recipe jsonb holds notes/steps/diets; column diets updated with it).
- Chunk SQL files (30 updates / 12 inserts each): scratchpad `.../scratchpad/ch/u01..u17.sql`, `i01..i11.sql` (rebuild with the generator in this note if lost). Update = `recipe || (row - id - notes) || filtered notes`, diets column set when row has diets. Insert picks a cook who already has published recipes in that cuisine (rotating, fewest recipes first), else official `thepantry`; review auto-checked; guarded by `not exists slug`.
- DEVIATION: 126 payload rows (90 updates, 36 inserts) carry an empty note "Food safety: " (source batches have the empty stub). Chunks strip notes that are exactly "Food safety:" so no blank note is published; source JSON unchanged. Lachlan may want the real food-safety text written later.
- Published before: 592 (604 rows, 12 removed).
- Done: u01, u02 (30/30 each).
- Done: u01, u02, u03 (30/30 each, 90 of 506 rows). Remaining: u04..u17 (updates), i01..i11 (inserts). Ready-to-paste SQL is in `docs/backups/feed-payloads-2026-10-17/chunks/` (Read one, paste it whole into Supabase `execute_sql`, project eozyhllkvajvrecojdxu; result must show expected = updated/inserted). Each chunk costs about 20k tokens of context (read + paste), so a fresh helper should do roughly 6 chunks, note progress here, and stop.
- Final checks still to run: published count (before 592), 5 random updated rows vs payload, 0 vegetarian/vegan rows with parmesan/pecorino/honey(vegan)/gelatin, and an md5 compare of recipe->steps per updated id against the payload to catch any paste typos.

### Progress, session 2 (17 Oct)
- Real food-safety notes written for all 126 empty-note rows (`docs/backups/feed-payloads-2026-10-17/fs_notes.py`, rule-based on ingredients; payload JSONs updated). Chunks rebuilt by `gen_chunks.py` (committed on main, not pushed).
- BUG FIXED: old i01..i11 used an invalid `$[` dollar-quote; regenerated with `$q$`. Use the regenerated files.
- Done: x01 (notes fix for u01-u03 rows; 54 rows checked, 13 lacked a note and got one), s01 (15/15, = compact rows 91-105).
- New smaller chunks s01..s28 (15 rows each, compact rows 91-506, fit one tool output). Next: s02. Do NOT use u04..u17 (they overlap s-series; s01 covers part of u04).
- Remaining: s02..s28 (updates), i01..i11 (inserts; 12 rows is ~41KB, too big for one output: split to ~4-6 rows before applying).
- Published count now: see Telegram report (before 592, inserts not yet applied).

### Progress, session 3 (17 Oct, helper via MCP)
- Done: s02, s03, s04, s05 (15/15 each). Next: s06 onward (s06..s28), then i01..i11 (split to ~5 rows). Inserts not started; no errors.

### Progress, session 4 (17 Oct, helper via MCP)
- Done: s06, s07, s08 (15/15 each, no errors). Next: s09 onward (s09..s28), then i01..i11 (split to ~5 rows). Inserts not started.
