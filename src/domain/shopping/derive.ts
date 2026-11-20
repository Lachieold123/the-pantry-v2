// The shopping list is never stored: it's worked out from the week's plan
// every time (map principle 3). Only the cook's edits for that week are
// stored, and each edit remembers what it applied to, so a change to the
// plan quietly retires an edit that no longer fits (D-010).

import { AISLES, normaliseWords, type AisleId, type IngredientIndex } from '../ingredients/database';
import type { UnitSystem } from '../ingredients/format';
import { formatQuantity } from '../ingredients/format';
import { mapQuantity, type Quantity } from '../ingredients/quantity';
import type { IngredientLine } from '../ingredients/types';
import { UNITS, type UnitId } from '../ingredients/units';
import type { PlanEntry } from '../plan/week';
import { allLines, type Recipe } from '../recipes/types';
import { listKey, mergeAmounts, wholeFruitLines } from './amounts';
import { tickHolds, tickValue } from './ticks';

export { asWholeFruit, mergeAmounts } from './amounts';

/**
 * Something added to the list by hand. When it's a known ingredient (from a
 * recipe's "add what's missing") it carries the id, so it merges with the
 * same ingredient from the plan and, once ticked, moves into the cupboard
 * like any other line. Free text ("dishwashing
 * liquid") stays a plain extra.
 */
export type ListExtra = {
  id: string;
  text: string;
  addedAt: number;
  ingredientId?: string | undefined;
  /** How much, when it came from a recipe's ingredient line (D-037). Merges with the plan's amounts. */
  quantity?: Quantity | undefined;
  unit?: UnitId | undefined;
  /** The recipe it came from, so the line can say so and the same recipe isn't added twice. */
  recipeId?: string | undefined;
};

/** The cook's edits to one week's list. Values record what the edit applied to. */
export type WeekListEdits = {
  /** key → how much the tick covered (./ticks). Ticks lapse only when more is needed. */
  checked: Record<string, string>;
  /** key → the plan entries it came from when removed. Removals lapse if those change. */
  removed: Record<string, string>;
  extras: ListExtra[];
  checkedExtras: string[];
};

export const EMPTY_EDITS: WeekListEdits = { checked: {}, removed: {}, extras: [], checkedExtras: [] };

export type ShoppingItem = {
  key: string;
  name: string;
  aisle: AisleId;
  /** "400 g + 2", "1¼ tbsp"; empty when no recipe gave an amount. */
  amount: string;
  recipeIds: string[];
  optional: boolean;
  checked: boolean;
  /** What a tick on this line stores: how much it covers, whatever the units (./ticks). */
  tick: string;
  /** In the cupboard thanks to a stand-in you have (its id), or a shelf item you're assumed to keep ('shelf'). */
  coveredBy?: string | undefined;
  /** Identifies which plan entries this line came from, for edit bookkeeping. */
  sourceStamp: string;
};

export type ShoppingList = {
  sections: { aisle: AisleId; items: ShoppingItem[] }[];
  /** Covered by the cupboard (or a staple): shown quietly, never dropped (D-010). */
  inCupboard: ShoppingItem[];
  extras: { extra: ListExtra; checked: boolean }[];
  removedCount: number;
};

/** Whether you already have something: the stand-in you have, 'shelf', or undefined. Same rules as "What I have" (cookable). */
export type Cover = (id: string) => string | undefined;

type Contribution = { line: IngredientLine; entryId: string; recipeId: string };

export function deriveShoppingList(args: {
  entries: readonly PlanEntry[];
  getRecipe: (id: string) => Recipe | undefined;
  index: IngredientIndex;
  cupboard: ReadonlySet<string>;
  edits: WeekListEdits;
  units: UnitSystem;
  /** Stand-ins and shelf items, so the list agrees with "What I have" (BUG-06). Without it only exact matches count. */
  cover?: Cover | undefined;
}): ShoppingList {
  const { entries, getRecipe, index, cupboard, edits, units, cover } = args;
  const groups = new Map<string, Contribution[]>();
  const add = (key: string, c: Contribution) => groups.set(key, [...(groups.get(key) ?? []), c]);

  for (const entry of entries) {
    const recipe = getRecipe(entry.recipeId);
    if (!recipe) continue; // A deleted custom recipe simply stops contributing.
    const ratio = entry.servings / recipe.servings;
    const scaled = allLines(recipe).map((line) =>
      line.quantity === undefined ? line : { ...line, quantity: mapQuantity(line.quantity, (n) => n * ratio) },
    );
    for (const line of wholeFruitLines(scaled)) add(listKey(line), { line, entryId: entry.id, recipeId: entry.recipeId });
  }

  // Known ingredients added by hand join the plan's lines, so they merge and tick like them. A recipe's
  // ingredients added to the list and then planned the same week count once (D-037, BUG-09).
  const planned = new Set(entries.map((e) => e.recipeId));
  for (const extra of edits.extras) {
    if (!extra.ingredientId || (extra.recipeId && planned.has(extra.recipeId))) continue;
    const line: IngredientLine = {
      item: extra.text,
      raw: extra.text,
      ingredientId: extra.ingredientId,
      ...(extra.quantity !== undefined ? { quantity: extra.quantity } : {}),
      ...(extra.unit ? { unit: extra.unit } : {}),
    };
    add(extra.ingredientId, { line, entryId: `extra:${extra.id}`, recipeId: extra.recipeId ?? '' });
  }

  const bySection = new Map<AisleId, ShoppingItem[]>();
  const inCupboard: ShoppingItem[] = [];
  let removedCount = 0;

  for (const [key, contributions] of groups) {
    const def = key.startsWith('text:') ? undefined : index.byId.get(key);
    const sourceStamp = [...new Set(contributions.map((c) => c.entryId))].sort().join(',');
    if (edits.removed[key] === sourceStamp) {
      removedCount++;
      continue;
    }
    const name = def?.name ?? contributions[0]?.line.item ?? key;
    const merged = mergeAmounts(contributions.map((c) => c.line));
    const amount = merged
      .map((a) => {
        // "2 leaves bay leaf" reads badly: when the name already says the unit, show just the number.
        const redundant = a.unit !== undefined && UNITS[a.unit].kind === 'count' && normaliseWords(name).includes(UNITS[a.unit].singular);
        return formatQuantity(a.quantity, redundant ? undefined : a.unit, units);
      })
      .join(' + ');
    const ticked = edits.checked[key];
    const item: ShoppingItem = {
      key,
      name,
      aisle: def?.aisle ?? 'other',
      amount,
      recipeIds: [...new Set(contributions.map((c) => c.recipeId).filter(Boolean))],
      optional: contributions.every((c) => c.line.optional === true),
      checked: tickHolds(ticked, merged, amount),
      tick: tickValue(merged),
      sourceStamp,
    };
    // Something you put on the list yourself stays on it, even if the cupboard says you have it:
    // asking for it is the newer, clearer signal (D-037). A line you've ticked stays in its aisle,
    // so nothing jumps mid-shop; the tick put it in the cupboard, which isn't a reason to hide it.
    const askedFor = contributions.some((c) => c.entryId.startsWith('extra:'));
    if (!askedFor && ticked === undefined) {
      const coveredBy = def && !def.staple && !cupboard.has(key) ? cover?.(key) : undefined;
      if (def?.staple || cupboard.has(key) || coveredBy) {
        inCupboard.push(coveredBy ? { ...item, coveredBy } : item);
        continue;
      }
    }
    const list = bySection.get(item.aisle) ?? [];
    list.push(item);
    bySection.set(item.aisle, list);
  }

  const byName = (a: ShoppingItem, b: ShoppingItem) => a.name.localeCompare(b.name);
  return {
    sections: AISLES.filter((a) => bySection.has(a)).map((aisle) => ({ aisle, items: (bySection.get(aisle) ?? []).sort(byName) })),
    inCupboard: inCupboard.sort(byName),
    extras: edits.extras.filter((x) => !x.ingredientId).map((extra) => ({ extra, checked: edits.checkedExtras.includes(extra.id) })),
    removedCount,
  };
}

/** Tick or untick a line. The tick remembers how much it covered, so only needing more later unticks it. */
export function toggleChecked(edits: WeekListEdits, item: ShoppingItem): WeekListEdits {
  const checked = { ...edits.checked };
  if (item.checked) delete checked[item.key];
  else checked[item.key] = item.tick;
  return { ...edits, checked };
}

export function removeItem(edits: WeekListEdits, item: ShoppingItem): WeekListEdits {
  return { ...edits, removed: { ...edits.removed, [item.key]: item.sourceStamp } };
}

export function restoreRemoved(edits: WeekListEdits): WeekListEdits {
  return { ...edits, removed: {} };
}

/** "Clear all": takes every line off and drops the extras. The caller keeps the old edits for undo. */
export function clearList(edits: WeekListEdits, list: ShoppingList): WeekListEdits {
  const removed = { ...edits.removed };
  for (const item of list.sections.flatMap((s) => s.items)) removed[item.key] = item.sourceStamp;
  return { ...edits, removed, extras: [], checkedExtras: [] };
}

/** How many things are still to buy: unticked list items and unticked extras. One count for the tab badge, the plan's card and the list's head. */
export function countToBuy(list: ShoppingList): number {
  return list.sections.reduce((n, s) => n + s.items.filter((i) => !i.checked).length, 0) + list.extras.filter((x) => !x.checked).length;
}

/** Every line in one A–Z list, for when the cook turns "By aisle" off. */
export function itemsAtoZ(list: ShoppingList): ShoppingItem[] {
  return list.sections.flatMap((s) => s.items).sort((a, b) => a.name.localeCompare(b.name));
}

/** Plain text for the share sheet, grouped by aisle, unticked items only. */
export function formatListForSharing(list: ShoppingList, aisleLabel: (a: AisleId) => string, title: string): string {
  const out: string[] = [title];
  for (const section of list.sections) {
    const items = section.items.filter((i) => !i.checked);
    if (!items.length) continue;
    out.push('', aisleLabel(section.aisle));
    for (const i of items) out.push(`- ${capitalise(i.name)}${i.amount ? `, ${i.amount}` : ''}${i.optional ? ' (optional)' : ''}`);
  }
  const extras = list.extras.filter((e) => !e.checked);
  if (extras.length) {
    out.push('', 'Also');
    for (const e of extras) out.push(`- ${e.extra.text}`);
  }
  return out.join('\n');
}

/** Names are stored lower case ("brown onion") so they read naturally mid-sentence; lists start them with a capital. */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Adding to the list by hand lives in ./extras; re-exported so callers keep one import.
export { addExtras, type ListAddition } from './extras';
