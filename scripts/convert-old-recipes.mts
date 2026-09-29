// One-off conversion of the old app's free-text catalogue into v2's
// structured recipes. Run it again any time the tags or ingredient database
// change; it's deterministic, and its report lists everything a person
// should look at.
//
//   npm run catalogue:convert -- /path/to/the-pantry-app
//
// Writes:
//   src/data/catalogue/recipes.json   the catalogue the app bundles
//   docs/reports/catalogue-report.md  lines to check, validation problems
//   docs/reports/recipe-review.csv    one row per recipe for Lachlan to approve tags

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildIngredientIndex, type IngredientDef } from '../src/domain/ingredients/database.ts';
import { parseIngredientLine } from '../src/domain/ingredients/parse.ts';
import type { ParseIssue } from '../src/domain/ingredients/types.ts';
import { deriveDiets } from '../src/domain/recipes/diets.ts';
import type { CuisineId, Difficulty, MealType, Recipe, Season } from '../src/domain/recipes/types.ts';
import { validateRecipe } from '../src/domain/recipes/validate.ts';

type OldRecipe = {
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty?: Difficulty;
  ingredients: { section?: string; items: string[] }[];
  steps: string[];
  notes?: string[];
};
type Tags = { title: string; cuisine: CuisineId; mealTypes: MealType[]; onePot: boolean; seasons?: Season[]; summary: string };
type Credit = { photographer?: string; source?: string };
type Replacement = { from: string; to: string };
type Fix = { steps?: Replacement[]; ingredients?: Replacement[]; addNotes?: string[] };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const oldApp = process.argv[2];
if (!oldApp || !existsSync(join(oldApp, 'src/data/recipes.ts'))) {
  console.error('Usage: npm run catalogue:convert -- /path/to/the-pantry-app');
  process.exit(1);
}

const { RECIPES } = (await import(pathToFileURL(join(oldApp, 'src/data/recipes.ts')).href)) as { RECIPES: Record<string, OldRecipe> };
const tags = JSON.parse(readFileSync(join(root, 'scripts/data/recipe-tags.json'), 'utf8')) as Record<string, Tags>;
const credits = JSON.parse(readFileSync(join(oldApp, 'src/data/recipeImageCredits.json'), 'utf8')) as Record<string, Credit>;
const { fixes } = JSON.parse(readFileSync(join(root, 'scripts/data/recipe-fixes.json'), 'utf8')) as { fixes: Record<string, Fix> };
const applied: string[] = [];

/** Replace text that must appear exactly once in the list; anything else is a conversion error. */
function applyReplacements(id: string, where: string, texts: string[], replacements: Replacement[] | undefined): string[] {
  let out = texts;
  for (const r of replacements ?? []) {
    const hits = out.filter((t) => t.includes(r.from)).length;
    if (hits !== 1) {
      problems.push(`${id}: fix for ${where} matched ${hits} times: "${r.from}"`);
      continue;
    }
    out = out.map((t) => (t.includes(r.from) ? t.replace(r.from, r.to) : t));
    applied.push(`${id} (${where})`);
  }
  return out;
}

const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);

const recipes: Recipe[] = [];
const lineIssues: { id: string; raw: string; issues: ParseIssue[] }[] = [];
const problems: string[] = [];
const noImage: string[] = [];

for (const id of Object.keys(RECIPES).sort()) {
  const old = RECIPES[id] as OldRecipe;
  const tag = tags[id];
  if (!tag) {
    problems.push(`${id}: no tags in scripts/data/recipe-tags.json`);
    continue;
  }
  const fix = fixes[id];
  const ingredientGroups = old.ingredients.map((group) => {
    const items = applyReplacements(
      id,
      'ingredients',
      group.items,
      fix?.ingredients?.filter((r) => group.items.some((t) => t.includes(r.from))),
    ).map((raw) => {
      const parsed = parseIngredientLine(raw, index.match);
      const worth = parsed.issues.filter((i) => i !== 'serving-suggestion' && i !== 'no-quantity');
      if (worth.length) lineIssues.push({ id, raw, issues: worth });
      return parsed.line;
    });
    return group.section ? { title: group.section, items } : { items };
  });
  const hasImage = existsSync(join(oldApp, 'assets/recipes', `${id}.jpg`));
  if (!hasImage) noImage.push(id);
  const credit = credits[id];
  const recipe: Recipe = {
    id,
    title: tag.title,
    summary: tag.summary,
    cuisine: tag.cuisine,
    diets: deriveDiets(
      ingredientGroups.flatMap((g) => g.items),
      index.byId,
    ),
    mealTypes: tag.mealTypes,
    difficulty: old.difficulty ?? 'easy',
    prepMinutes: old.prepMinutes,
    cookMinutes: old.cookMinutes,
    servings: old.servings,
    onePot: tag.onePot,
    ...(tag.seasons ? { seasons: tag.seasons } : {}),
    ...(hasImage
      ? {
          image: {
            key: id,
            ...(credit?.photographer
              ? { credit: `Photo: ${credit.photographer} / ${credit.source === 'pexels' ? 'Pexels' : (credit.source ?? 'unknown')}` }
              : {}),
          },
        }
      : {}),
    ingredientGroups,
    steps: applyReplacements(id, 'steps', old.steps, fix?.steps).map((text) => ({ text })),
    ...((old.notes?.length ?? 0) + (fix?.addNotes?.length ?? 0) ? { notes: [...(old.notes ?? []), ...(fix?.addNotes ?? [])] } : {}),
    source: 'house',
    provenance: 'ai-draft',
  };
  if (!old.difficulty) problems.push(`${id}: no difficulty in the old data; set to easy`);
  for (const p of validateRecipe(recipe)) problems.push(`${id}: ${p.path} ${p.message}`);
  recipes.push(recipe);
}

mkdirSync(join(root, 'src/data/catalogue'), { recursive: true });
mkdirSync(join(root, 'docs/reports'), { recursive: true });
writeFileSync(join(root, 'src/data/catalogue/recipes.json'), `${JSON.stringify(recipes, null, 2)}\n`);

// Metro needs a static require() per image, so the image map is generated alongside the JSON.
const withImages = recipes.filter((r) => r.image).map((r) => r.id);
writeFileSync(
  join(root, 'src/data/catalogue/images.ts'),
  [
    '// Generated by scripts/convert-old-recipes.mts. Do not edit by hand.',
    'export const RECIPE_IMAGES: Readonly<Record<string, number>> = {',
    ...withImages.map((id) => `  '${id}': require('../../../assets/recipes/${id}.jpg'),`),
    '};',
    '',
  ].join('\n'),
);

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csv = [
  ['id', 'title', 'cuisine', 'meal types', 'diets', 'one pot', 'seasons', 'summary', 'approved (y/n)', 'changes'].join(','),
  ...recipes.map((r) =>
    [
      r.id,
      r.title,
      r.cuisine,
      r.mealTypes.join(' '),
      r.diets.join(' '),
      r.onePot ? 'yes' : 'no',
      (r.seasons ?? []).join(' '),
      r.summary ?? '',
      '',
      '',
    ]
      .map(csvCell)
      .join(','),
  ),
].join('\n');
writeFileSync(join(root, 'docs/reports/recipe-review.csv'), `${csv}\n`);

// Diets are worked out from the first-named option of "A or B" lines, which is the cautious choice.
// These recipes would gain "vegetarian" if the line were rewritten to name the meat-free option.
const vegetarianIfRewritten = recipes
  .filter((r) => !r.diets.includes('vegetarian'))
  .map((r) => {
    const lines = r.ingredientGroups.flatMap((g) => g.items);
    // Only lines where one of the options is itself meat- and fish-free ("chicken or vegetable stock", "beef stock or water").
    const meatFreeOption = (text: string) => {
      const id = index.match(text);
      return id !== undefined && deriveDiets([{ item: text, raw: text, quantity: 1, ingredientId: id }], index.byId).includes('vegetarian');
    };
    const orLines = lines.filter((l) => / or /i.test(l.item) && l.item.split(/ or /i).some((alt) => meatFreeOption(alt.trim())));
    const rest = lines.filter((l) => !orLines.includes(l));
    return { r, orLines, restDiets: deriveDiets(rest, index.byId) };
  })
  .filter((x) => x.orLines.length > 0 && x.restDiets.includes('vegetarian'));

const byIssue = (issue: ParseIssue) => lineIssues.filter((l) => l.issues.includes(issue));
const totalLines = recipes.reduce((n, r) => n + r.ingredientGroups.reduce((m, g) => m + g.items.length, 0), 0);
const report = [
  '# Catalogue conversion report',
  '',
  `Generated by \`scripts/convert-old-recipes.mts\`. Recipes: ${recipes.length}. Ingredient lines: ${totalLines}.`,
  '',
  `- Validation problems: **${problems.length}**`,
  `- Lines matched to no ingredient: **${byIssue('no-ingredient-match').length}**`,
  `- Lines naming two ingredients ("A or B"): **${byIssue('multiple-ingredients').length}** (the first-named is used for the list and diets)`,
  `- Recipes with no photo: **${noImage.length}**`,
  `- Hand fixes applied from \`scripts/data/recipe-fixes.json\`: **${applied.length + Object.values(fixes).reduce((n, f) => n + (f.addNotes?.length ?? 0), 0)}**`,
  '',
  '## Validation problems',
  '',
  ...(problems.length ? problems.map((p) => `- ${p}`) : ['None.']),
  '',
  '## Lines with no ingredient match',
  '',
  ...(byIssue('no-ingredient-match').length ? byIssue('no-ingredient-match').map((l) => `- \`${l.id}\`: ${l.raw}`) : ['None.']),
  '',
  '## "A or B" lines',
  '',
  ...byIssue('multiple-ingredients').map((l) => `- \`${l.id}\`: ${l.raw}`),
  '',
  '## Would be vegetarian if an "A or B" line named the meat-free option',
  '',
  ...(vegetarianIfRewritten.length
    ? vegetarianIfRewritten.map((x) => `- \`${x.r.id}\`: ${x.orLines.map((l) => l.raw).join('; ')}`)
    : ['None.']),
  '',
  '## Recipes with no photo',
  '',
  ...(noImage.length ? noImage.map((id) => `- ${id}`) : ['None.']),
  '',
].join('\n');
writeFileSync(join(root, 'docs/reports/catalogue-report.md'), report);

console.log(`${recipes.length} recipes, ${problems.length} problems, ${byIssue('no-ingredient-match').length} unmatched lines.`);
if (problems.length) process.exitCode = 1;
