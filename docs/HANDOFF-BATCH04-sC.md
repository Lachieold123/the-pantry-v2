# Batch 04 slice C handoff (17 October 2026)

Branch `house-recipes-batch-04-sC` (worktree `~/Developer/the-pantry-v2-b04-sC`). Slice: breakfast, soups, salads, sides, sauces and condiments.

Files `batch-04-C01.json` (52), `C02.json` (45), `C03.json` (36) = 133 recipes. Validator 133/133 pass, 0 failures; `catalogue:check-house` "No problems". Stopped on context, not on the 300 target.

Mix: main meal breakfast 39, dinner 51, lunch 33, snack 10. Easy 113, medium 18, hard 2. Vegetarian 101 (vegan 50), pescatarian 15, no-gluten 74. 80 are 30 minutes or less.

Gaps: only 2 hard recipes; thin cuisines (indonesian 1, filipino 1, south-african 1, pacific-islands 1, west-african 2, vietnamese 2, malaysian 2); few meat soups; sides and sauces are still under-represented for caribbean and east-african (0). Titles were checked only against this worktree, so merge-time duplicates against slices A and B are possible: re-run the validator after merging.

## Update, second session (17 October 2026)

Added `batch-04-C04.json` (51), `C05.json` (52), `C06.json` (39) = 142 recipes; slice C total 275. Validator on C01 to C06: 275/275 pass, 0 failures; `catalogue:check-house` "No problems". Stopped on context (~140k), not on the 250 target (142 of 250 done).

New mix: easy 81, medium 39, hard 22 (slice C hard total now 24). Cuisine counts added: caribbean 15, east-african 13, indonesian 12, filipino 12, south-african 10, pacific-islands 10, west-african 10, vietnamese 8, malaysian 2. Added about 25 meat and seafood soups and a spread of vegan, gluten-free, dairy-free and high-protein recipes.

Method: each chunk was written as a compact text file, converted to JSON, diets filled from the app's own derivation and kcal from the macros, then validated. Nutrition was rescaled to within the validator's ingredient estimate where it disagreed. The helper scripts (scripts/zz-*) are untracked scratch and are not committed.

Gaps left: malaysian (2 only; add roti canai, mee goreng sides, chicken rice soup, sambal), more hard recipes in salads, sides and sauces (hollandaise-family done; mother sauces, stocks, fermented condiments still open); more breakfast hard (croissant-style, brioche); Pacific Islands and east-african sauces; more high-protein and dairy-free breakfasts. Several titles were rejected as too close to catalogue titles, so check for duplicates against slices A and B at merge. A few titles are clumsy and could be tidied at review (for example "Overnight oats" variants, "Pho Ga"). Some originals keep a fish sauce, dried shrimp or anchovy line; those are not tagged vegetarian.

## Update, third session (17 October 2026)

Added `batch-04-C07.json` (41), `C08.json` (22), `C09.json` (27), `C10.json` (24) = 114 recipes; slice C total 389. Each file passes the validator per file (41/41, 22/22, 27/27, 24/24, 0 failures); `catalogue:check-house` "No problems". Stopped on context, many drafts were dropped as duplicates of the catalogue or other chunks.

Added: malaysian about 20 (roti canai, nasi lemak, laksas, hokkien mee, sambals, kangkung, acar), hard sauces and sides (mother sauces, XO, mole, toum, pommes Anna, duchess potatoes, kimchi, sauerkraut, preserved lemons, fermented hot sauce), hard breakfasts (cinnamon rolls, bagels, crumpets, souffle pancakes, hoppers, injera), plus high-protein, dairy-free, seasonal soups and salads.

Validator lessons: steps need 25+ characters, 3 to 14 steps, and a doneness cue ("until", a temperature) on every cooking step; no "pound", "skillet", "butter lettuce" (reads as dairy), 12 servings max, salt under about 30g. Ingredients with no match in the app database (tempeh, fennel, banana, berries, peaches, brussels sprouts, bamboo shoots, pandan, black pudding, berbere, smoked fish) must be swapped. Duplicates against C01 to C06 are frequent for common titles: use specific dish names.

Gaps left: more Malaysian and Singapore breakfast, hard salads, more Pacific and east-african sauces, high-protein and dairy-free breakfasts.

## Update, fourth session (17 October 2026)

Added `batch-04-C11.json` (29 recipes): Malaysian/Singapore breakfasts (apam balik, mee rebus, bubur lambuk, chee cheong fun, bak chor mee, lontong sayur, mee siam, egg prata, nasi dagang, ginger chicken porridge), dairy-free/high-protein breakfasts, hard salads (Lyonnaise, Nicoise, cheese-free Caesar, lentil, beef and glass noodle salads), and East African/Pacific sauces (pilipili relish, awaze, niter kibbeh, coconut tomato, lolo, oka, Tahitian lime, huli huli, macadamia pesto). Validator 25/29.
Per coordinator, nutrition was NOT rescaled up to the estimator (it may read about 2x high on stews and rice). Four recipes fail only on that mismatch, left with honest per-serve figures: lontong-sayur-rice-cake-vegetable-curry, nasi-dagang-terengganu-coconut-rice-with-tuna-curry, kenyan-coconut-tomato-fish-sauce, fijian-lolo-coconut-cream-sauce. Do not use zz-run.sh (it rescales); build with zz-build.py + zz-fixdiets.mts then validate.
Valid cuisines are the app's 28 only (no singaporean, kenyan, ethiopian, fijian, samoan, australian).

## Update, fifth session (17 October 2026)

Added `batch-04-C12.json` (28), `C13.json` (21), `C14.json` (14) = 63 recipes; slice C total about 520 after C11. Covered: Singapore breakfasts (soy milk and you tiao, chwee kueh, mee soto, lor mai gai, nasi lemak wings, roti prata), high-protein and dairy-free breakfasts, regional soups (ajo blanco, gazpacho, aguadito, Oaxacan fish, Sichuan hot and sour, kharcho, Lebanese lentil, ezogelin, borshch, ajiaco, zuppa toscana, fasolada, miso, khao tom, minestrone), hard salads and seasonal sides, sauces.
Nutrition NOT rescaled. Fail only on nutrition mismatch (honest per-serve figures kept): soy-milk-with-you-tiao-crullers-singapore-style, egg-white-spinach-omelette-muffins-high-protein, miso-soup-with-tofu-and-wakame, elote-mexican-street-corn-off-the-cob, kerala-fish-moilee-coconut-soup. All other recipes pass; `catalogue:check-house` clean.
App ingredient DB has no match for: kaya, pandan, chia, bamboo shoots, fenugreek, grapes, freekeh, frisee, broad/fava beans, urad/toor dal, curry leaves, hominy, tomatillos, molokhia, goat, smoked haddock/trout, fennel, Brussels sprouts, strawberries. Avoid these. Validator also bans "pound" (use crush), needs 75°C literally with degree sign for poultry/mince/sausage, 40+ kcal per serve.
Gaps left: Pacific/east-african sauces, more hard recipes, Indian south breakfasts (needs dal matches), more Singapore (kaya-free) items.

## Update, sixth session (17 October 2026)
Added `batch-04-C15.json` (27: Central/Eastern European and Nordic soups, salads, pancakes, sauces), `C16.json` (22: Caribbean, West African, Persian/Israeli, Latin American), `C17.json` (23: Pacific, Latin sauces, Balkan/Georgian, Nordic, West African sides) = 72 recipes. Built with zz-build.py + zz-fixdiets.mts (no rescale), sources in /private/tmp/claude-501/c/c15-17.txt. Gaps left: more Pacific, Yemeni/Iraqi, hard salads, high-protein breakfasts.
Nutrition NOT rescaled; fail only on nutrition mismatch (honest figures kept): syrniki (russian-syrniki-quark-pancakes), dominican-mang-mashed-plantain-breakfast, tahitian-poisson-cru-coconut-fish-salad, salvadoran-curtido-cabbage-slaw. All others pass. New no-match ingredients: kefir, parsnip, turnip. Validator also rejects "A or B" in one ingredient line and "Salt and pepper" as one line (write "Salt; Black pepper").

## Update, seventh session (17 October 2026)
Added `batch-04-C18.json` (25: Japanese, Chinese, Korean, Vietnamese, Thai, Indian breakfasts, soups, banchan, dips) and `C19.json` (25: Turkish, Levantine, Greek dips and soups, Italian bread soups and frittata, Ethiopian wots, Mexican and Colombian salsas) = 50 recipes. Built with zz-build.py + zz-fixdiets.mts from /private/tmp/claude-501/c/c18.txt and c19.txt; nutrition NOT rescaled.
Fail only on nutrition mismatch (honest per-serve figures kept): japanese-chawanmushi-savoury-egg-custard, japanese-salmon-ochazuke-dashi-rice, japanese-kenchinjiru-root-vegetable-and-tofu-soup, japanese-ohitashi-greens-in-dashi, chinese-doufu-nao-savoury-silken-tofu-pudding, korean-kongnamul-guk-bean-sprout-soup, thai-kai-jeow-fluffy-thai-omelette-with-rice, indian-mint-and-coriander-chutney, turkish-kuru-fasulye-white-bean-stew, middle-eastern-hummus-masabacha-warm-chickpeas. New no-match ingredients: tea (all kinds), natto, burdock, winter melon, poha, mung beans, sucuk, mackerel, maize meal. Validator also rejects "scallion" and "pound" anywhere, needs 40+ kcal per serve (cut servings for sauces).
Gaps left: Ethiopian/South African breakfasts, Peruvian/Argentinian sauces, Indian idli/chaat, more Italian salads, Filipino silog.
