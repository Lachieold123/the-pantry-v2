// How the app names things to the cook, in Australian English.
import type { AisleId } from '../ingredients/database';
import type { AvoidOption, DietPreference } from './diets';
import type { TimeFilter } from './search';
import type { CuisineId, DietTag, Difficulty, MealType, Recipe } from './types';

export const CUISINE_LABELS: Readonly<Record<CuisineId, string>> = {
  italian: 'Italian',
  french: 'French',
  spanish: 'Spanish',
  greek: 'Greek',
  turkish: 'Turkish',
  'middle-eastern': 'Middle Eastern',
  'north-african': 'North African',
  'west-african': 'West African',
  'east-african': 'East African',
  'south-african': 'South African',
  indian: 'Indian',
  thai: 'Thai',
  vietnamese: 'Vietnamese',
  chinese: 'Chinese',
  japanese: 'Japanese',
  korean: 'Korean',
  malaysian: 'Malaysian',
  indonesian: 'Indonesian',
  filipino: 'Filipino',
  mexican: 'Mexican',
  'latin-american': 'Latin American',
  caribbean: 'Caribbean',
  american: 'American',
  british: 'British',
  'central-european': 'Central European',
  scandinavian: 'Scandinavian',
  'modern-australian': 'Modern Australian',
  'pacific-islands': 'Pacific Islands',
};

export const MEAL_TYPE_LABELS: Readonly<Record<MealType, string>> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export const TIME_FILTER_LABELS: Readonly<Record<TimeFilter, string>> = {
  'under-15': '≤ 15 min',
  'under-30': '≤ 30 min',
  'under-45': '≤ 45 min',
  'under-60': '≤ 1 hr',
  'over-60': 'Over 1 hr',
};

export const DIET_LABELS: Readonly<Record<DietTag, string>> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  'no-gluten': 'No gluten ingredients',
  'no-dairy': 'No dairy ingredients',
};

export const AISLE_LABELS: Readonly<Record<AisleId, string>> = {
  'fruit-veg': 'Fruit and veg',
  meat: 'Meat',
  seafood: 'Seafood',
  deli: 'Deli',
  'dairy-eggs': 'Dairy and eggs',
  bakery: 'Bakery',
  'pasta-rice-grains': 'Pasta, rice and grains',
  'tins-jars': 'Tins and jars',
  'sauces-oils': 'Sauces and oils',
  'herbs-spices': 'Herbs and spices',
  baking: 'Baking',
  'asian-international': 'Asian and international',
  'nuts-dried': 'Nuts and dried fruit',
  frozen: 'Frozen',
  drinks: 'Drinks',
  other: 'Other',
};

/** "1 hr 45", "35 min". */
/** v1's short durations: "20m", "1h 30m", "2h". */
export function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** A duration split for a big number with a small unit (the recipe's info tiles): "45" + "min", "1h 30" + "min". */
export function minutesParts(total: number): { value: string; unit: string } {
  if (total < 60) return { value: `${total}`, unit: 'min' };
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? { value: `${h}`, unit: h === 1 ? 'hr' : 'hrs' } : { value: `${h}h ${m}`, unit: 'min' };
}

export const AVOID_LABELS: Readonly<Record<AvoidOption, string>> = {
  nuts: 'Nuts',
  shellfish: 'Shellfish',
  fish: 'Fish',
  pork: 'Pork',
  beef: 'Beef',
  lamb: 'Lamb',
  dairy: 'Dairy',
  eggs: 'Eggs',
  gluten: 'Gluten',
  sesame: 'Sesame',
  soy: 'Soy',
  spicy: 'Chilli heat',
  alcohol: 'Alcohol',
};

export const DIET_PREFERENCE_LABELS: Readonly<Record<DietPreference, string>> = {
  everything: 'Everything',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
};

/** A recipe as plain text, for sharing one of your own with someone who doesn't have it. */
export function recipeAsText(recipe: Pick<Recipe, 'title' | 'summary' | 'servings' | 'ingredientGroups' | 'steps' | 'notes'>): string {
  const ingredients = recipe.ingredientGroups.flatMap((g) => [...(g.title ? [`${g.title}:`] : []), ...g.items.map((i) => `- ${i.raw}`)]);
  const steps = recipe.steps.map((s, i) => `${i + 1}. ${s.text}`);
  return [
    recipe.title,
    ...(recipe.summary ? [recipe.summary] : []),
    '',
    `Ingredients (serves ${recipe.servings})`,
    ...ingredients,
    '',
    'Method',
    ...steps,
    ...(recipe.notes?.length ? ['', 'Notes', ...recipe.notes] : []),
  ].join('\n');
}
