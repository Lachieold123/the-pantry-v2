// New house recipes written for v2 (D-044), kept apart from the old-app
// conversion. Each batch is one JSON file in scripts/data/house-recipes/,
// read in file-name order and appended after the converted recipes, so adding
// a batch never moves or changes an existing recipe in the catalogue.
//
// A batch entry is the recipe as a cook writes it: ingredient lines and steps
// as text, parsed by the same parser as everything else (D-021). The author
// also states the diets they expect; the script works them out from the
// ingredient database and reports any difference, which catches a stray soy
// sauce in a "no-gluten" dish. New recipes are held to a stricter standard
// than the converted ones: every line must name a known ingredient.
//
// A photo is optional. When a batch entry has one, the WebP lives at
// assets/recipes/<key>.webp and the entry carries its credit and the page it
// came from, so every photo's licence can be traced (D-045).
//
// Used by convert-old-recipes.mts (which writes the catalogue), by
// check-house-recipes.mts (which checks a batch without the old app) and by
// write-photo-sources.mts (which writes the photo page map on its own).

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IngredientIndex } from '../src/domain/ingredients/database.ts';
import { parseIngredientLine } from '../src/domain/ingredients/parse.ts';
import { deriveDiets } from '../src/domain/recipes/diets.ts';
import { isCommonsFilePage, photoLicence } from '../src/domain/recipes/photoCredit.ts';
import type { CuisineId, DietTag, Difficulty, MealType, Provenance, Recipe, Season } from '../src/domain/recipes/types.ts';
import { validateRecipe } from '../src/domain/recipes/validate.ts';
import { PHOTO_DIR, PHOTO_EXT } from './recipe-photos.mts';
import { artefactProblems, claimProblems, dietTextProblems, orLines } from './recipe-text-checks.mts';

export type HouseRecipe = {
  id: string;
  title: string;
  summary: string;
  cuisine: CuisineId;
  mealTypes: MealType[];
  difficulty: Difficulty;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  onePot: boolean;
  seasons?: Season[];
  /** What the author expects; checked against the diets worked out from the ingredients. */
  diets: DietTag[];
  ingredients: { section?: string; items: string[] }[];
  steps: string[];
  notes?: string[];
  /** Left out until Lachlan reviews or cook-tests the recipe, which keeps it an `ai-draft` (hidden in store builds). */
  provenance?: Provenance;
  /** Batch 03: who the recipe is credited to (always The Pantry) and the model that wrote it. */
  author?: string;
  generatedBy?: string;
  /** A real, freely licensed photo (D-045): the file at assets/recipes/<key>.webp, the credit shown under it, and its source page. */
  image?: { key: string; credit: string; source: string };
  /**
   * The author's estimate per serve (batch-04 on). Not shown in the app yet and not copied into the
   * catalogue; validate-house-recipes.mts checks it against the macros and a rough sum of the ingredients.
   */
  nutrition?: Nutrition;
};

export type Nutrition = { kcal: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; sodiumMg: number };

export type HouseBatch = { about: string; recipes: HouseRecipe[] };

/** Ids and lower-case titles already in the catalogue; new recipes are added as they're read. */
export type Taken = { ids: Set<string>; titles: Set<string> };

export const HOUSE_DIR = 'scripts/data/house-recipes';

export function batchFiles(root: string): string[] {
  const dir = join(root, HOUSE_DIR);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(dir, f));
}

export function readBatch(file: string): HouseBatch {
  return JSON.parse(readFileSync(file, 'utf8')) as HouseBatch;
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

// Text the app shows must follow the house style; em dashes also split a line's prep in the parser.
const allText = (h: HouseRecipe) => [h.title, h.summary, ...h.ingredients.flatMap((g) => g.items), ...h.steps, ...(h.notes ?? [])];

// "Photo: Name / Wikimedia Commons (CC BY-SA 4.0)": the same shape as the Pexels credits, with the licence where it asks for one.
const CREDIT = /^Photo: \S.* \/ \S.*$/;

function checkImage(h: HouseRecipe, root: string, problem: (m: string) => void): void {
  if (!h.image) return;
  const { key, credit, source } = h.image;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) problem(`${h.id}: image key "${key}" must be lower-case words joined by hyphens`);
  if (!existsSync(join(root, PHOTO_DIR, `${key}${PHOTO_EXT}`))) problem(`${h.id}: no photo at ${PHOTO_DIR}/${key}${PHOTO_EXT}`);
  if (!CREDIT.test(credit)) problem(`${h.id}: photo credit should read "Photo: Name / Source", got "${credit}"`);
  // The later batches also use Pexels photos (free licence, no licence link to show), as main's check allowed.
  if (isPexelsPhoto(h.image)) return;
  if (!isCommonsFilePage(source)) problem(`${h.id}: photo needs the https link to its Wikimedia Commons file page, got "${source}"`);
  // The app links the licence the credit names (K-17), so it must be one it knows.
  if (!photoLicence(credit)) problem(`${h.id}: photo credit should end with a known licence, like "(CC BY-SA 4.0)", got "${credit}"`);
}

function isPexelsPhoto({ credit, source }: { credit: string; source: string }): boolean {
  return /^https:\/\/www\.pexels\.com\/photo\/\S+$/.test(source) && / \/ Pexels$/.test(credit);
}

/** One batch entry as a catalogue recipe, with the repo's checks reported through `problem`. Also used by validate-house-recipes.mts. */
export function toRecipe(h: HouseRecipe, root: string, index: IngredientIndex, problem: (m: string) => void): Recipe {
  const ingredientGroups = h.ingredients.map((group) => {
    const items = group.items.map((raw) => {
      const { line, issues } = parseIngredientLine(raw, index.match);
      if (issues.includes('no-ingredient-match')) problem(`${h.id}: no ingredient match for "${raw}"`);
      if (issues.includes('multiple-ingredients')) problem(`${h.id}: names two ingredients, put the alternative in brackets: "${raw}"`);
      return line;
    });
    return group.section ? { title: group.section, items } : { items };
  });
  const diets = deriveDiets(
    ingredientGroups.flatMap((g) => g.items),
    index.byId,
  );
  if (!sameSet(diets, h.diets)) problem(`${h.id}: diets stated [${h.diets.join(', ')}] but the ingredients give [${diets.join(', ')}]`);
  // The words must agree with the tags too, so a bad link can't hand out a wrong diet (D-053).
  const items = ingredientGroups.flatMap((g) => g.items);
  for (const p of dietTextProblems(
    diets,
    items.map((l) => `${l.item}${l.optional ? ' (optional)' : ''}`),
  ))
    problem(`${h.id}: ${p}`);
  for (const l of orLines(
    items.map((l) => l.item),
    index.match,
  ))
    problem(`${h.id}: one ingredient per line, put the alternative in brackets: "${l}"`);
  // A plain claim ("Naturally vegan.") a counted line breaks, and bulk-edit damage ("Pandan-Free") (L7 FOOD-3, FOOD-11).
  const groups = new Set(
    items.filter((l) => !l.optional).flatMap((l) => (l.ingredientId ? (index.byId.get(l.ingredientId)?.groups ?? []) : [])),
  );
  for (const p of claimProblems([h.title, h.summary ?? '', ...(h.notes ?? [])], groups)) problem(`${h.id}: ${p}`);
  for (const p of artefactProblems([h.title, h.summary ?? '', ...h.ingredients.flatMap((g) => g.items), ...h.steps]))
    problem(`${h.id}: ${p}`);
  if (!h.summary?.trim()) problem(`${h.id}: no summary`);
  if (h.prepMinutes <= 0) problem(`${h.id}: prepMinutes must be more than 0`);
  if (h.prepMinutes + h.cookMinutes <= 0) problem(`${h.id}: no time given`);
  if (allText(h).some((t) => t.includes('—'))) problem(`${h.id}: uses an em dash`);
  checkImage(h, root, problem);
  if (h.provenance === 'ai-assisted' && (!h.generatedBy || h.author !== 'The Pantry'))
    problem(`${h.id}: an ai-assisted recipe must be credited to The Pantry and say which model wrote it`);
  if (h.image && /\bAI\b|AI-generated/.test(h.image.credit))
    problem(`${h.id}: photo credit says it's AI-generated; house batches use real photos only`);
  return {
    id: h.id,
    title: h.title,
    summary: h.summary,
    cuisine: h.cuisine,
    diets,
    mealTypes: h.mealTypes,
    difficulty: h.difficulty,
    prepMinutes: h.prepMinutes,
    cookMinutes: h.cookMinutes,
    servings: h.servings,
    onePot: h.onePot,
    ...(h.seasons?.length ? { seasons: h.seasons } : {}),
    ...(h.image ? { image: { key: h.image.key, credit: h.image.credit } } : {}),
    ingredientGroups,
    steps: h.steps.map((text) => ({ text })),
    ...(h.notes?.length ? { notes: h.notes } : {}),
    source: 'house',
    provenance: h.provenance ?? 'ai-draft',
    ...(h.generatedBy ? { generatedBy: h.generatedBy } : {}),
  };
}

/** Every batch, in file order, as catalogue recipes. Anything wrong is reported through `problem`. */
export function loadHouseRecipes(root: string, index: IngredientIndex, taken: Taken, problem: (m: string) => void): Recipe[] {
  const out: Recipe[] = [];
  for (const file of batchFiles(root)) {
    for (const h of readBatch(file).recipes) {
      if (taken.ids.has(h.id)) problem(`${h.id}: id already in the catalogue`);
      if (taken.titles.has(h.title.toLowerCase())) problem(`${h.id}: title "${h.title}" already in the catalogue`);
      taken.ids.add(h.id);
      taken.titles.add(h.title.toLowerCase());
      const recipe = toRecipe(h, root, index, problem);
      for (const p of validateRecipe(recipe)) problem(`${h.id}: ${p.path} ${p.message}`);
      out.push(recipe);
    }
  }
  return out;
}

// The photo's file page isn't part of the recipe, so it's kept beside the
// catalogue in its own generated map (K-17). It's written from the batches
// alone, so it can be rebuilt without the old app.
export const PHOTO_SOURCES_FILE = 'src/data/catalogue/photoSources.ts';

// The repo's Prettier print width (.prettierrc.json).
const PRINT_WIDTH = 140;

// Single quotes unless the text holds one, as Prettier chooses.
const quote = (text: string) => (text.includes("'") ? JSON.stringify(text) : `'${text.replace(/\\/g, '\\\\')}'`);

export function photoSourcesModule(root: string): string {
  // Commons pages only: they're the ones the recipe page links (photoCredit); a Pexels credit shows as text.
  const pages = batchFiles(root).flatMap((f) =>
    readBatch(f).recipes.flatMap((h) => (h.image && isCommonsFilePage(h.image.source) ? [[h.id, h.image.source]] : [])),
  );
  return [
    '// Generated by scripts/write-photo-sources.mts (and catalogue:convert) from',
    '// scripts/data/house-recipes/. Do not edit by hand.',
    "// Each house photo's Wikimedia Commons file page, by recipe id (D-045, K-17).",
    'export const PHOTO_SOURCES: Readonly<Record<string, string>> = {',
    // Quoted only where needed, as Prettier writes it, so a rebuild matches the committed file.
    ...pages.map(([id = '', page = '']) => {
      const key = `  ${/^[a-z_$][\w$]*$/i.test(id) ? id : `'${id}'`}:`;
      const line = `${key} ${quote(page)},`;
      // Prettier moves a value that doesn't fit onto its own line.
      return line.length <= PRINT_WIDTH ? line : `${key}\n    ${quote(page)},`;
    }),
    '};',
    '',
  ].join('\n');
}

export function writePhotoSources(root: string): void {
  writeFileSync(join(root, PHOTO_SOURCES_FILE), photoSourcesModule(root));
}
