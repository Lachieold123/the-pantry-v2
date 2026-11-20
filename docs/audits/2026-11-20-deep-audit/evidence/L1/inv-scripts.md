| file | lines | first comment |
|---|---|---|
| scripts/apply-nutrition-13.mts | 226 | Per-serve nutrition for the 13 batch-03 recipes the line estimator could not do |
| scripts/batch-03.mts | 499 | Batch 03 (12 Oct 2026): turns the recipes the old Supabase generator |
| scripts/check-house-recipes.mts | 51 | Checks the new house recipe batches (D-044) without needing the old app, so |
| scripts/check-ingredient-coverage.mts | 154 | Checks how well the ingredient database covers real recipe lines. |
| scripts/check-recipe-text.mts | 34 | Reads every recipe in the built catalogue and checks its own words against |
| scripts/convert-old-recipes.mts | 231 | One-off conversion of the old app's free-text catalogue into v2's |
| scripts/dedupe-batch04.mts | 274 | Finds duplicate recipes in the batch-04 files (batch-04*.json), across files and |
| scripts/estimate-nutrition-from-lines.mts | 212 | Gives batch-01 to 03 house recipes (which had no nutrition) a per-serve nutrition |
| scripts/fix-nutrition-from-lines.mts | 143 | Rebuilds stated nutrition from the ingredient lines for batch-04 recipes that fail the |
| scripts/home-engine-sim.mts | 152 | The Home engine simulation. Takes the real published recipes, cooks and |
| scripts/house-recipes.mts | 223 | New house recipes written for v2 (D-044), kept apart from the old-app |
| scripts/merge-batch04.sh | 92 | Re-does the batch-04 merge when the slice branches gain commits. Run it from the |
| scripts/nutrition-estimate.mts | 372 | Rough per-serve energy estimate for house recipes, from the ingredient lines. |
| scripts/nutrition-estimate.test.mts | 149 |  |
| scripts/owner-upload-feed.mts | 369 |  |
| scripts/pantry-match-report.mts | 102 | "I put 72 things in my pantry and it says I can cook 4": before and after |
| scripts/published-snapshot.mts | 72 | Reads the published recipes, cooks and follows from Supabase with the app's |
| scripts/rebuild-house-batches.mts | 51 | Rebuilds the house-batch part of the catalogue without the old app (batch 03). |
| scripts/recipe-fix.mts | 136 | Applies one recipe's hand fixes from scripts/data/recipe-fixes.json to its |
| scripts/recipe-photos.mts | 102 | Writes the recipe photo maps from the catalogue (K-30). Metro bundles every |
| scripts/recipe-text-checks.mts | 90 | Checks a recipe's own words against its diet tags (from the 12 Oct pilot's |
| scripts/renormalise-nutrition.mts | 90 | Checks stated per-serve nutrition in house recipe files against the ingredient |
| scripts/run-maestro.command | 224 | Runs the whole Maestro suite (.maestro/) against The Pantry in Expo Go on the |
| scripts/validate-house-recipes.mts | 615 | The single gate for new house recipe batches (batch-04 on). It runs the |
| scripts/verify-feed-payload.mts | 247 |  |
| scripts/verify-feed-payload.test.mts | 92 |  |
| scripts/write-photo-sources.mts | 14 | Writes src/data/catalogue/photoSources.ts (each house photo's Wikimedia |
