# Recipe review, October 2026

Every one of the 285 recipes was read line by line against a written brief (`docs/reports/recipe-review-brief.md`). The fixes go through the proper pipeline: `scripts/data/recipe-fixes.json`, then `npm run catalogue:convert` (D-014). Scores and notes for every recipe are in `scripts/data/recipe-review-2026-10.json`.

## Result

- Already fine: **35**
- Fixed: **238**
- Need Lachlan: **12** (questions below)

Kinds of fix (number of recipes):

- ingredients: 158
- times: 139
- steps: 108
- addNotes: 54
- addIngredients: 18
- addSteps: 11
- moveIngredients: 3
- difficulty: 1

## What the brief checked

1. Food safety (FSANZ): poultry, mince and sausages to 75°C; notes for raw or soft egg, raw fish and deli meat for pregnant people, young children, older people and anyone with a weakened immune system; rice cooled quickly; no raw-meat marinade on cooked food.
2. Ingredients used in a step but not listed, and listed but never used.
3. Times: total time covers marinating, rising, resting and chilling. Overnight counts as 480 minutes, with a "Start the day before" note.
4. "A or B" lines rewritten as `A (or B)`, naming the meat-free option first when the rest of the recipe is meat-free.
5. Quantities that don't fit the serving count, unclear or out-of-order steps, ingredients in the wrong group, wrong difficulty.

Titles, cuisines, tags and photos were not touched.

## Diet changes from the rewrites

- Lentil soup is now vegetarian (vegetable stock is named first).
- Penne arrabbiata is now vegan and dairy-free (parmesan is optional).
- Veggie stir fry is pescatarian, not vegetarian, because of the oyster sauce. See question 6.

## Questions for Lachlan

1. **Can reviewed recipes ship before you cook them?** D-008 says only `vetted` recipes ship, and today every recipe is `ai-draft`, so a store build would show none. Options: (a) **vetted means cook-tested**, and launch with the shortlist below once you've cooked it (recommended: it is the promise the app makes); (b) add a middle state, "reviewed", that ships with no "tested" mark; (c) ship everything reviewed. I haven't changed the gating.
2. **Parmesan, Gruyère and "vegetarian".** Most are made with animal rennet. Pick a catalogue-wide rule: name "vegetarian hard cheese (or parmesan)" in the list, or treat these cheeses as not vegetarian.
3. **"Shrimp" titles.** Seven titles say Shrimp while the recipes say prawns (shrimp-alfredo, shrimp-fried-rice, shrimp-pad-thai, shrimp-scampi, shrimp-tacos, shrimp-tempura, teriyaki-shrimp-bowl). Rename to "Prawn …"? Recommended.
4. **Near-duplicates.** chicken-tagine vs tagine, bbq-ribs-plate vs bbq-ribs. Keep both, or drop one each?
5. **Sides with no method** (bbq-ribs-plate, beef-shawarma-plate, feijoada's farofa, osso-buco's polenta, greek-chicken-bowl's lemon rice). Treat as bought, or add short methods?
6. **Optional meat in meat-free dishes.** Veggie stir fry uses oyster sauce; omelette fillings list ham and smoked salmon; minestrone lists pancetta; spring rolls list pork or chicken. Make the meat-free version the default?

### Recipes that need a kitchen test before they can ship

- **bbq-ribs-plate**: The plate lists mac and cheese, cornbread and coleslaw with no method. Link the app's mac-and-cheese recipe, treat the sides as bought, or drop them? This recipe also duplicates BBQ Ribs almost word for word; worth keeping both?
- **beef-shawarma-plate**: Toum, tahini sauce and tabbouleh have no method (same issue as chicken-shawarma-plate). Treat them as bought, or add short recipes?
- **butternut-squash-risotto**: Tagged vegetarian, but parmesan is made with animal rennet. Swap to a vegetarian hard cheese in the list, or drop the vegetarian tag?
- **chicken-biryani**: Bone-in thighs and drumsticks under a rice layer on the lowest heat: does 15 minutes' pre-cooking plus 25 minutes' dum get them to 75°C at the bone in your pot? Worth a probe test.
- **feijoada**: Farofa is listed to serve but has no method. Fine as a bought item, or do you want a short sub-recipe?
- **gnocchi**: Worth a kitchen test: 200g flour to 1kg potatoes with one yolk can be soft depending on the potatoes. Check the dough holds before committing all of it.
- **greek-chicken-bowl**: The lemon rice has no method beyond the ingredient line, and the bowl's cook time doesn't include cooking rice. Add a rice step, or treat it as leftover rice?
- **lobster-roll**: Written for American clawed lobster. Australian rock lobster has no claws and is expensive; consider leading with the cooked-meat option or a Moreton Bay bug/prawn version.
- **peking-duck**: A 2kg duck at 200°C for 90 minutes with honey basting risks burning the skin; worth a real kitchen test before launch.
- **salmon-nigiri**: I wrote a rice method (200g rice : 240ml water, 12 min + 10 min rest) because the recipe only said 'as for vegetarian sushi'. Please check the ratio against your usual rice.
- **sisig**: Chicken liver was listed with no step; I've had it cooked with the aromatics. Is that how you'd do it (traditional is grilled or boiled then chopped)?
- **sunday-roast**: Sunday roast needed re-sequencing: potatoes now go in with the beef and finish at 220°C alongside the Yorkshires while the beef rests 30 minutes. Please cook-test this timeline before launch.

### Other notes from the reviewers

- **chicken-tagine**: Near-duplicate of the 'tagine' recipe (same chicken, preserved lemon and olives, same method). Keep both?
- **club-sandwich**: Diet tag says no-dairy but the recipe lists Swiss cheese (optional). Worth checking the tag.
- **kebab**: Title is just 'Kebab' and the method is lamb skewers (shish); Australians may expect a doner-style wrap. Worth a title check.
- **mac-and-cheese**: Tagged vegetarian but uses Gruyère and parmesan, which are usually made with animal rennet. Same issue in other 'vegetarian' recipes with parmesan (margherita flatbread, mushroom risotto, pesto pasta, minestrone). Decide on a catalogue-wide rule.
- **margarita-flatbread**: Id is 'margarita-flatbread' but the title is Margherita; the id spelling is off (cosmetic).
- **minestrone**: Tagged vegetarian but lists optional pancetta and a parmesan rind (animal rennet). Either drop the pancetta line or the vegetarian tag.
- **omelette**: Tagged vegetarian but the optional-fillings line lists ham and smoked salmon.
- **osso-buco**: 'To serve' has a stray line 'Or buttered polenta' and neither side has a recipe. Link to a risotto alla milanese/polenta recipe or simplify.
- **spring-rolls**: Tagged pescatarian but lists optional pork or chicken. Fine if the app treats it as optional; otherwise drop the line or the tag.

## Cook-test shortlist (80)

Picked for appeal, weeknight practicality and the reviewer's confidence, with a spread of cuisines, 22 vegetarian dishes and 4 breakfasts. Recipes that need your call are left out, as are the near-duplicates. The tick-off sheet is `docs/reports/cook-test-shortlist.csv`, ordered quickest first, ten to a week.

- 56 take 40 minutes or less.
- Some pairs share a method, so one cook mostly covers both: chicken-teriyaki and teriyaki-chicken-bowl, gyudon and chicken-gyudon, chicken-gyro and chicken-souvlaki, cottage-pie and shepherd-s-pie, chicken-schnitzel and pork-schnitzel.

| Recipe | Cuisine | Time | Appeal · weeknight · confidence |
| --- | --- | --- | --- |
| Avocado Toast (`avocado-toast`) | modern-australian | 15 min | 4 · 5 · 5 |
| BLT Sandwich (`blt-sandwich`) | american | 17 min | 5 · 5 · 5 |
| Baked Salmon (`baked-salmon`) | modern-australian | 28 min | 4 · 5 · 5 |
| Banh Mi (`banh-mi`) | vietnamese | 60 min | 5 · 3 · 4 |
| Beef Pho (`beef-pho`) | vietnamese | 75 min | 5 · 3 · 4 |
| Beef Stroganoff (`beef-stroganoff`) | central-european | 40 min | 5 · 5 · 5 |
| Beef Tacos (`beef-tacos`) | mexican | 35 min | 5 · 5 · 5 |
| Black Bean Chili (`black-bean-chili`) | american | 65 min | 4 · 4 · 5 |
| Breakfast Burrito (`breakfast-burrito`) | mexican | 50 min | 4 · 4 · 4 |
| Bulgogi (`bulgogi`) | korean | 92 min | 5 · 3 · 5 |
| Burgers (`burgers`) | american | 27 min | 5 · 5 · 5 |
| Butter Chicken (`butter-chicken`) | indian | 90 min | 5 · 4 · 5 |
| Caprese Salad (`caprese-salad`) | italian | 40 min | 4 · 5 · 5 |
| Carbonara (`carbonara`) | italian | 20 min | 5 · 5 · 4 |
| Chana Masala (`chana-masala`) | indian | 45 min | 4 · 4 · 5 |
| Chicken Alfredo (`chicken-alfredo`) | american | 30 min | 5 · 5 · 4 |
| Chicken Fried Rice (`chicken-fried-rice`) | chinese | 22 min | 5 · 5 · 5 |
| Chicken Gyro (`chicken-gyro`) | greek | 95 min | 5 · 3 · 4 |
| Chicken Gyudon (`chicken-gyudon`) | japanese | 25 min | 4 · 5 · 5 |
| Chicken Pad See Ew (`chicken-pad-see-ew`) | thai | 18 min | 5 · 4 · 4 |
| Chicken Piccata (`chicken-piccata`) | italian | 25 min | 4 · 5 · 5 |
| Chicken Schnitzel (`chicken-schnitzel`) | central-european | 30 min | 5 · 5 · 5 |
| Chicken Souvlaki (`chicken-souvlaki`) | greek | 95 min | 5 · 3 · 4 |
| Chicken Stir Fry (`chicken-stir-fry`) | chinese | 30 min | 4 · 5 · 5 |
| Chicken Teriyaki (`chicken-teriyaki`) | japanese | 20 min | 5 · 5 · 5 |
| Chicken Wrap (`chicken-wrap`) | modern-australian | 37 min | 4 · 5 · 4 |
| Cottage Pie (`cottage-pie`) | british | 90 min | 5 · 2 · 5 |
| Couscous (`couscous`) | north-african | 30 min | 3 · 5 · 5 |
| Croque Monsieur (`croque-monsieur`) | french | 25 min | 4 · 4 · 5 |
| Dhal (`dhal`) | indian | 55 min | 4 · 4 · 5 |
| Falafel Salad (`falafel-salad`) | middle-eastern | 35 min | 3 · 5 · 5 |
| Fish Tacos (`fish-tacos`) | mexican | 32 min | 5 · 5 · 5 |
| Greek Salad (`greek-salad`) | greek | 15 min | 4 · 5 · 5 |
| Grilled Cheese (`grilled-cheese`) | american | 15 min | 4 · 5 · 5 |
| Grilled Halloumi (`grilled-halloumi`) | middle-eastern | 18 min | 4 · 5 · 5 |
| Grilled Salmon (`grilled-salmon`) | modern-australian | 22 min | 4 · 5 · 4 |
| Grilled Steak (`grilled-steak`) | modern-australian | 55 min | 5 · 4 · 4 |
| Gyudon (`gyudon`) | japanese | 25 min | 4 · 5 · 5 |
| Halloumi Wrap (`halloumi-wrap`) | middle-eastern | 25 min | 4 · 5 · 5 |
| Honey Garlic Chicken (`honey-garlic-chicken`) | chinese | 28 min | 5 · 5 · 4 |
| Huevos Rancheros (`huevos-rancheros`) | mexican | 30 min | 4 · 4 · 4 |
| Korean BBQ Beef (`korean-bbq-beef`) | korean | 60 min | 5 · 4 · 4 |
| Kung Pao Chicken (`kung-pao-chicken`) | chinese | 35 min | 5 · 4 · 5 |
| Laksa (`laksa`) | malaysian | 45 min | 5 · 4 · 5 |
| Lamb Chops (`lamb-chops`) | modern-australian | 55 min | 4 · 4 · 5 |
| Lamb Kofta (`lamb-kofta`) | middle-eastern | 35 min | 5 · 4 · 4 |
| Lemon Pepper Salmon (`lemon-pepper-salmon`) | modern-australian | 25 min | 4 · 5 · 5 |
| Mac and Cheese (`mac-and-cheese`) | american | 55 min | 5 · 3 · 5 |
| Mapo Tofu (`mapo-tofu`) | chinese | 25 min | 5 · 4 · 5 |
| Mushroom Risotto (`mushroom-risotto`) | italian | 55 min | 5 · 3 · 5 |
| Nasi Goreng (`nasi-goreng`) | indonesian | 22 min | 5 · 5 · 4 |
| Pad Thai (`pad-thai`) | thai | 32 min | 5 · 4 · 5 |
| Paneer Butter Masala (`paneer-butter-masala`) | indian | 60 min | 5 · 4 · 5 |
| Penne Arrabbiata (`penne-arrabbiata`) | italian | 25 min | 4 · 5 · 5 |
| Pepperoni Pizza (`pepperoni-pizza`) | american | 35 min | 5 · 5 · 5 |
| Peri Peri Chicken (`peri-peri-chicken`) | south-african | 2 h 5 min | 5 · 2 · 5 |
| Pesto Pasta (`pesto-pasta`) | italian | 25 min | 5 · 5 · 5 |
| Picanha (`picanha`) | latin-american | 35 min | 5 · 3 · 4 |
| Pork Fried Rice (`pork-fried-rice`) | chinese | 20 min | 4 · 5 · 5 |
| Pork Schnitzel (`pork-schnitzel`) | central-european | 27 min | 4 · 5 · 5 |
| Prawn Linguine (`prawn-linguine`) | italian | 28 min | 5 · 5 · 5 |
| Reuben Sandwich (`reuben-sandwich`) | american | 20 min | 4 · 5 · 5 |
| Risotto (`risotto`) | italian | 40 min | 4 · 4 · 5 |
| Roast Chicken (`roast-chicken`) | british | 2 h 20 min | 5 · 2 · 5 |
| Saag Paneer (`saag-paneer`) | indian | 40 min | 4 · 4 · 5 |
| Salmon Teriyaki (`salmon-teriyaki`) | japanese | 17 min | 5 · 5 · 5 |
| Shakshuka (`shakshuka`) | north-african | 35 min | 5 · 5 · 5 |
| Shepherd’s Pie (`shepherd-s-pie`) | british | 90 min | 5 · 2 · 5 |
| Shrimp Tacos (`shrimp-tacos`) | mexican | 23 min | 5 · 5 · 5 |
| Smash Burger (`smash-burger`) | american | 20 min | 5 · 5 · 4 |
| Spaghetti Aglio e Olio (`spaghetti-aglio-e-olio`) | italian | 17 min | 4 · 5 · 5 |
| Spicy Beef Bowl (`spicy-beef-bowl`) | korean | 35 min | 4 · 5 · 4 |
| Swedish Meatballs (`swedish-meatballs`) | scandinavian | 50 min | 4 · 4 · 5 |
| Tapas Platter (`tapas-platter`) | spanish | 60 min | 5 · 3 · 5 |
| Teriyaki Beef Bowl (`teriyaki-beef-bowl`) | japanese | 20 min | 4 · 5 · 5 |
| Teriyaki Chicken Bowl (`teriyaki-chicken-bowl`) | japanese | 20 min | 5 · 5 · 5 |
| Thai Basil Chicken (`thai-basil-chicken`) | thai | 22 min | 5 · 5 · 4 |
| Thai Green Curry (`thai-green-curry`) | thai | 40 min | 5 · 5 · 5 |
| Tortellini Alfredo (`tortellini-alfredo`) | american | 17 min | 4 · 5 · 5 |
| Vegetable Curry (`vegetable-curry`) | indian | 50 min | 4 · 4 · 5 |
