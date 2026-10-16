# Recipe batch 04 plan (17 October 2026)

Phase 1 of Lachlan's go-ahead (Telegram msg 1495): build thousands of original house recipes in Max-plan sessions, stopping when weekly usage reaches about 80%. This file sets the target mix. Branch `house-recipes-batch-04` (worktree `~/Developer/the-pantry-v2-batch04`), cut from `house-recipes-batch-01`.

## Rules for every batch

- Written by Claude in a normal Claude Code session Lachlan has approved. No API key, no `claude -p` loops, no crons, no Supabase.
- Original recipes only: no copying from sites or books, no Wikibooks for now.
- Format: `scripts/data/house-recipes/batch-04*.json`, the D-044 house format plus a per-serve `nutrition` estimate. All `ai-draft`.
- Gate: `npm run catalogue:validate -- <file>` must pass with 0 failures, and `npm run catalogue:check-house` must say "No problems."
- Before writing a chunk, read the current title list (catalogue, all batches, parked batch-03, the HQ pilot) so the duplicate check doesn't eat the work.
- Chunks of 50 recipes, one cuisine group per chunk, with a usage reading (SU) before and after.

## What already exists

Counted on 17 Oct. "In repo" is the catalogue on this branch (285 converted + batch-01 50 + batch-02 100 = 435). "Batch-03" is the 561 cleaned API recipes on the parked branch, counted only for titles and gaps (not shipped; 3 of its cuisines, pacific-islands, east-african and caribbean, don't exist on this branch).

| | In repo (435) | Batch-03 parked (561) |
|---|---|---|
| Meal types | dinner 359, lunch 229, snack 59, breakfast 34 | dinner 353, lunch 138, snack 48, breakfast 30 |
| Diets | no-dairy 212, no-gluten 115, vegetarian 96, pescatarian 67, vegan 26 | no-dairy 423, no-gluten 316, vegetarian 195, vegan 115, pescatarian 109 |
| Difficulty | easy 295, medium 131, hard 9 | easy 318, medium 237, hard 6 |
| 30 minutes or less | 108 | 171 |

Gaps: breakfast (8% of what exists), vegan (6% in repo), gluten-free, hard recipes, and the smaller cuisines (Scandinavian, South African, West African, Indonesian, Filipino all under 12 in repo).

## Targets for about 3000 new recipes

Meal types count the recipe's main meal type (a recipe may list more). Diet columns are floors, not caps: vegetarian (of which vegan), and no-gluten. Difficulty is easy / medium / hard.

| Cuisine | In repo | Batch-03 | Target | Breakfast | Lunch | Dinner | Snack and baking | Vegetarian (vegan) | No-gluten | Easy / medium / hard |
|---|---|---|---|---|---|---|---|---|---|---|
| italian | 38 | 25 | **240** | 29 | 60 | 115 | 36 | 96 (43) | 84 | 144 / 79 / 17 |
| modern-australian | 29 | 29 | **240** | 53 | 60 | 79 | 48 | 96 (43) | 84 | 144 / 79 / 17 |
| indian | 25 | 42 | **200** | 30 | 40 | 100 | 30 | 80 (36) | 70 | 120 / 66 / 14 |
| chinese | 26 | 25 | **180** | 22 | 45 | 86 | 27 | 72 (32) | 63 | 108 / 59 / 13 |
| thai | 16 | 25 | **160** | 19 | 40 | 77 | 24 | 64 (29) | 56 | 96 / 53 / 11 |
| japanese | 32 | 28 | **160** | 19 | 48 | 64 | 29 | 64 (29) | 56 | 96 / 53 / 11 |
| mexican | 23 | 24 | **150** | 27 | 40 | 61 | 22 | 60 (27) | 52 | 90 / 49 / 11 |
| middle-eastern | 18 | 28 | **140** | 21 | 42 | 49 | 28 | 56 (25) | 49 | 84 / 46 / 10 |
| american | 58 | 14 | **140** | 28 | 35 | 49 | 28 | 56 (25) | 49 | 84 / 46 / 10 |
| korean | 13 | 23 | **120** | 14 | 30 | 58 | 18 | 48 (22) | 42 | 72 / 40 / 8 |
| vietnamese | 10 | 25 | **120** | 18 | 42 | 48 | 12 | 48 (22) | 42 | 72 / 40 / 8 |
| greek | 13 | 17 | **110** | 13 | 28 | 53 | 16 | 44 (20) | 38 | 66 / 36 / 8 |
| french | 15 | 12 | **110** | 16 | 22 | 50 | 22 | 44 (20) | 38 | 66 / 36 / 8 |
| malaysian | 9 | 20 | **90** | 14 | 27 | 40 | 9 | 36 (16) | 31 | 54 / 30 / 6 |
| indonesian | 7 | 17 | **90** | 9 | 27 | 40 | 14 | 36 (16) | 31 | 54 / 30 / 6 |
| spanish | 10 | 16 | **90** | 9 | 22 | 37 | 22 | 36 (16) | 31 | 54 / 30 / 6 |
| british | 15 | 12 | **90** | 18 | 18 | 36 | 18 | 36 (16) | 31 | 54 / 30 / 6 |
| turkish | 9 | 18 | **90** | 18 | 22 | 36 | 14 | 36 (16) | 31 | 54 / 30 / 6 |
| latin-american | 11 | 20 | **90** | 11 | 22 | 43 | 14 | 36 (16) | 31 | 54 / 30 / 6 |
| north-african | 11 | 15 | **80** | 10 | 20 | 38 | 12 | 32 (14) | 28 | 48 / 26 / 6 |
| central-european | 16 | 22 | **80** | 12 | 16 | 36 | 16 | 32 (14) | 28 | 48 / 26 / 6 |
| filipino | 10 | 16 | **70** | 8 | 18 | 34 | 10 | 28 (13) | 24 | 42 / 23 / 5 |
| west-african | 7 | 14 | **60** | 7 | 15 | 29 | 9 | 24 (11) | 21 | 36 / 20 / 4 |
| south-african | 8 | 9 | **50** | 6 | 12 | 24 | 8 | 20 (9) | 18 | 30 / 16 / 4 |
| scandinavian | 6 | 13 | **50** | 10 | 12 | 18 | 10 | 20 (9) | 18 | 30 / 16 / 4 |
| **Total** | 435 | 561 | **3000** | 441 | 763 | 1300 | 496 | 1200 (540) | 1050 | 1800 / 990 / 210 |

Across the whole set:

- **Meal types:** breakfast about 15%, lunch 25%, dinner 43%, snack and baking 17%. Desserts sit under "snack" until Lachlan decides on a dessert meal type.
- **Diets:** vegetarian at least 40% (1200), vegan at least 18% (540), pescatarian about 12% (360), the rest meat. No-gluten at least 35% (1050), no-dairy at least 55%.
- **Difficulty:** easy 60%, medium 33%, hard 7% (hard is the biggest gap: 15 exist across 1000 recipes).
- **Time:** at least 40% done in 30 minutes or less; about 8% slow (2 hours or more, braises, roasts, breads).
- **Pantry-friendly:** at least 30% use only staples plus five or fewer fresh items, so "what can I cook" has plenty to offer.
- **Variants:** each popular dish gets at most one variant (a vegan or gluten-free take, or a different protein) and only when the title and method genuinely differ; the near-duplicate check (60% title-word overlap) enforces this.
- **Food safety:** every recipe with raw poultry, mince, fresh pork, beef or lamb cuts, seafood or soft egg carries a "Food safety" note with the temperature (75°C poultry and mince, 70°C pork, 63°C or opaque for seafood).

## Running order

1. Samples (done): 5 recipes in `batch-04.json`, preview in `docs/batch04-samples.md`.
2. After Lachlan's yes: chunks of 50 into `batch-04a.json`, `batch-04b.json` and so on, gaps first: breakfast across all cuisines, then vegan and gluten-free dinners, then the small cuisines, then the big ones.
3. After every 200: Lachlan spot-checks 20 at random plus every recipe tagged vegan or no-gluten that has a near-miss ingredient (soy sauce, oats, baking powder, stock).
4. Stop when weekly usage reaches about 80%, and leave a handoff note.

## Open calls for Lachlan

1. Hard cheese: the validator treats parmesan, pecorino, Gruyère and similar as not vegetarian (unless the line says vegetarian) but the app's `deriveDiets` still tags them vegetarian (D-036). Batch-04 recipes avoid the clash by leaving hard cheese out of vegetarian dishes or writing "vegetarian hard cheese". Which rule wins?
2. Nutrition: the app has no nutrition field. Batch-04 carries a per-serve estimate in the batch file only. Show it in the app, keep it as data, or drop it?
3. Cuisines: batch-03 added pacific-islands, east-african and caribbean. Bring those into this branch's cuisine list?
4. Desserts: add a dessert meal type, or keep them under snack?
5. Times: should marinating, resting and chilling count in prep time? (Currently they don't; the validator warns.)
