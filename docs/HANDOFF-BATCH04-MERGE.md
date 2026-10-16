# Batch-04 merge handoff (17 October 2026, interim round 2)

Branch `house-recipes-batch-04-merge` in `~/Developer/the-pantry-v2-b04-merge`. Not pushed, not merged into main.

## Where it stands

- Slices merged: sA to A55 (ded588a), sB to B51 (9e64db6), sC to C59 (2133e1f; slice C's writer was still running, so later C files are not in yet).
- Batch-04 recipes after dedupe: **4345** in 168 files (plus `batch-04.json` samples and chunks 01/02).
- Duplicates dropped this round: **26** (all inside batch-04: near-ingredients 21, near-title 4, slug 1; none against the catalogue). Dropped so far in total: 104. Full list in `docs/DEDUPE-BATCH04.md`.
- `catalogue:validate` over every batch-04 file: **PASS 4345/4345, 0 failures** (3861 warnings, mostly cup measures and doneness wording). `catalogue:check-house`: No problems (every line matches the ingredient DB). `catalogue:check-ingredients`: passes (99.99% of catalogue lines).
- Typecheck clean. Jest 68/68. Domain tests 308/309: the one failure is the batch-03 "says which model wrote every AI-assisted recipe" test, which needs main's `batch-03.json`. Main not merged (still needs the owner's go-ahead; conflicts in `package.json` and `scripts/validate-house-recipes.mts`).

## What changed this round

- `scripts/merge-batch04.sh` now also keeps out slice A's scratch (`scripts/_*`) and the `node_modules` symlink sA committed (it moves the local symlink aside during the merge and puts it back).
- Estimator fix (`scripts/nutrition-estimate.mts`, test added): whole-tin gram weights of pulses ("800g tinned chickpeas, drained") were counted as 800 g of chickpeas; now counted drained (60%, same as the per-tin figure). Re-running renormalise scaled 13 overstated recipes down. Nothing was scaled up.
- Only validator failure after the merge: giardiniera at 24 kcal a serve (true for brine-pickled veg). Gave it the olive-oil finish common in Italy, so 55 kcal; no rule changed.
- Ingredients missing from the DB: lemon myrtle was linking to "lemon" in 4 sA recipes. Swapped for lemon zest and retitled (ids changed): lemon-and-herb-pan-seared-snapper-with-roast-pumpkin, lemon-and-herb-crusted-lamb-rack-with-roast-vegetables, lemon-zest-prawn-skewers-with-quinoa-and-avocado, lemon-and-thyme-beef-burgers-with-beetroot-and-onion. "Curry goat" was made with lamb shoulder, so it's now `jamaican-style-curried-lamb` with a note that goat is traditional. No kangaroo, emu or other game lines are left in batch 04 (duck and goat's cheese are in the DB).

## Spot audit (10 random recipes from the new files, seed 20261017, hand count)

Within 20%: sweet potato coconut soup, chicken rice soup, stuffed capsicums, sweet potato hummus, honey soy wings (+12%), ocopa, pumpkin pie squares. Fixed:
- Mediterranean chickpea stew: 330 stated vs about 238 by hand (the tin-weight bug). Now 244.
- Big-batch chicken curry for ten: 640 stated vs about 790 (4 cups basmati and 2 tins coconut milk across 10). Rebuilt from lines to 790.
- Fresh kimchi (geotjeori): about 36 kcal a serve at 6 serves, under the 40 floor. Now 4 serves (about 150 g cabbage each) at 55 kcal.
Diet tags, food-safety notes and steps in all 10 were right.

## Still worth a look (warnings, not failures)

Some single-word links under-count or over-count: "vanilla sponge cake" links to vanilla extract, "turkey breast roll" to bread roll, "sushi-grade tuna" to tinned tuna, "split pigeon peas" to frozen peas. A few recipes, small effect. They need DB items or rewording.

## Next steps for the final run

1. When slice C's writer finishes (and A/B if they add more), commit any loose work in the merge worktree, then run `scripts/merge-batch04.sh` here. It merges, renormalises, dedupes, validates and commits.
2. Fix whatever fails (expect nutrition and near-duplicate titles), never loosening rules or scaling figures up. Re-run `npx tsx scripts/validate-house-recipes.mts $(ls scripts/data/house-recipes | grep '^batch-04')`.
3. Don't run `dedupe-batch04.mts --write` a second time by hand after a clean run: it rewrites `docs/DEDUPE-BATCH04.md` with an empty list (restore it with `git checkout HEAD -- docs/DEDUPE-BATCH04.md`).
4. Spot-audit 10 more, update this file, commit.
5. With the owner's yes, merge main (two conflicts) so the batch-03 test passes, then catalogue rebuild.
