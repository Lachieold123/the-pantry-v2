// How each ingredient behaves in a real kitchen, for "what can I cook?"
// (D-030). Built once from the ingredient database plus a small reviewed data
// file (families, shelf items, categories), so matching never guesses from
// text the way v1 did ("sage" matching sausage).

import type { AisleId, IngredientIndex } from '../ingredients/database';

/** v1's seven cupboard jars, plus Other so nothing is silently misfiled. */
export const CUPBOARD_CATEGORIES = ['proteins', 'vegetables', 'fruit', 'dairy', 'herbs', 'sauces', 'pantry', 'other'] as const;
export type CupboardCategory = (typeof CUPBOARD_CATEGORIES)[number];

export type KitchenData = {
  families: Record<string, string[]>;
  shelfAisles: string[];
  shelfExtra: string[];
  notShelf: string[];
  perishableAisles: string[];
  fruit: string[];
  freshHerbs: string[];
  proteins: string[];
  pantryFromAsian: string[];
};

export type Kitchen = {
  /** Other ingredients that can stand in for this one (never includes itself). */
  swapsFor: (id: string) => readonly string[];
  /** Long-life things most kitchens keep: spices, sauces, oils, baking basics, stock. */
  isShelf: (id: string) => boolean;
  /** Fresh food that goes off: used to favour recipes that use it up. */
  isPerishable: (id: string) => boolean;
  category: (id: string) => CupboardCategory;
  /** Every shelf ingredient, for the "always in my kitchen" sheet. */
  shelfIds: readonly string[];
};

const AISLE_CATEGORY: Readonly<Record<AisleId, CupboardCategory>> = {
  'fruit-veg': 'vegetables',
  meat: 'proteins',
  seafood: 'proteins',
  deli: 'other',
  'dairy-eggs': 'dairy',
  bakery: 'pantry',
  'pasta-rice-grains': 'pantry',
  'tins-jars': 'pantry',
  'sauces-oils': 'sauces',
  'herbs-spices': 'herbs',
  baking: 'pantry',
  'asian-international': 'sauces',
  'nuts-dried': 'pantry',
  frozen: 'vegetables',
  drinks: 'other',
  other: 'other',
};

export function buildKitchen(index: IngredientIndex, data: KitchenData): Kitchen {
  const swaps = new Map<string, string[]>();
  for (const members of Object.values(data.families)) {
    for (const id of members) {
      if (!index.byId.has(id)) throw new Error(`Kitchen family lists unknown ingredient: ${id}`);
      swaps.set(
        id,
        members.filter((m) => m !== id),
      );
    }
  }
  const lists = [data.shelfExtra, data.notShelf, data.fruit, data.freshHerbs, data.proteins, data.pantryFromAsian];
  for (const id of lists.flat()) if (!index.byId.has(id)) throw new Error(`Kitchen data lists unknown ingredient: ${id}`);

  const shelfAisles = new Set(data.shelfAisles);
  const shelfExtra = new Set(data.shelfExtra);
  const notShelf = new Set(data.notShelf);
  const perishableAisles = new Set(data.perishableAisles);
  const fruit = new Set(data.fruit);
  const herbs = new Set(data.freshHerbs);
  const proteins = new Set(data.proteins);
  const pantryFromAsian = new Set(data.pantryFromAsian);

  const isShelf = (id: string): boolean => {
    const def = index.byId.get(id);
    if (!def || def.staple || notShelf.has(id)) return false;
    return shelfExtra.has(id) || shelfAisles.has(def.aisle);
  };
  const category = (id: string): CupboardCategory => {
    if (fruit.has(id)) return 'fruit';
    if (herbs.has(id)) return 'herbs';
    if (proteins.has(id)) return 'proteins';
    if (pantryFromAsian.has(id)) return 'pantry';
    const def = index.byId.get(id);
    return def ? AISLE_CATEGORY[def.aisle] : 'other';
  };
  const shelfIds = [...index.byId.keys()].filter(isShelf).sort();

  return {
    swapsFor: (id) => swaps.get(id) ?? [],
    isShelf,
    isPerishable: (id) => {
      const def = index.byId.get(id);
      return def !== undefined && perishableAisles.has(def.aisle) && !isShelf(id);
    },
    category,
    shelfIds,
  };
}
