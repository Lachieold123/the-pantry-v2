import type { IngredientLine } from '../ingredients/types';

export const CUISINES = [
  'italian',
  'french',
  'spanish',
  'greek',
  'turkish',
  'middle-eastern',
  'north-african',
  'west-african',
  'south-african',
  'indian',
  'thai',
  'vietnamese',
  'chinese',
  'japanese',
  'korean',
  'malaysian',
  'indonesian',
  'filipino',
  'mexican',
  'latin-american',
  'american',
  'british',
  'central-european',
  'scandinavian',
  'modern-australian',
] as const;
export type CuisineId = (typeof CUISINES)[number];

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

/**
 * Diet tags describe what's in the ingredient list, not a safety promise.
 * "no-gluten" and "no-dairy" mean no listed ingredient contains them (D-006):
 * the app never calls a recipe allergy-safe.
 */
export const DIET_TAGS = ['vegetarian', 'vegan', 'pescatarian', 'no-gluten', 'no-dairy'] as const;
export type DietTag = (typeof DIET_TAGS)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type RecipeSource = 'house' | 'user' | 'imported';
/**
 * Where a house recipe stands (D-008, D-036): `ai-draft` until it has passed the
 * line-by-line editorial review, `reviewed` once it has, `vetted` once Lachlan
 * has cooked it. Release builds show reviewed and vetted recipes.
 */
export type Provenance = 'vetted' | 'reviewed' | 'ai-draft';

export type IngredientGroupBlock = { title?: string; items: IngredientLine[] };
export type Step = { text: string };

export type Recipe = {
  /** Stable forever: old ids are kept so testers' saved data still points at the right dish. */
  id: string;
  title: string;
  summary?: string;
  cuisine: CuisineId;
  diets: DietTag[];
  mealTypes: MealType[];
  difficulty: Difficulty;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  onePot: boolean;
  seasons?: Season[];
  image?: { key: string; credit?: string };
  ingredientGroups: IngredientGroupBlock[];
  steps: Step[];
  notes?: string[];
  source: RecipeSource;
  provenance?: Provenance;
};

export function totalMinutes(recipe: Pick<Recipe, 'prepMinutes' | 'cookMinutes'>): number {
  return recipe.prepMinutes + recipe.cookMinutes;
}

export function allLines(recipe: Pick<Recipe, 'ingredientGroups'>): IngredientLine[] {
  return recipe.ingredientGroups.flatMap((g) => g.items);
}
