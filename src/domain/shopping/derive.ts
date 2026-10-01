// The shopping list is never stored: it's worked out from the week's plan
// every time (map principle 3). Only the cook's edits for that week are
// stored, and each edit remembers what it applied to, so a change to the
// plan quietly retires an edit that no longer fits (D-010, edits.ts).

import { AISLES, normaliseWords, type AisleId, type IngredientIndex } from '../ingredients/database';
import type { UnitSystem } from '../ingredients/format';
import { formatQuantity } from '../ingredients/format';
import { mapQuantity, upper } from '../ingredients/quantity';
import type { IngredientLine } from '../ingredients/types';
import { UNITS } from '../ingredients/units';
import { combineZestAndJuice, displayName, mergeAmounts, needOf } from './amounts';
import type { ISODate, PlanEntry } from '../plan/week';
import { allLines, type Recipe } from '../recipes/types';
import { covers, removalHolds, tickBelongs, type CarriedExtra, type ListExtra, type Need, type WeekListEdits } from './edits';

export { mergeAmounts } from './amounts';
export {
  addExtras,
  carriedExtras,
  clearList,
  deleteExtra,
  EMPTY_EDITS,
  removeItem,
  restoreExtra,
  restoreRemoved,
  toggleChecked,
  toggleExtra,
  untickLeavesCupboard,
  type CarriedExtra,
  type ListAddition,
  type ListExtra,
  type WeekListEdits,
} from './edits';

export type ShoppingItem = {
  key: string;
  /** Singular or plural to match the amount: "brown onions, 3", "egg, 1". */
  name: string;
  aisle: AisleId;
  /** "400 g + 2", "1¼ tbsp"; empty when no recipe gave an amount. */
  amount: string;
  recipeIds: string[];
  optional: boolean;
  checked: boolean;
  /** The whole week's plan entries this line comes from, for edit bookkeeping. */
  sourceStamp: string;
  /** The whole week's need in base units: what a tick records. */
  need: Need;
};

export type ShoppingList = {
  sections: { aisle: AisleId; items: ShoppingItem[] }[];
  /** Covered by the cupboard (or a staple): shown quietly, never dropped (D-010). */
  inCupboard: ShoppingItem[];
  /** `fromWeek` is set on an extra carried forward from an earlier week. */
  extras: { extra: ListExtra; checked: boolean; fromWeek?: ISODate }[];
  removedCount: number;
};

type Contribution = { line: IngredientLine; entryId: string; recipeId: string; shown: boolean };

/**
 * The key that merges lines. Lines matched to the database merge by id. Free
 * text merges by its words, except text the word rules can't read (another
 * script, emoji), which keeps its own raw text so unrelated items don't all
 * collapse into one row (F190).
 */
function lineKey(line: IngredientLine): string {
  if (line.ingredientId) return line.ingredientId;
  const plain = line.item.normalize('NFKD').replace(/\p{M}/gu, '');
  if (/[^\p{P}\p{Z}a-z0-9]/iu.test(plain)) return `text:${line.item.trim().toLowerCase()}`;
  return `text:${normaliseWords(line.item).join(' ')}`;
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
  /** Every entry in the week: edits are kept over the whole week, so a day passing never undoes them (F11). */
  entries: readonly PlanEntry[];
  /** Meals before this day are over: they count for edits but aren't shown. */
  shownFrom?: ISODate;
  getRecipe: (id: string) => Recipe | undefined;
  index: IngredientIndex;
  cupboard: ReadonlySet<string>;
  edits: WeekListEdits;
  units: UnitSystem;
  carried?: readonly CarriedExtra[];
}): ShoppingList {
  const { entries, shownFrom, getRecipe, index, cupboard, edits, units, carried = [] } = args;
  const groups = new Map<string, Contribution[]>();

  for (const entry of entries) {
    const recipe = getRecipe(entry.recipeId);
    if (!recipe) continue; // A deleted custom recipe simply stops contributing.
    const ratio = entry.servings / recipe.servings;
    const shown = shownFrom === undefined || entry.day >= shownFrom;
    for (const line of combineZestAndJuice(allLines(recipe))) {
      const scaled = asWholeFruit(line.quantity === undefined ? line : { ...line, quantity: mapQuantity(line.quantity, (n) => n * ratio) });
      const key = lineKey(line);
      const list = groups.get(key) ?? [];
      list.push({ line: scaled, entryId: entry.id, recipeId: entry.recipeId, shown });
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
      shown: true,
    });
    groups.set(extra.ingredientId, list);
  }

  const bySection = new Map<AisleId, ShoppingItem[]>();
  const inCupboard: ShoppingItem[] = [];
  let removedCount = 0;

  for (const [key, contributions] of groups) {
    const shown = contributions.filter((c) => c.shown);
    if (shown.length === 0) continue; // Only needed for meals already eaten.
    const def = key.startsWith('text:') ? undefined : index.byId.get(key);
    const sourceStamp = [...new Set(contributions.map((c) => c.entryId))].sort().join(',');
    if (removalHolds(edits.removed[key], sourceStamp)) {
      removedCount++;
      continue;
    }
    const amounts = mergeAmounts(shown.map((c) => c.line));
    const fallback = shown[0]?.line.item ?? key;
    const printed = amounts.map((a) => {
      // "2 leaves bay leaf" reads badly: when the name already says the unit, show just the number.
      const redundant =
        a.unit !== undefined && UNITS[a.unit].kind === 'count' && normaliseWords(def?.name ?? fallback).includes(UNITS[a.unit].singular);
      return formatQuantity(a.quantity, redundant ? undefined : a.unit, units);
    });
    const need = needOf(contributions.map((c) => c.line));
    const tick = edits.checked[key];
    const belongs = tickBelongs(tick, sourceStamp);
    const item: ShoppingItem = {
      key,
      name: displayName(def, fallback, amounts, printed),
      aisle: def?.aisle ?? 'other',
      amount: printed.join(' + '),
      recipeIds: [...new Set(shown.map((c) => c.recipeId).filter(Boolean))],
      optional: shown.every((c) => c.line.optional === true),
      checked: belongs && covers(tick.need, need),
      sourceStamp,
      need,
    };
    // A line ticked for this plan stays in its aisle even once it's in the cupboard, so nothing jumps mid-shop.
    if (def?.staple || (cupboard.has(key) && !belongs)) {
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
    // Known ingredients added by hand are lines above, so only free text shows as an extra.
    extras: [
      ...carried.map(({ extra, fromWeek }) => ({ extra, checked: edits.checkedExtras.includes(extra.id), fromWeek })),
      ...edits.extras.filter((x) => !x.ingredientId).map((extra) => ({ extra, checked: edits.checkedExtras.includes(extra.id) })),
    ],
    removedCount,
  };
}

/** Every line in one A–Z list, for when the cook turns "By aisle" off. */
export function itemsAtoZ(list: ShoppingList): ShoppingItem[] {
  return list.sections.flatMap((s) => s.items).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Plain text for the share sheet, grouped by aisle, unticked items only.
 * Empty when there's nothing left to buy, so the caller never sends just a title (F132).
 */
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
  return out.length === 1 ? '' : out.join('\n');
}

/** Names are stored lower case ("brown onion") so they read naturally mid-sentence; lists start them with a capital. */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
