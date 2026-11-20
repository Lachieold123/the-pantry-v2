# FIX-L7 handoff (recipe fixer, 20 Nov)

Context ran out at ~140k; this is where the next helper picks up. Brief: the coordinator's FIX-L7 prompt (fix FOOD-1 to FOOD-18 in data, DB and validators; no live writes). Extra ask from the coordinator: also hand back `docs/audits/2026-11-20-deep-audit/FIX-L7-STATUS.csv`, one line per finding, no header: `id,status,commit,note` (status fixed|part-fixed|not-real|left|owner|held; note one short sentence, no commas before the third field ends).

## How the rebuild works now (read this first)

- `npx tsx scripts/rebuild-house-batches.mts` is THE rebuild. `catalogue:convert` with the old app (`~/Desktop/HQ/11-ThePantryV2/The Pantry - Transfer/the-pantry-app`) no longer reproduces the catalogue (drops 3 recipes, reparses 93), so don't use it.
- Since e249510/b7b3fb6 the rebuild also handles the 286 converted recipes: it applies any `recipe-fixes.json` entries they haven't had yet (`pendingFix`: replacements with `from` present; notes/steps/lines not yet there), re-links every line to the current `ingredients.json`, and re-derives diets. So converted-recipe fixes = add entries to `recipe-fixes.json` (via `tools/FIX-L7/merge-fixes.ts <file.json>`), then rebuild.
- House recipe fixes = `tools/FIX-L7/edit-batch.ts <edits.json>` (replace in title/summary/items/steps/notes or "text", addItems, addNotes, dropNotes, diets), then rebuild. If the rebuild says "diets stated [..] but the ingredients give [..]", run `tools/FIX-L7/sync-diets.ts <rebuild log> [ids allowed to gain a tag]` (it applies removals, holds additions).
- Ingredient DB fixes: `tools/FIX-L7/fix-ingredients.ts` (idempotent; edit its NEW/ADD/REMOVE/GROUPS lists and re-run).
- Helpers: `tools/FIX-L7/lines.ts "<regex>;;<regex>" [n]` (catalogue lines by link), `q.ts "phrase|phrase" idsubstr` (what links), `diet-diff.ts` (diet changes vs the audit commit 8cba2a8), lane scans in `tools/L7/` (they overwrite `evidence/L7/*`: `git checkout` those files after reading the counts).
- 18 batch files were re-laid-out (401abc8, no data change) so scripts can rewrite them.
- Pipe rebuild output to a file, e.g. `npx tsx scripts/rebuild-house-batches.mts > /tmp/l7-rebuild.log 2>&1`.

## Done (committed)

| Commit | What |
|---|---|
| e249510, cbabe25, b7b3fb6 | rebuild handles converted recipes (pending fixes, re-link, diets); photo maps via recipe-photos.mts; picks up parser drift in 93 house recipes (shape only) |
| 401abc8 | 18 batch files normalised |
| 69c86bc | FOOD-1, 2, 3, 13, 14 (see commit message): 24 new ingredients, alias fixes, 45 unused "A or B" aliases + 3 hiding aliases removed, lines split (pho x2, beef-korma, stuffed-mushrooms, turkey-burger, feijoada), 17 recipes lose a wrong tag, 2 gain pescatarian, 8 gain no-gluten (their lines name GF/teff/maize flour); 13 claims reworded; recipe-text-checks NOT-regex allows "gluten-free plain flour" |

Numbers so far:
- `link-word-clash` pairs where the link loses a group: 33 rows / 11 after. The 11 left are all not real: GF flours (buckwheat, sweet potato, millet, wattleseed) aren't wheat; lamb leg steaks; firm white fish steak; crusty bread roll and sourdough toast (soy only); "salt for pasta water" (salt, kept as a needed alias); "pork blood sausage" (optional Vietnamese blood cake, no wheat).
- FOOD-1 certain list (allergen-offenders-certain.csv, 28 rows): all link/diet rows fixed (trifle x2, crackles, rice-bubble bars, harira x2, sheer khurma, feijoada, kathi roll, fish-finger wraps note, minestrone now has a real pasta line, kingfish x2, pork scotch x3, black bean x2). Text rows: done except **lemon-chickpea-salad**, **harissa-chickpea-tagine**, **arepas** (their claims are hedged alternatives and true: "leave out the feta and it is vegan", "serve over rice for gluten-free"; record as not-real).
- Kept on purpose: "fried onions for garnish" -> fried-shallots (label-dependent wheat coating: next helper may want to give fried-shallots no change; it's a review item).

## Not done yet (in order)

1. **FOOD-7 validators.** `scripts/recipe-text-checks.mts`: widen WORDS (meat: turkey, venison, kangaroo, rabbit, goat, quail, boerewors, merguez, kransky, kielbasa, pepperoni, mortadella, guanciale, speck, bratwurst; seafood: kingfish, yellowtail, cod, snapper, barramundi, trout, mackerel, sardine, lobster, scallop, octopus, calamari, shrimp paste, bagoong, belacan, kimchi, curry paste with NOT "vegan ... paste"; gluten: sponge, savoiardi, ladyfinger, cake, biscuit, vermicelli, puffed rice, rice bubbles, corn flakes, paratha, roti, naan, black bean sauce, hoisin, shaoxing, stock cube/powder, malt, brioche; egg: pappardelle, egg pasta, sponge). Careful: NOT gluten has `corn (... flakes)` which would hide corn flakes: split flakes out. Add a claim check (title/summary/notes, regex + HEDGE from `tools/L7/scan-claims.ts`) and an artefacts check (`tools/L7/artefacts.ts` OK-list regex) to recipe-text-checks and call them from `check-recipe-text.mts` (whole catalogue, so converted too) and from `house-recipes.mts` toRecipe. `scripts/validate-house-recipes.mts`: honey + baby/infant/months rule; chicken "does not need to reach 75" negation; pork/beef doneness must say 63 °C only for whole cuts, mince/poultry 75; empty "Food safety:" must fail (needs a cue word); raw-egg hit needs /pregnan|vulnerable|pasteuri/; run its safety block over converted recipes (from recipes.json). Fixtures: copy `tools/L7/known-bad.json` cases into the scripts' tests (see `scripts/verify-feed-payload.test.mts` for the test style; `npm run test:domain` picks up scripts/*.test.mts? check package.json) with expected failures. Then run over the catalogue and fix what's newly caught.
2. **FOOD-4/5/6/18 safety notes.** Rules in `docs/backups/feed-payloads-2026-10-17/fs_notes.py`; lists in `evidence/L7/food-safety-certain.csv` (check column) and `food-safety-review.csv`. Converted recipes: addNotes in recipe-fixes.json via merge-fixes.ts. 130 empty "Food safety: " notes in batch-01/02/03: replace via edit-batch (replace in notes "Food safety: " exact -> full text; use dropNotes+addNotes since "from" must be unique). Raw egg (FOOD-6): check each dish (baked = no warning).
3. **FOOD-11** (`evidence/L7/find-replace-artefacts.csv`), **FOOD-12** (no code place exists for derived "Contains" notes, so correct the notes from the links; `evidence/L7/contains-note-mismatches.csv`; `tools/L7/scan-contains.ts`), **FOOD-15** (`scripts/fix-nutrition-from-lines.mts` / `estimate-nutrition-from-lines.mts` for taro-and-pisupo-bake), **FOOD-17** (margherita-pizza "250°C / 480°F" -> steps replace via recipe-fixes).
4. **FOOD-9/REPO-2**: payload files in `docs/backups/feed-payloads-2026-10-17/` vs `/Users/lachlanoldfield/telegram-bot/scratch/pantry-nas-2026-10-24.md` section A1; `npm run feed:verify` must pass ("Pasta e Lenticchie").
5. **FOOD-10** photo credits (repo facts only; rest to `FIX-L7-PHOTOS-TODO.csv`). **FOOD-16** `FIX-L7-LIVE.sql` (removals and notes only, with undo comments). FOOD-8: owner, leave.
6. Final checks: `npm run catalogue:check-house`, `catalogue:check-text`, `catalogue:check-ingredients`, `catalogue:validate` (and `-- --no-nutrition`), `feed:verify`, `typecheck`, `lint`, `test`; recipe count 5,496. Note: at handoff `npm run typecheck` fails in `src/features/household/words.ts` from another session's in-flight `src/lib/household.ts` (not ours).
7. Write `FIX-L7.md` + `FIX-L7-STATUS.csv`, commit with explicit paths.

Nothing uncommitted from this helper (scratch logs in /tmp only).
