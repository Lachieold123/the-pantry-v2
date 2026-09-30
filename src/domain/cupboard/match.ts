// What's in the cupboard. It stores ingredient ids only, with no quantities
// (D-010). What that lets you cook lives in cookable.ts.

export type CupboardItem = { ingredientId: string; addedAt: number; source: 'manual' | 'shop' | 'list' | 'scan' | 'receipt' | 'import' };

export function cupboardIds(items: readonly CupboardItem[]): Set<string> {
  return new Set(items.map((i) => i.ingredientId));
}

/** Add ingredients, ignoring ones already there. Returns the same array when nothing changes. */
export function addToCupboard(
  items: readonly CupboardItem[],
  ids: readonly string[],
  source: CupboardItem['source'],
  now: number,
): CupboardItem[] {
  const have = cupboardIds(items);
  const fresh = [...new Set(ids)].filter((id) => !have.has(id)).map((ingredientId) => ({ ingredientId, addedAt: now, source }));
  return fresh.length ? [...items, ...fresh] : (items as CupboardItem[]);
}
