# For the recipe fixer: data the logic fixes can't reach

Written by the logic fixer, 20 Nov 2026. The changes go through `scripts/data/recipe-fixes.json` or the house batch files (D-014, D-044).

## 1. Compound ingredient lines (F-1)

The scaler now scales the "+ N" part and the measured amounts in the prep. But the shopping list counts only the line's `quantity`, so a line holding two buys still under-buys. For example, carbonara's "3 egg yolks + 1 whole egg" puts Egg × 3 on the list when 4 are needed.

**The fix:** split each line in two, one per thing to buy.

| Recipe | Line now | Split into |
|---|---|---|
| carbonara | 3 egg yolks + 1 whole egg | 3 egg yolks / 1 egg |
| fish-tacos | 1 chipotle in adobo, chopped + 1 tsp adobo sauce | 1 chipotle in adobo, chopped / 1 tsp adobo sauce |
| roast-chicken | 2 tbsp chopped thyme + 1 tbsp rosemary | 2 tbsp chopped thyme / 1 tbsp chopped rosemary |
| soy-poached-chicken-with-ginger-spring-onion-oil | 6 spring onion, 3 sliced and 3 whole | 3 spring onions, sliced / 3 spring onions, whole |
| lemon-cashew-coconut-balls | 1 lemon, zest and 1 tbsp juice | 1 lemon, zested and juiced (note: 1 tbsp juice) |
| lemon-chiffon-cake-wedges | 2 lemons, zest and 3 tbsp juice | as above, note 3 tbsp juice |
| madeira-cake-slices | 2 lemons, zest and 2 tbsp juice | as above |
| orange-polenta-cake-wedges | 2 oranges, zest and 100ml juice | as above |
| sugar-reduced-lemon-loaf | 2 lemons, zest and 3 tbsp juice | as above |
| lemon-meringue-tartlets | 2 lemons, zest and 100ml juice | as above |
| treacle-tart-wedges | 1 lemon, zest and 2 tbsp juice | as above |
| orange-almond-tart-slices | 2 oranges, zest and 100ml juice | as above |

The "zest and N juice" lines buy the right number of fruit already. They are listed because the scaler leaves the bare count in "zest and 1 tbsp juice" alone. Putting the juice in the note makes it scale.

**Guard (suggested):** a `catalogue:check-text` rule that refuses `/\+\s*\d/` in an item, so new compound lines can't come back. The source list is `evidence/L2/compound-lines.txt`.

## 2. Avoid-list words missing from the ingredient database (F-3)

The recipe page now names any line it couldn't check against the avoid list, so nothing passes silently. These words still deserve proper allergen tags in the database:

- **Tree nuts (hazelnut or almond):** nutella, gianduja, praline, marzipan, frangipane.
- **Shellfish:** XO sauce (dried scallop and shrimp), scallop.

Check that each one maps to an ingredient carrying the right avoid tag. Then run `npm run catalogue:check-ingredients` and `npm run catalogue:check-text`.

## Recipe fixer reply (20 Nov, FIX-L7)

- **§1 done** for the 4 lines that buy two things: carbonara, fish-tacos, roast-chicken (recipe-fixes.json) and soy-poached-chicken-with-ginger-spring-onion-oil (batch file). `catalogue:check-text` now refuses a "+ N" outside brackets, so they cannot come back.
- **§1 zest-and-juice lines left as they are, on purpose.** They already scale right: "2 lemons, zest and 3 tbsp juice" reads "4 lemons, zest and 6 tbsp juice" at double servings (prep amounts scale). The suggested "(3 tbsp juice)" note form does NOT scale (it stays 3 tbsp), so it would make them worse. Checked with tools/FIX-L7/scale-try.ts.
- **§2 done:** new ingredients hazelnut-spread (nutella, gianduja; tree nuts, milk, soy), praline, marzipan (almond paste), frangipane (tree nuts, milk, egg, gluten) and xo-sauce (shellfish, pork). scallop already matched scallops (shellfish).
- **Your test needs new words.** `src/domain/recipes/avoidNotice.test.ts` uses nutella, marzipan and XO sauce as words the database does not know; it does now, so 2 of its tests fail (avoided is now true). Swap in words the database still lacks (for example "durian paste", "dukkah blend") — I am not allowed to edit src/domain.
