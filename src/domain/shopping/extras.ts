// Adding things to a week's list by hand: from the Cupboard, from a recipe's
// "what's missing", or from picking a recipe's lines (D-037).
import type { ListExtra, WeekListEdits } from './derive';

/** Something to put on the list: free text, or a known ingredient by id, with an amount when a recipe gave one. */
export type ListAddition = Omit<ListExtra, 'id' | 'addedAt'>;

/**
 * Adds extras (for example the things a cupboard match is missing), skipping
 * any already on the list: the same ingredient, or the same text whatever its
 * case. Returns the edits and the extras actually added, so the caller can
 * offer undo.
 */
export function addExtras(
  edits: WeekListEdits,
  additions: readonly (ListAddition | string)[],
  makeId: () => string,
  now: number,
): { edits: WeekListEdits; added: ListExtra[] } {
  // The same ingredient from the same recipe (or from no recipe) is only added once; from two
  // recipes it's two amounts, which the list adds together.
  const idKey = (ingredientId: string, recipeId: string | undefined) => `${ingredientId}|${recipeId ?? ''}`;
  const onList = new Set(edits.extras.map((x) => x.text.trim().toLowerCase()));
  const ids = new Set(edits.extras.flatMap((x) => (x.ingredientId ? [idKey(x.ingredientId, x.recipeId)] : [])));
  const added: ListExtra[] = [];
  for (const a of additions) {
    const addition: ListAddition = typeof a === 'string' ? { text: a } : a;
    const text = addition.text.trim();
    const { ingredientId } = addition;
    if (!text) continue;
    if (ingredientId ? ids.has(idKey(ingredientId, addition.recipeId)) : onList.has(text.toLowerCase())) continue;
    onList.add(text.toLowerCase());
    if (ingredientId) ids.add(idKey(ingredientId, addition.recipeId));
    const extra: ListExtra = { id: makeId(), text, addedAt: now };
    if (ingredientId) extra.ingredientId = ingredientId;
    if (addition.quantity !== undefined) extra.quantity = addition.quantity;
    if (addition.unit) extra.unit = addition.unit;
    if (addition.recipeId) extra.recipeId = addition.recipeId;
    added.push(extra);
  }
  return { edits: added.length ? { ...edits, extras: [...edits.extras, ...added] } : edits, added };
}
