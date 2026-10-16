# Batch-04 nutrition fix-up (17 October 2026)

Branch `house-recipes-batch-04-merge`. Before: validator 3220/3301, 81 failures, all nutrition
(72 stated kcal well below the ingredient estimate, 9 meat dishes under 10 g protein a serve).
After: 3301/3301, 0 failures; `catalogue:check-house` "No problems".

## What was actually wrong

Most of the 72 "too low" failures were the estimator, not the recipes. Going through the
per-line breakdowns, the big errors were:

| Estimator error | Example | Fix in `scripts/nutrition-estimate.mts` |
| --- | --- | --- |
| Cooked rice counted as dry rice (355 kcal/100 g, 200 g a cup) | oyakodon, egg fried rice, every rice bowl | lines saying "cooked" for rice, pasta and grains: 140 kcal/100 g, about 160 g a cup |
| A dumpling, wonton or spring roll wrapper counted as a 60 g wrap | 24 wrappers = 970 kcal a serve | wonton/gyoza wrapper 8 g, spring roll wrapper 13 g, 290 kcal/100 g |
| All deep-frying oil counted as eaten | 3 cups oil = 1500 kcal a serve | oil "for frying", or half a cup or more when the method deep/shallow-fries, fries in batches, drains on paper towel or heats oil to 150-190°C: 15% counted (what the food soaks up). Oil in a pesto, chimichurri or chilli oil is still counted in full |
| Water at 15 kcal/100 g | 2 litres water = 75 kcal a serve | water 0 |
| Shell-on clams and soup bones counted as meat | 1.5 kg beef bones = 825 kcal a serve | clams/mussels 30 kcal/100 g as bought, bones 25 (what a simmer extracts) |
| A corn tortilla at 60 g, an anchovy fillet at 170 g, a sun-dried tomato as a whole tomato | | 28 g, 4 g, 7 g |
| "2 x 400g tins" read as no amount | bean stews left half-counted | read as two tins (drained weight for pulses) |
| Puff pastry sheets, frankfurts, small baguettes, plantains, mango, okra not counted at all | pies, sausage rolls, banh mi | sheet 170 g at 400 kcal/100 g (Pampas sheet), filo sheet 20 g, frankfurt 40 g, small baguette 125 g, plantain 180 g at 120, mango 200 g |
| Bone-in lamb leg/shoulder and short ribs counted as boneless | gigot d'agneau | lamb leg 170, short ribs 200, "bone in" lines take 80% |
| Coleslaw at 260 (deli default), cottage cheese at 330, watery veg (daikon, cucumber, bok choy, cabbage) at 35 | | 120, 100, 20 |
| Chana dal or dried chickpeas linked to the tinned ingredient (110) | masala vada | "dried/dal/split" pulse lines without "tin/drained": 340 |

Each fix has a test in `scripts/nutrition-estimate.test.mts` (11 tests, all pass).

### Wrong ingredient links (fixed in `src/data/ingredients/ingredients.json`)

Four ingredients added because recipes were linking to the wrong thing, which also put the
wrong item on shopping lists: `split-peas` (was `frozen-peas`), `cottage-cheese` (was
`tasty-cheese`, in about 8 slice files), `beef-short-ribs` (was `beef-steak`), `barley-rusks`
(was `pearl-barley`, Cretan dakos). Soybean sprouts stay on `edamame` so the soy allergen holds.

### Validator protein floor

The floor said any dish with meat or seafood needs 10 g protein a serve. It caught a tart with
100 g bacon for six, beans with 200 g sausage for six, and a mole with lard. Now: lard is not
meat, and the floor applies when there is 50 g or more raw meat or seafood a serve (lines with
no amount still count as 50 g, so it stays strict when unsure).

**Revised in the second pass (below).** The 50 g threshold loosened the check rather than fixing
it: of the seven recipes it let through, four were simply understated (the bacon onion tart, beans
with smoked sausage, frankfurt muffin bites and the smoked salmon tart all come to 11 to 12 g
protein a serve from their lines). The lard change was right and stays.

## Recipe changes

1. With the estimator fixed, 53 recipes were stated more than 1.35 times the estimate (the
   generators had inflated rice bowls etc. to pass the old, inflated estimate), and later 4
   more. `renormalise-nutrition.mts --write` scaled them down to the estimate (existing method).
2. The remaining 40 that failed (stated far below or above, or a wrong serving count) were
   rebuilt by the new `scripts/fix-nutrition-from-lines.mts`: kcal from the estimate; protein,
   carbs and fat split per line by food type (oil all fat, rice and flour mostly carbs, meat
   and fish by protein/fat share); fibre and sodium kept. The merge script now runs it after
   renormalise so a re-merge can't bring the failures back.
3. One serving-count fix: Polish krupnik barley soup 3 -> 6 (6 cups stock, 2/3 cup barley and
   2 potatoes make about 2 litres).

Judgement calls checked by hand: curry puffs and pies really do use 2-4 sheets of puff pastry
for 4-6 serves, so 600-950 kcal a serve is honest for the servings given. Banh mi uses a 125 g
small baguette. Hawaiian macaroni salad has 200 g mayonnaise for 6, so about 490 kcal. Mint
chutney has 3 tbsp oil for 3 serves (about 14 g fat each), not 3 g. Tanzanian coconut rice,
khai palo and callaloo were stated at about twice the ingredients and came down.

### Rebuilt by fix-nutrition-from-lines (before -> after, per serve)

```
batch-04-A03.json cinnamon-baked-plantain [kcal x0.47 of estimate 283] 134 kcal p1 c23 f4 -> 279 kcal p4 c49 f7
batch-04-A06.json mushroom-leek-and-gruyere-tart [kcal x0.47 of estimate 638] 298 kcal p9 c19 f21 -> 642 kcal p15 c41 f46
batch-04-A09.json lamb-and-rosemary-pies [kcal x0.55 of estimate 849] 466 kcal p26 c32 f26 -> 845 kcal p43 c52 f51
batch-04-A21.json tourtiere-quebecois-spiced-pork-and-potato-pie [kcal x0.55 of estimate 371] 204 kcal p10 c13 f13 -> 371 kcal p23 c22 f21
batch-04-A21.json mince-and-cheese-pie-new-zealand-style [kcal x0.48 of estimate 657] 317 kcal p14 c19 f20 -> 656 kcal p32 c37 f42
batch-04-A22.json empanada-gallega-spanish-tuna-and-capsicum-pie [kcal x0.46 of estimate 422] 196 kcal p10 c16 f10 -> 419 kcal p20 c32 f23
batch-04-A26.json cheeseburger-pie [kcal x0.54 of estimate 493] 266 kcal p12 c15 f17 -> 494 kcal p30 c25 f30
batch-04-A28.json mushroom-and-spinach-wellington [kcal x0.38 of estimate 360] 138 kcal p5 c14 f7 -> 360 kcal p7 c37 f20
batch-04-A30.json jamaican-beef-patties-flaky-spiced-pastry-pockets [kcal x0.42 of estimate 384] 160 kcal p6 c11 f10 -> 379 kcal p18 c29 f21
batch-04-A33.json spinach-and-ricotta-hand-pies [kcal x0.34 of estimate 467] 159 kcal p5 c12 f10 -> 469 kcal p17 c39 f27
batch-04-A33.json potato-and-pea-samosa-pasties [kcal x0.33 of estimate 504] 164 kcal p4 c20 f8 -> 510 kcal p10 c58 f26
batch-04-A33.json empanadas-de-queso-argentine-cheese-empanadas [kcal x0.41 of estimate 574] 234 kcal p9 c19 f14 -> 576 kcal p21 c37 f38
batch-04-A34.json chicken-banh-mi-rolls [kcal x0.52 of estimate 697] 360 kcal p23 c47 f8 -> 694 kcal p46 c72 f24
batch-04-B01.json curry-puff-pastry-triangles [kcal x0.17 of estimate 272] 46 kcal p1 c6 f2 -> 271 kcal p5 c28 f15
batch-04-B01.json turon-banana-free-mango-spring-rolls [kcal x2.24 of estimate 168] 377 kcal p4 c70 f9 -> 169 kcal p4 c35 f1
batch-04-B02.json egg-tart-cups-with-flaky-pastry [kcal x0.37 of estimate 171] 63 kcal p1 c8 f3 -> 168 kcal p4 c20 f8
batch-04-B02.json spiced-pumpkin-samosa-pastries [kcal x0.16 of estimate 394] 63 kcal p1 c8 f3 -> 393 kcal p7 c38 f23
batch-04-B02.json tanzanian-coconut-rice-with-peas [kcal x1.99 of estimate 458] 912 kcal p18 c138 f32 -> 457 kcal p11 c59 f19
batch-04-B07.json filipino-chicken-pastel-hand-pies [kcal x0.49 of estimate 664] 324 kcal p19 c25 f16 -> 668 kcal p34 c55 f34
batch-04-B10.json malaysian-chicken-curry-puffs-with-cucumber [kcal x0.28 of estimate 948] 266 kcal p14 c20 f14 -> 949 kcal p38 c79 f53
batch-04-B14.json matoke-plantain-and-peanut-stew [kcal x0.43 of estimate 567] 243 kcal p5 c38 f7 -> 564 kcal p13 c86 f18
batch-04-B30.json lamb-and-mint-sausage-rolls [kcal x0.41 of estimate 578] 238 kcal p11 c15 f15 -> 575 kcal p28 c41 f33
batch-04-B31.json baked-tequenos [kcal x0.39 of estimate 374] 147 kcal p5 c10 f9 -> 372 kcal p13 c26 f24
batch-04-B31.json cheddar-and-mustard-cheese-twists [kcal x0.26 of estimate 305] 78 kcal p2 c6 f5 -> 312 kcal p9 c24 f20
batch-04-B35.json chickpea-and-mushroom-party-rolls [kcal x0.42 of estimate 294] 124 kcal p2 c12 f7 -> 297 kcal p8 c36 f13
batch-04-B35.json pork-and-apple-sausage-rolls [kcal x0.52 of estimate 354] 184 kcal p7 c13 f11 -> 354 kcal p21 c22 f20
batch-04-B35.json ham-and-cheese-pinwheels [kcal x0.34 of estimate 258] 88 kcal p3 c6 f6 -> 257 kcal p8 c18 f17
batch-04-C04.json callaloo-and-crab-soup [kcal x2.01 of estimate 327] 658 kcal p33 c23 f46 -> 323 kcal p15 c9 f23
batch-04-C04.json fried-sweet-plantain [kcal x0.39 of estimate 283] 110 kcal p1 c17 f4 -> 284 kcal p3 c36 f14
batch-04-C04.json hawaiian-style-macaroni-salad [kcal x0.54 of estimate 484] 263 kcal p6 c30 f13 -> 489 kcal p10 c51 f27
batch-04-C05.json banh-mi-style-fried-eggs-on-baguette [kcal x0.43 of estimate 489] 211 kcal p9 c23 f9 -> 488 kcal p20 c34 f30
batch-04-C05.json cuban-style-black-bean-soup [kcal x0.37 of estimate 230] 86 kcal p4 c11 f2 -> 225 kcal p12 c31 f5
batch-04-C05.json githeri-kenyan-beans-and-corn [kcal x0.49 of estimate 263] 130 kcal p6 c19 f2 -> 265 kcal p11 c41 f5
batch-04-C17.json salvadoran-curtido-cabbage-slaw [kcal x0.45 of estimate 89] 40 kcal p1 c8 f0 -> 89 kcal p3 c16 f1
batch-04-C18.json indian-mint-and-coriander-chutney [kcal x0.50 of estimate 134] 67 kcal p2 c7 f3 -> 138 kcal p0 c2 f14
batch-04-C19.json turkish-kuru-fasulye-white-bean-stew [kcal x0.44 of estimate 235] 103 kcal p5 c13 f3 -> 232 kcal p11 c27 f8
batch-04-C22.json khai-palo-thai-five-spice-egg-stew [kcal x2.15 of estimate 140] 301 kcal p14 c36 f11 -> 142 kcal p10 c7 f8
batch-04-C34.json egg-and-bacon-breakfast-pie [kcal x0.42 of estimate 585] 245 kcal p9 c14 f17 -> 581 kcal p22 c35 f39
batch-04-C37.json grilled-capsicum-and-white-bean-salad [kcal x0.51 of estimate 179] 91 kcal p4 c10 f4 -> 184 kcal p7 c19 f8
batch-04-C42.json polish-krupnik-barley-soup [servings] servings 3 -> 6; 191 kcal p6 c28 f5 -> 228 kcal p10 c31 f6
120 files: 40 recipes rebuilt
```

## Second pass (17 October 2026, later)

The first pass left 152 batch-04 recipes stated at 0.55 to 0.7 of the estimate (passing, but
reading low). Their id list is `docs/nutrition-second-pass-ids.txt`.

### More estimator fixes (`scripts/nutrition-estimate.mts`, tests added)

| Was | Now |
| --- | --- |
| Bone-in chicken at 170 kcal/100 g, and "8 chicken drumsticks" or "1 whole chicken" not weighed at all | as bought with the bone: whole 140, drumsticks and pieces 115, bone-in thigh 160, wings 120. Drumstick 135 g, bone-in thigh 170 g, wing 90 g, whole chicken 1.5 kg. The 20% "bone in" cut no longer applies on top |
| Sausages and bratwurst at 380 (the bacon figure); ham at the deli default 260 | fresh or smoked sausages 290, salami/chorizo 430, ham 125 |
| Olives and roasted capsicum at the deli default 260, tinned tomatoes at 60 | olives 145, roasted capsicum 35, tomatoes 22, tomato paste 80 |
| Gnocchi as dry pasta (355), silken tofu as firm (140), fresh tuna as salmon (190) | 160, 55, 120 |
| Pork ribs and oxtail as boneless | 180 and 140 |
| Roti, chapati, paratha, flatbread, a sirloin steak, a tuna steak not weighed; frozen chips as raw potato | 45, 45, 80, 60, 220, 150 g; chips 150 kcal/100 g |
| A bacon or prosciutto "slice" at 35 g, a rice paper sheet at 20 g, a cup of salad leaves or tapioca starch at water density | 25 g, 15 g, 9 g; 0.1 and 0.55 g/ml |
| "1 cup cooked lentils" at the dry figure | cooked pulses 120 kcal/100 g |

Macros: the per-food energy split that `fix-nutrition-from-lines.mts` used now lives in
`nutrition-estimate.mts` (`estimateMacrosPerServe`), with sweet sauces as sugar (not 30% protein),
fruit, olives, sausages, ham and skin-on chicken given their own splits.

### Validator protein floor (replaces the 50 g threshold)

Any meat or seafood (not lard, dripping, stock or bones) needs 10 g protein a serve, as before.
The one exception is a dish whose own lines can't supply 10 g, such as 100 g bacon through a
cabbage salad for four (about 6 g) or a pot of beans for eight: then the stated protein must be
at least 75% of what the lines give. The four understated recipes the 50 g rule let through were
rebuilt from their lines.

### What was changed

- 152 flagged recipes: rebuilt from their lines when still below 0.85 of the fixed estimate
  (`fix-nutrition-from-lines.mts --band 0.85 --ids docs/nutrition-second-pass-ids.txt`). With the
  estimator fixed, 149 of the 152 now sit within 0.85 to 1.15.
- Then anything in batch-04 under 0.7 (`--band 0.7`): mostly wraps and roti dishes whose bread
  had never been counted, and chicken dishes whose drumsticks had never been weighed.
- 18 stated well above the corrected estimate (sausages, silken tofu, olives) scaled down by
  `renormalise-nutrition.mts --write`.
- Judgement where the lines can't show what is eaten (`EATEN` in the fix script): dakgomtang
  (skin discarded) 75%, pho ga 80%, ramen broth with wings strained out 60%, New England boiled
  dinner 85%, ayam penyet (fried in 250 ml oil) 61%, which leaves its stated 674 kcal as is.
- `merge-batch04.sh` runs both passes, so a re-merge gives the same figures.

Batch-04 validator: 3301/3301. Per-recipe changes, before -> after a serve:

```
batch-04-01.json vegan-tofu-scramble-with-spinach [rebuilt] 372 kcal p24 c15 f24 -> 538 kcal p33 c50 f22
batch-04-01.json allspice-scotch-bonnet-grilled-chicken-thighs [rebuilt] 372 kcal p32 c7 f24 -> 542 kcal p49 c5 f36
batch-04-01.json hawaiian-style-tuna-poke-bowl [scaled down] 882 kcal p49 c95 f34 -> 607 kcal p34 c65 f23
batch-04-01.json pho-ga-with-charred-onion-and-rice-noodles [rebuilt (judgement)] 400 kcal p36 c46 f8 -> 601 kcal p61 c45 f19
batch-04-01.json banh-mi-op-la-vietnamese-eggs-in-a-pan [rebuilt] 306 kcal p15 c27 f15 -> 463 kcal p21 c51 f19
batch-04-02.json gluten-free-polenta-with-slow-braised-lamb-shoulder [rebuilt] 622 kcal p48 c40 f30 -> 886 kcal p70 c46 f46
batch-04-02.json oregano-chicken-drumsticks-with-lemon-potatoes [rebuilt] 354 kcal p22 c27 f18 -> 669 kcal p36 c38 f41
batch-04-02.json chicken-fricassee-with-mushrooms-and-tarragon [rebuilt] 438 kcal p34 c8 f30 -> 625 kcal p51 c17 f39
batch-04-02.json ratatouille-tian-baked-in-spirals [rebuilt] 178 kcal p4 c18 f10 -> 237 kcal p4 c19 f15
batch-04-A01.json apple-strudel-rolls [rebuilt] 136 kcal p2 c22 f4 -> 198 kcal p2 c24 f10
batch-04-A01.json bratwurst-and-sauerkraut-rolls [rebuilt] 534 kcal p24 c42 f30 -> 665 kcal p28 c44 f41
batch-04-A02.json baked-beef-empanadas [rebuilt] 400 kcal p16 c30 f24 -> 648 kcal p23 c48 f40
batch-04-A02.json tomato-bruschetta-trio [rebuilt] 368 kcal p12 c44 f16 -> 488 kcal p14 c59 f20
batch-04-A03.json lyonnaise-salad-with-bacon-and-poached-egg [rebuilt] 488 kcal p26 c24 f32 -> 629 kcal p31 c42 f37
batch-04-A03.json chickpea-shawarma-wraps [rebuilt] 356 kcal p13 c46 f13 -> 519 kcal p22 c69 f15
batch-04-A03.json pea-and-ham-soup [scaled down] 278 kcal p22 c34 f6 -> 179 kcal p14 c22 f4
batch-04-A03.json currywurst-with-potato-wedges [rebuilt] 576 kcal p24 c48 f32 -> 702 kcal p25 c49 f44
batch-04-A04.json italian-sausage-and-white-bean-pan [rebuilt] 546 kcal p40 c38 f26 -> 664 kcal p34 c44 f36
batch-04-A04.json honey-soy-chicken-drumsticks [rebuilt] 386 kcal p34 c22 f18 -> 482 kcal p35 c22 f28
batch-04-A04.json pollo-a-la-brasa-peruvian-chicken [rebuilt] 532 kcal p48 c4 f36 -> 769 kcal p57 c2 f59
batch-04-A05.json huevos-divorciados [rebuilt] 370 kcal p18 c34 f18 -> 582 kcal p28 c54 f26
batch-04-A05.json cochinita-pibil-style-slow-pork [rebuilt] 350 kcal p30 c26 f14 -> 575 kcal p51 c30 f27
batch-04-A05.json beef-picadillo-with-olives-raisins-and-rice [rebuilt] 512 kcal p26 c66 f16 -> 700 kcal p41 c69 f28
batch-04-A05.json pernil-style-roast-pork-shoulder [rebuilt] 370 kcal p40 c3 f22 -> 599 kcal p62 c4 f37
batch-04-A05.json peruvian-style-roast-chicken-with-lime-and-cumin [rebuilt] 418 kcal p38 c26 f18 -> 524 kcal p37 c25 f30
batch-04-A05.json tapioca-cheese-rolls [scaled down] 531 kcal p11 c61 f27 -> 359 kcal p7 c41 f18
batch-04-A05.json chermoula-chicken-braise-with-green-olives [rebuilt] 586 kcal p40 c48 f26 -> 835 kcal p62 c57 f39
batch-04-A05.json harissa-roast-chicken-with-chickpeas [rebuilt] 470 kcal p44 c24 f22 -> 656 kcal p54 c21 f38
batch-04-A05.json lamb-apricot-and-almond-tagine [rebuilt] 554 kcal p38 c60 f18 -> 771 kcal p52 c68 f31
batch-04-A05.json garlicky-black-bean-and-plantain-rice-bowls [rebuilt] 508 kcal p14 c86 f12 -> 740 kcal p22 c120 f16
batch-04-A05.json czech-style-roast-pork-with-caraway-and-sauerkraut [rebuilt] 400 kcal p40 c24 f16 -> 633 kcal p54 c32 f31
batch-04-A06.json porchetta-style-pork-belly-with-fennel-and-rosemary [rebuilt] 652 kcal p44 c2 f52 -> 1002 kcal p60 c1 f84
batch-04-A06.json chicken-cacciatore-with-olives-and-capers [scaled down] 675 kcal p70 c20 f35 -> 458 kcal p48 c14 f24
batch-04-A06.json fennel-sausages-baked-with-cannellini-and-rosemary [rebuilt] 476 kcal p28 c28 f28 -> 633 kcal p32 c29 f41
batch-04-A06.json ham-and-gruyere-crepes-with-fried-egg [rebuilt] 416 kcal p26 c24 f24 -> 536 kcal p35 c31 f30
batch-04-A06.json chicken-with-chorizo-and-sherry [rebuilt] 448 kcal p38 c20 f24 -> 655 kcal p64 c24 f33
batch-04-A06.json lamb-hotpot-with-sliced-potato-crust [rebuilt] 436 kcal p34 c30 f20 -> 624 kcal p47 c35 f32
batch-04-A07.json carne-asada-steak-bowls-with-lime-rice [rebuilt] 620 kcal p40 c70 f20 -> 967 kcal p60 c89 f39
batch-04-A07.json spiced-lamb-patties-with-harissa-eggs [rebuilt] 331 kcal p22 c20 f18 -> 493 kcal p36 c35 f23
batch-04-A07.json baked-falafel-plates-with-tahini [rebuilt] 219 kcal p10 c24 f10 -> 338 kcal p14 c31 f16
batch-04-A07.json dark-sugar-braised-chicken-with-thyme-and-carrot [rebuilt] 578 kcal p38 c66 f18 -> 873 kcal p66 c85 f29
batch-04-A07.json szekely-pork-and-sauerkraut-stew [rebuilt] 366 kcal p34 c8 f22 -> 535 kcal p45 c8 f35
batch-04-A07.json rinderrouladen-with-mustard-and-pickles [rebuilt] 510 kcal p44 c34 f22 -> 713 kcal p63 c39 f33
batch-04-A07.json chicken-leek-and-ham-pie [rebuilt] 323 kcal p17 c19 f20 -> 529 kcal p31 c31 f31
batch-04-A08.json chipotle-honey-pork-ribs [rebuilt] 572 kcal p44 c18 f36 -> 759 kcal p76 c21 f41
batch-04-A08.json spatchcock-chicken-with-parsley-and-garlic [rebuilt] 622 kcal p44 c26 f38 -> 831 kcal p48 c30 f57
batch-04-A08.json trinidad-style-potato-and-chickpea-roti-wraps [rebuilt] 202 kcal p6 c31 f6 -> 363 kcal p11 c57 f9
batch-04-A08.json polish-meatballs-in-dill-cream-sauce [rebuilt] 548 kcal p34 c40 f28 -> 863 kcal p48 c60 f47
batch-04-A08.json bacon-and-caraway-onion-tart-german-style [rebuilt] 278 kcal p8 c18 f19 -> 507 kcal p13 c30 f37
batch-04-A08.json pan-fried-salmon-cakes-with-lemon-mayo [rebuilt] 522 kcal p30 c24 f34 -> 759 kcal p34 c31 f55
batch-04-A08.json provencal-lamb-shoulder-with-white-beans [rebuilt] 420 kcal p42 c18 f20 -> 686 kcal p67 c16 f38
batch-04-A09.json pork-belly-gyro-plates-with-lemon-potatoes [rebuilt] 694 kcal p38 c32 f46 -> 1019 kcal p53 c31 f75
batch-04-A09.json pepper-steak-with-mushroom-sauce-and-chips [rebuilt] 384 kcal p23 c28 f20 -> 792 kcal p56 c51 f40
batch-04-A09.json baked-gnocchi-alla-sorrentina [rebuilt] 1105 kcal p45 c130 f45 -> 589 kcal p25 c61 f25
batch-04-A09.json pork-fillet-saltimbocca-with-sage-potatoes [rebuilt] 400 kcal p40 c24 f16 -> 524 kcal p46 c30 f24
batch-04-A09.json coq-au-riesling-style-chicken-with-bacon-and-onions [rebuilt] 524 kcal p38 c30 f28 -> 771 kcal p54 c58 f35
batch-04-A11.json poulet-r-ti-l-ail-roast-chicken-with-whole-garlic [rebuilt] 506 kcal p40 c28 f26 -> 768 kcal p59 c28 f46
batch-04-A13.json arroz-al-horno-spanish-baked-rice-with-pork-ribs-and-chorizo [scaled down] 705 kcal p38 c55 f37 -> 516 kcal p28 c40 f27
batch-04-A14.json puerto-rican-pollo-guisado [rebuilt] 420 kcal p36 c24 f20 -> 542 kcal p47 c28 f26
batch-04-A15.json hunkar-begendi-turkish-lamb-stew-on-smoky-eggplant-puree [rebuilt] 456 kcal p33 c18 f28 -> 732 kcal p49 c36 f42
batch-04-A15.json nashville-hot-chicken [rebuilt] 417 kcal p24 c24 f25 -> 731 kcal p40 c50 f41
batch-04-A15.json milanesa-napolitana-argentinian-crumbed-beef-with-ham-tomato-and-cheese [rebuilt] 616 kcal p40 c42 f32 -> 849 kcal p64 c23 f55
batch-04-A16.json uova-in-purgatorio-eggs-in-tomato-purgatory [rebuilt] 470 kcal p19 c50 f22 -> 575 kcal p25 c54 f27
batch-04-A16.json irish-stew-lamb-and-potato [rebuilt] 500 kcal p37 c36 f22 -> 729 kcal p59 c46 f33
batch-04-A16.json sopes-de-frijol-mexican-bean-sopes [rebuilt] 580 kcal p18 c68 f28 -> 866 kcal p26 c93 f40
batch-04-A17.json loubia-moroccan-white-bean-stew-with-paprika-and-cumin [rebuilt] 175 kcal p7 c21 f7 -> 270 kcal p11 c26 f12
batch-04-A18.json khachapuri-adjaruli-georgian-cheese-boat-with-egg [rebuilt] 700 kcal p24 c70 f36 -> 1030 kcal p47 c83 f56
batch-04-A18.json kibinai-lithuanian-lamb-pasties [rebuilt] 476 kcal p22 c34 f28 -> 711 kcal p27 c53 f43
batch-04-A18.json karjalanpiirakka-with-egg-butter-karelian-rice-pasties [rebuilt] 379 kcal p14 c47 f15 -> 543 kcal p16 c62 f25
batch-04-A19.json roast-chicken-with-sage-and-onion-stuffing [rebuilt] 628 kcal p46 c48 f28 -> 837 kcal p51 c64 f41
batch-04-A19.json arroz-negro-spanish-black-squid-ink-rice [rebuilt] 496 kcal p30 c58 f16 -> 776 kcal p43 c64 f38
batch-04-A20.json mansaf-jordanian-lamb-in-yoghurt-sauce-with-rice [rebuilt] 610 kcal p38 c56 f26 -> 947 kcal p68 c75 f41
batch-04-A21.json new-england-boiled-dinner-corned-beef-cabbage-and-root-vegetables [rebuilt (judgement)] 448 kcal p42 c34 f16 -> 688 kcal p67 c43 f26
batch-04-A21.json bifteki-greek-oregano-beef-patties-with-feta-and-lemon-potatoes [rebuilt] 496 kcal p36 c34 f24 -> 749 kcal p50 c48 f39
batch-04-A21.json pollo-alla-cacciatora-hunters-chicken-with-tomato-olives-and-capsicum [rebuilt] 424 kcal p40 c12 f24 -> 650 kcal p51 c11 f44
batch-04-A21.json saltimbocca-di-pollo-chicken-with-prosciutto-and-sage [rebuilt] 362 kcal p46 c4 f18 -> 497 kcal p54 c5 f29
batch-04-A22.json kapama-greek-cinnamon-chicken-braised-in-tomato [rebuilt] 482 kcal p42 c38 f18 -> 680 kcal p47 c45 f34
batch-04-A23.json chicken-and-mushroom-pie-with-thyme-and-puff-pastry-lid [rebuilt] 333 kcal p20 c17 f21 -> 561 kcal p31 c30 f35
batch-04-A23.json sausage-and-bean-casserole-slow-cooker-pork-sausages-in-tomato [scaled down] 188 kcal p11 c11 f11 -> 136 kcal p8 c8 f8
batch-04-A23.json cheese-boreks-turkish-feta-and-parsley-filo-rolls [rebuilt] 274 kcal p11 c17 f18 -> 389 kcal p14 c13 f31
batch-04-A23.json leek-and-potato-pie-with-cheddar-and-puff-pastry [rebuilt] 286 kcal p9 c23 f18 -> 518 kcal p13 c43 f32
batch-04-A23.json roasted-cauliflower-shawarma-with-tahini-and-pickles [rebuilt] 271 kcal p8 c28 f14 -> 436 kcal p11 c46 f22
batch-04-A24.json schweinebraten-bavarian-roast-pork-with-beer-gravy [rebuilt] 504 kcal p40 c32 f24 -> 773 kcal p71 c37 f37
batch-04-A25.json lamb-kofta-flatbreads-with-yoghurt-and-cucumber [rebuilt] 312 kcal p18 c27 f14 -> 475 kcal p38 c37 f19
batch-04-A25.json torta-ahogada-guadalajara-drowned-pork-sandwich [scaled down] 504 kcal p31 c50 f20 -> 342 kcal p21 c34 f14
batch-04-A27.json gigot-d-agneau-aux-anchois-french-roast-leg-of-lamb-with-anchovy-and-garlic [rebuilt] 422 kcal p43 c22 f18 -> 693 kcal p61 c28 f37
batch-04-A27.json steak-frites-bistro-pan-seared-steak-with-oven-chips-and-pepper-butter [rebuilt] 348 kcal p23 c20 f19 -> 629 kcal p52 c39 f29
batch-04-A27.json lancashire-hotpot-lamb-and-potato-pot [rebuilt] 462 kcal p34 c32 f22 -> 737 kcal p57 c46 f35
batch-04-A27.json caldereta-de-cordero-spanish-lamb-stew-with-peppers-and-wine [rebuilt] 490 kcal p38 c26 f26 -> 681 kcal p54 c35 f35
batch-04-A28.json chicken-marengo-napoleonic-chicken-with-tomato-mushrooms-and-wine [rebuilt] 176 kcal p16 c4 f11 -> 682 kcal p57 c14 f44
batch-04-A28.json garbanzos-con-espinacas-andalusian-chickpeas-with-spinach-and-cumin [rebuilt] 211 kcal p8 c20 f11 -> 330 kcal p11 c32 f16
batch-04-A28.json boston-baked-beans-with-smoked-sausage [rebuilt] 183 kcal p9 c23 f6 -> 235 kcal p12 c23 f9
batch-04-A29.json chip-butty-english-hot-chips-in-buttered-bread [rebuilt] 272 kcal p5 c42 f10 -> 431 kcal p5 c45 f25
batch-04-A29.json tarte-a-la-moutarde-french-tomato-and-mustard-tart [rebuilt] 341 kcal p13 c21 f23 -> 489 kcal p21 c26 f33
batch-04-A30.json piadina-romagnola-with-prosciutto-mozzarella-and-rocket [rebuilt] 336 kcal p17 c34 f15 -> 497 kcal p23 c35 f29
batch-04-A32.json pupusas-de-queso-y-frijoles-salvadoran-bean-and-cheese-pupusas [rebuilt] 500 kcal p22 c70 f14 -> 741 kcal p31 c96 f23
batch-04-A32.json chicken-tikka-roti-wrap-with-mint-yoghurt [rebuilt] 278 kcal p24 c29 f8 -> 523 kcal p43 c48 f17
batch-04-A32.json egg-roti-wrap-malaysian-style-roti-telur [rebuilt] 256 kcal p15 c24 f12 -> 496 kcal p23 c55 f20
batch-04-A34.json kale-and-bean-quesadilla [rebuilt] 620 kcal p30 c72 f22 -> 964 kcal p46 c130 f26
batch-04-A35.json mee-goreng-mamak-malaysian-spicy-fried-noodles [rebuilt] 560 kcal p24 c68 f21 -> 820 kcal p34 c105 f28
batch-04-A35.json vegetable-uttapam-south-indian-savoury-pancake [rebuilt] 290 kcal p7 c46 f8 -> 461 kcal p10 c70 f15
batch-04-A35.json egg-kathi-roll-calcutta-style [rebuilt] 261 kcal p10 c23 f15 -> 379 kcal p15 c27 f23
batch-04-A36.json harissa-chicken-flatbread-with-yoghurt-and-herbs [rebuilt] 302 kcal p26 c25 f10 -> 467 kcal p44 c38 f15
batch-04-B01.json silken-tofu-and-mushrooms-in-chilli-bean-sauce [scaled down] 678 kcal p27 c93 f22 -> 460 kcal p18 c63 f15
batch-04-B01.json south-african-milk-tart-squares [rebuilt] 84 kcal p2 c10 f4 -> 139 kcal p4 c15 f7
batch-04-B03.json chilled-silken-tofu-with-ginger-soy [rebuilt] 278 kcal p22 c7 f18 -> 130 kcal p10 c4 f8
batch-04-B03.json spicy-silken-tofu-pot-with-cracked-egg [scaled down] 477 kcal p34 c29 f25 -> 268 kcal p19 c16 f14
batch-04-B03.json apricot-almond-chicken-drumstick-pot [rebuilt] 416 kcal p27 c49 f13 -> 731 kcal p43 c69 f31
batch-04-B04.json crisp-skin-soy-glazed-roast-chicken [rebuilt] 408 kcal p29 c42 f14 -> 931 kcal p64 c85 f37
batch-04-B04.json tamagoyaki-rolled-omelette-breakfast-plates [rebuilt] 436 kcal p20 c52 f16 -> 632 kcal p26 c86 f20
batch-04-B05.json soy-poached-chicken-with-ginger-spring-onion-oil [rebuilt] 626 kcal p44 c62 f22 -> 1036 kcal p64 c77 f52
batch-04-B07.json curry-egg-roti-pockets [rebuilt] 283 kcal p12 c24 f15 -> 527 kcal p23 c47 f27
batch-04-B07.json p-t-baguette-with-pan-fried-eggs-and-soy [rebuilt] 260 kcal p13 c26 f12 -> 426 kcal p20 c45 f18
batch-04-B07.json kenyan-spiced-potato-mashed-bread-wraps [rebuilt] 225 kcal p5 c36 f6 -> 345 kcal p9 c55 f9
batch-04-B07.json chickpea-coconut-curry-wraps [rebuilt] 292 kcal p9 c37 f11 -> 446 kcal p14 c54 f18
batch-04-B08.json tofu-and-mushroom-vegan-lunch-pot [rebuilt] 462 kcal p22 c60 f14 -> 696 kcal p35 c83 f24
batch-04-B08.json goya-free-okinawan-pork-and-tofu-champuru [rebuilt] 386 kcal p24 c8 f28 -> 569 kcal p40 c4 f43
batch-04-B08.json mushroom-matar-lunch-curry-with-roti [rebuilt] 166 kcal p6 c23 f4 -> 275 kcal p10 c41 f7
batch-04-B08.json sri-lankan-egg-roti-lunch-pockets [rebuilt] 196 kcal p9 c20 f8 -> 442 kcal p20 c49 f18
batch-04-B08.json ugandan-chapati-egg-rolls [rebuilt] 200 kcal p9 c20 f9 -> 442 kcal p20 c49 f18
batch-04-B08.json maize-pap-bowls-with-curried-tomato-onion [scaled down] 364 kcal p8 c62 f8 -> 256 kcal p6 c44 f6
batch-04-B09.json mandazi-spiced-coconut-breakfast-fingers [rebuilt] 442 kcal p10 c72 f12 -> 705 kcal p14 c91 f31
batch-04-B09.json kampala-street-rolex-omelette-wraps [rebuilt] 254 kcal p14 c25 f10 -> 365 kcal p19 c28 f19
batch-04-B09.json ethiopian-spiced-scrambled-eggs-with-flatbread [rebuilt] 276 kcal p14 c25 f13 -> 420 kcal p20 c43 f18
batch-04-B09.json indian-egg-paratha-rolls-with-mint-yoghurt [rebuilt] 189 kcal p10 c17 f8 -> 315 kcal p16 c28 f15
batch-04-B13.json lechon-kawali-crispy-pork-belly-with-vinegar-dip [rebuilt] 880 kcal p36 c50 f58 -> 1274 kcal p56 c59 f90
batch-04-B14.json thit-kho-hot-vit-pork-and-egg-braise [rebuilt] 746 kcal p38 c62 f38 -> 1120 kcal p60 c66 f68
batch-04-B16.json mi-quang-central-vietnamese-turmeric-noodles [rebuilt] 518 kcal p34 c62 f14 -> 736 kcal p48 c80 f24
batch-04-B16.json kothu-roti-sri-lankan-chopped-roti [rebuilt] 295 kcal p15 c31 f12 -> 533 kcal p29 c56 f21
batch-04-B16.json awaze-tibs-spiced-ethiopian-beef-saute [rebuilt] 307 kcal p22 c23 f14 -> 469 kcal p39 c39 f17
batch-04-B20.json gua-bao-taiwanese-braised-pork-belly-buns-with-peanut [rebuilt] 570 kcal p24 c36 f36 -> 884 kcal p42 c74 f46
batch-04-B21.json pap-en-wors-south-african-maize-porridge-with-sausage-and-tomato-relish [rebuilt] 594 kcal p24 c46 f34 -> 821 kcal p35 c49 f53
batch-04-B21.json ethiopian-fasting-plate-with-gomen-greens-and-spiced-lentils [rebuilt] 330 kcal p12 c49 f8 -> 473 kcal p18 c67 f13
batch-04-B22.json budae-jjigae-korean-army-stew [scaled down] 508 kcal p24 c38 f28 -> 364 kcal p17 c27 f20
batch-04-B22.json gamjatang-pork-bone-and-potato-stew [rebuilt] 738 kcal p36 c78 f30 -> 1024 kcal p74 c98 f36
batch-04-B23.json kai-jeow-moo-sap-thai-pork-omelette-rice-bowl [rebuilt] 770 kcal p30 c76 f38 -> 1191 kcal p43 c76 f79
batch-04-B28.json tabaka-uzbek-flattened-chicken-with-garlic [rebuilt] 241 kcal p19 c14 f12 -> 768 kcal p57 c31 f46
batch-04-B28.json tawa-machhi-mumbai-pan-fried-spiced-fish [rebuilt] 259 kcal p21 c22 f9 -> 385 kcal p35 c26 f15
batch-04-B28.json tandoori-gobi-roasted-spiced-cauliflower [rebuilt] 140 kcal p5 c17 f5 -> 260 kcal p8 c33 f10
batch-04-B30.json onion-pakoras [rebuilt] 278 kcal p9 c26 f14 -> 414 kcal p9 c24 f30
batch-04-B32.json orange-almond-biscotti [rebuilt] 198 kcal p5 c30 f6 -> 285 kcal p7 c43 f9
batch-04-B32.json potato-latkes [rebuilt] 367 kcal p9 c38 f19 -> 582 kcal p9 c40 f42
batch-04-B32.json spinach-and-ricotta-filo-rolls [rebuilt] 148 kcal p7 c12 f8 -> 226 kcal p9 c11 f16
batch-04-B32.json tomato-basil-bruschetta-bites [rebuilt] 143 kcal p4 c20 f5 -> 211 kcal p4 c23 f11
batch-04-B34.json paneer-gulab-jamun [rebuilt] 252 kcal p7 c33 f10 -> 374 kcal p12 c45 f16
batch-04-B34.json rasgulla-syrupy-cheese-balls [rebuilt] 172 kcal p7 c18 f8 -> 275 kcal p8 c45 f7
batch-04-B35.json frankfurt-muffin-bites [rebuilt] 229 kcal p8 c17 f14 -> 341 kcal p11 c31 f19
batch-04-C01.json miso-mushroom-soup-with-soba-and-spinach [rebuilt] 342 kcal p16 c56 f6 -> 510 kcal p20 c90 f6
batch-04-C01.json lemongrass-prawn-soup-with-rice-noodles [rebuilt] 266 kcal p27 c35 f2 -> 413 kcal p51 c40 f5
batch-04-C01.json som-tam-style-green-mango-salad [rebuilt] 113 kcal p4 c16 f3 -> 169 kcal p4 c21 f7
batch-04-C01.json blistered-broccolini-with-garlic-and-sesame [rebuilt] 60 kcal p3 c3 f4 -> 89 kcal p1 c0 f9
batch-04-C02.json silky-ramen-style-chicken-broth-with-greens [rebuilt (judgement)] 454 kcal p32 c50 f14 -> 361 kcal p30 c43 f7
batch-04-C02.json cucumber-yoghurt-salad-with-toasted-cumin-and-chilli [scaled down] 107 kcal p8 c12 f3 -> 72 kcal p5 c8 f2
batch-04-C04.json ensaladang-mangga-green-mango-salad [scaled down] 131 kcal p3 c25 f1 -> 93 kcal p2 c18 f1
batch-04-C05.json nigerian-style-chicken-pepper-soup [scaled down] 262 kcal p32 c6 f12 -> 188 kcal p23 c4 f9
batch-04-C07.json roti-canai-with-dhal-dipping-curry [rebuilt] 476 kcal p14 c66 f16 -> 721 kcal p21 c100 f25
batch-04-C07.json sourdough-crumpets [rebuilt] 184 kcal p5 c27 f6 -> 301 kcal p8 c42 f11
batch-04-C08.json ribollita-tuscan-bread-soup [scaled down] 405 kcal p15 c50 f13 -> 296 kcal p11 c37 f10
batch-04-C09.json moroccan-spiced-lentil-harira-soup [scaled down] 317 kcal p14 c44 f7 -> 229 kcal p10 c32 f5
batch-04-C12.json soy-milk-with-you-tiao-crullers-singapore-style [rebuilt] 408 kcal p14 c55 f14 -> 678 kcal p14 c73 f36
batch-04-C12.json egg-white-spinach-omelette-muffins-high-protein [rebuilt] 202 kcal p20 c3 f12 -> 328 kcal p25 c7 f22
batch-04-C12.json egyptian-style-mashed-bean-breakfast-with-tomato [rebuilt] 251 kcal p11 c31 f7 -> 400 kcal p14 c54 f12
batch-04-C13.json okonomiyaki-cabbage-pancake [rebuilt] 434 kcal p21 c36 f22 -> 664 kcal p26 c48 f40
batch-04-C13.json miso-soup-with-tofu-and-wakame [scaled down] 88 kcal p7 c5 f4 -> 63 kcal p5 c4 f3
batch-04-C15.json polish-zupa-ogorkowa-pickle-soup [rebuilt] 236 kcal p6 c28 f10 -> 356 kcal p11 c35 f18
batch-04-C15.json russian-shchi-cabbage-soup [rebuilt] 204 kcal p17 c14 f8 -> 286 kcal p18 c20 f14
batch-04-C15.json swedish-rtsoppa-yellow-pea-soup [rebuilt] 245 kcal p20 c28 f4 -> 313 kcal p25 c37 f5
batch-04-C16.json nigerian-moi-moi-steamed-bean-pudding [rebuilt] 222 kcal p12 c20 f9 -> 328 kcal p15 c28 f16
batch-04-C17.json tahitian-poisson-cru-coconut-fish-salad [rebuilt] 266 kcal p26 c8 f14 -> 374 kcal p50 c11 f14
batch-04-C18.json japanese-hiyayakko-chilled-tofu-with-ginger-and-bonito [scaled down] 150 kcal p14 c5 f8 -> 105 kcal p10 c3 f6
batch-04-C18.json korean-kongnamul-guk-bean-sprout-soup [rebuilt] 73 kcal p5 c5 f3 -> 104 kcal p9 c2 f6
batch-04-C19.json middle-eastern-hummus-masabacha-warm-chickpeas [rebuilt] 182 kcal p7 c15 f9 -> 317 kcal p12 c22 f19
batch-04-C22.json persian-nargesi-spinach-and-egg-pan [rebuilt] 184 kcal p8 c19 f8 -> 331 kcal p13 c39 f13
batch-04-C22.json greek-strapatsada-tomato-and-feta-scramble [rebuilt] 341 kcal p19 c22 f19 -> 468 kcal p25 c32 f26
batch-04-C23.json ethiopian-firfir-spiced-torn-flatbread [rebuilt] 109 kcal p3 c16 f3 -> 252 kcal p6 c38 f8
batch-04-C24.json swedish-hasselbackspotatis-fanned-roast-potatoes [rebuilt] 370 kcal p10 c44 f16 -> 547 kcal p10 c77 f21
batch-04-C25.json french-soupe-a-l-oignon-gratinee-onion-soup-with-cheese-toast [rebuilt] 427 kcal p17 c40 f21 -> 683 kcal p24 c88 f25
batch-04-C28.json spanish-fabada-style-white-bean-soup-with-chorizo [rebuilt] 287 kcal p15 c29 f10 -> 421 kcal p22 c36 f19
batch-04-C28.json fijian-rourou-spinach-in-coconut-cream [rebuilt] 219 kcal p5 c9 f17 -> 322 kcal p5 c10 f28
batch-04-C30.json korean-seolleongtang-ox-bone-soup [rebuilt] 398 kcal p34 c38 f12 -> 579 kcal p43 c54 f21
batch-04-C30.json korean-galbitang-short-rib-soup [rebuilt] 420 kcal p30 c24 f22 -> 674 kcal p62 c24 f36
batch-04-C30.json korean-dwaeji-gukbap-pork-and-rice-soup [rebuilt] 404 kcal p34 c30 f16 -> 584 kcal p55 c27 f28
batch-04-C30.json korean-dakgomtang-chicken-soup [rebuilt (judgement)] 223 kcal p21 c21 f6 -> 553 kcal p59 c45 f15
batch-04-C30.json japanese-kimchi-nabe [rebuilt] 420 kcal p24 c38 f18 -> 548 kcal p34 c33 f30
batch-04-C30.json lao-jeow-mak-len-roasted-tomato-dip [rebuilt] 48 kcal p2 c9 f0 -> 61 kcal p2 c10 f1
batch-04-C33.json mexican-quick-pickled-red-onions [rebuilt] 56 kcal p0 c13 f0 -> 89 kcal p2 c17 f1
batch-04-C34.json smoked-salmon-and-dill-brunch-tart [rebuilt] 211 kcal p9 c9 f15 -> 326 kcal p13 c14 f24
batch-04-C36.json pan-juice-gravy-for-the-holiday-roast [rebuilt] 65 kcal p1 c4 f5 -> 96 kcal p2 c4 f8
batch-04-C37.json slow-baked-beans-for-the-barbecue [rebuilt] 116 kcal p5 c17 f2 -> 181 kcal p8 c24 f5
batch-04-C37.json chilean-cazuela-chicken-and-pumpkin-stew [rebuilt] 198 kcal p13 c19 f7 -> 353 kcal p25 c28 f15
batch-04-C37.json sweet-potato-and-black-bean-chilli-soup [rebuilt] 151 kcal p6 c22 f3 -> 214 kcal p10 c31 f4
batch-04-C38.json garlic-bread-foil-parcels [rebuilt] 122 kcal p2 c13 f6 -> 180 kcal p2 c11 f14
batch-04-C38.json lemon-garlic-aioli [rebuilt] 112 kcal p0 c1 f12 -> 179 kcal p0 c2 f19
batch-04-C41.json gluten-free-cornbread-stuffing-muffins [rebuilt] 228 kcal p7 c26 f10 -> 350 kcal p11 c57 f8
batch-04-C42.json korean-spring-onion-and-sesame-pesto [rebuilt] 104 kcal p1 c2 f10 -> 163 kcal p1 c1 f17
batch-04-C43.json fried-plantain-with-pepper-sauce [rebuilt] 247 kcal p1 c35 f11 -> 397 kcal p3 c43 f23
batch-04-C43.json puerto-rican-tostones-with-garlic-mojo [rebuilt] 380 kcal p2 c46 f20 -> 547 kcal p2 c36 f43
batch-04-C44.json spanish-huevos-rotos-with-potatoes [rebuilt] 546 kcal p22 c36 f34 -> 740 kcal p20 c46 f52
batch-04-C44.json grilled-mango-yoghurt-breakfast-bowl [rebuilt] 247 kcal p9 c38 f6 -> 363 kcal p11 c49 f13
```

### Spot audit (10 random batch-04 recipes, seed 20261017, counted by hand from AUSNUT/USDA figures)

| Recipe | Stated | Hand count | Off by |
| --- | --- | --- | --- |
| Black sesame mochi waffles | 458 | 530 | -14% |
| Arroz con leche | 293 | 293 | 0% |
| Tendon prawn tempura rice bowl | 623 | 680 | -8% |
| Carbonada criolla | 388 | 460 | -16% |
| Pico de gallo | 46 | 41 | +12% |
| Pepper steak with mushroom sauce and chips | 384 (now 792) | 915 | -58% (now -13%) |
| Beetroot hummus with veggie sticks | 210 | 208 | +1% |
| Georgian ajika | 69 | 59 | +17% |
| Chilled cucumber and yoghurt soup | 271 | 296 | -8% |
| Creamy garlic mushroom sauce | 220 | 254 | -13% |

As found: mean error 15%, median 12.5%, 9 of 10 within 20%. The miss was the pepper steak: the
estimator couldn't weigh "4 beef sirloin" and read frozen chips as raw potato, so it looked fine
at 384 kcal. Fixed (with two other steak-and-chips recipes). After that, mean error 10%, all 10
within 20%, and the lean is low: 6 of 10 under, average -6%. Treat stated figures as about
+/-15%, slightly understated.

## Left as is

- Two domain tests failed after the slice merges. "every cuisine has an eyebrow colour" was a code
  gap: batch 04 added `caribbean`, `east-african` and `pacific-islands` to `CUISINES` without a
  colour family. Fixed in `src/ui/tokens/cuisine.ts` (Caribbean with Latin American, the other
  two with "other"); the test was right.
- `recipes.test.ts` "says which model wrote every AI-assisted recipe (batch 03)" still fails, and
  the test is right. Chunk 01 brought in batch 03's types and this test, but the batch-03 recipes
  (`scripts/data/house-recipes/batch-03.json`, merged into main in 3fe688f) are not on this branch,
  so there are no `ai-assisted` recipes to check. It passes once this branch takes main (or lands
  on it); that merge has two conflicts (`package.json`, `scripts/validate-house-recipes.mts`) and
  needs the owner's go-ahead.
- `catalogue:validate` with no file list also checks batch-01/02 (150 older drafts), which fail on
  their own long-standing issues (no nutrition, food-safety notes); not touched here.
