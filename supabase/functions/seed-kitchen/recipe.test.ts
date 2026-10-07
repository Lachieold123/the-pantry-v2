// deno test supabase/functions/seed-kitchen/recipe.test.ts
// The draft → Recipe step, through the app's own parser, validator and diet rules.

import { deepStrictEqual as assertEquals, ok as assert } from 'node:assert';
import { assemble, cleanNewIngredients, type Draft, type Extra, normaliseDraft, slugify } from './recipe.ts';
import { AISLES, INGREDIENT_GROUPS } from './_domain.js';

const draft: Draft = {
  title: 'Kimchi jjigae',
  summary: 'Sour kimchi and pork belly simmered into a spicy stew with soft tofu.',
  caption: 'The jar at the back of the fridge that has gone properly sour? This is what it is for.',
  cuisine: 'korean',
  region: 'Korean',
  mealTypes: ['dinner'],
  difficulty: 'easy',
  prepMinutes: 10,
  cookMinutes: 25,
  servings: 2,
  onePot: true,
  ingredientGroups: [{
    lines: [
      '200 g pork belly, thinly sliced',
      '300 g kimchi, roughly chopped',
      '1 tbsp gochugaru (Korean chilli flakes)',
      '1 tbsp gochujang',
      '2 garlic cloves, crushed',
      '500 ml water',
      '300 g silken tofu, cut into pieces',
      '2 spring onions, sliced',
      '2 tbsp dahi (plain yoghurt), to serve',
    ],
  }],
  steps: [
    'Fry the pork in a small saucepan over medium-high heat until the fat runs and the edges brown, about 5 minutes.',
    'Add the kimchi, gochugaru, gochujang and garlic and fry, stirring, for 3 minutes.',
    'Pour in the water, bring to the boil, then simmer for 15 minutes.',
    'Slide in the tofu and simmer 3 minutes more. Scatter with spring onion and serve with rice.',
  ],
  newIngredients: [{ kind: 'alias', name: 'dahi', aliasOf: 'greek-yoghurt' }, { kind: 'alias', name: 'gochugaru', aliasOf: 'chilli-flakes' }],
  photoQuery: 'kimchi stew',
  photoFallbackQuery: 'korean stew',
  photoDescription: 'A red, bubbling stew in a small pot with tofu and spring onion.',
};

const asExtras = (list: ReturnType<typeof cleanNewIngredients>['ok'], status = 'proposed'): Extra[] =>
  list.map((x) => ({ ...x, status }));

Deno.test('a native name declared as an alias matches its database item, and diets are worked out', () => {
  const declared = cleanNewIngredients(draft.newIngredients, AISLES, INGREDIENT_GROUPS);
  assertEquals(declared.problems, []);
  const out = assemble('0b0b0b0b-0000-4000-8000-000000000000', draft, asExtras(declared.ok));
  assertEquals(out.problems, []);
  assertEquals(out.dietsPending, false);
  const lines = (out.recipe.ingredientGroups as { items: { ingredientId?: string }[] }[])[0]!.items;
  assertEquals(lines[2]!.ingredientId, 'gochugaru');
  assertEquals(lines[8]!.ingredientId, 'greek-yoghurt');
  assertEquals(declared.ok.map((x) => x.id), ['dahi'], 'gochugaru is already in the database');
  assert(!(out.recipe.diets as string[]).includes('vegetarian'), 'pork belly is not vegetarian');
});

Deno.test('an undeclared name is reported as unmatched, and no diet is claimed for it', () => {
  const out = assemble('0b0b0b0b-0000-4000-8000-000000000000', draft, []);
  assertEquals(out.unmatched, ['dahi']);
  assertEquals(out.recipe.diets, []);
});

Deno.test('a new ingredient whose groups are unconfirmed claims no diet', () => {
  const vegan: Draft = {
    ...draft,
    ingredientGroups: [{ lines: ['200 g dalo (taro), peeled and cubed', '400 ml coconut milk', '1 brown onion, sliced', 'Salt, to taste'] }],
    newIngredients: [{ kind: 'new', name: 'dalo', aisle: 'fruit-veg', groups: [], swapId: 'potato', swapTip: 'Use potato.' }],
  };
  const declared = cleanNewIngredients(vegan.newIngredients, AISLES, INGREDIENT_GROUPS);
  const pending = assemble('0b0b0b0b-0000-4000-8000-000000000000', vegan, asExtras(declared.ok));
  assertEquals(pending.problems, []);
  assertEquals(pending.dietsPending, true);
  assertEquals(pending.recipe.diets, []);
  const confirmed = assemble('0b0b0b0b-0000-4000-8000-000000000000', vegan, asExtras(declared.ok, 'verified'));
  assert((confirmed.recipe.diets as string[]).includes('vegan'));
});

Deno.test('Fahrenheit and imperial measures are sent back', () => {
  const us: Draft = { ...draft, steps: [...draft.steps, 'Bake at 350°F for 10 minutes.'], ingredientGroups: [{ lines: ['8 oz pork belly', ...draft.ingredientGroups[0]!.lines.slice(1)] }] };
  const out = assemble('0b0b0b0b-0000-4000-8000-000000000000', us, asExtras(cleanNewIngredients(draft.newIngredients, AISLES, INGREDIENT_GROUPS).ok));
  assert(out.problems.some((p) => p.includes('Fahrenheit')));
  assert(out.problems.some((p) => p.includes('imperial')));
});

Deno.test('slugs are plain', () => {
  assertEquals(slugify('Pastel de choclo (Chilean corn pie)'), 'pastel-de-choclo-chilean-corn-pie');
  assertEquals(slugify('Crème brûlée'), 'creme-brulee');
});

Deno.test('a draft with lists sent as text is repaired; one missing its method is refused', () => {
  const repaired = normaliseDraft({ ...draft, steps: '1. Fry the pork.\n2. Add the kimchi.\n3. Simmer.', prepMinutes: '10' });
  assertEquals(repaired.draft?.steps, ['Fry the pork.', 'Add the kimchi.', 'Simmer.']);
  assertEquals(repaired.draft?.prepMinutes, 10);
  const broken = normaliseDraft({ ...draft, steps: undefined });
  assertEquals(broken.draft, undefined);
  assert(broken.problems.includes('steps is missing'));
});

Deno.test('a declared name with its English name in brackets still matches the line', () => {
  const declared = cleanNewIngredients([{ kind: 'new', name: 'dalo (taro)', aisle: 'fruit-veg', groups: [] }], AISLES, INGREDIENT_GROUPS);
  assertEquals(declared.ok[0]?.name, 'dalo');
  assertEquals(declared.ok[0]?.aliases, ['taro']);
});
