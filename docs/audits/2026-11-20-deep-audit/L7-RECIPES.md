# Lane 7: Recipes, food safety and content

Audit of 20 Nov 2026, branch `audit/deep-1120` at 8bbbacd. Read-only. Evidence is in `evidence/L7/` and the scripts are in `tools/L7/`.

## Summary

**18 findings: S1 3, S2 7, S3 6, S4 2.**

How exposed people are: all 28 hand-checked wrong allergen and diet cases are `ai-draft` recipes. Those show only in dev builds, or with `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1`. Store builds ship 271 reviewed recipes. Those 271 carry the food-safety gaps in FOOD-4, not the allergen errors.

The five worst:

1. **FOOD-2.** Wrong ingredient links hide allergens from "Ingredients to avoid":
   - kingfish is linked to beef steak
   - pork scotch fillet is linked to beef rib-eye
   - black bean sauce is linked to plain black beans, so soy and gluten are missed
   - turkey breast roll is linked to bread roll
2. **FOOD-1.** Recipes carry a no-gluten or no-dairy tag they shouldn't have:
   - trifle sponge, Rice Bubbles crackles and wheat vermicelli harira are tagged no-gluten
   - feijoada farofa with butter, kathi rolls and fish-finger wraps are tagged no-dairy
3. **FOOD-3.** 21 recipes say "vegan", "vegetarian" or "gluten-free" in their own words while a line breaks it. Examples: honey in a "vegan" doughnut, shrimp-paste curry paste in a "vegan" curry, kecap manis in a "gluten-free" gado-gado.
4. **FOOD-4.** 68 store-build recipes lack the food-safety cues the house rules require:
   - 42 with raw poultry and no 75°C
   - 28 with mince and no 75°C
   - 2 chillies using dried kidney beans with no hard boil

   These are the converted old-app recipes, which `validate-house-recipes` never checks.
5. **FOOD-8.** The live feed shows 719 recipes under 99 invented "person" cooks. They have AI portraits and follower counts, and the app gives no label saying so.

**Coverage:**
- Diet tags recomputed for 100% of recipes (5,496).
- Food-safety scan on 100%.
- The project validator run on 100% of batch recipes (5,210 of 5,496). The other 286 are converted recipes, which it never reads.
- Photo credits on 100% of the 631 images; 60 photos (9.5%) checked by eye.
- Live feed: all 731 rows, aggregated.

## Index

| ID | Sev | Fix | Conf | Title | Where |
|----|-----|-----|------|-------|-------|
| FOOD-1 | S1 | auto | CONFIRMED | No-gluten / no-dairy / vegan tags that the lines break, via wrong links | batch-04 files, recipe-fixes.json; `evidence/L7/allergen-offenders-certain.csv` |
| FOOD-2 | S1 | auto | CONFIRMED | Wrong ingredient links hide fish, pork, soy, gluten from the avoid list and shopping list | `src/data/ingredients/ingredients.json`; `link-word-clash.csv`, `allergen-link-misses.csv` |
| FOOD-3 | S1 | auto | CONFIRMED | Title, summary or note claims a diet the lines break (21 recipes) | `text-claims-false.csv` |
| FOOD-4 | S2 | auto | CONFIRMED | 68 store-build recipes miss 75°C or other safety cues; converted recipes are never validated | `food-safety-certain.csv` (route recipe-fixes) |
| FOOD-5 | S2 | auto | CONFIRMED | 130 recipes show an empty "Food safety: " note | batch-01, 02, 03; `food-safety-certain.csv` check=blank-safety-note |
| FOOD-6 | S2 | auto | LIKELY | Raw or lightly cooked egg dishes with no warning for vulnerable people (123) | `food-safety-certain.csv` check=raw-egg-no-warning |
| FOOD-7 | S2 | auto | CONFIRMED | The validators pass 8 of 11 known-bad recipes on diet and safety | `scripts/validate-house-recipes.mts`, `scripts/recipe-text-checks.mts`; `tools/L7/known-bad.json` |
| FOOD-8 | S2 | owner | LIKELY | Live feed presents 99 invented cooks as real people | `public.cooks`, `src/domain/published/published.ts:74` |
| FOOD-9 | S2 | owner | CONFIRMED | Backup payloads would undo the 24 Oct vegan fixes if re-run | `docs/backups/feed-payloads-2026-10-17/`, `docs/backups/supabase-2026-10-17/` |
| FOOD-10 | S2 | owner | CONFIRMED | 120 shipped-path photos have no credit; 156 CC BY/BY-SA credits lack a licence or source link | `photos.csv` |
| FOOD-11 | S3 | auto | CONFIRMED | Find-and-replace damage: "Pandan-Free Coconut Custard Pots" and others (25 titles, 53 recipes) | `find-replace-artefacts.csv` |
| FOOD-12 | S3 | auto | LIKELY | "Contains ..." notes leave out allergens the lines carry (595 notes) | `contains-note-mismatches.csv` |
| FOOD-13 | S3 | auto | CONFIRMED | Workaround aliases ("panko soaked in", "chicken or shrimp stock") hide allergens and get around D-044 | ingredients.json |
| FOOD-14 | S3 | auto | LIKELY | Fresh chillies and peppers (poblano, shishito, piquillo) linked to black pepper, so the spicy avoid misses them | ingredients.json |
| FOOD-15 | S3 | auto | CONFIRMED | taro-and-pisupo-bake says 311 kcal; its lines come to about 635 (carry-over) | batch-03 |
| FOOD-16 | S3 | live | LIKELY | Live feed: small diet and safety gaps ("oil or ghee" tagged no-dairy, mince with no 75°C) | `public.published_recipes` |
| FOOD-17 | S4 | auto | CONFIRMED | Fahrenheit in a store-build recipe (margherita-pizza "480°F") | recipe-fixes route |
| FOOD-18 | S4 | auto | LEAD | Reheat cues (169), raw-seafood warnings (26), garlic-in-oil storage (3) | `food-safety-review.csv` |

## Findings

### FOOD-1 · S1 · auto · CONFIRMED: Diet tags the lines break, via wrong ingredient links

**What the person sees.** They filter for gluten-free or dairy-free, and get dishes that contain gluten or dairy:

- **marsala-trifle-cups** (vegetarian, no-gluten): "200g vanilla sponge cake" is linked to `vanilla-extract`, so gluten, egg and dairy are missed. **berry-trifle-cups** has the same link, so the gluten and egg avoids miss it.
- **chocolate-crackles** (vegan, no-gluten) and **honey-rice-bubble-bars** (no-gluten): "puffed rice cereal" is linked to `white-rice`. Australian Rice Bubbles contain barley malt.
- **harira-chickpea-and-lentil-soup**, **moroccan-spiced-lentil-harira-soup** and **sheer-khurma-eid-vermicelli-pudding** (no-gluten): wheat vermicelli is linked to `rice-vermicelli`.
- **feijoada** (no-dairy): "Farofa (toasted cassava flour with butter)". The butter is part of the farofa, not an alternative.
- **egg-kathi-roll-calcutta-style** (no-dairy): "frozen parathas" is linked to `roti`. The recipe's own note says "Contains egg, gluten and milk".
- **fish-finger-wraps-for-kids-with-crunchy-slaw** (no-dairy): its own note says it contains milk.
- **freezer-batch-minestrone** (vegan, no-gluten): its note says to add cooked pasta when serving.

**Evidence.** `evidence/L7/allergen-offenders-certain.csv` has 28 hand-checked rows: slug, source file, field, wrong value, proving line, corrected value and fix route. All are `ai-draft`, and none are reviewed.

**Root cause.** `deriveDiets` trusts the link. The matcher links on the single word that matches ("vanilla", "rice", "vermicelli", "roti"). The validator's `[link]` check flags single-word links on 3+ word items, but only as a warning (229 warnings in the full run).

**Smallest fix.**
- Correct the line or the alias. Batch recipes: edit the batch file and rebuild (D-044). Converted recipes: `scripts/data/recipe-fixes.json` (D-014).
- Add ingredient ids for sponge cake, puffed rice cereal (gluten) and wheat vermicelli.

**Test that would have caught it.** In `validate-house-recipes.mts`, make the `[link]` single-word warning a fail when the link drops an allergen group that the item's other words imply. The known-bad recipes in `tools/L7/known-bad.json` (l7-trifle, l7-crackles, l7-harira) are ready-made fixtures.

### FOOD-2 · S1 · auto · CONFIRMED: Wrong links hide allergens from the avoid list and shopping list

**What the person sees.** Someone avoiding fish, pork or soy still gets these dishes. The shopping list also asks them to buy the wrong food:

- **Kingfish steaks → `beef-steak`**: teriyaki-buri-glazed-yellowtail, meen-varuthathu-kerala-fried-fish-with-rice. Both recipes' own notes say "Contains fish".
- **Pork scotch fillet → `beef-rib-eye`**: gluten-free-japanese-style-ginger-pork-with-rice, char-siu-cantonese-roast-pork-with-rice-and-greens, bun-thit-nuong-vietnamese-grilled-pork-with-vermicelli.
- **Black bean sauce or paste → `black-beans`**, which has no groups: crispy-tofu-and-greens-with-black-bean-sauce, korean-jajangmyeon-black-bean-noodles (note says "Contains gluten and soy"). Also "soybean paste" → `edamame`.
- **Other wrong links:**
  - turkey breast roll → `bread-roll` (2 turkey recipes)
  - beef sausages and boerewors → `pork-sausage`, which also clashes with halal avoids
  - merguez → `pork-sausage`
  - "pork stock (or chicken)" → `chicken-stock` (bak-chor-mee)

**Evidence.**
- `link-word-clash.csv`: 33 item→id pairs where the line names a different ingredient from the one it links to.
- `allergen-link-misses.csv`: 60 lines.
- `residual-words.txt`: 603 pairs with words the link doesn't cover. This is the review list.

**Root cause.** The aliases in `ingredients.json` match the longest phrase. "steak", "scotch fillet" and "black bean" win with no context.

**Smallest fix.** Add aliases ("kingfish", "yellowtail", "pork scotch fillet", "black bean sauce", "beef sausages", "merguez", "turkey breast roll") to the right ids or to new ones, then rebuild the catalogue.

**Test.** A unit test in the ingredient index that pins these phrases to their ids. Fixtures l7-kingfish-steaks, l7-pork-scotch, l7-black-bean-tofu and l7-roast-turkey-roll all pass the validator today.

### FOOD-3 · S1 · auto · CONFIRMED: The recipe's own words claim a diet that a line breaks

**What the person sees.** "Vegan" or "gluten-free" in the summary or title, while a line breaks it:

- indonesian-gado-gado-with-peanut-sauce: kecap manis
- mushroom-and-lentil-pie-with-sweet-potato-top: soy sauce
- kalua-style-slow-pork-shoulder-with-rice: soy sauce
- massaman-sweet-potato-curry and pumpkin-red-curry-with-rice: curry paste, which usually contains shrimp paste
- thai-sweet-corn-fritters-with-cucumber-dip: red curry paste
- kimchi-cheese-toastie-rolls and crisp-kimchi-and-spring-onion-wedges: kimchi
- lokma-honey-doughnut-bites: honey
- vegan-mushroom-ragu-pappardelle: egg pasta
- cantonese-steamed-chicken: Shaoxing wine, but claims gluten-free

**Evidence.**
- `text-claims-vs-lines.csv`: 236 claim sentences; 69 have no hedge.
- `text-claims-false.csv`: 25 rows in 21 recipes are certain; the rest depend on labels (baking powder, cornflour, sausages).
- Refuted: gluten-free muffins, scones and cornbread whose line says "gluten-free flour" but links to `plain-flour`. Those are FOOD-2-class link errors that make the tag stricter, not unsafe.

**Root cause.** `dietTextProblems` checks ingredient items against tags. It never checks the summary, title or notes.

**Smallest fix.** Reword each claim, or name the safe product ("vegan curry paste", "tamari"). Batch files, then rebuild.

**Test.** Add a check to `recipe-text-checks.mts` that runs `scan-claims.ts`'s claim regex against the linked groups.

### FOOD-4 · S2 · auto · CONFIRMED: Store-build recipes miss required food-safety cues

**What the person sees.** A reviewed recipe that ships in the store build, with no temperature for chicken or mince. Examples: bbq-pulled-chicken, buffalo-wings, chicken-adobo, chicken-fried-rice, beef-lasagna, beef-tacos, bobotie, baked-ziti.

**Evidence.** `food-safety-certain.csv`, converted route:
- 42 recipes with raw poultry and no 75°C
- 28 with mince or sausage and no 75°C
- 2 with dried kidney beans and no 10-minute boil (chili-con-carne, chili-cheese-fries)
- 1 with rice and no cooling advice (stuffed-cabbage)

Across reviewed recipes: 72 rows in 68 recipes.

**Root cause.** `validate-house-recipes.mts` reads only `scripts/data/house-recipes/*.json` (5,210 recipes). The 286 converted recipes route through `recipe-fixes.json` and are never put through the food-safety rules that batch recipes must pass (Australian guidance: poultry and mince to 75°C).

**Smallest fix.** Add "Food safety:" notes through `recipe-fixes.json`. Then run the same checks over the built catalogue: export `checkRecipe`'s safety section and call it from the catalogue build.

**Test.** Run the safety block against every recipe in `recipes.json` in CI.

### FOOD-5 · S2 · auto · CONFIRMED: An empty "Food safety: " note on 130 recipes

**What the person sees.** A note that says "Food safety:" and nothing after it.

**Evidence.** batch-01, 02 and 03 contain `"Food safety: "` 130 times. For example, chicken-cacciatore's notes before 3fe688f were two notes; at 3fe688f ("Merge batch-03 … with diet, safety and text fixes (D-053)", 17 Oct) a third, empty `"Food safety: "` was added. The live feed has 0 of these.

**Root cause.** A bulk fix added the prefix but not the text. The validator checks `/^Food safety/` only, so the empty note passes.

**Smallest fix.** Write the notes, for example with the 37 standard texts already used. Make the validator require at least one cue word after the prefix.

**Test.** Fixture l7-chicken-boilerplate ("Food safety: be careful.") passes today and should fail.

### FOOD-6 · S2 · auto · LIKELY: Raw or lightly cooked egg with no warning for vulnerable people

**What the person sees.** Tiramisu, mousse, homemade mayo or aioli, hollandaise, Caesar dressing, carbonara or a runny yolk, with no line saying "not for pregnant women, young children, older or immune-compromised people".

**Evidence.**
- 123 certain and 30 review in `food-safety*.csv`. The 60 recipes that already use the standard warning are excluded.
- Some "Caesar" rows use bought dressing, so expect roughly 15-25% false positives.

**Root cause.** The validator asks for a "Food safety" note but doesn't check that it is about eggs.

**Fix.** Add the existing standard text: "Raw and lightly cooked foods aren't recommended for pregnant women, young chi…".

**Test.** Check that a RAW_EGG hit has a note matching `/pregnan|vulnerable|pasteuri/`.

### FOOD-7 · S2 · auto · CONFIRMED: The project validators miss most known-bad recipes

**Steps.** `npx tsx scripts/validate-house-recipes.mts docs/audits/2026-11-20-deep-audit/tools/L7/known-bad.json`

**Caught:** dried kidney beans in a slow cooker, leftover rice left out overnight, and kcal 999 against macros of 85.

**Passed the diet and safety checks:**
- turkey roll tagged vegan (`MEAT_WORDS` has no turkey)
- kingfish linked to beef (the fish words miss "kingfish")
- trifle, crackles and harira tagged no-gluten (no sponge, puffed rice or vermicelli in the gluten words)
- black-bean tofu: the derived no-gluten tag was accepted
- pork with a "63°C" note: the beef rule accepts any °C, and the pork link is lost
- honey porridge "for babies from 6 months": there is no honey-under-12-months check
- a chicken step saying it "does not need to reach 75°C"

**Smallest fix.**
- Widen the `ALLERGENS` and `MEAT_WORDS` lists: turkey, venison, kingfish, sponge, vermicelli, puffed rice, corn flakes, black bean sauce.
- Add a honey-and-infant rule.
- Run the safety checks over converted recipes too (FOOD-4).

**Test.** Commit `known-bad.json` as a fixture, with the expected failures.

### FOOD-8 · S2 · owner · LIKELY: Live feed recipes under invented cooks

**What the person sees.** A community feed of 719 published recipes from 99 "person" cooks, with portraits (48 AI portraits, 21 AI logos, 30 food photos) and 1,967 followers in total. All rows have `source: "user"` and `review: "auto-checked"`. 127 have `provenance: ai-draft`; 604 have no provenance.

**Evidence.**
- SELECTs on `public.cooks` and `public.published_recipes`.
- `published.ts:74` maps every non-official cook to `person`, and nothing in `src` reads `avatar_kind`.
- No decision in DECISIONS.md covers invented cooks.

**Risk.** Australian Consumer Law (misleading conduct) and App Store review (fake user activity).

**Fix.** Owner decision: label them "Pantry kitchen" or "illustrative", or fold them into the official cook.

**Test.** None until the decision is made.

### FOOD-9 · S2 · owner · CONFIRMED: Backups would bring back 11 wrong vegan tags

**Evidence.** The 11 live slugs that were vegan on 17 Oct and are no longer vegan are all still fixed live: briam, buri-gochu-jjim, chakalaka-pap, dal-with-crispy-onions, ful-medames, githeri, mujadara, pasta-e-fagioli, pasta-e-lenticchie, roti-and-dal, rotkohl-mit-apfeln.

These files still tag some of them vegan:
- `docs/backups/feed-payloads-2026-10-17/feed-inserts.json` (3)
- `feed-updates.json` (7)
- `chunks/i03.sql`, `i05.sql`, `i06.sql` (mujadara, briam, chakalaka-pap)
- `docs/backups/supabase-2026-10-17/published_recipes.json` (6)

Lists are in `evidence/L7/backup-vegan-*.txt`.

**Fix.** Mark the folder "superseded 24 Oct, do not replay", or patch the 11 rows. Move it to the Bin only on the owner's word.

**Test.** A replay script that refuses payloads older than the newest feed fix.

### FOOD-10 · S2 · owner · CONFIRMED: Photo credits and licences

**Evidence.** `photos.csv` covers 631 images:
- 120 have no credit at all. All are converted recipes, 115 of them reviewed, so they ship in store builds.
- 156 CC BY or BY-SA credits name the author and licence but give no source or licence link. CC BY requires title, author, source and licence (TASL).
- Pexels: 324. Its licence asks for no attribution, so this is fine.
- 6 image keys have no file on disk (K-30).
- AI images: 0. The 32 "AI" hits were letters inside photographer names.

**Fix.** Find where the old-app photos came from (owner), and store a source URL with each Commons photo.

**Test.** A catalogue check that a CC BY or BY-SA credit has a URL.

### FOOD-11 · S3 · auto · CONFIRMED: Find-and-replace damage

25 titles and slugs, and 79 hits in 53 `ai-draft` recipes, for example:
- "Pandan-Free Coconut Custard Pots"
- "Pisang-Free Cassava Cake"
- "Turon Banana-Free Mango Spring Rolls"
- "Walnut Date-Free Sticky Rice Cake"

There are also items such as "parsnip-free onion" → `parsnip`, and "stir-fry sauce" → `frozen-chips`.

Evidence: `find-replace-artefacts.csv`. Fix: rename in the batch files, then rebuild. Test: the `artefacts.ts` regex added to `recipe-text-checks`.

### FOOD-12 · S3 · auto · LIKELY: "Contains" notes leave out allergens

958 recipes have a "Contains …" note. 595 notes leave out a group that their linked lines carry:

| Group left out | Notes |
|---|---|
| gluten | 206 |
| soy | 147 |
| dairy | 87 |
| fish | 49 |
| egg | 37 |
| sesame | 35 |
| shellfish | 30 |
| tree nuts | 4 |

Some groups are conservative, so this is a review list. Evidence: `contains-note-mismatches.csv`. Fix: generate the note from the groups rather than writing it by hand.

### FOOD-13 · S3 · auto · CONFIRMED: Workaround aliases

`ingredients.json` has aliases such as:
- "panko mixed with" and "panko soaked in", which hide milk and butter
- "salt for"
- "chicken or shrimp stock" and "chicken or seafood stock", which lack the shellfish group

These get around D-044's one-ingredient-a-line rule. `alias-smell.ts` lists about 100. The validator's `a-or-b` alias check catches only the aliases containing "or". Fix: remove them and rewrite the lines.

### FOOD-14 · S3 · auto · LIKELY: Fresh chillies linked to black pepper

poblano, shishito, piquillo, choricero, cruschi and "pepper sauce" are linked to `black-pepper`, so the "spicy" avoid misses them, and the shopping list says black pepper. Fix: aliases to capsicum or chilli ids.

### FOOD-15 · S3 · auto · CONFIRMED: Carry-over taro-and-pisupo-bake kcal

The only FAIL in the full validator run: 311 kcal stated against roughly 635 from the lines. Nutrition is absent from the feed (0 of 731 rows) and from the app (K-5), so nobody sees it yet.

### FOOD-16 · S3 · live · LIKELY: Live feed gaps

Aggregated ILIKE checks over the 719 published rows:
- **Vegan and vegetarian tags:** no breaking lines.
- **no-dairy:**
  - karahi-chicken, nihari: "neutral oil or ghee"
- **no-gluten:**
  - chile-con-queso: "corn or flour tortilla chips"
  - honey-soy-chicken-stir-fry: "rice or noodles"
- **Safety:**
  - 3 poultry recipes with no 75°C: musakhan, pastitsada, camp-oven-rabbit-stew. The last one probably matched "duck" or "rabbit" wording, so treat it as a lead.
  - 5 with mince and no 75°C: mapo-tofu, nikujaga, …
  - 6 raw-egg dishes with no warning: arros-a-banda aioli, …
- **Fahrenheit:** 0.
- **batch-04 and nutrition:** absent from the feed, as expected.

### FOOD-17 · S4 · auto · CONFIRMED: Fahrenheit

margherita-pizza (reviewed, ships): "250°C / 480°F". The validator's style rule would fail this, but it never sees converted recipes. Fix: drop "/ 480°F" in recipe-fixes.json.

### FOOD-18 · S4 · auto · LEAD: Smaller safety wording

These are review lists in `food-safety-review.csv`, not checked one by one:
- 169 "reheat" with no "steaming hot / 75°C" cue
- 26 raw seafood dishes (ceviche, sashimi, poke) with no vulnerable-people line
- 3 garlic or chilli oils with no fridge storage
- 2 room-temperature holds: one is a rice soak, which is fine, and one is a sambal left out, which is fine

## Carry-over status

- **BUG-07** (Browse ignores diet and avoid): fixed and still in place. The avoid filter uses the link groups, but it inherits FOOD-2 and does not see notes or bracketed text.
- **REL-16** (photos): still WebP. 6 image keys have no file (as in K-30).
- **K-3** ("A or B" lines): new lines are blocked by the validator `a-or-b` check. "Or" aliases get around it (FOOD-13). The live feed still has "oil or ghee" and similar.
- **K-4** (times and missing ingredients): the 12 listed recipes were not re-checked. The full validator run gives 417 time warnings and no fails.
- **K-5** (nutrition): still open. Nutrition is only in the batch files, with 0 in the feed and none in the app.
- **K-6** (unsure cuisines): not checked; it is an editorial call.
- **K-13** (import source link): not tested in this lane (imports).
- **K-17** (house photos): superseded. 631 recipes now have images; see FOOD-10 for credits.
- **K-30** (6 photos): still open, 6 keys with no file.
- **K-31** (bibimbap photo, pulled-pork unlinked line): not re-checked line by line.
- **INTEGRATION taro-and-pisupo-bake:** still open (FOOD-15).
- **INTEGRATION 162 Pexels with no link:** now 324 with no link. That is fine under the Pexels licence; the real gap is the 120 photos with no credit (FOOD-10).

## Coverage

| Area | Done | Of | How |
|---|---|---|---|
| Diet tags recomputed from lines and links | 5,496 | 5,496 | `scan-diets.ts`: 0 stale; 0 flags from the project's word check |
| Hidden sources (links, aliases, notes, claims) | 5,496 | 5,496 | `scan-links`, `residual`, `scan-contains`, `scan-claims` |
| Food safety | 5,496 | 5,496 | `scan-safety.ts` (830 rows: 358 certain, 472 review or refuted) |
| Project validator | 5,210 | 5,496 | Full run: 5,209 pass. It cannot read the 286 converted recipes. |
| Known-bad fixtures | 11 | 11 | `known-bad.json` |
| Photo credits | 631 | 631 | `photos.ts` |
| Photos by eye | 60 | 631 | Two 6x5 contact sheets plus 2 close-ups: 0 wrong-dish |
| Live feed | 731 | 731 | Aggregated SELECTs only |

## Not tested

- What a store build actually renders: no build was run. The 271 figure comes from `shipsInStoreBuilds` logic.
- Step-by-step time checks beyond the validator's `time` warnings.
- Serves and quantities beyond the validator's `amounts` and `servings` checks (4 reviewed exceptions).
- Duplicates beyond the validator's (24 near-duplicates, 2 duplicates, all marked reviewed).
- Label-dependent products (stock cubes, hokkien noodles, fried shallots) were left as review items.
- Live feed recipes were never read one by one: only aggregates, no recipe bodies were pulled, so the matching runs on words.
- Slow cookers and home canning: the scan found none that hold food in the danger zone.
- The 595 "Contains" omissions were not sampled.

## Refuted appendix

These came from my own scans:
- **honey-infant (6):** baby potatoes, baby leaves, Dutch baby.
- **poultry-pink (4):** prawns or beef turn pink.
- **burgers mince-rare:** the step says "no pink (75°C)".
- **"AI" photo credits (32):** letters inside photographer names.
- **Wrong-dish suspects:** grilled-salmon and danish-open-sandwiches, both correct on close-up.
- **Diet-tag "certain" rows:** lobster-roll hot-dog buns, and stock cubes for no-gluten. Both are label-dependent, now review.
- **Earlier refutations:** dosa batter, palm nuts, wattleseed flour, bagoong, massaman paste peanuts, quail eggs, goat, pork loin steaks, cod livers, "(or chicken stock)" alternatives in brackets.
- **Gluten-free bakes linked to plain flour:** they make the tag stricter, not unsafe.
