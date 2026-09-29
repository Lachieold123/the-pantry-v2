// "No buttermilk?" tips shown under an ingredient line. Keyed by ingredient
// database id, so a tip appears for the thing itself however the recipe
// words it. Written for Australian kitchens and measures (D-013).
// Tips never make allergy claims (D-006).

const TIPS: Readonly<Record<string, string>> = {
  buttermilk: 'No buttermilk? Stir 1 tbsp lemon juice or white vinegar into 250 ml milk and rest it for 5 minutes.',
  cream: 'No cream? For a sauce, whisk 185 ml full-cream milk with 60 g melted butter.',
  'sour-cream': 'Greek yoghurt swaps 1:1 in most savoury dishes. Stir it in off the heat so it doesn’t split.',
  'creme-fraiche': 'Sour cream, or Greek yoghurt loosened with a little cream.',
  ricotta: 'Drained cottage cheese is the closest swap.',
  mascarpone: 'Cream cheese softened with a splash of cream stands in well.',
  'greek-yoghurt': 'Sour cream works 1:1 in savoury dishes.',
  'self-raising-flour': 'Plain flour plus 2 tsp baking powder per 150 g (1 cup).',
  'brown-sugar': 'White sugar with 1 tbsp golden syrup per cup gets close.',
  'white-wine': 'Stock with a squeeze of lemon juice or a splash of white wine vinegar.',
  'red-wine': 'Beef or mushroom stock with 1 tbsp red wine vinegar.',
  'shaoxing-wine': 'Dry sherry works best. Otherwise 1 tbsp rice vinegar and 1 tsp sugar per 2 tbsp wine.',
  mirin: 'Rice vinegar sweetened with a little sugar: about 1 tsp per tablespoon.',
  'soy-sauce': 'Tamari or coconut aminos swap 1:1. Check the label if you’re avoiding gluten.',
  'fish-sauce': 'For a vegetarian version, use soy sauce with a pinch of salt and a squeeze of lime.',
  gochujang: '1 tbsp sriracha with 1 tsp white miso and ½ tsp sugar per tablespoon.',
  harissa: 'Chilli paste with a pinch each of ground cumin, caraway and smoked paprika.',
  tahini: 'Smooth peanut butter loosened with a little sesame oil gets close.',
  'pine-nuts': 'Toasted walnuts, almonds or pepitas all work.',
  shallot: 'Half a small brown onion plus a small clove of garlic per shallot.',
  saffron: 'A pinch of turmeric gives the colour, though not the flavour.',
  panko: 'Ordinary dried breadcrumbs work; they’ll be a little less crisp.',
  lemongrass: 'Per stalk: the zest of 1 lemon and ½ tsp grated ginger.',
  'garam-masala': '1 tsp cumin, ½ tsp coriander and a pinch each of cardamom, cinnamon and black pepper.',
  'five-spice': 'Equal parts ground star anise, cloves, cinnamon, fennel seed and Sichuan pepper.',
};

export function substitutionFor(ingredientId: string | undefined): string | undefined {
  return ingredientId === undefined ? undefined : TIPS[ingredientId];
}

export const SUBSTITUTION_IDS: readonly string[] = Object.keys(TIPS);
