// Picking a recipe's ingredients for the shopping list, without planning it
// (D-037). Each row is one thing to buy, the way the list will show it: lines
// for the same ingredient are merged, amounts are scaled to the servings
// chosen, and lime juice becomes limes. Each row says whether you already
// have it, so the sheet can tick only what you need.
import { normaliseWords, type IngredientIndex } from '../ingredients/database';
import { formatQuantity, type UnitSystem } from '../ingredients/format';
import { mapQuantity } from '../ingredients/quantity';
import type { IngredientLine } from '../ingredients/types';
import { allLines, type Recipe } from '../recipes/types';
import { asWholeFruit, capitalise, mergeAmounts, type ListExtra, type ShoppingList } from './derive';
import type { ListAddition } from './extras';

/** need: not in the cupboard · have: in the cupboard · staple: salt, oil, water · on-list: this recipe's already there. */
export type RowStatus = 'need' | 'have' | 'staple' | 'on-list';

export type RecipeListRow = {
  key: string;
  name: string;
  /** "400 g", "2", "1 tbsp + 2"; empty when the recipe gives no amount. */
  amount: string;
  optional: boolean;
  status: RowStatus;
  addition: ListAddition;
};

export function recipeListRows(args: {
  recipe: Recipe;
  servings: number;
  index: IngredientIndex;
  /**
   * Whether you have an ingredient, as the cupboard match works it out (a stand-in
   * from the same family, or an assumed shelf item, counts), so the sheet agrees
   * with the recipe page's "You have 8 of 12".
   */
  has: (ingredientId: string) => boolean;
  /** Keys already on this week's list for this recipe (see recipeKeysOnList). */
  onList: ReadonlySet<string>;
  units: UnitSystem;
}): RecipeListRow[] {
  const { recipe, servings, index, has, onList, units } = args;
  const ratio = servings / recipe.servings;
  const groups = new Map<string, IngredientLine[]>();
  for (const line of allLines(recipe)) {
    const scaled = asWholeFruit(line.quantity === undefined ? line : { ...line, quantity: mapQuantity(line.quantity, (n) => n * ratio) });
    const key = rowKey(line);
    groups.set(key, [...(groups.get(key) ?? []), scaled]);
  }
  const rows: RecipeListRow[] = [];
  for (const [key, lines] of groups) {
    const first = lines[0];
    if (!first) continue;
    const id = first.ingredientId;
    const def = id ? index.byId.get(id) : undefined;
    const name = def?.name ?? first.item;
    const amounts = mergeAmounts(lines);
    const amount = amounts.map((a) => formatQuantity(a.quantity, a.unit, units)).join(' + ');
    // The list stores one amount per added line. Two that can't be added ("2 onions" and "200 g onion") keep the first.
    const main = amounts[0];
    const addition: ListAddition = id
      ? {
          text: capitalise(name),
          ingredientId: id,
          recipeId: recipe.id,
          ...(main ? { quantity: main.quantity, ...(main.unit ? { unit: main.unit } : {}) } : {}),
        }
      : { text: amount ? `${capitalise(name)}, ${amount}` : capitalise(name), recipeId: recipe.id };
    const status: RowStatus = onList.has(key) ? 'on-list' : def?.staple ? 'staple' : id && has(id) ? 'have' : 'need';
    rows.push({ key, name, amount, optional: lines.every((l) => l.optional === true), status, addition });
  }
  return rows;
}

/** What the sheet ticks to begin with: what you need and the recipe doesn't call optional. */
export function startPicked(rows: readonly RecipeListRow[]): Set<string> {
  return new Set(rows.filter((r) => r.status === 'need' && !r.optional).map((r) => r.key));
}

/**
 * Which of this recipe's rows are already on the week's list: from planning it,
 * or from adding it before. Plain-text lines are found by the name they start with.
 */
export function recipeKeysOnList(list: ShoppingList, extras: readonly ListExtra[], recipeId: string): Set<string> {
  const keys = new Set<string>();
  for (const item of [...list.sections.flatMap((s) => s.items), ...list.inCupboard]) {
    if (item.recipeIds.includes(recipeId)) keys.add(item.key);
  }
  for (const x of extras) {
    if (x.recipeId === recipeId && !x.ingredientId) keys.add(textKey(x.text.split(',')[0] ?? x.text));
  }
  return keys;
}

function rowKey(line: IngredientLine): string {
  return line.ingredientId ?? textKey(line.item);
}

function textKey(item: string): string {
  return `text:${normaliseWords(item).join(' ')}`;
}
