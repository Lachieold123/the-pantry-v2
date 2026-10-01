// Scanning a receipt or a photo of your food into the cupboard (D-030).
// The reading itself happens on a server we haven't connected yet; this is
// everything around it that doesn't need the server: what a reading looks
// like, how it becomes the same review list "Add a list" uses (so nothing
// lands in the cupboard unseen), and the monthly allowance.

import type { IngredientIndex } from '../ingredients/database';
import { parseIngredientLine } from '../ingredients/parse';
import type { ListGuess } from './addList';

export type ScanKind = 'receipt' | 'food';

/** One thing the reader spotted. Receipts are printed, so they come back sure; photos can hedge. */
export type DetectedItem = { name: string; confidence?: number | undefined; note?: string | undefined };

export type ScanResult = { kind: ScanKind; items: DetectedItem[]; storeName?: string | undefined };

/** Below this, a photo guess starts unticked: shown, but the cook opts in. */
export const UNSURE_BELOW = 0.75;

export type ScanGuess = ListGuess & { note?: string | undefined; unsure: boolean };

/** Each spotted thing matched to an ingredient through the same reader as "Add a list". Duplicates collapse. */
export function guessesFromScan(result: ScanResult, index: IngredientIndex): ScanGuess[] {
  const seen = new Set<string>();
  const out: ScanGuess[] = [];
  for (const item of result.items) {
    const text = item.name.trim();
    if (!text) continue;
    // Matched whole, not split like a typed list: "Salt and vinegar chips" is one thing on a receipt.
    const id = parseIngredientLine(text, index.match).line.ingredientId;
    const guess: ListGuess = id ? { text, id } : { text };
    const key = guess.id ?? guess.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...guess, note: item.note, unsure: (item.confidence ?? 1) < UNSURE_BELOW });
  }
  return out;
}

/** What starts ticked in the review: known, not already in the cupboard, and not a hedge. */
export function startTicked(guesses: readonly (ListGuess & { unsure?: boolean })[], have: ReadonlySet<string>): Set<string> {
  return new Set(guesses.flatMap((g) => (g.id && !have.has(g.id) && !g.unsure ? [g.id] : [])));
}

// — The allowance (D-030): 3 free scans a calendar month; Pro is unlimited within about 15 a day.

export const SCAN_LIMITS = { freePerMonth: 3, proPerDay: 15 } as const;

export type Allowance = {
  /** Scans left in the current window. */
  left: number;
  /** When the window resets: the first of next month, or tomorrow for Pro. */
  resetsAt: Date;
  window: 'month' | 'day';
};

/** Only scans that read something count; a failed or cancelled scan is free. */
export function scanAllowance(usedAt: readonly number[], now: Date, pro: boolean): Allowance {
  const start = pro ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date(now.getFullYear(), now.getMonth(), 1);
  const resetsAt = pro
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const used = usedAt.filter((t) => t >= start.getTime() && t < resetsAt.getTime()).length;
  const limit = pro ? SCAN_LIMITS.proPerDay : SCAN_LIMITS.freePerMonth;
  return { left: Math.max(0, limit - used), resetsAt, window: pro ? 'day' : 'month' };
}

/** Old scans can't affect any window from today on; keeps the stored list short. */
export function pruneScans(usedAt: readonly number[], now: Date): number[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return usedAt.filter((t) => t >= monthStart);
}
