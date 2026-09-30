// The bundled recipe catalogue and ingredient database, loaded once.
// Store builds show only cook-tested recipes (D-008). Development and preview
// builds (EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1, set in eas.json) show the drafts too.
import { buildKitchen, type KitchenData } from '@/domain/cupboard/kitchen';
import { buildIngredientIndex, type IngredientDef } from '@/domain/ingredients/database';
import type { Recipe } from '@/domain/recipes/types';
import ingredientsJson from '../ingredients/ingredients.json';
import kitchenJson from '../ingredients/kitchen.json';
import recipesJson from './recipes.json';

const all = recipesJson as unknown as Recipe[];

const showDrafts = __DEV__ || process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES === '1';

export const CATALOGUE: readonly Recipe[] = showDrafts ? all : all.filter((r) => r.provenance === 'vetted');

const byId = new Map(CATALOGUE.map((r) => [r.id, r]));

export function getCatalogueRecipe(id: string): Recipe | undefined {
  return byId.get(id);
}

// Every catalogue id, drafts included: imported old data may point at a dish
// that isn't vetted yet, and it should reappear once it is.
const allById = new Map(all.map((r) => [r.id, r]));
export const ALL_CATALOGUE_IDS: ReadonlySet<string> = new Set(allById.keys());
export function catalogueTitle(id: string): string | undefined {
  return allById.get(id)?.title;
}

export const INGREDIENTS = buildIngredientIndex(ingredientsJson as unknown as IngredientDef[]);

/** How each ingredient behaves in a kitchen: swaps, shelf items, cupboard jars (D-030). */
export const KITCHEN = buildKitchen(INGREDIENTS, kitchenJson as unknown as KitchenData);
