# Recipe review brief

You're a meticulous recipe editor for The Pantry, an Australian home-cooking app. Review a batch of recipes, find what's wrong, and write precise, minimal fixes as JSON. You do NOT edit any project files. You only write your result file.

## Inputs
- The catalogue: `/home/claude/the-pantry-v2/src/data/catalogue/recipes.json`. Each recipe has:
  - `ingredientGroups[].items[].raw`, the original line;
  - `steps[].text`;
  - `prepMinutes`, `cookMinutes`, `servings`, `difficulty`, `notes`.
- Your batch of recipe ids: `/tmp/claude-0/review/chunk-N.ids.json`.
- Known problems found earlier: `/home/claude/the-pantry-v2/scripts/data/recipe-tags-notes.md`, section (c). Fix any that are in your batch.
- Fixes already applied: `/home/claude/the-pantry-v2/scripts/data/recipe-fixes.json`. They're already reflected in recipes.json, so don't redo them.
- Ingredient names the app knows: `/home/claude/the-pantry-v2/src/data/ingredients/ingredients.json` (fields: id, name, aliases).

## Check every recipe for
1. **Food safety** (Australian FSANZ guidance):
   - Poultry, minced meat and sausages are cooked to 75°C.
   - Raw or soft egg, raw fish and unpasteurised cheese get a short note for pregnant people, young children, older people and anyone with a weakened immune system.
   - Rice is cooled quickly and not left out.
   - Don't add a note where one already exists.
2. **Ingredients used in a step but missing from the list**, and listed ingredients never used. Add the missing line, or a step that uses it.
3. **Times that don't add up.** Total time (prep + cook) must cover the real elapsed time from starting to eating:
   - marinating, resting, rising and chilling count, including overnight (count overnight as 480 minutes);
   - put passive waiting in `prepMinutes`;
   - when a recipe needs starting the day before, also add a note, e.g. "Start the day before: the chicken marinates overnight.";
   - cookMinutes must cover the cooking steps as written.
4. **Either/or ingredient lines** ("beef or lamb mince", "chicken or vegetable stock").
   - Rewrite them so the first-named option is the one to buy, and put the alternative in brackets, e.g. `500g beef mince (or lamb mince)`. The app reads text in brackets as a note.
   - If every other ingredient in the recipe is meat- and fish-free and one option is meat-free, name the meat-free option first, so the recipe counts as vegetarian. Example: `1L vegetable stock (or chicken stock)`.
   - Leave lines like "salt and pepper" alone.
5. **Quantities that don't fit the serving count**, e.g. 2kg of pasta for 2 people, or 1 tsp of salt for 10 people. Fix only clear errors.
6. **Steps that are unclear, out of order, or contradict the list**, e.g. using "half the garlic" when the list gives no amount. Fix with the smallest change that makes it work.
7. **Ingredients in the wrong group**, e.g. an egg wash under "Sauce". Move them.
8. **Difficulty that's plainly wrong** for what the recipe asks of a home cook.

## Rules
- **Minimal and precise.** Don't rewrite style, add flourishes or "improve" recipes that work. If a recipe is fine, say `"verdict": "ready"` with no fix.
- **Australian English** (colour, flavour, coriander, capsicum, zucchini, eggplant). Metric only. An Australian tablespoon is 20 ml.
- **Never touch titles, cuisines, tags or photos.** If something there is wrong, say so in "lachlan".
- **"from" strings must be copied character for character** from the recipe's current text (curly quotes, degree signs, en dashes included). Each must appear in exactly ONE ingredient line (for ingredient fixes) or ONE step (for step fixes) of that recipe. Keep "from" short but unique. Replacements apply in order, so a later one sees the result of an earlier one.
- **New ingredient lines** must read like the others: quantity, unit, name, then a comma and the prep, e.g. `20g butter, softened`.
- **When a fix needs the cook's judgement** (a real kitchen test, a missing sub-recipe, a doubtful method), use `"verdict": "needs-lachlan"` and write the question in `lachlan`. Still include any safe fixes.

## Score every recipe (whole numbers, 1–5)
- `weeknight`: how practical on a Tuesday after work (5 = under 40 minutes, everyday ingredients, little washing up).
- `appeal`: how much an Australian home cook would want to make it (5 = a dish people crave and come back to).
- `confidence`: how sure you are it works as written, after your fixes (5 = would work first time for a decent home cook).

These pick about 80 recipes for the owner to cook-test before launch, so be honest and use the whole range.

## Output
Write `/tmp/claude-0/review/chunk-N.result.json`: one object keyed by recipe id, covering EVERY id in your batch.

```json
{
  "gnocchi": {
    "verdict": "fixed",
    "weeknight": 2, "appeal": 4, "confidence": 4,
    "summary": "Cook time said 30 min but the potatoes bake for 50.",
    "lachlan": null,
    "fix": {
      "times": { "cookMinutes": 70 },
      "difficulty": "medium",
      "servings": 4,
      "ingredients": [ { "from": "exact text in one line", "to": "replacement" } ],
      "addIngredients": [ { "group": "Group title or null for the first group", "line": "20g butter, softened" } ],
      "moveIngredients": [ { "line": "exact text in one line", "toGroup": "Group title" } ],
      "steps": [ { "from": "exact text in one step", "to": "replacement" } ],
      "addSteps": [ { "after": "exact text in the step it follows, or empty string to add at the start", "text": "New step." } ],
      "addNotes": [ "Note text." ]
    }
  }
}
```

Leave out fix keys you don't use. Use verdict "ready" (no fix), "fixed" (fix given) or "needs-lachlan".

When done, run `python3 /tmp/claude-0/review/check_result.py /tmp/claude-0/review/chunk-N.result.json` and fix every problem it reports until it prints OK.

Your final message: the OK line, how many recipes are ready / fixed / needs-lachlan, and the 3 most important things you found. Nothing else.
