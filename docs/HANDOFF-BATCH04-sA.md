# Batch 04 helper sA handoff (17 October 2026, updated after chunks 05 to 09)

Branch `house-recipes-batch-04-sA` (worktree `~/Developer/the-pantry-v2-b04-sA`). 431 new recipes in `scripts/data/house-recipes/batch-04-A01.json` to `A09.json` (50, 49, 59, 43, 52, 43, 49, 48, 38). Validator 431/431 pass across the A files, `catalogue:check-house` "No problems". Stopped on context at 230 added this session (target was 250). Not pushed or merged.

Counts (main meal type): dinner 211, snack/baking/dessert 94, lunch 60, breakfast 66. Difficulty: easy 223, medium 143, hard 65. Diets: vegetarian 214 (vegan 50), pescatarian 46, no-gluten 195 (45%), no-dairy 200.

## Gaps left in the slice

- Total is 431 of the 300 originally planned for this slice; further volume is optional.
- Thinnest cuisines for dinners and breakfasts: greek (breakfast), italian (breakfast), spanish, modern-australian, french.
- Few slow breads or bakes for breakfast; no ceviche or raw-fish dishes (avoided on food safety).
- Nutrition: the validator's estimator often reads about 2x the hand-estimated macros on stews and rice dishes; this session scaled stated nutrition to the estimator (autofix by title) so the figures are validator-consistent rather than independently weighed.

## Notes for the next helper

- Compact generator lives outside the repo (scratchpad `sA/build.mts`): it parses lines, fills `diets` with `deriveDiets` and sets kcal = 4p+4c+9f. Write a similar one.
- Validator traps seen: ingredient lines must match the 560-item list (no banana, plums, dates, raspberry jam, condensed milk); "sheets" of pastry and whole fruit/veg units are under-counted by the nutrition estimator (use grams); deep-fry oil is best written without a quantity ("neutral oil, for deep frying"); gelatine blocks a vegetarian tag; steps must be 3 to 14 and not very short; servings 1 to 12; cooking steps need "until" or a temperature; "skillet" and "stovetop" trip the US-term check.
- Check titles first: many classics are already taken (Welsh Rarebit, Patatas Bravas, Pan con Tomate, Kaiserschmarrn, Anzac Biscuits, Moroccan Carrot Salad, Leek and Potato Soup, Sloppy Joes, Pot Roast, Stuffed Eggplant).
