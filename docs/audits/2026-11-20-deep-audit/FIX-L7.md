# FIX-L7: recipe and food-safety fixes (FOOD-1 to FOOD-18)

Recipe fixer, both shifts, 20 Nov 2026, branch `audit/deep-1120`. Statuses are in `FIX-L7-STATUS.csv`. The first shift's working notes are in `FIX-L7-HANDOFF.md`.

## Rules kept

- `recipes.json` changed only through the batch files, `recipe-fixes.json`, the ingredient database and the rebuild (`scripts/rebuild-house-batches.mts`).
- No tag, rule or threshold was loosened to make a check pass.
- No live service was touched. FOOD-16 is a SQL file the owner runs.
- FOOD-8 is left to the owner.

## Numbers, before and after

| Check | Audit | Now |
|---|---|---|
| `catalogue:validate -- --no-nutrition` | 935 failures (PASS 4862/5496) | 0 failures (PASS 5496/5496), 4514 warnings |
| `catalogue:check-text` | 99 problems | 0 |
| `catalogue:check-house` | | No problems |
| `catalogue:check-ingredients` | | All assertions passed |
| `feed:verify` | 1 problem | all passed |
| Known-bad fixtures caught | most missed | all caught (`scripts/recipe-text-checks.test.mts`, 7 tests) |
| Recipes | 5496 | 5496 |

Since the audit, 18 recipes lost a diet tag and 15 gained one. Every gain was reviewed.

## What changed, by finding

- **FOOD-1, 2, 13, 14 (69c86bc):** wrong ingredient links were fixed at the root.
  - 24 new ingredients and several alias fixes.
  - 45 unused "A or B" aliases and 3 hiding aliases removed, and their lines rewritten.
  - Fresh chillies no longer link to black pepper.
  - Second shift (1241649):
    - `stir-fry-sauce` added; it had matched frozen chips. It carries gluten, soy and shellfish.
    - `maize-cornflour` added. Plain Australian cornflour keeps gluten.
    - `dairy-free-dark-chocolate` added.
- **FOOD-3 (69c86bc, 1241649, e8da8d1):** 45 flat diet claims were hedged or had their lines changed, and 3 summaries were fixed. The claim rule now also catches "a vegan ..." and a trailing ", vegan.".
- **FOOD-4, 5, 6, 18 (1241649):** written safety notes for 607 recipes, from the `fs_notes.py` rules.
  - 141 of them replaced an empty "Food safety:" note.
  - A real existing note keeps its words.
  - The raw-egg rule was narrowed from 229 crude hits to 34 real ones. Jammy tomatoes, runny honey and raw egg that is then baked no longer count.
  - New rules: reheating must say steaming hot, honey only counts in a dish meant for babies, and garlic or chilli in oil.
- **FOOD-7 (c2b5a21):** `scripts/recipe-text-checks.mts` holds the shared rules.
  - It is used by `validate-house-recipes.mts` (which now checks converted recipes too) and by `check-recipe-text.mts`.
  - The fixtures are in `scripts/fixtures/known-bad-l7.json`.
- **FOOD-9 (43dc846):** the 17 Oct feed payloads now match the 24 Oct live vegan fixes. The 6 affected SQL chunks were regenerated, and `feed:verify` passes.
  - Pasta e Fagioli is not in the payloads.
  - The `supabase-2026-10-17` snapshot is left as it was taken. It still shows the old vegan tags.
- **FOOD-10 (ff2a3eb):** the 156 CC BY or BY-SA credits the scan flagged already have their Commons file page in `photoSources.ts`, and the recipe screen links it.
  - `check-text` now fails a CC BY photo that has no such page.
  - Pexels photos need no attribution (324).
  - The owner has the rest in `FIX-L7-PHOTOS-TODO.csv`: 120 old-app photos with no credit (the repo has no source for them) and 6 image keys with no file (K-30).
- **FOOD-11 (1241649):** 45 "X-free" find-and-replace artefacts were fixed.
  - "Cassava Cake" is now "Coconut Cassava Cake", because the first name duplicated an existing title.
  - The 33 still in the crude scan are recipe ids or real "cheese-free" and "mayo-free" wording.
- **FOOD-12 (4dfd0e4):** 345 "Contains" notes were corrected from the counted lines, with 30 spot-checked. `check-text` now runs `containsGaps`.
  - gluten 187, soy 138, milk 71, fish 48, egg 35, sesame 34, shellfish 29, tree nuts 3
  - Conservative calls: bread rolls count as soy, cornflour and baking powder as gluten, and prawn stock as fish.
- **FOOD-15 (1241649):** recomputed from the lines.
  - taro-and-pisupo-bake: 311 kcal to 635 kcal
  - the turkey breast roll: 821 kcal to 460 kcal
- **FOOD-16 (9c1d8e9), held:** `FIX-L7-LIVE.sql` is for the owner and has **not been run**.
  - It was built offline over the 719 live rows as of 17 Oct: the `published_recipes` backup overlaid with the update and insert payloads.
  - **Diet tags (3):**
    - Pepper Soup loses no-gluten (stock cubes).
    - Honey Soy Chicken Stir-Fry loses no-gluten (stir-fry sauce).
    - Pasta e Lenticchie loses vegetarian (Parmesan, animal rennet, D-053).
    - Pasta e Fagioli is in the file commented out, because its only Parmesan is an optional rind. That is the owner's call.
  - **Safety notes (150 rows):** mostly the reheat note, plus poultry, pork, mince, beef, egg, rice and seafood notes.
  - **Leads the audit raised that were not real:**
    - The karahi and nihari ghee lines: neither row is tagged no-dairy.
    - The chile con queso flour chips: the row is not tagged no-gluten.
    - The Arrós a Banda aioli: it is made from bought mayonnaise.
  - **How each statement is built:**
    - It is keyed by id, or by slug for inserted rows.
    - It changes nothing if run twice.
    - It has its undo in the comment under it.
    - A diet tag comes off only where the checked catalogue copy lost it and the breaking line is in the live row word for word.
  - **How it was checked:** `tools/FIX-L7/live-sql-check.mjs` ran it on PGlite loaded with the backup. It changed 150 rows, a second run changed 0, diets and `recipe->diets` agree, and the undos restored every row.
- **FOOD-17 (1241649):** margherita-pizza loses "/ 480°F".

## FIX-LOGIC-DATA-TODO (c86b381)

- **Done:** 4 lines that each bought two things were split, so the shopping list counts both: carbonara, fish-tacos, roast-chicken and the soy-poached chicken. `check-text` now refuses "+ N" outside brackets.
- **Not done, on purpose:** the zest-and-juice lines were left. They already scale ("2 lemons, zest and 3 tbsp juice" doubles to "4 lemons, zest and 6 tbsp juice"), and the suggested note form would not scale.
- **Done:** new ingredients hazelnut-spread (nutella, gianduja), praline, marzipan, frangipane and xo-sauce, each with its allergen groups.
- **Breaks 2 tests:** 2 tests in `src/domain/recipes/avoidNotice.test.ts` now fail, because they used nutella, marzipan and XO sauce as words the database does not know. My brief does not allow edits in `src/domain`, so the fix (swap in unknown words) is written up for the logic fixer in that TODO file.

## Final checks (20 Nov)

| Check | Result |
|---|---|
| `check-house`, `check-text`, `check-ingredients`, `validate` (bare) | pass |
| `feed:verify` | passes |
| `typecheck`, `lint` | clean |
| `test:domain` | 628 pass, 2 fail (the `avoidNotice` tests above) |
| `test:ui` (Jest) | 294 of 294 pass |

The L7 scans were re-run, and the evidence files they rewrote were restored.

## Left for the owner

1. **FOOD-8:** invented cooks on the live feed.
2. **FOOD-16:** review and run `FIX-L7-LIVE.sql`, and decide the Pasta e Fagioli line.
3. **FOOD-10:** credits for 120 photos and the 6 missing files (`FIX-L7-PHOTOS-TODO.csv`).
4. **Optional ingredients:** catalogue recipes stay vegan or vegetarian when the only animal item is an optional line. That is the app's rule (optional lines don't count), but some might want it changed.
5. **Stock and gluten:** 503 no-gluten recipes rely on plain stock not being tagged gluten. Stock cubes are tagged gluten.
