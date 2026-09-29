# Recipe tags: review notes

Draft for owner review. The tags themselves are in `recipe-tags.json`. Run `node scripts/validate-recipe-tags.js` to check them.

## (a) Id mismatches between `recipes.ts` and `meals.ts`

- None. All 285 `RAW_MEALS` names slugify to exactly the 285 `RECIPES` keys. No duplicates, and no ids appear in only one file.
- Title fix: `margarita-flatbread` is now titled "Margherita Flatbread" because the topping is a margherita. The id still says "margarita", so you may want to rename the slug.
- Title worth a look: `chowder` is a corn chowder, not a seafood one, so "Corn Chowder" might be clearer.
- Title worth a look: `spring-rolls` is Vietnamese fresh rice paper rolls (gỏi cuốn), not fried spring rolls.

## (b) Cuisine calls I was unsure about

- `chili-con-carne`: Tex-Mex. Tagged american, not mexican. Same for `black-bean-chili`.
- `fajitas`, `loaded-nachos`, `breakfast-burrito`: Tex-Mex too, but tagged mexican. Could be american.
- `chicken-pot-pie`: this style is common in both the US and the UK. Tagged american.
- `caesar-salad`: created in Tijuana by an Italian-American. Tagged american.
- `chicken-alfredo`, `shrimp-scampi`, `chicken-parmesan`: Italian-American dishes (the recipes say so themselves). Tagged american.
- `italian-meatballs`, `chicken-piccata`: also Italian-American in practice, but tagged italian because that is what the titles say.
- `carbonnade`: Belgian, and there is no Belgian option. Tagged french.
- `beef-stroganoff`, `chicken-kiev`: Russian/Ukrainian. Tagged central-european as the closest option.
- `chicken-cordon-bleu`: Swiss. Tagged central-european, could be french.
- `satay-skewers`, `chicken-satay`, `chicken-satay-bowl`: the marinade is Malaysian-style, but the recipes also use kecap manis and Thai red curry paste. Tagged malaysian.
- `beef-rendang`: dry-cooked with kerisik (toasted coconut), which is the Minangkabau method. Tagged indonesian.
- `kebab`, `stuffed-eggplant`: tagged turkish. Could be middle-eastern.
- `lamb-kofta`, `halloumi-wrap`, `grilled-halloumi`, `mediterranean-platter`: tagged middle-eastern. Could be turkish or greek (halloumi is Cypriot).
- `lentil-soup`: a generic cumin-spiced lentil soup. Tagged middle-eastern.
- `peri-peri-chicken`: Portuguese-Mozambican in origin, popularised through South Africa. Tagged south-african.
- `couscous`: a modern herb-and-feta salad rather than Moroccan steamed couscous. Tagged north-african.
- `tikka-masala`: British-Indian. Tagged indian, could be british.
- `vegetable-curry`, `mango-curry`: no single tradition. Tagged indian.
- `poke-bowl`, `tuna-poke`, `salmon-poke`: Hawaiian. Tagged american, could be japanese.
- `hawaiian-pizza`: invented in Canada. Tagged american, following your guidance.
- `honey-garlic-chicken`: takeaway style. Tagged chinese.
- `spicy-beef-bowl`: the recipe calls itself "Korean-inspired". Tagged korean.
- `roast-chicken`: tagged british (roast with pan gravy and bread sauce). Could be modern-australian.
- `chicken-wings` (honey soy glaze): tagged modern-australian. Could be chinese or american.
- `lamb-chops`, `stuffed-peppers`, `veggie-burger`, `chicken-and-rice`, `baked-zucchini-boats`: no clear origin. Tagged modern-australian.
- Also tagged modern-australian for no clear origin: `grilled-salmon`, `baked-salmon`, `lemon-pepper-salmon`, `baked-cod`, `grilled-steak`, `stuffed-chicken-breast`.

## (c) Content that looks wrong or risky

### Food safety
- `burgers`: patties are cooked "for medium". Minced beef should be cooked through (about 71°C).
- `chicken-kiev`: the target internal temperature is 70°C. FSANZ guidance for chicken is 75°C. `turkey-burger`, `chicken-cordon-bleu` and `roast-chicken` correctly use 75°C.
- `gyudon`, `chicken-gyudon`: suggest cracking a raw egg over the dish. Needs a warning for pregnant, elderly and immunocompromised cooks. The same applies to `caesar-salad`, whose dressing uses raw yolks.
- `ceviche`: the fish is only lime-cured, never cooked (the notes say so correctly). Consider a pregnancy warning. The same applies to `sushi-rolls`, `poke-bowl`, `tuna-poke`, `salmon-poke` and `salmon-nigiri`.
- `lobster-roll`: plunges live lobsters into boiling water. RSPCA and NSW welfare guidance is to chill them to insensibility first.

### Ingredients missing from the list
- `beef-roast-dinner`: lists "roast potatoes (parboiled… roasted in duck fat)", but no step parboils or roasts them.
- `mediterranean-platter`: lists cooked lamb meatballs and pan-fried halloumi, but no step makes either.
- `veggie-burger`: toasts the buns "butter-side-down", but butter is not in the ingredients. The same applies to `turkey-burger`.
- `butter-chicken`, `paneer-butter-masala`: finish with "a knob of butter", but all the listed butter is already used in the sauce.
- `prawn-curry`: says to "keep some shells for stock", but no stock is ever made or used.
- `bibimbap`: lists garlic "divided across the veg", but no step uses it.

### Times that don't add up
- `gnocchi`: cookMinutes is 30, but step 1 bakes the potatoes for 50 minutes.
- `tapas-platter`: cookMinutes is 25, but the potatoes roast for 30 minutes.
- `arancini`: the cook time doesn't cover making the risotto plus frying. The overnight chill is also not in prepMinutes.
- `chicken-and-waffles`: cookMinutes is 30, but the chicken fries for 12–15 minutes per batch, then the waffles still need cooking. The 4-hour-plus marinade is not counted either.
- `sunday-roast`: the timing doesn't work as written. The beef rests 20 minutes, but the potatoes need 45 minutes and the Yorkshires 20 minutes at 220°C afterwards.
- `empanadas`: prepMinutes is 45, but the dough rests for an hour.
- Overnight steps not reflected in prepMinutes:
  - dry-brining: `peking-duck`, `crispy-duck-pancakes`, `pork-roast`
  - marinating: `coq-au-vin`, `fried-chicken`, `tandoori-chicken`, `chicken-tikka`, `beef-tikka`
- `beef-brisket`: prepMinutes also leaves out the 1-hour rest of the rubbed brisket before cooking (a shorter step, not overnight).

### Cosmetic
- `calzone`: the egg wash is listed under "Sauce".
- `samosas`: frying oil is listed under "To serve".
- `chicken-shawarma-plate`: says "stuff with pita pieces" and refers to toum and tahini sauce, but gives no recipe for either.
