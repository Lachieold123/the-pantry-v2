# Overnight 21 Oct 2026 (branch overnight/pantry-code-items)

Local commits only. Nothing pushed, uploaded, applied or deployed. No live service touched.

## Task A: feed verify (done)

- `scripts/verify-feed-payload.mts`, `npm run feed:verify`, test `scripts/verify-feed-payload.test.mts` (8 tests), and `docs/FEED-VERIFY.md` (read-only SELECT export, project eozyhllkvajvrecojdxu; `npm run feed:verify -- --sql` prints the exact queries).
- Run against the real payloads: 565 full updates, 506 compact updates (59 rows have no field change, so no chunk), 127 inserts, 57 chunk files. Every compact row is in exactly one applied chunk and one `u*` chunk, every insert in one `i*` chunk, chunk rows equal payload rows, no blank "Food safety:" notes.
- **One real finding:** "Pasta e Lenticchie" (id fcc4ff98-09d0-4068-9c82-add53a836973) is tagged vegetarian/vegan/no-dairy but lists "Parmesan, finely grated, to serve". It needs a diet-tag fix in the feed (and check the catalogue copy). Not fixed: it touches live data.
- Not checked: the live rows themselves (no access). That is the owner or a Supabase-MCP session running the SQL in FEED-VERIFY.md.

## Task B: nutrition for the 13 (done)

- `catalogue:validate` went from 5197/5210 to **5210/5210, 0 failures**. Details, sources and URLs: `docs/NUTRITION-13-SOURCES.md`.
- Only 6 are truly under the 40 kcal floor (base-genep, nozawana-zuke, pico-de-gallo, torshi, horenso-no-ohitashi, jaew-makhuea-thet). The other 7 were estimator gaps (unweighed coconut, chillies, spoon-measured milks, an ingredient link).
- gat-kimchi was a plain data bug: no `mustard-greens` ingredient, so it linked to Dijon. Added the ingredient. It also relinks "mustard greens" in 6 other batch files; all still validate.
- House recipes live in batch files (D-044), not `recipe-fixes.json` (which only patches converted old-app recipes), so nutrition went into `batch-03.json` through `scripts/apply-nutrition-13.mts`, then `scripts/rebuild-house-batches.mts` rebuilt `recipes.json` (5496 recipes). I did not hand-edit `recipes.json`.
- Decision made: floor left at 40; the 6 are in the validator's existing `REVIEWED` list with reasons (they show as warnings).
- Caveats: values come from USDA SR via the nutritionvalue.org mirror (scaled from per-serving pages); a handful of minor items (tomato, oil, vinegar and similar) are standard USDA values typed from memory, listed in the doc. Kina and rēwena use proxies (fish roe, white bread); a NZ table would be better.
- The live feed rows for these 13 do not have the new nutrition.

## Task C: seed kitchen off (prepared, not applied)

- `docs/SEED-KITCHEN-OFF.md` and `supabase/migrations/_pending/20261021000000_seed_kitchen_off.sql` (unschedules cron if present, RLS with no policies on the 5 `seed.*` tables, deletes nothing). Delete command and rollback are in the doc.
- Found: no migration in git actually unschedules the cron job, despite the status note. Worth running `select * from cron.job;` first.
- The stub function already refuses everything, so no guard was added.

## Needs the owner

1. Pick the 40 kcal floor option (keep the per-recipe list, add a condiment category, or drop it).
2. Fix the Pasta e Lenticchie diet tags in the feed.
3. Run the FEED-VERIFY SQL (or ask a Supabase-MCP session) and feed the result to `feed:verify`.
4. Decide whether to apply the seed-kitchen pending SQL and delete the function.
5. `docs/launch/APP-STORE-LISTING.md` had uncommitted edits before I started; left alone and not committed.

## Checks

typecheck clean, lint clean, `npm test`: domain 398/398, Jest 110/110 (one Jest test failed once during a combined run and passed on rerun; looks timing-related).
