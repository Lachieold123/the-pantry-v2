// fix-ingredients.ts : FOOD-2, FOOD-13, FOOD-14 fixes to src/data/ingredients/ingredients.json. Idempotent; prints what it changed.
import { readFileSync, writeFileSync } from 'node:fs';
import { normaliseWords, type IngredientDef, type IngredientGroup } from '../../../../../src/domain/ingredients/database.ts';
import { allLines, type Recipe } from '../../../../../src/domain/recipes/types.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const FILE = ROOT + 'src/data/ingredients/ingredients.json';
const defs: IngredientDef[] = JSON.parse(readFileSync(FILE, 'utf8'));
const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
const byId = new Map(defs.map((d) => [d.id, d]));
const get = (id: string) => {
  const d = byId.get(id);
  if (!d) throw new Error('no ingredient ' + id);
  return d;
};

// [id, name, aisle taken from, groups, aliases]
const NEW: [string, string, string, IngredientGroup[], string[]][] = [
  ['kingfish', 'kingfish', 'white-fish', ['fish'], ['kingfish steak', 'kingfish fillet', 'yellowtail', 'yellowtail kingfish', 'hiramasa', 'buri']],
  ['turkey-breast', 'turkey breast', 'turkey-mince', ['meat', 'poultry'], ['turkey breast fillet']],
  // Shop turkey breast rolls are often seasoned or stuffed; the label decides, so no gluten-free tag.
  ['turkey-breast-roll', 'turkey breast roll', 'turkey-mince', ['meat', 'poultry', 'gluten'], ['turkey roll', 'turkey breast roast']],
  ['black-bean-sauce', 'black bean sauce', 'soy-sauce', ['gluten', 'soy'], ['black bean paste', 'chunjang', 'black bean garlic sauce', 'chinese black bean sauce']],
  ['beef-sausage', 'beef sausage', 'pork-sausage', ['meat', 'beef', 'gluten'], ['thick beef sausage', 'beef chipolata']],
  // Boerewors is beef with pork or lamb, often with cereal.
  ['boerewors', 'boerewors', 'pork-sausage', ['meat', 'beef', 'pork', 'lamb', 'gluten'], ['boerewors sausage', 'boerewors coil']],
  ['merguez', 'merguez sausage', 'pork-sausage', ['meat', 'lamb', 'beef', 'gluten'], ['merguez']],
  ['pork-stock', 'pork stock', 'chicken-stock', ['meat', 'pork'], ['pork broth', 'pork bone broth']],
  ['sponge-cake', 'sponge cake', 'bread-roll', ['gluten', 'egg', 'dairy'], ['vanilla sponge cake', 'plain sponge cake', 'trifle sponge', 'savoiardi', 'sponge finger', 'ladyfinger']],
  // Australian Rice Bubbles and Corn Flakes carry barley malt.
  ['puffed-rice-cereal', 'puffed rice cereal', 'rolled-oats', ['gluten'], ['puffed rice', 'rice bubbles', 'rice krispies']],
  ['corn-flakes', 'corn flakes', 'rolled-oats', ['gluten'], ['cornflakes', 'cornflake', 'corn flake']],
  ['wheat-vermicelli', 'wheat vermicelli', 'spaghetti', ['gluten'], ['vermicelli', 'fine vermicelli', 'seviyan', 'sevai', 'vermicelli pasta']],
  // Shop parathas are usually made with milk or ghee.
  ['paratha', 'paratha', 'roti', ['gluten', 'dairy'], ['frozen paratha', 'flaky paratha', 'lachha paratha', 'parotta']],
  // Stock cubes and powders often contain wheat; the label decides, so no gluten-free tag.
  ['vegetable-stock-cube', 'vegetable stock cube', 'vegetable-stock', ['gluten'], ['vegetable bouillon cube', 'vegetable stock powder']],
  ['chicken-stock-cube', 'chicken stock cube', 'chicken-stock', ['meat', 'poultry', 'gluten'], ['stock cube', 'chicken stock powder', 'stock powder', 'chicken bouillon cube']],
  ['beef-stock-cube', 'beef stock cube', 'beef-stock', ['meat', 'beef', 'gluten'], ['beef stock powder', 'beef bouillon cube']],
  // Named animal-rennet cheeses, as D-053's Gruyère.
  ['emmental', 'Emmental', 'gruyere', ['dairy', 'animal-product', 'non-vegetarian'], ['emmentaler', 'emmenthal']],
  ['gorgonzola', 'Gorgonzola', 'gruyere', ['dairy', 'animal-product', 'non-vegetarian'], ['gorgonzola dolce', 'gorgonzola piccante']],
  // Lines that name a gluten-free product were linked to the wheat one by the shared word.
  ['gluten-free-flour', 'gluten-free plain flour', 'plain-flour', [], ['gluten-free flour', 'gf flour', 'gluten-free self-raising flour', 'gluten-free all-purpose flour']],
  ['gluten-free-baking-powder', 'gluten-free baking powder', 'baking-powder', [], []],
  ['gluten-free-cornbread', 'gluten-free cornbread', 'cornbread', ['dairy', 'egg'], []],
  ['teff-flour', 'teff flour', 'plain-flour', [], ['teff', 'ivory teff flour', 'brown teff flour']],
  ['maize-flour', 'maize flour', 'plain-flour', [], ['maize meal', 'white maize flour', 'unga', 'mealie meal', 'mielie meal']],
  ['dried-sweet-pepper', 'dried sweet pepper', 'capsicum', [], ['dried choricero pepper', 'choricero pepper', 'choricero', 'peperoni cruschi', 'peperone crusco', 'dried crusco pepper', 'cruschi pepper', 'nora pepper', 'ñora pepper']],
];
const ADD: Record<string, string[]> = {
  'pork-shoulder': ['pork scotch fillet'],
  miso: ['soybean paste', 'fermented soybean paste', 'yellow soybean paste'],
  'green-chilli': ['poblano', 'poblano pepper', 'poblano chilli', 'shishito', 'shishito pepper', 'padron pepper', 'padrón pepper'],
  'roasted-capsicum': ['piquillo pepper', 'piquillo'],
  'hot-sauce': ['pepper sauce', 'caribbean pepper sauce', 'scotch bonnet pepper sauce'],
};
const REMOVE: Record<string, string[]> = {
  'rice-vermicelli': ['vermicelli'],
  'vegetable-stock': ['vegetable stock cube'],
  'beef-stock': ['beef stock cube', 'beef bouillon'],
  // Workaround aliases that hide a second ingredient (FOOD-13); their lines are rewritten.
  panko: ['panko mixed with', 'panko soaked in'],
  'hoisin-sauce': ['hoisin and sriracha'],
};
const GROUPS: Record<string, IngredientGroup[]> = {
  // Some prawn crackers are made with wheat flour; the label decides.
  'prawn-crackers': ['gluten'],
};

const log: string[] = [];
for (const [id, name, like, groups, aliases] of NEW) {
  if (byId.has(id)) continue;
  const d: IngredientDef = { id, name, aisle: get(like).aisle, aliases, groups };
  defs.push(d);
  byId.set(id, d);
  log.push(`new ${id}`);
}
for (const [id, as] of Object.entries(ADD)) for (const a of as) if (!get(id).aliases.includes(a)) (get(id).aliases.push(a), log.push(`+${id}: ${a}`));
for (const [id, as] of Object.entries(REMOVE))
  for (const a of as) if (get(id).aliases.includes(a)) ((get(id).aliases = get(id).aliases.filter((x) => x !== a)), log.push(`-${id}: ${a}`));
for (const [id, gs] of Object.entries(GROUPS)) for (const g of gs) if (!get(id).groups.includes(g)) (get(id).groups.push(g), log.push(`+${id} group ${g}`));

// "A or B" aliases no line uses: matcher workarounds that would hand a line one ingredient's groups for two (FOOD-13).
const has = (w: string[], p: string[]) => w.some((_, i) => p.every((x, j) => w[i + j] === x));
const lines = recipes.flatMap((r) => allLines(r));
for (const d of defs) {
  const unused = d.aliases.filter((a) => / or /.test(a) && !lines.some((l) => l.ingredientId === d.id && has(normaliseWords(l.item), normaliseWords(a))));
  if (unused.length) {
    d.aliases = d.aliases.filter((a) => !unused.includes(a));
    log.push(`-${d.id}: ${unused.join(' | ')}`);
  }
}
writeFileSync(FILE, `${JSON.stringify(defs, null, 2)}\n`);
console.log(log.length, 'changes');
console.log(log.join('\n'));
