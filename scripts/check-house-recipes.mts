// Checks the new house recipe batches (D-044) without needing the old app, so
// a batch can be written and checked before the catalogue is rebuilt.
// Run from the repo root: npm run catalogue:check-house
//
// Uses the same loader as the converter, against the converted recipes in the
// current catalogue, then prints a short profile of each batch (meal types,
// cuisines, diets) to make gaps and lopsided batches easy to spot.
// Exits non-zero on any problem.

import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIngredientIndex, type IngredientDef } from '../src/domain/ingredients/database.ts';
import type { Recipe } from '../src/domain/recipes/types.ts';
import { batchFiles, loadHouseRecipes, readBatch } from './house-recipes.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);

// The catalogue may already hold these batches from the last rebuild; compare only against the rest.
const files = batchFiles(root);
const houseIds = new Set(files.flatMap((f) => readBatch(f).recipes.map((r) => r.id)));
const catalogue = (JSON.parse(readFileSync(join(root, 'src/data/catalogue/recipes.json'), 'utf8')) as Recipe[]).filter(
  (r) => !houseIds.has(r.id),
);
const taken = { ids: new Set(catalogue.map((r) => r.id)), titles: new Set(catalogue.map((r) => r.title.toLowerCase())) };

const problems: string[] = [];
const recipes = loadHouseRecipes(root, index, taken, (m) => problems.push(m));

const tally = (values: string[]) =>
  Object.entries(values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`)
    .join(', ');

console.log(`House recipes: ${recipes.length} in ${files.length} batch file(s): ${files.map((f) => basename(f)).join(', ')}`);
console.log(`Meal types: ${tally(recipes.flatMap((r) => r.mealTypes))}`);
console.log(`Cuisines: ${tally(recipes.map((r) => r.cuisine))}`);
console.log(`Diets: ${tally(recipes.flatMap((r) => r.diets))}`);
console.log(`Difficulty: ${tally(recipes.map((r) => r.difficulty))}`);
console.log(`Provenance: ${tally(recipes.map((r) => r.provenance ?? 'ai-draft'))}`);

console.log(problems.length ? `\n${problems.length} problem(s):` : '\nNo problems.');
for (const p of problems) console.log(`  ✗ ${p}`);
if (problems.length) process.exitCode = 1;
