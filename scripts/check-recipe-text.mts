// Reads every recipe in the built catalogue and checks its own words against
// its diet tags and for "A or B" lines (scripts/recipe-text-checks.mts).
// Run after catalogue:convert: npm run catalogue:check-text
// Exits non-zero on any problem.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIngredientIndex, type IngredientDef } from '../src/domain/ingredients/database.ts';
import type { Recipe } from '../src/domain/recipes/types.ts';
import { dietTextProblems, orLines } from './recipe-text-checks.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const recipes = JSON.parse(readFileSync(join(root, 'src/data/catalogue/recipes.json'), 'utf8')) as Recipe[];

const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);

const problems: string[] = [];
for (const r of recipes) {
  // The item only: prep ("for cooking the noodles") and notes (alternatives) aren't what goes in.
  const lines = r.ingredientGroups.flatMap((g) => g.items).map((l) => `${l.item}${l.optional ? ' (optional)' : ''}`);
  for (const p of dietTextProblems(r.diets, lines)) problems.push(`${r.id} (${r.source}): ${p}`);
  for (const l of orLines(
    r.ingredientGroups.flatMap((g) => g.items).map((i) => i.item),
    index.match,
  ))
    problems.push(`${r.id} (${r.source}): one ingredient per line, put the alternative in brackets: "${l}"`);
}
console.log(`Recipe text: ${recipes.length} recipes, ${problems.length} problem(s).`);
for (const p of problems) console.log(`  ✗ ${p}`);
if (problems.length) process.exitCode = 1;
