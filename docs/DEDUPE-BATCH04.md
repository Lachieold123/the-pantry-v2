# Batch-04 dedupe

Made by `scripts/dedupe-batch04.mts` on branch house-recipes-batch-04-merge (re-run by `scripts/merge-batch04.sh`).

- Now: 4345 unique batch-04 recipes. Dropped so far: 104. Last run 2026-10-17 10:17.
- Rules: same slug, same title, title words 80%+ alike, or same cuisine with 90%+ of 6+ linked ingredients shared and a title word in common. The near rules skip vegetarian vs non-vegetarian pairs and a short hand-checked list (NOT_DUPLICATES in the script).
- Existing means the catalogue (src/data/catalogue/recipes.json), batch-01/02, parked batch-03 and the 12 Oct pilot. Against those the batch-04 draft is always dropped.
- Inside batch-04 the more detailed version is kept (ingredient lines, steps, method length, notes, nutrition).
- Only the batch-04 draft files on this branch change. Nothing published is removed.

## Run 2026-10-17 10:17

- 4371 batch-04 recipes in 168 files; 26 duplicates (0 of existing recipes, 26 inside batch-04); 4345 unique left.
- By rule: near-ingredients 21, near-title 4, slug 1.

| Dropped (file) | Title | Kept (file) | Kept title | Rule |
| --- | --- | --- | --- | --- |
| lemon-ricotta-cake (batch-04-A01) | Lemon Ricotta Cake | baked-ricotta-frittelle-bites (batch-04-B41) | Baked Ricotta Frittelle Bites | near-ingredients 1.00 |
| coconut-jam-drops (batch-04-A03) | Coconut Jam Drops | jam-tart-bars (batch-04-B46) | Jam Tart Bars | near-ingredients 1.00 |
| gooey-cinnamon-rolls (batch-04-A03) | Gooey Cinnamon Rolls | cinnamon-sugar-scrolls-with-cream-cheese-glaze (batch-04-B47) | Cinnamon Sugar Scrolls with Cream Cheese Glaze | near-ingredients 1.00 |
| spiced-honey-lebkuchen-biscuits (batch-04-A03) | Spiced Honey Lebkuchen Biscuits | iced-lebkuchen-spiced-honey-cookies (batch-04-B39) | Iced Lebkuchen Spiced Honey Cookies | near-ingredients 0.92 |
| smoked-salmon-cream-cheese-cucumber-rolls-low-carb (batch-04-A40) | Smoked Salmon and Cream Cheese Cucumber Rolls | smoked-salmon-cucumber-rounds (batch-04-B42) | Smoked Salmon Cucumber Rounds | near-ingredients 1.00 |
| air-fryer-lamb-koftas-with-tzatziki-and-flatbread (batch-04-A41) | Air-Fryer Lamb Koftas with Tzatziki and Flatbread | nut-free-lamb-kofta-with-tzatziki-and-flatbread (batch-04-A46) | Nut-Free Lamb Kofta with Tzatziki and Flatbread | near-ingredients 0.92 |
| big-tray-baked-chicken-and-chorizo-paella-for-eight (batch-04-A42) | Big-Tray Baked Chicken and Chorizo Paella for Eight | spanish-chicken-and-chorizo-rice-bake (batch-04-A09) | Spanish Chicken and Chorizo Rice Bake | near-ingredients 0.92 |
| saucy-mushroom-and-silken-tofu-in-chilli-bean-sauce (batch-04-A49) | Saucy Mushroom and Silken Tofu in Chilli Bean Sauce | silken-tofu-and-mushrooms-in-chilli-bean-sauce (batch-04-B01) | Silken Tofu and Mushrooms in Chilli Bean Sauce | near-title 0.86 |
| lunar-new-year-whole-steamed-barramundi-with-ginger-and-spring-onion (batch-04-A51) | Lunar New Year Steamed Whole Fish with Ginger and Spring Onion | ginger-soy-steamed-white-fish-with-hot-oil (batch-04-B05) | Ginger Soy Steamed White Fish with Hot Oil | near-ingredients 0.90 |
| lunar-new-year-prawn-and-vegetable-fried-rice-for-prosperity (batch-04-A55) | Lunar New Year Prawn and Egg Fried Rice | wok-rice-with-prawns-and-soft-egg-ribbons (batch-04-B02) | Wok Rice with Prawns and Soft Egg Ribbons | near-ingredients 1.00 |
| kenyan-coconut-mandazi (batch-04-B01) | Kenyan Coconut Mandazi | mandazi (batch-04-B49) | Mandazi | near-ingredients 1.00 |
| honey-castella-sponge-loaf (batch-04-B05) | Honey Castella Sponge Loaf | castella-cubes (batch-04-B49) | Castella Cubes | near-ingredients 1.00 |
| ugandan-chapati-egg-rolls (batch-04-B08) | Ugandan Chapati Egg Rolls | ugandan-rolex-egg-and-chapati-rolls (batch-04-C50) | Ugandan Rolex Egg and Chapati Rolls | near-title 0.80 |
| sapasui-samoan-chicken-and-glass-noodle-stir-fry (batch-04-B21) | Sapasui Samoan Chicken and Glass Noodle Stir-Fry | sapasui-samoan-glass-noodle-stir-fry (batch-04-A39) | Sapasui (Samoan Glass Noodle Stir-Fry) | near-title 0.86 |
| apple-cinnamon-cake-wedges (batch-04-B33) | Apple Cinnamon Cake Wedges | apple-upside-down-cake (batch-04-B45) | Apple Upside-Down Cake | near-ingredients 1.00 |
| apricot-jam-drop-biscuits (batch-04-B33) | Apricot Jam Drop Biscuits | jam-thumbprint-christmas-cookies (batch-04-B41) | Jam Thumbprint Christmas Cookies | near-ingredients 1.00 |
| apple-oat-crumble-fingers (batch-04-B38) | Apple Oat Crumble Fingers | spiced-apple-crumble (batch-04-A03) | Spiced Apple Crumble | near-ingredients 1.00 |
| quick-pickled-jalapenos (batch-04-B43) | Quick Pickled Jalapenos | quick-pickled-jalapenos (batch-04-C33) | (same title) | slug |
| koulourakia-orange-butter-twists (batch-04-B44) | Koulourakia Orange Butter Twists | koulourakia-butter-twists (batch-04-A03) | Koulourakia Butter Twists | near-ingredients 1.00 |
| sugar-reduced-apple-oat-muffins (batch-04-B45) | Sugar-Reduced Apple Oat Muffins | greek-yoghurt-oat-muffins (batch-04-B41) | Greek Yoghurt Oat Muffins | near-ingredients 0.90 |
| basbousa (batch-04-B49) | Basbousa | basbousa-semolina-and-coconut-cake (batch-04-B34) | Basbousa Semolina and Coconut Cake | near-ingredients 0.90 |
| kachumber-salad (batch-04-C08) | Kachumber Salad | kachumber-fine-chopped-cucumber-tomato-red-onion-salad-with-roasted-cumin (batch-04-C57) | Kachumber Fine-Chopped Cucumber Tomato Red Onion Salad with Roasted Cumin | near-ingredients 1.00 |
| tabbouleh-lebanese-parsley-salad (batch-04-C13) | Tabbouleh Lebanese Parsley Salad | travel-tabbouleh-in-a-jar (batch-04-C52) | Travel Tabbouleh in a Jar | near-ingredients 1.00 |
| cumin-roast-cauliflower-on-pomegranate-tahini (batch-04-C27) | Cumin Roast Cauliflower on Pomegranate Tahini | spice-rubbed-whole-cauliflower-with-lemon-tahini-and-pomegranate (batch-04-C54) | Spice-Rubbed Whole Cauliflower with Lemon Tahini and Pomegranate | near-ingredients 0.91 |
| chermoula-herb-sauce-for-grilled-fish (batch-04-C46) | Chermoula Herb Sauce for Grilled Fish | moroccan-chermoula-herb-marinade (batch-04-C22) | Moroccan Chermoula Herb Marinade | near-ingredients 1.00 |
| kids-sweet-potato-wedges-with-yoghurt-dip (batch-04-C51) | Kids' Sweet Potato Wedges with Yoghurt Dip | sweet-potato-wedges-with-yoghurt-dip (batch-04-B32) | Sweet Potato Wedges with Yoghurt Dip | near-title 0.83 |

## Run 2026-10-17 09:44

- 3379 batch-04 recipes in 120 files; 78 duplicates (3 of existing recipes, 75 inside batch-04); 3301 unique left.
- By rule: slug 10, near-title 32, near-ingredients 36.

| Dropped (file) | Title | Kept (file) | Kept title | Rule |
| --- | --- | --- | --- | --- |
| flourless-peanut-butter-cookies (batch-04-A01) | Flourless Peanut Butter Cookies | flourless-peanut-butter-cookies (batch-04-B04) | (same title) | slug |
| orange-semolina-syrup-cake (batch-04-A01) | Orange Semolina Syrup Cake | orange-semolina-cake-with-cardamom-syrup (batch-04-B05) | Orange Semolina Cake with Cardamom Syrup | near-title 0.80 |
| tuna-and-white-bean-salad (batch-04-A01) | Tuna and White Bean Salad | tuna-and-white-bean-salad (batch-04-C07) | (same title) | slug |
| almond-cantucci (batch-04-A02) | Almond Cantucci | orange-almond-biscotti (batch-04-B32) | Orange Almond Biscotti | near-ingredients 1.00 |
| cheddar-and-chive-scones (batch-04-A02) | Cheddar and Chive Scones | cheddar-and-chive-scones (batch-04-B33) | (same title) | slug |
| chicken-gyro-pita-wraps (batch-04-A02) | Chicken Gyro Pita Wraps | greek-chicken-gyro-pitas-with-red-onion (batch-04-A30) | Greek Chicken Gyro Pitas (with Red Onion) | near-ingredients 0.90 |
| baked-eggs-with-chorizo-and-tomato (batch-04-A04) | Baked Eggs with Chorizo and Tomato | baked-eggs-in-tomato-and-chorizo-pan (batch-04-C34) | Baked Eggs in Tomato and Chorizo Pan | near-title 0.80 |
| chorizo-chicken-paella-pan (batch-04-A04) | Chorizo Chicken Paella Pan | spanish-chicken-and-chorizo-rice-bake (batch-04-A09) | Spanish Chicken and Chorizo Rice Bake | near-ingredients 0.91 |
| gratin-dauphinois (batch-04-A04) | Gratin Dauphinois | gratin-dauphinois (batch-04-C07) | (same title) | slug |
| bauernfruhstuck-farmer-s-breakfast (batch-04-A05) | Bauernfruhstuck Farmer's Breakfast | german-bauernfruhstuck-farmer-s-breakfast (batch-04-C29) | German Bauernfruhstuck Farmer's Breakfast | near-title 0.80 |
| moroccan-semolina-pancakes-with-honey-butter (batch-04-A07) | Moroccan Semolina Pancakes with Honey Butter | moroccan-baghrir-semolina-pancakes (batch-04-01) | Baghrir (Moroccan Thousand-Hole Pancakes) | near-ingredients 1.00 |
| kotopoulo-lemonato-greek-lemon-chicken-and-potato-traybake (batch-04-A16) | Kotopoulo Lemonato (Greek Lemon Chicken and Potato Traybake) | sticky-lemon-garlic-chicken-bake-greek-style (batch-04-A08) | Sticky Lemon-Garlic Chicken Bake, Greek-Style | near-ingredients 1.00 |
| kuru-fasulye-turkish-white-bean-and-tomato-stew (batch-04-A16) | Kuru Fasulye (Turkish White Bean and Tomato Stew) | turkish-kuru-fasulye-white-bean-stew (batch-04-C19) | Turkish Kuru Fasulye White Bean Stew | near-title 0.86 |
| mirza-ghasemi-persian-smoky-aubergine-and-eggs (batch-04-A16) | Mirza Ghasemi (Persian Smoky Aubergine and Eggs) | persian-mirza-ghasemi-smoky-aubergine-and-egg (batch-04-C16) | Persian Mirza Ghasemi Smoky Aubergine and Egg | near-title 1.00 |
| texas-style-oven-beef-brisket-with-peppery-rub (batch-04-A23) | Texas-Style Oven Beef Brisket with Pepper Rub | oven-barbecued-beef-brisket (batch-04-A06) | Oven-Barbecued Beef Brisket | near-ingredients 0.90 |
| yassa-poulet-senegalese-lemon-and-onion-chicken (batch-04-A25) | Yassa Poulet (Senegalese Lemon and Onion Chicken) | yassa-poulet-senegalese-lemon-onion-chicken (batch-04-B25) | Yassa Poulet Senegalese Lemon Onion Chicken | near-title 1.00 |
| aloo-paratha-spiced-potato-stuffed-flatbread (batch-04-A31) | Aloo Paratha (Spiced Potato-Stuffed Flatbread) | aloo-paratha-potato-stuffed-flatbread (batch-04-C13) | Aloo Paratha Potato Stuffed Flatbread | near-title 0.83 |
| cong-you-bing-chinese-spring-onion-pancakes (batch-04-A31) | Cong You Bing (Chinese Spring Onion Pancakes) | chinese-cong-you-bing-spring-onion-egg-pancake (batch-04-C18) | Chinese Cong You Bing Spring Onion Egg Pancake | near-title 0.88 |
| teriyaki-salmon-rice-bowl-with-edamame (batch-04-A31) | Teriyaki Salmon Rice Bowl (with Edamame) | teriyaki-salmon-rice-bowls (batch-04-B02) | Teriyaki Salmon Rice Bowls | near-title 0.80 |
| jianbing-chinese-egg-crepe-wrap (batch-04-A32) | Jianbing (Chinese Egg Crepe Wrap) | chinese-jianbing-crepe-with-egg-and-crackers (batch-04-C29) | Chinese Jianbing Crepe with Egg and Crackers | near-ingredients 0.91 |
| prawn-rice-paper-rolls-with-hoisin-peanut-sauce (batch-04-A32) | Prawn Rice Paper Rolls (with Hoisin Peanut Sauce) | prawn-rice-paper-rolls-with-peanut-dip (batch-04-B32) | Prawn Rice Paper Rolls with Peanut Dip | near-ingredients 0.91 |
| koshari-bowl-egyptian-lentil-rice-and-pasta (batch-04-A33) | Koshari Bowl (Egyptian Lentil, Rice and Pasta) | egyptian-koshari-lentil-rice-bowl (batch-04-C10) | Egyptian Koshari Lentil Rice Bowl | near-title 0.83 |
| chicken-larb-lettuce-cups (batch-04-A34) | Chicken Larb Lettuce Cups | chicken-larb-lettuce-cups (batch-04-C08) | (same title) | slug |
| spinach-and-cheese-borek-rolls (batch-04-A34) | Spinach and Cheese Borek Rolls | cheese-and-spinach-borek-rolls (batch-04-C26) | Cheese and Spinach Borek Rolls | near-title 1.00 |
| khao-man-gai-thai-chicken-rice (batch-04-A35) | Khao Man Gai (Thai Chicken Rice) | khao-man-gai-thai-chicken-rice (batch-04-B16) | Khao Man Gai Thai Chicken Rice | slug |
| khao-pad-sapparot-thai-pineapple-fried-rice (batch-04-A35) | Khao Pad Sapparot (Thai Pineapple Fried Rice) | khao-pad-sapparot-thai-pineapple-fried-rice (batch-04-B14) | Khao Pad Sapparot Thai Pineapple Fried Rice | slug |
| thai-pad-kra-pao-moo-holy-basil-pork-with-fried-egg (batch-04-A35) | Thai Pad Kra Pao Moo (Holy Basil Pork with Fried Egg) | pad-kra-pao-moo-thai-holy-basil-pork (batch-04-B16) | Pad Kra Pao Moo Thai Holy Basil Pork | near-title 0.80 |
| sri-lankan-egg-hopper-pancakes (batch-04-B01) | Sri Lankan Egg Hopper Pancakes | sri-lankan-egg-hopper-pancakes (batch-04-C09) | (same title) | slug |
| kaya-toast-with-soft-eggs (batch-04-B02) | Kaya Toast with Soft Eggs | kaya-toast-with-soft-eggs (batch-04-C07) | (same title) | slug |
| okonomiyaki-cabbage-pancakes (batch-04-B02) | Okonomiyaki Cabbage Pancakes | okonomiyaki-cabbage-pancake (batch-04-C13) | Okonomiyaki Cabbage Pancake | near-title 1.00 |
| silky-tomato-scramble-rice-plates (batch-04-B02) | Silky Tomato Scramble Rice Plates | fan-qie-chao-dan-tomato-and-egg-stir-fry (batch-04-B22) | Fan Qie Chao Dan Tomato and Egg Stir-Fry | near-ingredients 1.00 |
| battered-cauliflower-in-tangy-pineapple-glaze (batch-04-B03) | Battered Cauliflower in Tangy Pineapple Glaze | sweet-and-sour-cauliflower-with-pineapple (batch-04-02) | Sweet and Sour Cauliflower with Pineapple | near-ingredients 0.91 |
| curry-laksa-style-vegetable-noodle-soup (batch-04-B03) | Curry Laksa-Style Vegetable Noodle Soup | curry-laksa-noodle-soup (batch-04-C07) | Curry Laksa Noodle Soup | near-title 0.80 |
| rice-noodle-salad-with-peanut-lime-dressing (batch-04-B03) | Rice Noodle Salad with Peanut Lime Dressing | noodle-salad-with-peanut-lime-dressing (batch-04-C02) | Noodle Salad with Peanut Lime Dressing | near-title 0.83 |
| fluffy-japanese-souffle-pancakes (batch-04-B04) | Fluffy Japanese Souffle Pancakes | japanese-souffl-pancakes (batch-04-C07) | Japanese Soufflé Pancakes | near-ingredients 1.00 |
| soy-egg-rice-bowls-with-nori (batch-04-B04) | Soy Egg Rice Bowls with Nori | japanese-breakfast-rice-bowl-with-soft-egg-and-nori (batch-04-C40) | Japanese Breakfast Rice Bowl with Soft Egg and Nori | near-ingredients 1.00 |
| gilgeori-cabbage-egg-toast-sandwiches (batch-04-B06) | Gilgeori Cabbage Egg Toast Sandwiches | korean-egg-toast-gilgeori-toast (batch-04-A29) | Korean Egg Toast (Gilgeori Toast) | near-ingredients 1.00 |
| apam-balik-peanut-pancakes (batch-04-B07) | Apam Balik Peanut Pancakes | apam-balik-peanut-pancake-folds (batch-04-C11) | Apam Balik Peanut Pancake Folds | near-title 0.80 |
| ayam-bubur-chicken-rice-porridge (batch-04-B07) | Ayam Bubur Chicken Rice Porridge | bubur-ayam-indonesian-chicken-rice-porridge (batch-04-C04) | Bubur Ayam Indonesian Chicken Rice Porridge | near-title 0.83 |
| champorado-chocolate-rice-porridge (batch-04-B07) | Champorado Chocolate Rice Porridge | champorado-chocolate-rice-porridge (batch-04-C05) | (same title) | slug |
| tortang-talong-eggplant-omelettes (batch-04-B07) | Tortang Talong Eggplant Omelettes | tortang-talong-eggplant-omelette (batch-04-C04) | Tortang Talong Eggplant Omelette | near-title 1.00 |
| thai-jok-style-pork-rice-porridge (batch-04-B09) | Thai Jok Style Pork Rice Porridge | thai-jok-pork-and-ginger-rice-porridge (batch-04-C25) | Thai Jok Pork and Ginger Rice Porridge | near-title 0.83 |
| kerala-mutta-roast-egg-roast (batch-04-B14) | Kerala Mutta Roast Egg Roast | kerala-nadan-egg-roast-with-rice (batch-04-B13) | Kerala Nadan Egg Roast with Rice | near-ingredients 0.92 |
| misir-wot-ethiopian-red-lentil-stew (batch-04-B15) | Misir Wot Ethiopian Red Lentil Stew | ethiopian-misir-wot-red-lentil-stew (batch-04-C19) | Ethiopian Misir Wot Red Lentil Stew | near-title 1.00 |
| telur-balado-sumatran-chilli-eggs (batch-04-B17) | Telur Balado Sumatran Chilli Eggs | telur-balado-padang-eggs-in-chilli-sambal (batch-04-B11) | Telur Balado Padang Eggs in Chilli Sambal | near-ingredients 0.91 |
| sanbei-ji-taiwanese-three-cup-chicken-with-basil (batch-04-B18) | Sanbei Ji Taiwanese Three-Cup Chicken with Basil | sanbeiji-three-cup-chicken-with-basil (batch-04-B22) | Sanbeiji Three-Cup Chicken with Basil | near-ingredients 0.90 |
| dhaba-style-egg-curry-with-tomato-and-onion-masala (batch-04-B19) | Dhaba-Style Egg Curry with Tomato and Onion Masala | anda-curry-spiced-egg-curry (batch-04-B24) | Anda Curry Spiced Egg Curry | near-ingredients 0.91 |
| pad-see-ew-thai-soy-sauce-noodles-with-chicken-and-greens (batch-04-B20) | Pad See Ew Thai Soy Sauce Noodles with Chicken and Greens | pad-see-ew-thai-soy-sauce-rice-noodles-with-chicken (batch-04-A29) | Pad See Ew (Thai Soy Sauce Rice Noodles with Chicken) | near-title 0.80 |
| efo-riro-nigerian-spinach-stew-with-chicken (batch-04-B21) | Efo Riro Nigerian Spinach Stew with Chicken | nigerian-efo-riro-spinach-stew (batch-04-C16) | Nigerian Efo Riro Spinach Stew | near-title 0.83 |
| sinigang-na-baboy-sour-tamarind-pork-soup (batch-04-B23) | Sinigang na Baboy Sour Tamarind Pork Soup | sinigang (catalogue) | Pork Sinigang | near-ingredients 0.92 (existing) |
| rosemary-focaccia-squares (batch-04-B36) | Rosemary Focaccia Squares | rosemary-sea-salt-focaccia (batch-04-A02) | Rosemary Sea Salt Focaccia | near-ingredients 1.00 |
| farinata-chickpea-squares (batch-04-B37) | Farinata Chickpea Squares | baked-chickpea-pancake-farinata-with-rosemary (batch-04-02) | Farinata (Ligurian Chickpea Flatbread) with Rosemary | near-ingredients 1.00 |
| shredded-cabbage-slaw-with-sesame-soy-dressing (batch-04-C01) | Shredded Cabbage Slaw with Sesame Soy Dressing | chinese-style-sesame-cabbage-slaw (batch-04-C27) | Chinese-Style Sesame Cabbage Slaw | near-ingredients 0.90 |
| eggs-benedict-with-blender-hollandaise (batch-04-C02) | Eggs Benedict with Blender Hollandaise | ham-and-poached-egg-muffins-with-lemon-butter-sauce (batch-04-C05) | Ham and Poached Egg Muffins with Lemon Butter Sauce | near-ingredients 1.00 |
| spanish-migas-with-chorizo-and-fried-egg (batch-04-C02) | Spanish Migas with Chorizo and Fried Egg | migas-with-chorizo-and-fried-eggs (batch-04-A10) | Migas with Chorizo and Fried Eggs | near-title 0.80 |
| island-pumpkin-soup-with-lime-and-ginger (batch-04-C04) | Island Pumpkin Soup with Lime and Ginger | pacific-coconut-pumpkin-and-cabbage-soup (batch-04-C27) | Pacific Coconut Pumpkin and Cabbage Soup | near-ingredients 0.91 |
| mandazi-coconut-doughnuts (batch-04-C04) | Mandazi Coconut Doughnuts | mandazi-spiced-coconut-breakfast-fingers (batch-04-B09) | Mandazi Spiced Coconut Breakfast Fingers | near-ingredients 1.00 |
| roasted-tomato-gazpacho (batch-04-C08) | Roasted Tomato Gazpacho | andalusian-gazpacho-with-cucumber-salsa (batch-04-C12) | Andalusian Gazpacho with Cucumber Salsa | near-ingredients 1.00 |
| ayam-masak-merah-tomato-chilli-chicken (batch-04-C10) | Ayam Masak Merah Tomato Chilli Chicken | ayam-masak-merah-malaysian-tomato-chilli-chicken (batch-04-B13) | Ayam Masak Merah Malaysian Tomato Chilli Chicken | near-title 0.86 |
| persian-kuku-sabzi-herb-frittata (batch-04-C10) | Persian Kuku Sabzi Herb Frittata | kuku-sabzi-persian-herb-frittata (batch-04-A16) | Kuku Sabzi (Persian Herb Frittata) | near-title 1.00 |
| tex-mex-sweet-corn-and-black-bean-bowl (batch-04-C12) | Tex-Mex Sweet Corn and Black Bean Bowl | chargrilled-corn-and-black-bean-salad (batch-04-C06) | Chargrilled Corn and Black Bean Salad | near-ingredients 0.90 |
| georgian-lobio-kidney-bean-stew (batch-04-C15) | Georgian Lobio Kidney Bean Stew | lobio-georgian-kidney-bean-stew-with-walnuts (batch-04-A18) | Lobio (Georgian Kidney Bean Stew with Walnuts) | near-title 0.83 |
| argentinian-chimichurri-green-herb-sauce (batch-04-C17) | Argentinian Chimichurri Green Herb Sauce | chimichurri-verde-argentine-herb-sauce (batch-04-C14) | Chimichurri Verde Argentine Herb Sauce | near-ingredients 1.00 |
| mexican-frijoles-charros-cowboy-bean-soup (batch-04-C19) | Mexican Frijoles Charros Cowboy Bean Soup | frijoles-charros (batch-03 (parked)) | Frijoles Charros | near-ingredients 0.90 (existing) |
| warm-brown-rice-and-edamame-salad (batch-04-C21) | Warm Brown Rice and Edamame Salad | brown-rice-edamame-and-carrot-salad-with-sesame-ginger-dressing (batch-04-C39) | Brown Rice, Edamame and Carrot Salad with Sesame Ginger Dressing | near-ingredients 0.90 |
| indian-besan-chilla-chickpea-flour-pancakes (batch-04-C23) | Indian Besan Chilla Chickpea Flour Pancakes | besan-chilla-chickpea-flour-pancakes (batch-04-A35) | Besan Chilla (Chickpea Flour Pancakes) | near-title 0.83 |
| irish-colcannon-mash-with-cabbage-and-butter (batch-04-C23) | Irish Colcannon Mash with Cabbage and Butter | colcannon-irish-mashed-potato-and-cabbage (batch-04-C13) | Colcannon Irish Mashed Potato and Cabbage | near-ingredients 1.00 |
| dutch-boerenkool-stamppot-kale-and-potato-mash-with-sausage (batch-04-C24) | Dutch Boerenkool Stamppot Kale and Potato Mash with Sausage | stamppot-boerenkool-dutch-kale-mash-with-sausage (batch-04-A17) | Stamppot Boerenkool (Dutch Kale Mash with Sausage) | near-title 0.86 |
| jamaican-rice-and-peas-with-coconut-milk (batch-04-C24) | Jamaican Rice and Peas with Coconut Milk | rice-and-peas-with-coconut-and-thyme (batch-04-C04) | Rice and Peas with Coconut and Thyme | near-ingredients 0.90 |
| polish-placki-ziemniaczane-potato-pancakes-with-sour-cream (batch-04-C24) | Polish Placki Ziemniaczane Potato Pancakes with Sour Cream | placki-ziemniaczane-polish-potato-pancakes-with-sour-cream (batch-04-A16) | Placki Ziemniaczane (Polish Potato Pancakes with Sour Cream) | near-title 1.00 |
| indonesian-sambal-matah-raw-lemongrass-sambal (batch-04-C25) | Indonesian Sambal Matah Raw Lemongrass Sambal | sambal-matah-balinese-raw-shallot-sambal (batch-04-C22) | Sambal Matah Balinese Raw Shallot Sambal | near-ingredients 1.00 |
| norwegian-lapskaus-root-vegetable-and-beef-stew (batch-04-C25) | Norwegian Lapskaus Root Vegetable and Beef Stew | lapskaus-norwegian-beef-and-root-vegetable-stew (batch-04-A22) | Lapskaus (Norwegian Beef and Root Vegetable Stew) | near-title 1.00 |
| argentinian-chimichurri-rojo-red-pepper-sauce (batch-04-C32) | Argentinian Chimichurri Rojo Red Pepper Sauce | chimichurri-rojo-red-chimichurri (batch-04-C22) | Chimichurri Rojo Red Chimichurri | near-ingredients 1.00 |
| italian-panzanella-with-cucumber-and-basil (batch-04-C32) | Italian Panzanella with Cucumber and Basil | panzanella (catalogue) | Panzanella | near-ingredients 0.91 (existing) |
| big-aussie-brunch-plate (batch-04-C34) | Big Aussie Brunch Plate | full-australian-breakfast-plate (batch-04-C13) | Full Australian Breakfast Plate | near-ingredients 0.90 |
| senegalese-mafe-peanut-stew (batch-04-C43) | Senegalese Mafe Peanut Stew | mafe-senegalese-peanut-stew-with-chicken (batch-04-B25) | Mafe Senegalese Peanut Stew with Chicken | near-title 0.80 |
| senegalese-yassa-onion-and-lemon-chicken (batch-04-C43) | Senegalese Yassa Onion and Lemon Chicken | yassa-poulet-senegalese-lemon-onion-chicken (batch-04-B25) | Yassa Poulet Senegalese Lemon Onion Chicken | near-title 0.83 |
| wonton-soup-with-bok-choy (batch-04-C43) | Wonton Soup with Bok Choy | wonton-noodle-soup-with-pork-and-prawn (batch-04-02) | Wonton Noodle Soup with Pork and Prawn | near-ingredients 0.91 |
