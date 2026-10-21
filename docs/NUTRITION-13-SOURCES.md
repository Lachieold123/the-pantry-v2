# Nutrition for the 13 "no nutrition" recipes (21 Oct 2026)

All 13 are batch-03 house recipes. The line estimator (`scripts/estimate-nutrition-from-lines.mts`) skipped them, so `catalogue:validate` failed them with "no nutrition estimate". They now carry per-serve nutrition from `scripts/apply-nutrition-13.mts` (weights and food values are in that file), written into `scripts/data/house-recipes/batch-03.json` (house recipes are edited in their batch file, D-044; `recipe-fixes.json` only patches the converted old-app recipes). Catalogue rebuilt with `scripts/rebuild-house-batches.mts`. `catalogue:validate` is now **5210/5210, 0 failures** (was 5197/5210).

## Why each one failed, and the result

| Recipe | Cause | kcal a serve | Outcome |
|---|---|---|---|
| base-genep | spice paste, really under 40 | 28 | exemption |
| nozawana-zuke | pickled leaves, under 40 | 22 | exemption |
| pico-de-gallo | fresh salsa, under 40 | 39 | exemption |
| torshi | pickle, under 40 | 32 | exemption |
| horenso-no-ohitashi | spinach side, under 40 | 39 | exemption |
| jaew-makhuea-thet | dipping sauce, under 40 | 36 | exemption |
| pol-sambol | estimator did not weigh 400 g coconut (said 14 kcal) | 373 | passes the floor |
| salsa-de-pasilla | estimator did not weigh the 6 dried chillies (said 27) | 68 | passes |
| teh-tarik | condensed and evaporated milk given in spoons, not weighed (said 25) | 117 | passes |
| nabak-kimchi | estimator said 34; weighed daikon gives 41 | 41 | passes |
| gat-kimchi | "mustard greens" linked to the Dijon mustard condiment | 93 | link fixed, passes |
| kina-with-rewena | sea urchin roe and rēwena not weighable (cover 0.5) | 281 | passes (validator warns: estimator sees 2 of 4 lines) |
| grilled-fish-wrapped-in-vine-leaves | whole fish and leaves not weighable (cover 0.25) | 268 | passes (cover too low to compare) |

Only 6 recipes truly sit under the floor. The other 7 were estimator gaps, not a rule problem.

## Owner decision: the 40 kcal floor

I did not lower the floor. The 6 under-40 recipes are listed by id in `REVIEWED` in `scripts/validate-house-recipes.mts`, each with a reason. The validator turns their failure into a warning and the floor stays at 40 for everything else. Options: (1) keep this per-recipe list (recommended, narrow and visible); (2) add a "condiment, pickle or paste" category with a lower floor (about 10 kcal) so future batches do not need a list; (3) drop the floor. Nothing else needs doing if you pick 1.

## gat-kimchi link fix

There was no `mustard-greens` ingredient, so the word "mustard" matched `dijon-mustard`. Added `mustard-greens` (fruit-veg; aliases mustard green, gai choy, brown mustard greens) to `src/data/ingredients/ingredients.json`. It also relinks "mustard greens" lines in 6 other batch files (batch-02, batch-03, four batch-04 files), all of which validate. `SKIP_IDS` in the line estimator still lists gat-kimchi and can now be removed (the hand figure does not depend on it).

## Sources

Food values per 100 g are USDA National Nutrient Database, Standard Reference (SR Legacy), read through the free mirror nutritionvalue.org (a secondary copy: its pages show per-serving values, which I scaled to 100 g, so expect rounding of a few per cent). Page pattern: `https://www.nutritionvalue.org/<USDA_name>_nutritional_value.html`. Fetched on 21 Oct 2026:

| Food (used for) | Page |
|---|---|
| Turnip greens (nozawana) | `Turnip_greens%2C_raw_nutritional_value.html` |
| Chilli, hot red (several) | `Peppers%2C_raw%2C_red%2C_hot_chili_nutritional_value.html` |
| Garlic | `Garlic%2C_raw_nutritional_value.html` |
| Ginger (also stands in for fresh turmeric and galangal) | `Ginger_root%2C_raw_nutritional_value.html` |
| Shallots | `Shallots%2C_raw_nutritional_value.html` |
| Lime juice | `Lime_juice%2C_raw_nutritional_value.html` |
| Onion | `Onions%2C_raw_nutritional_value.html` |
| Coriander leaves | `Coriander_%28cilantro%29_leaves%2C_raw_nutritional_value.html` |
| Coconut meat | `Nuts%2C_raw%2C_coconut_meat_nutritional_value.html` |
| Fish roe (stands in for kina) | `Fish%2C_raw%2C_mixed_species%2C_roe_nutritional_value.html` |
| Snapper (white fish) | `Fish%2C_raw%2C_mixed_species%2C_snapper_nutritional_value.html` |
| Oriental radish (daikon) | `Radishes%2C_raw%2C_oriental_nutritional_value.html` |
| Spinach | `Spinach%2C_raw_nutritional_value.html` |
| Mustard greens | `Mustard_greens%2C_raw_nutritional_value.html` |
| Sweetened condensed milk | `Milk%2C_sweetened%2C_condensed%2C_canned_nutritional_value.html` |
| Evaporated milk | `Milk%2C_with_added_vitamin_D_and_without_added_vitamin_A%2C_evaporated%2C_canned_nutritional_value.html` |
| Turnip, cauliflower | `Turnips%2C_raw_...`, `Cauliflower%2C_raw_nutritional_value.html` |
| Fish sauce | `Sauce%2C_ready-to-serve%2C_fish_nutritional_value.html` |
| Soy sauce (shoyu) | `Soy_sauce_made_from_soy_and_wheat_%28shoyu%29_nutritional_value.html` |
| Dried ancho chilli (stands in for pasilla) | `Peppers%2C_dried%2C_ancho_nutritional_value.html` |
| White bread (stands in for rēwena) | `Bread%2C_commercially_prepared%2C_white_nutritional_value.html` |
| Sesame seeds, white rice flour (stands in for glutinous) | `Seeds%2C_dried%2C_whole%2C_sesame_seeds_...`, `Rice_flour%2C_unenriched%2C_white_...` |
| Grape leaves (looked up, not counted: wrapper) | `Grape_leaves%2C_raw_nutritional_value.html` |

**Not fetched** (page lookups failed or the item is trivial); the standard USDA SR values are typed in from memory and should be spot-checked: tomato (18 kcal), sugar, olive/neutral oil, salt (sodium 38,758 mg/100 g), white and rice vinegar, mirin, bonito flakes, dried salted cod (stands in for ikan bilis), lemon, black pepper, chilli powder (gochugaru), spring onion.

## Judgement calls (all in `scripts/apply-nutrition-13.mts`)

- Proxies: kina (sea urchin roe) uses fish roe; rēwena uses white bread; glutinous rice flour uses white rice flour; pasilla uses ancho; fresh turmeric and galangal use ginger. A New Zealand source (NZ Food Composition Database) would be better for kina and rēwena; not fetched.
- Pickling brines: only part is eaten (nozawana 30%, torshi 25%, nabak-kimchi 50% of the brine salt because the liquid is drunk). Salting salt that is rinsed off counts 10%.
- Grilled fish: flesh taken as 45% of the 400 g whole fish; vine leaves are a wrapper and not counted; oil 20 g across both.
- Count lines were weighed by hand (for example 4 ripe tomatoes = 480 g); see the file.
- Fish sauce and brine make nabak-kimchi 2,029 mg sodium a serve: real, under the 3,500 mg validator limit.

## Not done

- Live feed rows for these 13 recipes do not carry the new nutrition (feed untouched, per the overnight limits).
