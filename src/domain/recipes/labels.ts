// How the app names things to the cook, in Australian English.
import type { AisleId } from '../ingredients/database';
import type { AvoidOption, DietPreference } from './diets';
import type { CuisineId, DietTag, MealType } from './types';

export const CUISINE_LABELS: Readonly<Record<CuisineId, string>> = {
  italian: 'Italian',
  french: 'French',
  spanish: 'Spanish',
  greek: 'Greek',
  turkish: 'Turkish',
  'middle-eastern': 'Middle Eastern',
  'north-african': 'North African',
  'west-african': 'West African',
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
  american: 'American',
  british: 'British',
  'central-european': 'Central European',
  scandinavian: 'Scandinavian',
  'modern-australian': 'Modern Australian',
};

export const MEAL_TYPE_LABELS: Readonly<Record<MealType, string>> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
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
export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m}`;
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
