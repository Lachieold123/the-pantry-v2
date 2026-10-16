# Nutrition audit, 17 Oct 2026

A batch-04 generator reported scaling stated nutrition up to "match the validator's
estimator, which reads about 2x my macros on stews and rice dishes". This audit checks
which side was wrong.

## Verdict

The estimator was biased high, by 1.2x to 1.8x on curries, coconut stews and rice
dishes, and generators inflated stated nutrition to clear its 0.55x floor. The stated
figures that were *not* inflated were mostly close to a hand count.

It was not a per-recipe vs per-serve mix-up (it divides by servings correctly), not a
cooked vs dry mix-up (rice, pasta and pulses are listed dry and costed dry) and not a
missing-yield problem. The causes were table and conversion errors in
`scripts/validate-house-recipes.mts`:

| Cause | Effect |
| --- | --- |
| `coconut-milk` and `coconut-cream` hit the `/nut/` rule before their own rules | 590 kcal/100 g instead of 190 and 330 (3.1x and 1.8x). Also `almond-milk` at 590 instead of about 20. |
| Every cup measured at water density unless listed | 1 cup dry rice = 250 g (real about 200 g); grated cheese, nuts, oats, desiccated coconut, herbs and frozen peas 1.5x to 6x too heavy |
| Spring onion and shallot matched the `onion` rule | 130 g each instead of about 15 g and 30 g |
| Every tin = 400 g | Tuna tins are 185 g; tinned pulses are about 240 g drained |
| Ricotta in the hard-cheese rule | 330 kcal instead of about 150 |
| Smaller errors | beef shin/chuck at fatty-mince 220 (now 165), skinless thigh 170 (now 150), dashi 120 (now 5), sugar-snap peas 380 (sugar rule), fresh/hokkien/udon noodles costed as dry, `brandy` caught by `bran`; mayo, aioli, pesto and sweet sauces were under-counted |

## Hand check (per serve, standard AUSNUT/USDA per-100 g figures)

| Recipe (slice) | Type | Stated kcal | Hand kcal | Old estimate | Fixed estimate |
| --- | --- | --- | --- | --- | --- |
| rendang-daging-slow-beef (B07) | coconut stew | 474 | ~485 | 857 | 446 |
| slow-braised-beef-shin-ragu (A04) | stew + pasta | 560 | ~625 | 773 | 681 |
| malaysian-chicken-curry-mee-soup (C08) | coconut curry | 598 | ~655 | 969 | 607 |
| olive-and-capsicum-chicken-pot-rice-dominican-style (A08) | rice | 476 | ~580 | 729 | 622 |
| samoan-style-coconut-fish-with-rice (B04) | coconut + rice | 600 | ~670 | 1071 | 703 |
| lemon-ricotta-cake (A01) | baking | 276 | ~285 | 331 | 272 |
| tuna-and-white-bean-salad (C07) | salad | **1033** | ~425 | 1145 | 551 |
| mexican-street-corn-and-bean-salad (C01) | salad | 327 | ~300 | 260 | 260 |

Hand macros agreed with stated macros within a few grams for the rendang (P 36 / C 15 /
F 32 vs 42 / 12 / 28) and the cake (P 7 / C 37 / F 12 vs 8 / 34 / 12). The C07 tuna salad
is a clear case of chasing the estimator: "2 tins tuna" was costed at 800 g, and the
stated 1033 kcal / 96 g protein is about 2.4x a hand count.

Across all 1,287 slice recipes, median stated / estimate moved from 0.89 to 0.97
(stews 0.83 to 0.99, rice dishes 0.81 to 0.99, coconut dishes 0.82 to 1.08), so the
fixed estimator no longer leans high.

## What changed (house-recipes-batch-04)

- `scripts/nutrition-estimate.mts`: the estimator moved out of the validator, with the
  fixes above. The validator imports `estimateKcalPerServe`; its thresholds are unchanged.
- `scripts/nutrition-estimate.test.mts`: tests for the fixed rules and a coconut-rice
  hand count (runs in `npm run test:domain`).
- `scripts/renormalise-nutrition.mts`: lists recipes whose stated kcal is above 1.35x or
  below 0.7x the estimate (where at least 75% of lines can be weighed). `--write` scales
  only the high ones down to the estimate (kcal, protein, carbs, fat and fibre together,
  sodium untouched). Low ones are listed for a person, because a low estimate usually
  means lines it can't weigh.

## Slice files with inflated values (snapshot, 17 Oct, not changed)

Report-only run over the slice worktrees as they stood (37 files, generators still
running): 139 recipes stated above 1.35x the fixed estimate, 35 of them above 1.8x (those
will fail the fixed validator).

Count of high recipes per file:

A01 1, A02 2, A03 2, A05 1, A06 3, A07 8, A08 4, A09 2, A10 1, B01 13, B02 13, B03 19, B04 2, B05 4, B06 2, B07 5, B08 4, B09 3, B10 1, C01 5, C02 7, C03 1, C04 7, C05 5, C06 4, C07 4, C08 2, C09 3, C10 2, C11 3, C12 6

B01 to B03 (45 between them) and the coconut dishes in every slice are the worst. Above 1.8x:

- batch-04-A06.json paper-baked-salmon-with-fennel-beans-and-dill 348 vs 125 (x2.79)
- batch-04-A06.json lamb-cutlets-with-mint-and-pea-smash 432 vs 202 (x2.14)
- batch-04-B01.json vietnamese-sweet-corn-pudding 972 vs 421 (x2.31)
- batch-04-B01.json sri-lankan-coconut-sambol-toasts 510 vs 266 (x1.91)
- batch-04-B01.json pacific-coconut-fish-ceviche-cups 403 vs 217 (x1.85)
- batch-04-B02.json chawanmushi-egg-custard-with-mushroom 256 vs 96 (x2.66)
- batch-04-B02.json che-three-colour-dessert-glass 589 vs 316 (x1.86)
- batch-04-B02.json perkedel-corn-and-potato-patties 282 vs 148 (x1.91)
- batch-04-B02.json serabi-coconut-pancakes 521 vs 275 (x1.89)
- batch-04-B03.json yellow-curry-cauliflower-lunch-pots 497 vs 250 (x1.99)
- batch-04-B03.json slow-coconut-beef-dry-curry 957 vs 472 (x2.03)
- batch-04-B03.json mee-goreng-free-hawker-egg-noodles 656 vs 362 (x1.81)
- batch-04-B03.json kuih-ketayap-pandan-free-coconut-crepes 652 vs 328 (x1.99)
- batch-04-B03.json coconut-macaroon-mounds 426 vs 181 (x2.35)
- batch-04-B03.json spiced-samoan-coconut-rice-pudding 1021 vs 475 (x2.15)
- batch-04-B06.json miso-mushroom-egg-rice-porridge 366 vs 202 (x1.81)
- batch-04-B07.json p-t-baguette-with-pan-fried-eggs-and-soy 496 vs 260 (x1.91)
- batch-04-B08.json mushroom-matar-lunch-curry-with-roti 312 vs 166 (x1.88)
- batch-04-B08.json ugandan-chapati-egg-rolls 396 vs 200 (x1.98)
- batch-04-C02.json overnight-oats-with-coconut-and-mango 885 vs 481 (x1.84)
- batch-04-C02.json soba-noodle-breakfast-bowl-with-soft-egg-and-dashi 720 vs 372 (x1.94)
- batch-04-C02.json raisin-and-almond-breakfast-pudding 1379 vs 315 (x4.38)
- batch-04-C02.json tom-kha-style-mushroom-and-coconut-soup 612 vs 246 (x2.49)
- batch-04-C04.json cornmeal-porridge-with-coconut-and-nutmeg 703 vs 382 (x1.84)
- batch-04-C04.json sayur-lodeh-vegetable-coconut-soup 728 vs 342 (x2.13)
- batch-04-C04.json island-pumpkin-soup-with-lime-and-ginger 656 vs 334 (x1.96)
- batch-04-C04.json fijian-fish-and-coconut-soup 673 vs 348 (x1.93)
- batch-04-C05.json tom-kha-gai-chicken-coconut-soup 651 vs 324 (x2.01)
- batch-04-C05.json supu-ya-samaki-swahili-coconut-fish-soup 678 vs 347 (x1.96)
- batch-04-C06.json pacific-coconut-rice-breakfast-bowl 786 vs 435 (x1.81)
- batch-04-C06.json fiji-style-rourou-greens-with-coconut-milk 610 vs 277 (x2.20)
- batch-04-C07.json tuna-and-white-bean-salad 1033 vs 551 (x1.87)
- batch-04-C08.json green-smoothie-bowl-with-seeds 1210 vs 616 (x1.97)
- batch-04-C12.json warm-freekeh-and-roast-pumpkin-salad-with-tahini 484 vs 237 (x2.04)
- batch-04-C12.json ful-medames-egyptian-fava-bean-breakfast 438 vs 119 (x3.70)

A few of these may be estimator misses rather than inflation (for example a fillet line it
weighs low), so glance at the line count in the script's output before accepting `--write`.

## At merge time

1. Merge each slice branch into house-recipes-batch-04 (after this commit).
2. `npx tsx scripts/renormalise-nutrition.mts --report docs/nutrition-renormalise.txt`
   and review the HIGH list.
3. `npx tsx scripts/renormalise-nutrition.mts --write`, then `npm run catalogue:validate`.
