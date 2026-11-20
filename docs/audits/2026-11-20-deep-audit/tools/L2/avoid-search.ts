// L2: the avoid list on typed (own, imported, household) recipes, and search on other names/spellings.
import './dev-global';
import { INGREDIENTS, CATALOGUE } from '../../../../../src/data/catalogue/catalogue';
import { containsAvoided } from '../../../../../src/domain/recipes/diets';
import { buildRecipe } from '../../../../../src/domain/recipes/draft';
import { indexForSearch, searchRecipes } from '../../../../../src/domain/recipes/search';

const lines = [
  '100 g cashews', '2 tbsp peanut butter', '50 g macadamia praline', '1 tbsp satay sauce', '100 g pesto', '2 tbsp tahini', '100 g marzipan',
  '200 g prawns', '1 tbsp fish sauce', '1 tbsp oyster sauce', '100 g crab sticks', '1 tbsp worcestershire sauce', '2 tbsp nutella',
  '100 g feta', '1 cup milk', '50 g ghee', '2 tbsp miso', '1 tbsp hoisin', '1 tbsp gochujang', '100 g frangipane', '1 tbsp XO sauce',
];
const optionFor: Record<string, string[]> = {};
const opts = ['nuts', 'shellfish', 'fish', 'dairy', 'sesame', 'soy', 'gluten', 'eggs'] as const;
console.log('line | matched id | avoid options that hide it');
for (const raw of lines) {
  const draft = { title: 't', summary: '', cuisine: 'modern-australian', mealTypes: ['dinner'], difficulty: 'easy', prepMinutes: 1, cookMinutes: 1, servings: 2, onePot: false, ingredientsText: raw, methodText: 'Cook.', notesText: '' };
  const built = buildRecipe('x', draft as never, { kind: 'own' } as never, INGREDIENTS);
  const recipe = (built as { recipe?: unknown }).recipe ?? built;
  const r = recipe as { ingredientGroups: { items: { ingredientId?: string }[] }[]; diets: string[] };
  const hides = opts.filter((o) => containsAvoided(r as never, { options: [o], custom: [] }, INGREDIENTS));
  optionFor[raw] = hides;
  console.log(`${raw} | ${r.ingredientGroups[0]?.items[0]?.ingredientId ?? '-'} | ${hides.join(',') || 'NONE'} | diets ${r.diets.join(',')}`);
}

console.log('\n--- search ---');
const idx = indexForSearch(CATALOGUE, (c) => c);
const qs = ['carbonara', 'carbonarra', 'spag bol', 'spaghetti bolognese', 'bolognaise', 'aubergine', 'eggplant', 'courgette', 'zucchini', 'coriander', 'cilantro',
  'capsicum', 'bell pepper', 'prawn', 'shrimp', 'mince', 'ground beef', 'chicken', 'chiken', 'pad thai', 'phad thai', 'tikka masala', 'mac and cheese', 'mac n cheese', '🍝', 'x', '   ', 'a'.repeat(200)];
for (const q of qs) {
  const t = performance.now();
  const res = searchRecipes(idx, q);
  const ms = performance.now() - t;
  console.log(`${JSON.stringify(q.length > 30 ? q.slice(0, 10) + '…' : q)}: ${res.length} results in ${ms.toFixed(0)} ms; top: ${res.slice(0, 3).map((r) => r.id).join(', ')}`);
}
