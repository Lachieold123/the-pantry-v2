// The shopping list is never stored: it's worked out from the week's plan
// every time (map principle 3). Only the cook's edits for that week are
// stored, and each edit remembers what it applied to, so a change to the
// plan quietly retires an edit that no longer fits (D-010).

import { AISLES, normaliseWords, type AisleId, type IngredientIndex } from '../ingredients/database';
import type { UnitSystem } from '../ingredients/format';
import { formatQuantity } from '../ingredients/format';
import { addQuantities, mapQuantity, upper, type Quantity } from '../ingredients/quantity';
import type { IngredientLine } from '../ingredients/types';
import { convert, UNITS, type UnitId } from '../ingredients/units';
import type { PlanEntry } from '../plan/week';
import { allLines, type Recipe } from '../recipes/types';

/**
 * Something added to the list by hand. When it's a known ingredient (from the
 * Cupboard's "add one thing" or a recipe's "add what's missing") it carries the
 * id, so it merges with the same ingredient from the plan and, once ticked,
 * moves into the cupboard like any other line. Free text ("dishwashing
 * liquid") stays a plain extra.
 */
export type ListExtra = { id: string; text: string; addedAt: number; ingredientId?: string | undefined };

/** The cook's edits to one week's list. Values record what the edit applied to. */
export type WeekListEdits = {
  /** key → the amount text that was ticked. Ticks lapse if the amount changes. */
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

type Contribution = { line: IngredientLine; entryId: string; recipeId: string };

const SPOON_OR_CUP: ReadonlySet<UnitId> = new Set(['tsp', 'tbsp', 'cup']);

/** Adds amounts that can be added (D-010): same unit family merges, others sit side by side. */
export function mergeAmounts(lines: readonly IngredientLine[]): { quantity: Quantity; unit: UnitId | undefined }[] {
  const families = new Map<string, { quantity: Quantity; unit: UnitId | undefined; units: UnitId[] }>();
  for (const line of lines) {
    if (line.quantity === undefined) continue;
    const unit = line.unit;
    const kind = unit === undefined ? 'count:none' : UNITS[unit].kind === 'count' ? `count:${unit}` : UNITS[unit].kind;
    const existing = families.get(kind);
    if (!existing) {
      families.set(kind, { quantity: line.quantity, unit, units: unit ? [unit] : [] });
      continue;
    }
    if (unit === undefined || existing.unit === undefined) {
      existing.quantity = addQuantities(existing.quantity, line.quantity);
      continue;
    }
    // Spoons and cups stay in the largest spoon/cup used; everything else goes to g or ml and is re-displayed later.
    const allSpoons = [...existing.units, unit].every((u) => SPOON_OR_CUP.has(u));
    const target: UnitId = allSpoons
      ? ([...existing.units, unit].sort((a, b) => (UNITS[b].base ?? 0) - (UNITS[a].base ?? 0))[0] as UnitId)
      : UNITS[unit].kind === 'mass'
        ? 'g'
        : UNITS[unit].kind === 'volume'
          ? 'ml'
          : unit;
    const from = existing.unit;
    const a = mapQuantity(existing.quantity, (n) => convert(n, from, target));
    const b = mapQuantity(line.quantity, (n) => convert(n, unit, target));
    existing.quantity = addQuantities(a, b);
    existing.unit = target;
    existing.units.push(unit);
  }
  return [...families.values()].map(({ quantity, unit }) => ({ quantity, unit }));
}

/**
 * Roughly how much juice one fruit gives, in millilitres. Recipes ask for
 * "1 tbsp lime juice"; you buy limes, so the list says "Lime, 1" rather than
 * "Lime, 1 tbsp + 1".
 */
const JUICE_PER_FRUIT_ML: Readonly<Record<string, number>> = { lime: 30, lemon: 45, orange: 80 };

function asWholeFruit(line: IngredientLine): IngredientLine {
  const perFruit = line.ingredientId ? JUICE_PER_FRUIT_ML[line.ingredientId] : undefined;
  const base = line.unit ? UNITS[line.unit].base : undefined;
  if (!perFruit || line.quantity === undefined || !line.unit || UNITS[line.unit].kind !== 'volume' || base === undefined) return line;
  const fruits = Math.max(1, Math.ceil((upper(line.quantity) * base) / perFruit - 1e-9));
  const whole: IngredientLine = { ...line, quantity: fruits };
  delete whole.unit;
  return whole;
}

export function deriveShoppingList(args: {
  entries: readonly PlanEntry[];
  getRecipe: (id: string) => Recipe | undefined;
  index: IngredientIndex;
  cupboard: ReadonlySet<string>;
  edits: WeekListEdits;
  units: UnitSystem;
}): ShoppingList {
  const { entries, getRecipe, index, cupboard, edits, units } = args;
  const groups = new Map<string, Contribution[]>();

  for (const entry of entries) {
    const recipe = getRecipe(entry.recipeId);
    if (!recipe) continue; // A deleted custom recipe simply stops contributing.
    const ratio = entry.servings / recipe.servings;
    for (const line of allLines(recipe)) {
      const scaled = asWholeFruit(line.quantity === undefined ? line : { ...line, quantity: mapQuantity(line.quantity, (n) => n * ratio) });
      const key = line.ingredientId ?? `text:${normaliseWords(line.item).join(' ')}`;
      const list = groups.get(key) ?? [];
      list.push({ line: scaled, entryId: entry.id, recipeId: entry.recipeId });
      groups.set(key, list);
    }
  }

  // Known ingredients added by hand join the plan's lines, so they merge and tick like them.
  for (const extra of edits.extras) {
    if (!extra.ingredientId) continue;
    const list = groups.get(extra.ingredientId) ?? [];
    list.push({
      line: { item: extra.text, raw: extra.text, ingredientId: extra.ingredientId },
      entryId: `extra:${extra.id}`,
      recipeId: '',
    });
    groups.set(extra.ingredientId, list);
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
    const amount = mergeAmounts(contributions.map((c) => c.line))
      .map((a) => {
        // "2 leaves bay leaf" reads badly: when the name already says the unit, show just the number.
        const redundant = a.unit !== undefined && UNITS[a.unit].kind === 'count' && normaliseWords(name).includes(UNITS[a.unit].singular);
        return formatQuantity(a.quantity, redundant ? undefined : a.unit, units);
      })
      .join(' + ');
    const item: ShoppingItem = {
      key,
      name,
      aisle: def?.aisle ?? 'other',
      amount,
      recipeIds: [...new Set(contributions.map((c) => c.recipeId).filter(Boolean))],
      optional: contributions.every((c) => c.line.optional === true),
      checked: edits.checked[key] === amount,
      sourceStamp,
    };
    if (def?.staple || cupboard.has(key)) {
      inCupboard.push(item);
      continue;
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

/** Tick or untick a line. The tick remembers the amount, so needing more later unticks it. */
export function toggleChecked(edits: WeekListEdits, item: ShoppingItem): WeekListEdits {
  const checked = { ...edits.checked };
  if (item.checked) delete checked[item.key];
  else checked[item.key] = item.amount;
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

/** Something to put on the list: free text, or a known ingredient by id. */
export type ListAddition = { text: string; ingredientId?: string | undefined };

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
  const onList = new Set(edits.extras.map((x) => x.text.trim().toLowerCase()));
  const ids = new Set(edits.extras.flatMap((x) => (x.ingredientId ? [x.ingredientId] : [])));
  const added: ListExtra[] = [];
  for (const a of additions) {
    const { text: raw, ingredientId } = typeof a === 'string' ? { text: a, ingredientId: undefined } : a;
    const text = raw.trim();
    if (!text || onList.has(text.toLowerCase()) || (ingredientId && ids.has(ingredientId))) continue;
    onList.add(text.toLowerCase());
    if (ingredientId) ids.add(ingredientId);
    added.push({ id: makeId(), text, addedAt: now, ...(ingredientId ? { ingredientId } : {}) });
  }
  return { edits: added.length ? { ...edits, extras: [...edits.extras, ...added] } : edits, added };
}
