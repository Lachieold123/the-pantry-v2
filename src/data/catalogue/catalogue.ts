// The bundled recipe catalogue and ingredient database, loaded once.
// Store builds show recipes that passed the editorial review or a cook test
// (D-008, D-036). Development and preview builds (EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1,
// set in eas.json) show the drafts too.
import { buildKitchen, type KitchenData } from '@/domain/cupboard/kitchen';
import { buildIngredientIndex, type IngredientDef } from '@/domain/ingredients/database';
import { withAliases, type HierarchyData } from '@/domain/ingredients/hierarchy';
import type { Recipe } from '@/domain/recipes/types';
import ingredientsJson from '../ingredients/ingredients.json';
import hierarchyJson from '../ingredients/hierarchy.json';
import kitchenJson from '../ingredients/kitchen.json';
import titlesJson from './titles.json';

// A store build bundles only the recipes it shows (recipes.store.json, generated with the
// photo maps), not all 5,496 (PERF-1). The check is fixed at build time and must stay inline:
// that, and require() rather than import, is what lets Metro leave the other file out.
export const CATALOGUE: readonly Recipe[] = (
  __DEV__ || process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES === '1' ? require('./recipes.json') : require('./recipes.store.json')
) as Recipe[];

const byId = new Map(CATALOGUE.map((r) => [r.id, r]));

export function getCatalogueRecipe(id: string): Recipe | undefined {
  return byId.get(id);
}

// Every catalogue id, drafts included: imported old data may point at a dish
// that isn't vetted yet, and it should reappear once it is.
const titleById = new Map(Object.entries(titlesJson as Record<string, string>));
export const ALL_CATALOGUE_IDS: ReadonlySet<string> = new Set(titleById.keys());
export function catalogueTitle(id: string): string | undefined {
  return titleById.get(id);
}

const HIERARCHY = hierarchyJson as unknown as HierarchyData;

/** The database plus the model's extra AU/UK/US names, so "bell pepper" or "cilantro" in a pantry list is understood. */
export const INGREDIENTS = buildIngredientIndex(withAliases(ingredientsJson as unknown as IngredientDef[], HIERARCHY));

/** How each ingredient behaves in a kitchen: swaps, shelf items, cupboard jars (D-030). */
export const KITCHEN = buildKitchen(INGREDIENTS, kitchenJson as unknown as KitchenData, HIERARCHY);
