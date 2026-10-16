// One-off conversion of the old app's free-text catalogue into v2's
// structured recipes. Run it again any time the tags or ingredient database
// change; it's deterministic, and its report lists everything a person
// should look at.
//
//   npm run catalogue:convert -- /path/to/the-pantry-app
//
// New house recipes (D-044) come from scripts/data/house-recipes/ and are
// appended after the converted ones, so a new batch never moves an old recipe.
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
import type { CuisineId, MealType, Recipe, Season } from '../src/domain/recipes/types.ts';
import { validateRecipe } from '../src/domain/recipes/validate.ts';
import { loadHouseRecipes } from './house-recipes.mts';
import { applyFix, type Fix, type RawRecipe as OldRecipe } from './recipe-fix.mts';

type Tags = { title: string; cuisine: CuisineId; mealTypes: MealType[]; onePot: boolean; seasons?: Season[]; summary: string };
type Credit = { photographer?: string; source?: string };
type GlobalReplacement = { from: string; to: string; why: string };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const oldApp = process.argv[2];
if (!oldApp || !existsSync(join(oldApp, 'src/data/recipes.ts'))) {
  console.error('Usage: npm run catalogue:convert -- /path/to/the-pantry-app');
  process.exit(1);
}

const { RECIPES } = (await import(pathToFileURL(join(oldApp, 'src/data/recipes.ts')).href)) as { RECIPES: Record<string, OldRecipe> };
const tags = JSON.parse(readFileSync(join(root, 'scripts/data/recipe-tags.json'), 'utf8')) as Record<string, Tags>;
// The editorial review (D-036): a recipe that passed ships as `reviewed`; one
// waiting on Lachlan's answer stays an `ai-draft`, hidden from store builds.
const review = JSON.parse(readFileSync(join(root, 'scripts/data/recipe-review-2026-10.json'), 'utf8')) as Record<
  string,
  { verdict: string }
>;
const credits = JSON.parse(readFileSync(join(oldApp, 'src/data/recipeImageCredits.json'), 'utf8')) as Record<string, Credit>;
const { fixes, everywhere } = JSON.parse(readFileSync(join(root, 'scripts/data/recipe-fixes.json'), 'utf8')) as {
  fixes: Record<string, Fix>;
  everywhere: GlobalReplacement[];
};

/** Wording changes applied to every ingredient line and step, matching case at the start of a sentence. */
function applyEverywhere(text: string): string {
  let out = text;
  for (const r of everywhere) {
    out = out.replace(new RegExp(r.from, 'gi'), (m) =>
      m[0] === m[0]?.toUpperCase() ? r.to.charAt(0).toUpperCase() + r.to.slice(1) : r.to,
    );
  }
  return out;
}
const applied: string[] = [];

const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);

const recipes: Recipe[] = [];
const lineIssues: { id: string; raw: string; issues: ParseIssue[] }[] = [];
const problems: string[] = [];
const noImage: string[] = [];

for (const id of Object.keys(RECIPES).sort()) {
  const source = RECIPES[id] as OldRecipe;
  const unfixed: OldRecipe = {
    ...source,
    ingredients: source.ingredients.map((g) => ({ ...g, items: g.items.map(applyEverywhere) })),
    steps: source.steps.map(applyEverywhere),
    ...(source.notes ? { notes: source.notes.map(applyEverywhere) } : {}),
  };
  const old = applyFix(id, unfixed, fixes[id], { problem: (m) => problems.push(m), applied: (w) => applied.push(w) });
  const tag = tags[id];
  if (!tag) {
    problems.push(`${id}: no tags in scripts/data/recipe-tags.json`);
    continue;
  }
  const ingredientGroups = old.ingredients.map((group) => {
    const items = group.items.map((raw) => {
      const parsed = parseIngredientLine(raw, index.match);
      const worth = parsed.issues.filter((i) => i !== 'serving-suggestion' && i !== 'no-quantity');
      if (worth.length) lineIssues.push({ id, raw, issues: worth });
      return parsed.line;
    });
    return group.section ? { title: group.section, items } : { items };
  });
  const hasImage = fixes[id]?.image !== false && existsSync(join(oldApp, 'assets/recipes', `${id}.jpg`));
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
    steps: old.steps.map((text) => ({ text })),
    ...(old.notes?.length ? { notes: old.notes } : {}),
    source: 'house',
    provenance: review[id] && review[id].verdict !== 'needs-lachlan' ? 'reviewed' : 'ai-draft',
  };
  if (!old.difficulty) problems.push(`${id}: no difficulty in the old data; set to easy`);
  for (const p of validateRecipe(recipe)) problems.push(`${id}: ${p.path} ${p.message}`);
  recipes.push(recipe);
}

const converted = recipes.length;
const taken = { ids: new Set(recipes.map((r) => r.id)), titles: new Set(recipes.map((r) => r.title.toLowerCase())) };
recipes.push(...loadHouseRecipes(root, index, taken, (m) => problems.push(m)));

mkdirSync(join(root, 'src/data/catalogue'), { recursive: true });
mkdirSync(join(root, 'docs/reports'), { recursive: true });
writeFileSync(join(root, 'src/data/catalogue/recipes.json'), `${JSON.stringify(recipes, null, 2)}\n`);

// Metro needs a static require() per image, so the image map is generated alongside the JSON.
// It's keyed by recipe id and points at the photo's key (the same as the id for every photo so far).
const withImages = recipes.flatMap((r) => (r.image ? [{ id: r.id, key: r.image.key }] : []));
writeFileSync(
  join(root, 'src/data/catalogue/images.ts'),
  [
    '// Generated by scripts/convert-old-recipes.mts. Do not edit by hand.',
    'export const RECIPE_IMAGES: Readonly<Record<string, number>> = {',
    // Quoted only where needed, as Prettier writes it, so a rebuild matches the committed file.
    ...withImages.map(({ id, key }) => `  ${/^[a-z_$][\w$]*$/i.test(id) ? id : `'${id}'`}: require('../../../assets/recipes/${key}.jpg'),`),
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
  `Generated by \`scripts/convert-old-recipes.mts\`. Recipes: ${recipes.length} (${converted} converted, ${recipes.length - converted} new house recipes). Ingredient lines: ${totalLines}.`,
  '',
  `- Validation problems: **${problems.length}**`,
  `- Lines matched to no ingredient: **${byIssue('no-ingredient-match').length}**`,
  `- Lines naming two ingredients ("A or B"): **${byIssue('multiple-ingredients').length}** (the first-named is used for the list and diets)`,
  `- Converted recipes with no photo: **${noImage.length}**; new house recipes with a photo: **${recipes.slice(converted).filter((r) => r.image).length}** of ${recipes.length - converted}`,
  `- Hand fixes applied from \`scripts/data/recipe-fixes.json\`: **${applied.length}**`,
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
