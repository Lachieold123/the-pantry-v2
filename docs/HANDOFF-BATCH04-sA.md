# Batch 04 helper sA handoff (17 October 2026)

Branch `house-recipes-batch-04-sA` (worktree `~/Developer/the-pantry-v2-b04-sA`). 201 new recipes in `scripts/data/house-recipes/batch-04-A01.json` to `A04.json` (50, 49, 59, 43). Validator 201/201 pass, `catalogue:check-house` "No problems". Stopped on context at 201 of the 300 target. Not pushed or merged.

Counts (main meal type): snack/baking/dessert 94, lunch 59, dinner 39, breakfast 9. Difficulty: easy 132, medium 55, hard 14. Diets: vegetarian 151 (vegan 40), pescatarian 14, no-gluten 64, no-dairy 89. 71 take 30 minutes or less.

Cuisine: italian 24, british 24, french 20, modern-australian 18, spanish 17, american 17, greek 16, middle-eastern 13, central-european 13, mexican 11, caribbean 10, north-african 10, latin-american 8.

## Gaps left in the slice

- Dinners (39 of 201) and breakfasts (9): the biggest gap. Every cuisine needs more dinners, especially mexican, latin-american, north-african, middle-eastern, caribbean, central-european.
- Smaller cuisines still thin: latin-american, caribbean, north-african, mexican, central-european.
- Few hard recipes (14) and no slow roasts or breads beyond focaccia, buns and pretzels.
- No-gluten share is 32% (target 35%+); vegan 20% (target 18%+, fine).

## Notes for the next helper

- Compact generator lives outside the repo (scratchpad `sA/build.mts`): it parses lines, fills `diets` with `deriveDiets` and sets kcal = 4p+4c+9f. Write a similar one.
- Validator traps seen: ingredient lines must match the 560-item list (no banana, plums, dates, raspberry jam, condensed milk); "sheets" of pastry and whole fruit/veg units are under-counted by the nutrition estimator (use grams); deep-fry oil is best written without a quantity ("neutral oil, for deep frying"); gelatine blocks a vegetarian tag; steps must be 3 to 14 and not very short; servings 1 to 12; cooking steps need "until" or a temperature; "skillet" and "stovetop" trip the US-term check.
- Check titles first: many classics are already taken (Welsh Rarebit, Patatas Bravas, Pan con Tomate, Kaiserschmarrn, Anzac Biscuits, Moroccan Carrot Salad, Leek and Potato Soup, Sloppy Joes, Pot Roast, Stuffed Eggplant).
