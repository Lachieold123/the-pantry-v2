// Prints the shape of the big data files without dumping them.
import { readFileSync, readdirSync } from 'node:fs';
const root = '/Users/lachlanoldfield/Developer/the-pantry-v2/.claude/worktrees/audit-1120/';
const trim = (v: unknown, d = 0): unknown => {
  if (typeof v === 'string') return v.length > 80 ? v.slice(0, 80) + '…' : v;
  if (Array.isArray(v)) return d > 3 ? `[${v.length}]` : v.slice(0, 2).map((x) => trim(x, d + 1)).concat(v.length > 2 ? [`…+${v.length - 2}`] : []);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trim(x, d + 1)]));
  return v;
};
const r = JSON.parse(readFileSync(root + 'src/data/catalogue/recipes.json', 'utf8'));
const arr = Array.isArray(r) ? r : r.recipes ?? Object.values(r);
console.log('recipes.json top:', Array.isArray(r) ? 'array' : Object.keys(r).slice(0, 10), 'n=', arr.length);
const keys = new Map<string, number>();
for (const x of arr) for (const k of Object.keys(x)) keys.set(k, (keys.get(k) ?? 0) + 1);
console.log('keys', Object.fromEntries(keys));
console.log(JSON.stringify(trim(arr[0]), null, 1).slice(0, 2500));
const count = (f: (x: any) => string | string[] | undefined) => {
  const m = new Map<string, number>();
  for (const x of arr) for (const v of [f(x)].flat()) m.set(String(v), (m.get(String(v)) ?? 0) + 1);
  return Object.fromEntries([...m].sort((a, b) => b[1] - a[1]).slice(0, 40));
};
console.log('source', count((x) => x.source));
console.log('provenance', count((x) => x.provenance));
console.log('diets', count((x) => x.diets));
console.log('lineKeys', count((x) => x.ingredientGroups.flatMap((g: any) => g.items.flatMap((i: any) => Object.keys(i)))));
const b = JSON.parse(readFileSync(root + 'scripts/data/house-recipes/batch-04-A01.json', 'utf8'));
const barr = Array.isArray(b) ? b : b.recipes;
console.log('batch top', Array.isArray(b) ? 'array' : Object.keys(b), 'n', barr?.length);
console.log(JSON.stringify(trim(barr[0]), null, 1).slice(0, 2500));
const ing = JSON.parse(readFileSync(root + 'src/data/ingredients/ingredients.json', 'utf8'));
const iarr = Array.isArray(ing) ? ing : ing.ingredients ?? Object.values(ing);
console.log('ingredients top', Array.isArray(ing) ? 'array' : Object.keys(ing).slice(0, 5), 'n', iarr.length);
console.log(JSON.stringify(trim(iarr[0])));
console.log('batch files', readdirSync(root + 'scripts/data/house-recipes').length);
