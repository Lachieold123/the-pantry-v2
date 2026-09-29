// Reads what testers saved in the old app (the TestFlight builds) and turns
// it into v2 records (D-005). Pure: the caller loads the old JSON and writes
// the result into the v2 stores. The old data itself is never changed or
// deleted, so a mistake here can always be fixed and re-run.
//
// Imported: bookmarks, collections, hidden dishes, recently viewed, the cook
// log, the cupboard, custom recipes and onboarding answers.
// Not imported: the plan and shopping list (weekday-based and stale).

import type { IngredientIndex } from '../ingredients/database';
import { AVOID_OPTIONS, type AvoidList, type AvoidOption, type DietPreference } from '../recipes/diets';
import { EMPTY_DRAFT, myRecipeId, type RecipeDraft } from '../recipes/draft';
import type { TimeFilter } from '../recipes/search';
import type { CuisineId, Difficulty } from '../recipes/types';

/** Storage keys the old app used, newest first (it was renamed twice). */
export const OLD_STORAGE_KEYS = ['the-pantry/v1', 'the-hub/v1', 'dinner-spinner/v1'] as const;

export type ImportedRecipe = { id: string; draft: RecipeDraft };
export type ImportedTaste = {
  diet: DietPreference;
  avoid: AvoidList;
  cuisines: CuisineId[];
  weeknight: TimeFilter | undefined;
  units: 'metric' | 'imperial';
};

export type OldAppImport = {
  bookmarks: string[];
  collections: { name: string; recipeIds: string[]; createdAt: number }[];
  hidden: string[];
  recentlyViewed: string[];
  cooks: { recipeId: string; cookedAt: number }[];
  cupboard: string[];
  recipes: ImportedRecipe[];
  /** Only when the tester finished the old onboarding. */
  taste?: ImportedTaste | undefined;
  /** References to dishes that aren't in v2, left behind. */
  dropped: number;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

const OLD_CUISINES: Readonly<Record<string, readonly CuisineId[]>> = {
  italian: ['italian'],
  mexican: ['mexican'],
  indian: ['indian'],
  american: ['american'],
  middleEastern: ['middle-eastern'],
  asian: ['chinese', 'japanese', 'korean', 'thai', 'vietnamese', 'malaysian', 'indonesian', 'filipino'],
  european: ['french', 'spanish', 'greek', 'british', 'central-european', 'scandinavian'],
};
const OLD_DIETS: Readonly<Record<string, DietPreference>> = {
  omnivore: 'everything',
  vegetarian: 'vegetarian',
  vegan: 'vegan',
  pescatarian: 'pescatarian',
};
const OLD_TIMES: Readonly<Record<string, TimeFilter | undefined>> = { quick: 'under-30', medium: 'under-45', long: undefined };

function taste(prefs: unknown): ImportedTaste | undefined {
  if (!isObj(prefs) || prefs.completed !== true) return undefined;
  const options: AvoidOption[] = [];
  const custom: string[] = [];
  for (const word of strings(prefs.avoid).map((w) => w.trim().toLowerCase())) {
    // The old fixed choices (nuts, dairy, spicy…) share their names with v2's.
    const option = Object.hasOwn(AVOID_OPTIONS, word) ? (word as AvoidOption) : undefined;
    if (option) {
      if (!options.includes(option)) options.push(option);
    } else if (word && !custom.includes(word)) custom.push(word);
  }
  return {
    diet: OLD_DIETS[String(prefs.diet)] ?? 'everything',
    avoid: { options, custom },
    cuisines: [...new Set(strings(prefs.cuisines).flatMap((c) => OLD_CUISINES[c] ?? []))],
    weeknight: OLD_TIMES[String(prefs.time)],
    units: prefs.unitSystem === 'imperial' ? 'imperial' : 'metric',
  };
}

/** "custom-nans-soup" → "Nans soup": the best title we have for a name-only meal. */
function titleFromId(id: string): string {
  const words = id
    .replace(/^custom-/, '')
    .replace(/-/g, ' ')
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'My recipe';
}

function draftFromOld(title: string, old: unknown): RecipeDraft {
  if (!isObj(old)) return { ...EMPTY_DRAFT, title };
  const ingredients = (Array.isArray(old.ingredients) ? old.ingredients : []).flatMap((group: unknown) =>
    isObj(group)
      ? [...(typeof group.section === 'string' && group.section.trim() ? [`${group.section.trim()}:`] : []), ...strings(group.items)]
      : [],
  );
  const difficulty: Difficulty = old.difficulty === 'medium' || old.difficulty === 'hard' ? old.difficulty : 'easy';
  return {
    ...EMPTY_DRAFT,
    title,
    difficulty,
    prepMinutes: Math.max(0, Math.round(num(old.prepMinutes, EMPTY_DRAFT.prepMinutes))),
    cookMinutes: Math.max(0, Math.round(num(old.cookMinutes, EMPTY_DRAFT.cookMinutes))),
    servings: Math.min(50, Math.max(1, Math.round(num(old.servings, EMPTY_DRAFT.servings)))),
    ingredientsText: ingredients.join('\n'),
    methodText: strings(old.steps).join('\n'),
    notesText: strings(old.notes).join('\n'),
  };
}

export type ImportContext = {
  /** Every recipe id in the v2 catalogue, drafts included, so nothing is lost when a dish is vetted later. */
  catalogueIds: ReadonlySet<string>;
  titleOf: (catalogueId: string) => string | undefined;
  index: IngredientIndex;
  now: number;
  random: () => string;
};

export function importOldApp(raw: string, ctx: ImportContext): OldAppImport | undefined {
  let old: unknown;
  try {
    old = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isObj(old)) return undefined;

  // Custom recipes and name-only custom meals become your own recipes, with new ids.
  const newIds = new Map<string, string>();
  const recipes: ImportedRecipe[] = [];
  const names = new Map<string, string>();
  for (const meal of Array.isArray(old.customMeals) ? old.customMeals : []) {
    if (isObj(meal) && typeof meal.id === 'string' && typeof meal.name === 'string') names.set(meal.id, meal.name.trim());
  }
  const oldRecipes = isObj(old.customRecipes) ? old.customRecipes : {};
  for (const oldId of new Set([...names.keys(), ...Object.keys(oldRecipes)])) {
    // An edited built-in keeps pointing at the catalogue; the edit comes across as your own version.
    const edited = ctx.catalogueIds.has(oldId);
    const title = (names.get(oldId) || (edited ? `${ctx.titleOf(oldId) ?? titleFromId(oldId)} (my version)` : titleFromId(oldId))).slice(
      0,
      80,
    );
    const id = myRecipeId(title, ctx.random());
    if (!edited) newIds.set(oldId, id);
    recipes.push({ id, draft: draftFromOld(title, oldRecipes[oldId]) });
  }

  const dropped = new Set<string>();
  const resolve = (oldId: string): string | undefined => {
    const id = newIds.get(oldId) ?? (ctx.catalogueIds.has(oldId) ? oldId : undefined);
    if (!id) dropped.add(oldId);
    return id;
  };
  const resolveAll = (ids: string[]) => [...new Set(ids.map(resolve).filter((id): id is string => id !== undefined))];

  const collections = (Array.isArray(old.collections) ? old.collections : []).flatMap((c: unknown) =>
    isObj(c) && typeof c.name === 'string' && c.name.trim()
      ? [{ name: c.name.trim().slice(0, 40), recipeIds: resolveAll(strings(c.recipeIds)), createdAt: num(c.createdAt, ctx.now) }]
      : [],
  );
  const cooks = (Array.isArray(old.cookLog) ? old.cookLog : []).flatMap((e: unknown) => {
    if (!isObj(e) || typeof e.id !== 'string' || typeof e.at !== 'number') return [];
    const recipeId = resolve(e.id);
    return recipeId ? [{ recipeId, cookedAt: e.at }] : [];
  });
  const cupboard = [...new Set(strings(old.pantryItems).map((name) => ctx.index.match(name)))].filter(
    (id): id is string => id !== undefined,
  );

  return {
    bookmarks: resolveAll(strings(old.favorites)),
    collections,
    hidden: resolveAll(strings(old.hidden)),
    recentlyViewed: resolveAll(strings(old.recentlyViewed)),
    cooks,
    cupboard,
    recipes,
    taste: taste(old.preferences),
    dropped: dropped.size,
  };
}

/** The single "Welcome back" line (D-005). Undefined when there was nothing worth saying. */
export function welcomeBackLine(result: OldAppImport): string | undefined {
  const parts: string[] = [];
  const count = (n: number, one: string, many: string) => (n > 0 ? `${n} ${n === 1 ? one : many}` : undefined);
  const saved = count(result.bookmarks.length, 'saved recipe', 'saved recipes');
  const collections = count(result.collections.length, 'collection', 'collections');
  const mine = count(result.recipes.length, 'recipe of your own', 'recipes of your own');
  const cooks = count(result.cooks.length, 'cook', 'cooks');
  for (const p of [saved, collections, mine, cooks ? `${cooks} in your history` : undefined]) if (p) parts.push(p);
  if (!parts.length) return undefined;
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  const gone = result.dropped
    ? ` ${result.dropped === 1 ? 'One dish is' : `${result.dropped} dishes are`} no longer in the app, so ${result.dropped === 1 ? 'it was' : 'they were'} left behind.`
    : '';
  return `Welcome back. We brought over ${list}.${gone}`;
}
