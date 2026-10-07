// Variety for the top of Home (docs/HOME-RANKING.md §3.5). Ranking alone puts
// look-alikes together: a cook who loves Thai would get five Thai curries in a
// row. This re-rank walks down the list and, at each place, takes the best
// dish once a penalty for looking like the ones just above it is counted
// (a greedy "maximal marginal relevance" re-rank). Only the top of the list is
// re-ranked: that's what's on screen, and the rest keeps its score order.

import type { CuisineId } from '../recipes/types';
import type { Protein } from './signals';

export type Facets = { cuisine: CuisineId; protein: Protein | undefined };
export type Ranked<T> = { item: T; score: number; facets: Facets };

/**
 * Penalties in score points. Same cuisine back-to-back costs more than any
 * ordinary gap between two good dishes, so it only happens when nothing else
 * comes close (or everything is that cuisine, when the penalty is the same
 * for every choice and changes nothing). Repeats a little further up cost less.
 */
export const VARIETY = {
  /** The card right above has the same cuisine. */
  sameCuisineNext: 6,
  /** The card right above has the same main protein. */
  sameProteinNext: 2,
  /** Each of the few cards above that with the same cuisine. */
  sameCuisineNear: 1,
  /** Each of the few cards above that with the same main protein. */
  sameProteinNear: 0.5,
  /** How many cards above count as "near". */
  near: 4,
} as const;

function penalty(f: Facets, placed: readonly Facets[]): number {
  const prev = placed[placed.length - 1];
  if (!prev) return 0;
  let p = 0;
  if (prev.cuisine === f.cuisine) p += VARIETY.sameCuisineNext;
  if (f.protein && prev.protein === f.protein) p += VARIETY.sameProteinNext;
  for (const other of placed.slice(-VARIETY.near - 1, -1)) {
    if (other.cuisine === f.cuisine) p += VARIETY.sameCuisineNear;
    if (f.protein && other.protein === f.protein) p += VARIETY.sameProteinNear;
  }
  return p;
}

/**
 * Re-ranks the first `count` places for variety; the rest follow in score
 * order. Ties keep the incoming order, so the result is as stable as the input.
 */
export function diversify<T>(ranked: readonly Ranked<T>[], count: number): T[] {
  const remaining = [...ranked].sort((a, b) => b.score - a.score);
  const out: T[] = [];
  const placed: Facets[] = [];
  while (out.length < count && remaining.length > 0) {
    let best = 0;
    let bestValue = -Infinity;
    remaining.forEach((r, i) => {
      const value = r.score - penalty(r.facets, placed);
      if (value > bestValue) {
        bestValue = value;
        best = i;
      }
    });
    const [chosen] = remaining.splice(best, 1);
    if (!chosen) break;
    out.push(chosen.item);
    placed.push(chosen.facets);
  }
  return [...out, ...remaining.map((r) => r.item)];
}
