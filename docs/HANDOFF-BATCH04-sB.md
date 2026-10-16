# Batch 04 slice B handoff

391 recipes in batch-04-B01..B08.json (branch house-recipes-batch-04-sB, worktree ~/Developer/the-pantry-v2-b04-sB). Validator 391/391 pass (0 failures, warnings only: cup measures and a few time notes); check-house No problems. The 300 target is lifted (owner: thousands, no cap, Telegram 1495/1498/1503). B07 (+53) and B08 (+39) added in the latest session.

Added this session: B04 (50: hard dishes, Pacific/East/South African dinners, vegan dinners, gluten-free baking, Chinese/Japanese breakfasts), B05 (52: baking, desserts, dinners), B06 (24: lunches, dinners, breakfasts).

Cuisine: chinese 42, japanese 39, indian 37, korean 27, thai 27, vietnamese 24, filipino 19, indonesian 18, pacific-islands 18, malaysian 17, south-african 16, east-african 15

Meal type: dinner 110, snack 103, lunch 50, breakfast 36

Diets: no-dairy 214, vegetarian 180, no-gluten 103, vegan 70, pescatarian 46

Difficulty: easy 151, medium 109, hard 39

Gaps left: Sri Lankan has no cuisine tag (filed under indian); lunches and breakfasts are lightest (Indian, Filipino, Malaysian, African breakfasts); more vegan lunches and gluten-free dinners; East and South African, Filipino, Malaysian are the thinnest cuisines. Gelatine is not tagged non-vegetarian by the app, so avoid it (use cornflour sets).

Builder notes: ingredient lines must match ingredients.json (curry leaf is "10g curry leaf", clove is "ground cloves", no dried fish, tempeh, tea, banana); the validator rejects US terms (scallion, skillet), "pound" as a verb, servings above 12, and titles near catalogue classics (check Char Kway Teow, Pad See Ew, Fried Rice, Bredie). Its kcal estimator runs high for coconut milk, dashi, wrapper and cooked rice lines, so state "cup of dry rice" and keep nutrition within 0.55 to 1.8 of its estimate. Drafting helper (build.py, DSL text to JSON with auto diets) lived in the session scratchpad and is not committed.

## Latest session (B07, B08)
Totals: 391. Cuisine: indian 51, chinese 49, japanese 46, thai 32, korean 31, filipino 30, vietnamese 29, east-african 27, south-african 27, malaysian 24, pacific-islands 23, indonesian 22. Meals: dinner 147, snack 103, lunch 80, breakfast 61. Easy 206, medium 143, hard 42.
Drafting tools are now committed in docs/tools-sB (build.py DSL text to JSON with kcal from macros; fixdiets.mts fills diets from the app; fix1.py adds "until" cues; run.sh NN builds, fixes diets, validates). They expect the scratchpad paths edited at the top of run.sh.
Validator lessons: every cooking step needs "until" or a temperature (say "until tender and fluffy" after rice); steps under about 25 characters fail; titles near existing ones fail (check "Mapo Tofu", "Sosatie", "Cape Malay", "Pap with Tomato"); raw-looking nutrition must sit 0.55 to 1.8 of the estimate (coconut milk and oil lines run high). B08 back half is terse and could be enriched.
Gaps left: breakfasts still lightest (61), more East/South African, Malaysian, Indonesian and Pacific lunches and gluten-free dinners, regional depth (Sichuan, Kerala, Punjabi, Okinawan, Hokkaido have one or two each), and hard-difficulty dishes.
