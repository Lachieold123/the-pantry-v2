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
