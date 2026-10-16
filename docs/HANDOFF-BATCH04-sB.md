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

## Session (B08 polish, B09, B10)
B08 back half (19-38) rewritten to B01 detail. B09 (25 breakfasts: Malaysian, Indonesian, East/South African, Pacific, Japanese, Chinese, Korean, Thai, Vietnamese, Indian) and B10 (22: East/South African, Malaysian, Indonesian, Pacific lunches/dinners, gluten-free dinners, hard dishes). Total now 438.
Nutrition left honest per coordinator note (not scaled to the validator). B09 fails only on the nutrition mismatch for: kolak-pumpkin-coconut-breakfast-pots, mandazi-spiced-coconut-breakfast-fingers, korean-egg-and-kimchi-breakfast-rice-cakes. All else passes.
Lesson: write full-length steps first time (about 300+ chars of steps per recipe); terse drafts needed a rewrite. Gaps left: Pacific and Indonesian lunches, more hard dishes, vegan gluten-free dinners.

## Session (B11, B12)
B11 (15) and B12 (14): regional dinners and lunches (Chengdu, Cantonese, Hakka, Okinawan, Kyushu, Jeju-free Korean, Isaan, Hue, Padang, Nyonya, Visayan, Kerala, Goan, Bengali, Samoan, Ethiopian, Cape Malay, Fijian, Swahili, Sri Lankan, Lombok, Rajasthani, Hawaiian). Total now 467. check-house clean.
Nutrition left honest (not scaled). Fails only on nutrition mismatch (coconut milk lines overestimated by the validator): fijian-coconut-curry-fish-with-pumpkin, samaki-wa-kupaka-swahili-grilled-fish-in-coconut-tamarind.
Validator lessons: summary max 120 chars; every meat/poultry/egg Food safety note needs a stated temperature in C (use 75°C, 63°C steak/fish); "tuna steak" and similar "steak" lines break the pescatarian tag; "whole clove" has no match (use "1/2 tsp ground cloves"); title near batch-03 "Twice-Cooked Pork" failed. docs/tools-sB/fs.py adds temperatures and trims summaries.
Gaps left: breakfasts, vegan GF dinners, East/South African, Pacific lunches.

## Session (B13)
B13 (41 mains: Kerala, Chettinad, Korean jjim, Japanese kakuni/hambagu, Thai, Vietnamese kho, Filipino, Indonesian, Malaysian, Ethiopian/Ugandan/Kenyan, Tongan, Hawaiian, Chinese braises and stir-fries). Total now 508.
Fails only on nutrition (honest, not scaled; validator overcounts oil and coconut milk): lechon-kawali-crispy-pork-belly-with-vinegar-dip, gulai-kambing-sumatran-lamb-curry, salt-and-pepper-squid-cantonese-style-with-rice.
Lessons: no ingredient match for berbere, mitmita, mackerel (use chilli powder plus paprika, white fish fillet, salmon); "drumsticks and thighs" needs one item; "soaked in milk" hides the milk from the diet tag; "pound" the verb fails. Titles near B03/B04/B12 failed (moo ping, kua kling, pla neung manao, kuku paka), so renamed.

## Session (B14, B15)
B14 (31) and B15 (34): regional mains (Sichuan/Hunan/Teochew, Japanese, Korean, Thai, Vietnamese, Indonesian, Malaysian, Filipino, Indian/Nepali/Bengali/Sri Lankan, Ethiopian/Kenyan, South African, Pacific). Total now 573. Built with docs/tools-sB (copy to scratchpad, edit run.sh path).
Nutrition left honest, fails only there. B14: laksa-lemak-tofu-puff-curry-noodles, rendang-cendawan-mushroom-curry, khao-pad-sapparot-thai-pineapple-fried-rice, curry-mee-mamak-style-noodles, wali-wa-nazi-coconut-rice-with-pigeon-peas. B15: gaeng-keow-wan-gai-thai-green-chicken-curry, khao-soi-gai-chiang-mai-chicken-curry-noodles, ca-ri-ga-vietnamese-chicken-curry, kari-kapitan-nyonya-chicken-curry, lumpiang-shanghai-filipino-spring-roll-plates, goan-xitt-kodi-fish-curry-with-rice, sri-lankan-chickpea-and-bean-curry-with-roasted-curry-powder, chingri-malaikari-bengali-coconut-prawn-curry, rourou-fijian-taro-leaf-coconut-curry, poisson-cru-tahitian-fish-in-coconut-and-lime.
Lessons: no match for tempeh, bamboo shoots, jackfruit, yakisoba, maize meal, pickled plum, shirataki, yellow curry paste, skewers, liquid smoke; "king oyster" trips shellfish; "Doro Wat" and "Karahi Chicken" already exist. Gaps: vegan GF mains, breakfasts, quick weeknight Pacific/South African.

## Session (B16, B17)
B16 (30) and B17 (24): regional mains (Sichuan/Beijing/Hakka, Japanese don bowls, Korean, Malaysian, Indonesian, Thai, Vietnamese, Filipino, Indian/Pakistani/Afghan, Ethiopian, Senegalese, Kenyan, Samoan). Total now 627.
Nutrition left honest (not scaled), fails only there: chole-bhature-spiced-chickpeas-with-puffed-bread, kothu-roti-sri-lankan-chopped-roti (B16); kimchi-bokkeumbap-pork-belly-fried-rice, wali-wa-maharage-kenyan-beans-in-coconut-with-rice (B17).
Lessons: no match for mung beans, tempeh, poppy seeds, sweet bean sauce, yellow bean sauce, choy sum; "or" in an ingredient line fails; fried rice and noodle recipes need "refrigerate within 1 hour"; my quick title check misses long B-titles, so compare the first two words against B11-B15 (Semur Daging, Bo Kho, Pininyahang Manok, Goan Xacuti, Ojingeo Bokkeum, Ayam Penyet, Misir Wot, Oyakodon already exist).

## Session (B18-B21)
B18 (24), B19 (24), B20 (25), B21 (21): dumplings and buns, Nepali/Afghan/Pakistani/Bengali/Gujarati/Kerala mains, Japanese/Korean/Taiwanese/Chinese, Thai/Vietnamese/Indonesian/Malaysian/Filipino, West/East/South African, Pacific. Total now 721. Each chunk committed.
Nutrition left honest (not scaled), fails only there: momo-nepali-steamed-chicken-dumplings-with-tomato-dip, veg-momo-nepali-cabbage-and-paneer-dumplings, manti-afghan-beef-dumplings-with-garlic-yoghurt, mantu-afghan-pumpkin-dumplings-with-lentil-sauce, jiaozi-chive-and-egg-dumplings-with-black-vinegar-dip, kimchi-mandu-korean-pork-dumplings, fish-moilee-kerala-mild-coconut-fish-curry, ginataang-hipon-filipino-prawns-in-coconut-milk (B18); mappas-kerala-chicken-in-gentle-coconut-gravy (B19); tempura-prawn-and-vegetable-plate-with-rice, cha-gio-vietnamese-pork-and-prawn-spring-rolls (B20); beef-sambusa-somali-spiced-pastry-pockets-with-lime-yoghurt, puaka-tunu-tongan-roast-pork-with-coconut-sweet-potato (B21).
Lessons: "Cook the rice by your usual method" and "Serve with the rice" fail (use "until tender and fluffy", longer final steps); no match for taro, grated coconut (use desiccated), "vermicelli noodles" (use rice noodles); "scallion" is a US term; "8 lamb cutlets" undercounts (use grams); raw prawn rolls need a 63°C cue; East Asian titles are saturated (check keywords like katsu, mandu, jjim first). Gaps: breakfasts, vegan GF mains.

## Session (B22-B26)
B22 (26), B23 (21), B24 (22), B25 (21), B26 (18): Japanese/Korean/Taiwanese/Chinese hot pots, claypots and rice bowls, Thai/Lao/Burmese/Vietnamese/Indonesian/Malaysian/Filipino, Indian/Pakistani/Afghan/Uzbek/Tibetan/Nepali pressure-cooker dals and festive dishes, West/East/South African, Samoan, vegan tofu and egg mains. Total now 829. Each chunk committed; tools in docs/tools-sB (build.py, run.sh, fixdiets.mts) plus a dup checker (first two words of title vs all batches and catalogue, run BEFORE writing).
Nutrition left honest (not scaled), fails only there: yudofu-kyoto-simmered-tofu-pot (B22); nasi-goreng-kampung-anchovy-fried-rice (B23); shapaley-tibetan-beef-pasties (B24); agedashi-tofu-donburi-with-mushrooms, kimchi-dubu-jjigae-vegan-style-tofu-stew (B25); yangzhou-chao-fan-egg-and-prawn-fried-rice (B26).
Lessons: no match for oysters, curry leaves, nigella, jujubes, sambar/bisi bele bath/bak kut teh mixes (use curry powder, black pepper); "Pound the" in a step trips non-metric (use Crush); dried kidney beans need "boil hard for 10 minutes"; every pork cut needs "at least 70°C", beef/lamb "at least 71°C"; boiling steps need an "until" cue. Already taken: Efo Riro, Shiro Wat, Githeri, Bunny Chow, Gyudon, Katsudon, Bulgogi, Jjimdak, Haemul Pajeon, Mapo Tofu, Gong Bao Ji Ding, Dan Dan Mian, Awaze Tibs, Okonomiyaki, Egg Foo Young, Jjajangmyeon, Hyderabadi biryani, Ambul Thiyal, Shorshe Maach.

## Session (B27-B29)
B27 (25), B28 (24), B29 (14): pan-fried and deep-fried mains, steamed fish, kebabs and tikkas, biryanis (Kolkata, Thalassery, Kacchi, Ambur), Chinese/Japanese/Korean/Thai/Lao/Vietnamese/Indonesian/Malaysian/Filipino/Indian/Pacific/Ghanaian. Total now 892. Each chunk committed.
Nutrition left honest (not scaled), fails only there: tabaka-uzbek-flattened-chicken-with-garlic, tandoori-gobi-roasted-spiced-cauliflower (both B28).
Lessons: no match for mackerel, trout, sardine, sea bream, pork hock, banana leaf, cassava, maize meal (use barramundi, snapper, kingfish); "X or Y" fails; frying in 1 cup oil trips the kcal check (shallow-fry with 3-4 tbsp); mince needs 75°C; last step "Serve with the rice." too short (merge). Saturated, skip: Karaage, Dakgalbi, Samgyeopsal, Lok Lak, Amok, Bun Cha, Seekh, Sekuwa, Suya, Mishkaki, Kitfo, Yassa, Thieboudienne, Huli Huli, Loco Moco, Kabuli, Plov, Chapli, Hong Shao Rou, Lu Rou Fan.

## Session (B30-B32) NEW FOCUS: SNACKS
Slice B mains are saturated, so this worktree now owns SNACKS (mealTypes ["snack"]) across all cuisines: street bites, baked goods, slices, dips, lunchbox and high-protein. No "dessert" meal type exists, so sweet items use snack. B30 (18), B31 (20), B32 (15) written and committed; total now 966 (892 + 53 snacks + earlier files unchanged; recount with the validator).
Nutrition left honest (not scaled), fails only there: chilli-lime-corn-ribs, baked-tequenos, cheddar-and-mustard-cheese-twists, smoky-paprika-almonds (B31); tomato-basil-bruschetta-bites (B32). Validator underweights corn cobs, pastry sheets, baguette; almonds it overweights.
Lessons: no match for bananas, dates, biscuits, urad dal, mixed spice, lentils, tuna, cardamom, matcha, glutinous rice flour; parmesan needs "vegetarian hard cheese"; a prove/set step makes the time check fail unless prep+cook covers it; "Puff-Puff", Anzac Biscuits, Peanut Butter Cookies, Coconut Macaroons, Chicken Quesadilla, Zucchini Slice, Pumpkin Scones, curry puffs, empanadas, falafel, tzatziki, guacamole already exist. Tools: scratchpad sn/ (copies of docs/tools-sB with run.sh and dup.mjs).

## Session (B33-B35) SNACKS continued
B33 (25 sweet bakes), B34 (22 mithai, Middle Eastern, Latin American, Japanese, Filipino and Pacific sweets), B35 (26 savoury bakes, healthy and kids' party snacks) written and committed; total about 1039 (966 + 73). Servings cap is 12, so slices are 8-10 servings of 2 pieces. Tools: scratchpad build.py, fixdiets.mts, run.sh and dup.mjs (two-word title key over all worktrees).
Nutrition left honest (not scaled), fails only there: brigadeiros-chocolate-truffles, maja-blanca-coconut-corn-pudding (B34); chickpea-and-mushroom-party-rolls, pork-and-apple-sausage-rolls, ham-and-cheese-pinwheels (B35). Validator underweights puff pastry, condensed milk (maps to milk) and tinned coconut milk.
Lessons: no match for berries (use "frozen mixed berries"), raspberry/strawberry jam (use apricot jam), poppy seeds, milk powder, Vegemite, glutinous rice flour; dropped as existing: churro bites, Pani Popo, Haupia, Caramel Slice, Hot Cross Buns, Biko, Besan Ladoo, Sausage Rolls. Pork mince needs 75°C. Next: Indian/Pakistani sweets (jalebi, halwa), kakanin, fritters, popcorn/nut mixes, frozen snacks, dips.

## Session (B36-B38) SNACKS: breads, puddings, frozen, crackers, spreads, GF/vegan, Aussie/lunchbox
B36 (25), B37 (25), B38 (25) written and committed (75 new, about 1114 total). Nutrition left honest (not scaled), fails only there: vegetarian-coconut-pudding-cups-with-mango, halo-halo-style-fruit-ice-cups, pineapple-coconut-ice-blocks (B36); vanilla-slice-squares, bacon-and-cheese-pastry-cups (B38). Validator underweights puff pastry, condensed/evaporated milk and tinned coconut milk.
Lessons: no match for bananas, dates, agar, sago/tapioca pearls, chia, flax, aquafaba, xanthan, custard powder, strawberries, blueberries, coffee, passionfruit, shortcrust, marshmallow, cherries, figs, prunes, peaches, tea, malt powder (tagged gluten, wrong match; use cocoa); proving/freezing times in steps trip the time check (say "until doubled" and put the time in a note); scratchpad is shared, work in a subfolder. Saturated: Vegan Lemon Coconut balls, Socca, Apple Crumble Slice, Sweet Potato Chickpea Patties. Next: Indian/Pakistani sweets, kakanin, fritters, dips, popcorn and nut mixes.

## Session (B39-B41) SNACKS: festival sweets, tea cakes, savoury muffins, fruit desserts, pastry
B39 (24), B40 (24), B41 (19) written and committed (67 new, about 1181 total). Nutrition left honest (not scaled), fails only there: mini-apple-strudel-rolls (B41; validator underweights puff pastry).
Lessons: cuisines must be one of the app's 28 (jewish/german -> central-european, nigerian -> west-african, australian -> modern-australian, mediterranean -> greek); no match for plums, rhubarb, apricot halves, cornflakes, whole cloves (use ground), food colouring; titles near-duplicate on close wording (Potato Latkes, Potato Bhajia, Gajar Halwa, Shortbread Fingers, Cheese Twists, Apple Cinnamon Cake Wedges, Peanut Butter Oat Bars all exist). Run.sh can silently skip building; run build.py, fixdiets.mts and the validator by hand.
Next: Tang yuan/mochi-style sweets, kakanin, more protein bars, galettes with other fruit, savoury pastry cups, more regional baked "fried" snacks.
