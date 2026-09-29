// Checks how well the ingredient database covers real recipe lines.
// Run from the repo root: npm run catalogue:check-ingredients [-- lines-file]
// With no file, it checks the original text of every line in the converted catalogue.
// Parses every line with the real parser and matcher, reports the share of
// lines that resolved to an ingredient, lists the most common misses, prints
// a random sample of matches for eyeballing, and asserts the tricky cases.
// Exits non-zero if coverage is under 98% or any assertion fails.

import { readFileSync } from 'node:fs';
import { buildIngredientIndex, type IngredientDef, type IngredientGroup } from '../src/domain/ingredients/database.ts';
import { parseIngredientLine } from '../src/domain/ingredients/parse.ts';

const defs = JSON.parse(readFileSync(new URL('../src/data/ingredients/ingredients.json', import.meta.url), 'utf8')) as IngredientDef[];

const LINES_FILE = process.argv[2];
const MIN_COVERAGE = 98;
const SAMPLE_SIZE = 60;

const index = buildIngredientIndex(defs);

// ---- coverage ----
type CatalogueRecipe = { ingredientGroups: { items: { raw: string }[] }[] };
const lines = (
  LINES_FILE
    ? readFileSync(LINES_FILE, 'utf8').split('\n')
    : (JSON.parse(readFileSync(new URL('../src/data/catalogue/recipes.json', import.meta.url), 'utf8')) as CatalogueRecipe[]).flatMap((r) =>
        r.ingredientGroups.flatMap((g) => g.items.map((i) => i.raw)),
      )
)
  .map((l: string) => l.trim())
  .filter(Boolean);

let matched = 0;
const misses = new Map<string, number>();
const matches: { item: string; id: string }[] = [];
for (const raw of lines) {
  const { line } = parseIngredientLine(raw, index.match);
  if (line.ingredientId) {
    matched++;
    matches.push({ item: line.item, id: line.ingredientId });
  } else {
    const key = line.item || `(empty item) ${raw}`;
    misses.set(key, (misses.get(key) ?? 0) + 1);
  }
}
const coverage = (matched / lines.length) * 100;
console.log(`Ingredients in database: ${index.byId.size}`);
console.log(`Lines: ${lines.length}, matched: ${matched}, coverage: ${coverage.toFixed(2)}%`);

console.log('\nTop unmatched items:');
[...misses.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 40)
  .forEach(([item, n]) => console.log(`  ${String(n).padStart(3)}  ${item}`));

// ---- random sample (seeded so runs are comparable) ----
let seed = Number(process.env['SEED'] ?? 42);
const random = (): number => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
console.log(`\n${SAMPLE_SIZE} random matches:`);
for (let i = 0; i < SAMPLE_SIZE && matches.length; i++) {
  const m = matches[Math.floor(random() * matches.length)];
  if (m) console.log(`  ${m.item} → ${m.id}`);
}

// ---- assertions ----
const failures: string[] = [];
const idOf = (item: string): string | undefined => index.match(item);
const groupsOf = (item: string): readonly IngredientGroup[] => {
  const id = idOf(item);
  return (id && index.byId.get(id)?.groups) || [];
};
function expectId(item: string, id: string): void {
  const got = idOf(item);
  if (got !== id) failures.push(`"${item}" → ${got ?? 'no match'}, expected ${id}`);
}
function expect(cond: boolean, message: string): void {
  if (!cond) failures.push(message);
}

expectId('sweet potato', 'sweet-potato');
expectId('coconut milk', 'coconut-milk');
expectId('peanut butter', 'peanut-butter');
expectId('red pepper flakes', 'chilli-flakes');
expectId('red capsicum', 'capsicum');
expectId('spring onions', 'spring-onion');
expectId('garlic', 'garlic');
{
  const id = idOf('beef or lamb stock');
  expect(!!id && /stock/.test(id), `"beef or lamb stock" → ${id ?? 'no match'}, expected a stock entry`);
  expect(id !== undefined && !['beef-steak', 'beef-mince'].includes(id), `"beef or lamb stock" matched plain beef`);
}
expectId('chicken stock', 'chicken-stock');
expect(groupsOf('chicken stock').includes('poultry'), 'chicken stock should include poultry');
expect(groupsOf('fish sauce').includes('fish'), 'fish sauce should include fish');
expect(groupsOf('soy sauce').includes('gluten') && groupsOf('soy sauce').includes('soy'), 'soy sauce should include gluten and soy');
expect(groupsOf('parmesan').includes('dairy'), 'parmesan should include dairy');
expectId('tinned chickpeas', 'chickpeas');
expectId('chickpeas', 'chickpeas');
expect(groupsOf('egg noodles').includes('egg') && groupsOf('egg noodles').includes('gluten'), 'egg noodles should include egg and gluten');
expect(idOf('rice noodles') !== undefined && !groupsOf('rice noodles').includes('gluten'), 'rice noodles should match and have no gluten');

// Extra guards against longest-match theft.
expectId('coconut cream', 'coconut-cream');
expectId('sour cream', 'sour-cream');
expectId('butter', 'butter');
expectId('brown onion', 'brown-onion');
expectId('red onion', 'red-onion');
expectId('diced tomatoes', 'tinned-tomatoes');
expectId('cherry tomatoes', 'cherry-tomato');
expectId('ground cinnamon', 'ground-cinnamon');
expectId('cinnamon stick', 'cinnamon-stick');
expectId('chicken thigh', 'chicken-thigh');
expectId('chicken breasts', 'chicken-breast');
expectId('beef mince', 'beef-mince');
expectId('plain flour', 'plain-flour');
expectId('smoked paprika', 'smoked-paprika');
expectId('rice vinegar', 'rice-vinegar');
expectId('rice wine', 'rice-wine');
expectId('sesame oil', 'sesame-oil');
expectId('toasted sesame seeds', 'sesame-seeds');
expectId('lemon juice', 'lemon');
expectId('salt and pepper', 'salt');
expectId('tamari', 'tamari');
expect(!groupsOf('tamari').includes('gluten'), 'tamari should not include gluten');
expect(groupsOf('worcestershire sauce').includes('fish'), 'worcestershire should include fish');
expect(groupsOf('oyster sauce').includes('shellfish'), 'oyster sauce should include shellfish');
expect(!groupsOf('smoked paprika').includes('chilli'), 'smoked paprika is not chilli');
expect(groupsOf('bacon').includes('pork'), 'bacon should include pork');
expect(groupsOf('vegetable stock').length === 0, 'vegetable stock has no groups');

// Data sanity.
for (const d of defs) {
  if (d.staple && !['salt', 'black-pepper', 'water', 'olive-oil', 'neutral-oil'].includes(d.id)) failures.push(`unexpected staple ${d.id}`);
  if (d.groups.includes('meat') && !d.groups.some((g) => ['beef', 'pork', 'lamb', 'poultry'].includes(g)))
    failures.push(`${d.id}: meat without a specific animal`);
  for (const a of d.aliases) if (a !== a.toLowerCase()) failures.push(`${d.id}: alias not lower case: ${a}`);
}

console.log(failures.length ? `\n${failures.length} assertion(s) FAILED:` : '\nAll assertions passed.');
for (const f of failures) console.log(`  ✗ ${f}`);

if (failures.length || coverage < MIN_COVERAGE) {
  if (coverage < MIN_COVERAGE) console.log(`Coverage ${coverage.toFixed(2)}% is below ${MIN_COVERAGE}%.`);
  process.exit(1);
}
