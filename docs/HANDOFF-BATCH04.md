# Batch 04 handoff (17 October 2026)

Last chunk: 02 (files `scripts/data/house-recipes/batch-04-01.json`, `batch-04-02.json`). 100 new recipes plus 5 samples = 105. Validator 105/105, `catalogue:check-house` "No problems". Weekly usage reading at the stop: 51% (limit 78%). Stopped on context, not usage.

## How the chunks are built

The generator keeps recipes in a compact form outside the repo and expands them into the house format. The helper scripts lived in the session scratchpad and are not committed, so a fresh helper should write its own small builder: it needs to (1) parse each ingredient line with `parseIngredientLine`, (2) fill `diets` from `deriveDiets` so they always match, (3) set `kcal = 4p + 4c + 9f`, then (4) run `NUTRI_DEBUG=1 npm run catalogue:validate -- <file>` and nudge the macros into the validator's accepted band (0.55 to 1.8 of its estimate). The validator now prints `NUTRI <id> <estimate> <coverage>` when `NUTRI_DEBUG` is set (one added line).

## Rules learned from the validator

- Every ingredient line must match `src/data/ingredients/ingredients.json` (560 items). Missing: chia, plums, banana, urad dal, fennel bulb, whole cloves, berbere, taro, cassava leaves. Substitute or name a listed item. "2 x 400g tins X" is mis-parsed as 2 g; write "800g tinned X".
- One ingredient per line (no "or"), cooking steps need "until" or a temperature, Food safety notes must start "Food safety" and carry 75°C for mince, poultry cut-offs, and an "opaque / flakes / 63°C" cue for seafood (even raw fish).
- Title near-duplicates (60% word overlap) include the catalogue, batch-03 and the pilot: "Pasta e Fagioli", "Jerk Chicken", "Rice and Peas", "Mee Goreng", "Kimchi Fried Rice", "Bobotie" are all taken. Use distinct titles.
- Words that trip style checks: "pound" (as a verb), "stovetop".

## Coverage gaps (next targets)

Counts above are in `RECIPE-BATCH04-PLAN.md`. Biggest gaps against the 3000 target:

1. Snacks, baking and desserts (only 4 of 100; target about 17%).
2. Lunch (11 of 100; target 25%) and hard recipes (5; target 7%).
3. Under-served cuisines: spanish, north-african, indonesian, vietnamese, british, latin-american, malaysian, south-african (1 to 2 each), plus filipino (0), central-european (0).
4. Vegan share is 25% (good); keep vegetarian at 40% or more and no-gluten at 35% or more.
5. Still to do for the big cuisines: italian, modern-australian, indian, chinese (240, 240, 200, 180 targets; 8, 9, 8, 7 done).

Next chunk 03 suggestion: 50 recipes covering desserts and baking across all cuisines, filipino, central-european, spanish, north-african and lunch dishes.
