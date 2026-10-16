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

## Left as is

- 150 batch-04 recipes still sit between 0.55 and 0.7 of the estimate (pass, but likely
  understated; many are bone-in chicken and slow-cooked fatty cuts, where the estimator
  over-counts). Worth a second pass with a tighter band once bone-in poultry is handled.
- Two domain tests failed before this work and still fail (`recipes.test.ts:147` batch-03
  AI-model attribution, and "every cuisine has an eyebrow colour": no family for
  `caribbean`). Both come from the slice merges, not nutrition.
