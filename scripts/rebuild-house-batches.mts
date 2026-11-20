// Rebuilds the catalogue without the old app (batch 03). The full converter
// (convert-old-recipes.mts) needs the old app's source to redo the converted
// recipes, and no longer reproduces them exactly; this keeps those as they are
// in recipes.json, applies any recipe-fixes.json entries they haven't had yet,
// re-links their lines to the current ingredient database and works their
// diets out again (L7 FOOD-2, FOOD-4). Then it re-appends every batch in
// scripts/data/house-recipes/ and regenerates images.ts as the converter does.
//
//   npx tsx scripts/rebuild-house-batches.mts
//
// Exits non-zero, writing nothing, if any batch has a problem.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIngredientIndex, type IngredientDef } from '../src/domain/ingredients/database.ts';
import { parseIngredientLine } from '../src/domain/ingredients/parse.ts';
import type { IngredientLine } from '../src/domain/ingredients/types.ts';
import { deriveDiets } from '../src/domain/recipes/diets.ts';
import { allLines, type Recipe } from '../src/domain/recipes/types.ts';
import { validateRecipe } from '../src/domain/recipes/validate.ts';
import { batchFiles, loadHouseRecipes, readBatch } from './house-recipes.mts';
import { applyFix, type Fix, type RawRecipe } from './recipe-fix.mts';
import { writeRecipePhotoMaps } from './recipe-photos.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cataloguePath = join(root, 'src/data/catalogue/recipes.json');
const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);

const problems: string[] = [];
const { fixes } = JSON.parse(readFileSync(join(root, 'scripts/data/recipe-fixes.json'), 'utf8')) as { fixes: Record<string, Fix> };

/**
 * The fix entries a frozen converted recipe hasn't had yet. Its text already carries every fix
 * the converter applied, so a replacement counts as pending only when its "from" is there and
 * its "to" isn't; a note, step or line is pending when it isn't there yet.
 */
function pendingFix(r: Recipe, fix: Fix | undefined): Fix | undefined {
  if (!fix) return undefined;
  const lines = allLines(r).map((l) => l.raw);
  const steps = r.steps.map((s) => s.text);
  const todo = (texts: string[]) => (x: { from: string; to: string }) =>
    texts.some((t) => t.includes(x.from)) && !texts.some((t) => t.includes(x.to));
  const out = {
    ingredients: (fix.ingredients ?? []).filter(todo(lines)),
    steps: (fix.steps ?? []).filter(todo(steps)),
    addNotes: (fix.addNotes ?? []).filter((n) => !(r.notes ?? []).includes(n)),
    addSteps: (fix.addSteps ?? []).filter((a) => !steps.includes(a.text)),
    addIngredients: (fix.addIngredients ?? []).filter((a) => !lines.includes(a.line)),
  };
  return Object.values(out).some((v) => v.length > 0) ? out : undefined;
}

/** A converted recipe with its pending fixes applied, every line re-linked to the current database, and its diets worked out again. */
function refreshConverted(r: Recipe): Recipe {
  const fix = pendingFix(r, fixes[r.id]);
  const raw: RawRecipe = {
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    difficulty: r.difficulty,
    ingredients: r.ingredientGroups.map((g) => ({ ...(g.title ? { section: g.title } : {}), items: g.items.map((l) => l.raw) })),
    steps: r.steps.map((s) => s.text),
    ...(r.notes ? { notes: r.notes } : {}),
  };
  const fixed = applyFix(r.id, raw, fix, { problem: (m) => problems.push(m), applied: () => {} });
  const old = new Map(allLines(r).map((l) => [l.raw, l]));
  const ingredientGroups = fixed.ingredients.map((g) => {
    const items = g.items.map((text) => {
      const { line } = parseIngredientLine(text, index.match);
      const was = old.get(text);
      // An unchanged line keeps its parsed shape and only takes the current link.
      if (!was) return line;
      const kept: IngredientLine = { ...was };
      if (line.ingredientId) kept.ingredientId = line.ingredientId;
      else delete kept.ingredientId;
      return kept;
    });
    return g.section ? { title: g.section, items } : { items };
  });
  const out: Recipe = {
    ...r,
    diets: deriveDiets(
      ingredientGroups.flatMap((g) => g.items),
      index.byId,
    ),
    ingredientGroups,
    steps: fixed.steps.map((text) => ({ text })),
    ...(fixed.notes?.length ? { notes: fixed.notes } : {}),
  };
  for (const p of validateRecipe(out)) problems.push(`${r.id}: ${p.path} ${p.message}`);
  return out;
}

const houseIds = new Set(batchFiles(root).flatMap((f) => readBatch(f).recipes.map((r) => r.id)));
const converted = (JSON.parse(readFileSync(cataloguePath, 'utf8')) as Recipe[]).filter((r) => !houseIds.has(r.id)).map(refreshConverted);
const taken = { ids: new Set(converted.map((r) => r.id)), titles: new Set(converted.map((r) => r.title.toLowerCase())) };

const recipes = [...converted, ...loadHouseRecipes(root, index, taken, (m) => problems.push(m))];
if (problems.length) {
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}

writeFileSync(cataloguePath, `${JSON.stringify(recipes, null, 2)}\n`);
// As in convert-old-recipes.mts: the photo maps come from recipe-photos.mts (K-30).
for (const p of writeRecipePhotoMaps(root, recipes)) console.error(`  ✗ ${p}`);
const withImages = recipes.filter((r) => r.image);
console.log(
  `Catalogue: ${recipes.length} recipes (${converted.length} converted, ${recipes.length - converted.length} from house batches); ${withImages.length} with photos.`,
);
