// Reads what testers saved in the old app (the TestFlight builds) and turns
// it into v2 records (D-005). Pure: the caller loads the old JSON and writes
// the result into the v2 stores. The old data itself is never changed or
// deleted, so a mistake here can be fixed and re-run: ids are derived from the
// old ids, so a second run finds the same records (see merge.ts, audit F07).
//
// The field names are the old app's own (its `Persisted` type in
// src/store/useStore.ts), not guesses: `favorites`, `recents`, `cookedRecipes`…
//
// Imported: bookmarks, collections, hidden dishes, recently viewed, what was
// cooked, the cupboard, custom recipes and onboarding answers.
// Not imported: the plan and shopping list (weekday-based and stale), the
// profile, filters, notification settings and Pro status.

import type { IngredientIndex } from '../ingredients/database';
import { AVOID_OPTIONS, type AvoidList, type AvoidOption, type DietPreference } from '../recipes/diets';
import { EMPTY_DRAFT, myRecipeId, type RecipeDraft } from '../recipes/draft';
import type { TimeFilter } from '../recipes/search';
import type { CuisineId, Difficulty, MealType } from '../recipes/types';
import type { CookEvent } from '../cook/cook';

/**
 * v1's cupboard stored loose names ("Chicken", "Pork"). Where the ingredient
 * matcher would guess badly or find nothing, this says what they meant: the
 * cut or kind v2's recipes actually use most.
 */
const OLD_PANTRY_NAMES: Readonly<Record<string, string>> = {
  chicken: 'chicken-thigh',
  beef: 'beef-mince',
  pork: 'pork-shoulder',
  lamb: 'lamb-shoulder',
  turkey: 'turkey-mince',
  noodles: 'egg-noodles',
  'curry paste': 'red-curry-paste',
  jam: 'apricot-jam',
  berries: 'frozen-berries',
  'stock cube': 'chicken-stock',
  'wholemeal flour': 'plain-flour',
};

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
  /** Newest first, the way the old app showed them. */
  bookmarks: string[];
  collections: { id: string; name: string; recipeIds: string[]; createdAt: number }[];
  hidden: string[];
  recentlyViewed: string[];
  /** One per dish the old app had ticked as cooked. It never kept dates, so each is dated now and flagged. */
  cooks: CookEvent[];
  cupboard: string[];
  /** Cupboard names nothing here matched, so the welcome line can say so. */
  cupboardMissed: string[];
  recipes: ImportedRecipe[];
  /** Only when the tester actually answered the old onboarding. */
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

/**
 * Skipping the old onboarding saved `completed: true` with every answer left at
 * its default (v1 HomeScreen `onSkip`). That's no answer at all, so it mustn't
 * skip v2's welcome or leave a 45-minute preference nobody chose (audit F148).
 */
function skipped(prefs: Obj): boolean {
  const empty = (v: unknown) => strings(v).length === 0;
  const either = (v: unknown, dflt: string) => v === undefined || v === dflt;
  return (
    either(prefs.diet, 'omnivore') &&
    either(prefs.time, 'medium') &&
    either(prefs.skill, 'medium') &&
    either(prefs.unitSystem, 'metric') &&
    empty(prefs.cuisines) &&
    empty(prefs.avoid)
  );
}

function taste(prefs: unknown): ImportedTaste | undefined {
  if (!isObj(prefs) || prefs.completed !== true || skipped(prefs)) return undefined;
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

/** A short, stable tag for an old id, so the same old recipe always gets the same new id (FNV-1a). */
function stableTag(oldId: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < oldId.length; i++) h = Math.imul(h ^ oldId.charCodeAt(i), 0x01000193) >>> 0;
  return `v1${h.toString(36)}`;
}

type CatalogueDish = { title: string; cuisine: CuisineId; mealTypes: readonly MealType[] };

function draftFromOld(title: string, old: unknown, dish: CatalogueDish | undefined): RecipeDraft {
  // Your version of a built-in dish is still that dish: same cuisine and meals,
  // so it isn't held back as a draft just for want of a cuisine (audit F10).
  const base: RecipeDraft = dish
    ? { ...EMPTY_DRAFT, title, cuisine: dish.cuisine, mealTypes: [...dish.mealTypes] }
    : { ...EMPTY_DRAFT, title };
  if (!isObj(old)) return base;
  const ingredients = (Array.isArray(old.ingredients) ? old.ingredients : []).flatMap((group: unknown) =>
    isObj(group)
      ? [...(typeof group.section === 'string' && group.section.trim() ? [`${group.section.trim()}:`] : []), ...strings(group.items)]
      : [],
  );
  const difficulty: Difficulty = old.difficulty === 'medium' || old.difficulty === 'hard' ? old.difficulty : 'easy';
  return {
    ...base,
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
  dish: (catalogueId: string) => CatalogueDish | undefined;
  index: IngredientIndex;
  now: number;
  /**
   * Your recipe with this exact title, if you already have one. An earlier
   * importer gave recipes random ids; reusing the one it made stops a re-run
   * adding a second copy.
   */
  mine?: ((title: string) => string | undefined) | undefined;
};

export function importOldApp(raw: string, ctx: ImportContext): OldAppImport | undefined {
  let old: unknown;
  try {
    old = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isObj(old)) return undefined;

  // Custom recipes and name-only custom meals become your own recipes, with ids made from the old ones.
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
    const dish = edited ? ctx.dish(oldId) : undefined;
    const title = (names.get(oldId) || (edited ? `${dish?.title ?? titleFromId(oldId)} (my version)` : titleFromId(oldId))).slice(0, 80);
    const id = ctx.mine?.(title) ?? myRecipeId(title, stableTag(oldId));
    if (!edited) newIds.set(oldId, id);
    recipes.push({ id, draft: draftFromOld(title, oldRecipes[oldId], dish) });
  }

  const dropped = new Set<string>();
  const resolve = (oldId: string): string | undefined => {
    const id = newIds.get(oldId) ?? (ctx.catalogueIds.has(oldId) ? oldId : undefined);
    if (!id) dropped.add(oldId);
    return id;
  };
  const resolveAll = (ids: string[]) => [...new Set(ids.map(resolve).filter((id): id is string => id !== undefined))];

  const collections = (Array.isArray(old.collections) ? old.collections : []).flatMap((c: unknown, i: number) =>
    isObj(c) && typeof c.name === 'string' && c.name.trim()
      ? [
          {
            id: `v1-${typeof c.id === 'string' && c.id ? c.id : i}`,
            name: c.name.trim().slice(0, 40),
            recipeIds: resolveAll(strings(c.recipeIds)),
            createdAt: num(c.createdAt, ctx.now),
          },
        ]
      : [],
  );
  // The old app kept a set of cooked dish ids with no dates (Lachlan, 30 Sep 2026: one cook each, dated now, flagged).
  const cooks = resolveAll(strings(old.cookedRecipes)).map((recipeId): CookEvent => ({
    id: `v1-cooked-${recipeId}`,
    recipeId,
    cookedAt: ctx.now,
    dateUnknown: true,
  }));
  const cupboard = new Set<string>();
  const cupboardMissed = new Set<string>();
  for (const name of strings(old.pantryItems).map((n) => n.trim())) {
    const id = OLD_PANTRY_NAMES[name.toLowerCase()] ?? ctx.index.match(name);
    if (id) cupboard.add(id);
    else if (name) cupboardMissed.add(name);
  }

  return {
    // The old app kept favourites in the order they were added and showed them newest first.
    bookmarks: resolveAll(strings(old.favorites).reverse()),
    collections,
    hidden: resolveAll(strings(old.hidden)),
    recentlyViewed: resolveAll(strings(old.recents)),
    cooks,
    cupboard: [...cupboard],
    cupboardMissed: [...cupboardMissed],
    recipes,
    taste: taste(old.preferences),
    dropped: dropped.size,
  };
}
