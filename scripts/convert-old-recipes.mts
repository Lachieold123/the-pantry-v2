// One-off conversion of the old app's free-text catalogue into v2's
// structured recipes. Run it again any time the tags or ingredient database
// change; it's deterministic, and its report lists everything a person
// should look at.
//
//   npm run catalogue:convert -- /path/to/the-pantry-app
//
// Writes:
//   src/data/catalogue/recipes.json   the catalogue the app bundles
//   docs/reports/catalogue-report.md  lines to check, warnings
//   docs/reports/recipe-review.csv    one row per recipe for Lachlan to approve tags
//
// Nothing is written if there are errors (a fix that matches nothing or more
// than once, an unknown recipe key, an invalid recipe), so a half-applied
// conversion can never be committed. Warnings are reported but don't block.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildIngredientIndex, type IngredientDef } from '../src/domain/ingredients/database.ts';
import { parseIngredientLine } from '../src/domain/ingredients/parse.ts';
import type { ParseIssue } from '../src/domain/ingredients/types.ts';
import { deriveDiets } from '../src/domain/recipes/diets.ts';
import { isOptionalHeading } from '../src/domain/recipes/draft.ts';
import type { CuisineId, Difficulty, MealType, Recipe, Season } from '../src/domain/recipes/types.ts';
import { validateRecipe } from '../src/domain/recipes/validate.ts';
import { applyAcross, checkFixes, checkTags, type Fix } from './catalogue/fixes.mts';

type OldRecipe = {
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty?: Difficulty;
  ingredients: { section?: string; items: string[] }[];
  steps: string[];
  notes?: string[];
};
type Tags = {
  title: string;
  cuisine: CuisineId;
  mealTypes: MealType[];
  onePot: boolean;
  seasons?: Season[];
  summary: string;
  /** Set once Lachlan has cook-tested the recipe (D-008): store builds show only these. */
  vetted?: true;
};
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
let applied = 0;

const defs = JSON.parse(readFileSync(join(root, 'src/data/ingredients/ingredients.json'), 'utf8')) as IngredientDef[];
const index = buildIngredientIndex(defs);

const recipes: Recipe[] = [];
const lineIssues: { id: string; raw: string; issues: ParseIssue[] }[] = [];
/** Anything here stops the conversion writing its outputs. */
const problems: string[] = [];
/** Worth a look, but the catalogue is still correct. */
const warnings: string[] = [];
const noImage: string[] = [];

const oldIds = new Set(Object.keys(RECIPES));
problems.push(...checkFixes(fixes, oldIds), ...checkTags(tags, oldIds));

for (const id of Object.keys(RECIPES).sort()) {
  const source = RECIPES[id] as OldRecipe;
  const old: OldRecipe = {
    ...source,
    ingredients: source.ingredients.map((g) => ({ ...g, items: g.items.map(applyEverywhere) })),
    steps: source.steps.map(applyEverywhere),
    ...(source.notes ? { notes: source.notes.map(applyEverywhere) } : {}),
  };
  const tag = tags[id];
  if (!tag) {
    problems.push(`${id}: no tags in scripts/data/recipe-tags.json`);
    continue;
  }
  const fix = fixes[id];
  // Counted across every group, so a fix can't match once in two groups and apply twice.
  const fixedIngredients = applyAcross(
    id,
    'ingredients',
    old.ingredients.map((g) => g.items),
    fix?.ingredients,
    problems,
  );
  const fixedSteps = applyAcross(id, 'steps', [old.steps], fix?.steps, problems);
  applied += fixedIngredients.applied + fixedSteps.applied + (fix?.addNotes?.length ?? 0);
  const ingredientGroups = old.ingredients.map((group, g) => {
    const items = (fixedIngredients.groups[g] ?? [])
      // A fix can split one line into several ("\n") or remove it (""): see recipe-fixes.json.
      .flatMap((raw) => raw.split('\n'))
      .filter((raw) => raw.trim() !== '')
      .map((raw) => {
        const parsed = parseIngredientLine(raw, index.match);
        const worth = parsed.issues.filter((i) => i !== 'serving-suggestion' && i !== 'no-quantity');
        if (worth.length) lineIssues.push({ id, raw, issues: worth });
        // Same rule as the editor: lines under an "Optional…" heading are optional.
        return isOptionalHeading(group.section) ? { ...parsed.line, optional: true } : parsed.line;
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
      index,
    ),
    mealTypes: tag.mealTypes,
    // A cook-tested correction in recipe-fixes.json wins over the old data (K-4).
    difficulty: fix?.difficulty ?? old.difficulty ?? 'easy',
    prepMinutes: fix?.prepMinutes ?? old.prepMinutes,
    cookMinutes: fix?.cookMinutes ?? old.cookMinutes,
    servings: fix?.servings ?? old.servings,
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
    steps: (fixedSteps.groups[0] ?? []).map((text) => ({ text })),
    ...((old.notes?.length ?? 0) + (fix?.addNotes?.length ?? 0) ? { notes: [...(old.notes ?? []), ...(fix?.addNotes ?? [])] } : {}),
    source: 'house',
    provenance: tag.vetted ? 'vetted' : 'ai-draft',
  };
  if (!old.difficulty && !fix?.difficulty) warnings.push(`${id}: no difficulty in the old data; set to easy`);
  for (const p of validateRecipe(recipe)) problems.push(`${id}: ${p.path} ${p.message}`);
  recipes.push(recipe);
}

const byIssue = (issue: ParseIssue) => lineIssues.filter((l) => l.issues.includes(issue));
for (const w of warnings) console.warn(`warning: ${w}`);
if (problems.length) {
  for (const p of problems) console.error(`error: ${p}`);
  console.error(`\n${problems.length} errors. Nothing was written: fix them and run the conversion again.`);
  process.exit(1);
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
    // Quoted only where needed, the way Prettier writes it, so format:check passes on a fresh conversion.
    ...withImages.map((id) => `  ${/^[A-Za-z_$][\w$]*$/.test(id) ? id : `'${id}'`}: require('../../../assets/recipes/${id}.jpg'),`),
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

// A diet tag needs every option of an "A or B" line to fit it, which is the cautious choice.
// These recipes would gain "vegetarian" if the line were rewritten to name the meat-free option.
const vegetarianIfRewritten = recipes
  .filter((r) => !r.diets.includes('vegetarian'))
  .map((r) => {
    const lines = r.ingredientGroups.flatMap((g) => g.items);
    // Only lines where one of the options is itself meat- and fish-free ("chicken or vegetable stock", "beef stock or water").
    const meatFreeOption = (text: string) => {
      const id = index.match(text);
      return id !== undefined && deriveDiets([{ item: text, raw: text, quantity: 1, ingredientId: id }], index).includes('vegetarian');
    };
    const orLines = lines.filter((l) => / or /i.test(l.item) && l.item.split(/ or /i).some((alt) => meatFreeOption(alt.trim())));
    const rest = lines.filter((l) => !orLines.includes(l));
    return { r, orLines, restDiets: deriveDiets(rest, index) };
  })
  .filter((x) => x.orLines.length > 0 && x.restDiets.includes('vegetarian'));

const totalLines = recipes.reduce((n, r) => n + r.ingredientGroups.reduce((m, g) => m + g.items.length, 0), 0);
const report = [
  '# Catalogue conversion report',
  '',
  `Generated by \`scripts/convert-old-recipes.mts\`. Recipes: ${recipes.length}. Ingredient lines: ${totalLines}.`,
  '',
  `- Vetted (shown in store builds): **${recipes.filter((r) => r.provenance === 'vetted').length}**`,
  `- Warnings: **${warnings.length}**`,
  `- Lines matched to no ingredient: **${byIssue('no-ingredient-match').length}**`,
  `- Lines naming two ingredients ("A or B"): **${byIssue('multiple-ingredients').length}** (the list uses one; diets and the avoid list check every option)`,
  `- Recipes with no photo: **${noImage.length}**`,
  `- Hand fixes applied from \`scripts/data/recipe-fixes.json\`: **${applied}**`,
  '',
  '## Warnings',
  '',
  ...(warnings.length ? warnings.map((w) => `- ${w}`) : ['None.']),
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

console.log(`${recipes.length} recipes, ${warnings.length} warnings, ${byIssue('no-ingredient-match').length} unmatched lines.`);
