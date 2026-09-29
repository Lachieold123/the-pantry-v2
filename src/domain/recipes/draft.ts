// Your own recipes are stored as the words you typed (a draft) and turned
// into a structured Recipe whenever they're read. One source of truth: the
// text. That way a better ingredient database or parser improves old
// recipes for free, and editing never fights a half-converted copy.
//
// A draft that isn't complete yet (no method, no cuisine) is still kept and
// shown in My recipes; it just can't be planned or cooked until it's finished.

import type { IngredientIndex } from '../ingredients/database';
import { parseIngredientLine } from '../ingredients/parse';
import { deriveDiets } from './diets';
import type { CuisineId, Difficulty, IngredientGroupBlock, MealType, Recipe, RecipeSource, Step } from './types';
import { validateRecipe, type RecipeProblem } from './validate';

export type RecipeDraft = {
  title: string;
  summary: string;
  cuisine?: CuisineId | undefined;
  mealTypes: MealType[];
  difficulty: Difficulty;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  onePot: boolean;
  /** One ingredient per line. A line ending in ":" starts a group ("Sauce:"). */
  ingredientsText: string;
  /** One step per line. */
  methodText: string;
  notesText: string;
};

export const EMPTY_DRAFT: RecipeDraft = {
  title: '',
  summary: '',
  mealTypes: ['dinner'],
  difficulty: 'easy',
  prepMinutes: 10,
  cookMinutes: 20,
  servings: 4,
  onePot: false,
  ingredientsText: '',
  methodText: '',
  notesText: '',
};

/** Bullets and numbering people paste in from notes apps and websites. */
const LIST_MARKER = /^\s*(?:[-*•·▢□◦‣]+|\d+[.)]|step\s+\d+[:.)]?)\s*/i;

function cleanLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(LIST_MARKER, '').trim())
    .filter(Boolean);
}

/** Longer than this, a line ending in a colon is probably an ingredient with a note, not a heading. */
const HEADING_MAX = 60;

export type UnsureLine = { raw: string; reason: 'not-recognised' | 'two-options' };

export function parseIngredientsText(text: string, index: IngredientIndex): { groups: IngredientGroupBlock[]; unsure: UnsureLine[] } {
  const groups: IngredientGroupBlock[] = [];
  const unsure: UnsureLine[] = [];
  let current: IngredientGroupBlock | undefined;
  for (const raw of cleanLines(text)) {
    if (raw.endsWith(':') && raw.length <= HEADING_MAX) {
      current = { title: raw.slice(0, -1).trim(), items: [] };
      groups.push(current);
      continue;
    }
    if (!current) {
      current = { items: [] };
      groups.push(current);
    }
    const { line, issues } = parseIngredientLine(raw, index.match);
    current.items.push(line);
    // Quantity-less lines ("salt and pepper") are normal; only flag what changes the list or the diet tags.
    if (issues.includes('no-ingredient-match') && line.quantity !== undefined) unsure.push({ raw, reason: 'not-recognised' });
    else if (issues.includes('multiple-ingredients')) unsure.push({ raw, reason: 'two-options' });
  }
  return { groups: groups.filter((g) => g.items.length > 0), unsure };
}

export function parseMethodText(text: string): Step[] {
  return cleanLines(text).map((t) => ({ text: t }));
}

/** Problems in the words the editor shows, keyed to the field they belong to. */
export type DraftProblem = { field: 'title' | 'summary' | 'cuisine' | 'mealTypes' | 'ingredients' | 'method' | 'other'; message: string };

const FIELD_FOR: Record<string, DraftProblem['field']> = {
  title: 'title',
  summary: 'summary',
  cuisine: 'cuisine',
  mealTypes: 'mealTypes',
  ingredientGroups: 'ingredients',
  steps: 'method',
};

function toDraftProblem(p: RecipeProblem): DraftProblem {
  const root = p.path.split(/[.[]/)[0] ?? '';
  const field = FIELD_FOR[root] ?? 'other';
  const message =
    field === 'title' && p.message === 'is empty'
      ? 'Give it a name.'
      : field === 'ingredients'
        ? 'Add at least one ingredient.'
        : field === 'method'
          ? 'Add at least one step.'
          : field === 'mealTypes'
            ? 'Pick at least one meal.'
            : `${root} ${p.message}.`;
  return { field, message };
}

export type BuiltDraft = { recipe?: Recipe; problems: DraftProblem[]; unsure: UnsureLine[] };

/** Turns a draft into a Recipe, or says why it can't yet. */
export function buildRecipe(id: string, draft: RecipeDraft, source: RecipeSource, index: IngredientIndex): BuiltDraft {
  const { groups, unsure } = parseIngredientsText(draft.ingredientsText, index);
  const problems: DraftProblem[] = [];
  if (!draft.cuisine) problems.push({ field: 'cuisine', message: 'Pick the closest cuisine.' });
  const notes = cleanLines(draft.notesText);
  const recipe: Recipe = {
    id,
    title: draft.title.trim(),
    cuisine: draft.cuisine ?? 'modern-australian',
    diets: deriveDiets(
      groups.flatMap((g) => g.items),
      index.byId,
    ),
    mealTypes: draft.mealTypes,
    difficulty: draft.difficulty,
    prepMinutes: draft.prepMinutes,
    cookMinutes: draft.cookMinutes,
    servings: draft.servings,
    onePot: draft.onePot,
    ingredientGroups: groups,
    steps: parseMethodText(draft.methodText),
    source,
  };
  if (draft.summary.trim()) recipe.summary = draft.summary.trim();
  if (notes.length) recipe.notes = notes;
  for (const p of validateRecipe(recipe)) {
    const d = toDraftProblem(p);
    if (!problems.some((x) => x.field === d.field)) problems.push(d);
  }
  return problems.length ? { problems, unsure } : { recipe, problems, unsure };
}

/** Back from a Recipe to editable words: used when an imported recipe arrives structured. */
export function recipeToDraft(recipe: Recipe): RecipeDraft {
  const ingredientsText = recipe.ingredientGroups
    .flatMap((g) => [...(g.title ? [`${g.title}:`] : []), ...g.items.map((i) => i.raw)])
    .join('\n');
  return {
    title: recipe.title,
    summary: recipe.summary ?? '',
    cuisine: recipe.cuisine,
    mealTypes: [...recipe.mealTypes],
    difficulty: recipe.difficulty,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    servings: recipe.servings,
    onePot: recipe.onePot,
    ingredientsText,
    methodText: recipe.steps.map((s) => s.text).join('\n'),
    notesText: (recipe.notes ?? []).join('\n'),
  };
}

/**
 * Ids for your own recipes start with "my-" so they can never collide with a
 * catalogue recipe, and carry a short random tail so two "Nan's curry"s can coexist.
 */
export function myRecipeId(title: string, random: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  const tail = random.toLowerCase().replace(/[^a-z0-9]/g, '') || '0';
  return `my-${slug ? `${slug}-` : ''}${tail}`;
}
