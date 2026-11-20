// Stage 3: re-ranking. The scored list is good item by item but can be
// lopsided (five curries from one cook in a row). This pass walks it greedily
// and takes the best item that keeps the page varied, saving a regular slot
// for something exploratory. When no item fits the rules, the best one wins
// anyway: a short feed beats an empty one.
import type { EngineConfig } from './config';
import type { RankedItem } from './types';

function runLength<T>(list: readonly RankedItem[], key: (r: RankedItem) => T, value: T): number {
  let n = 0;
  for (let i = list.length - 1; i >= 0 && key(list[i]!) === value; i--) n++;
  return n;
}

/** `runsOnly` checks the in-a-row rules but not the per-page cap (the fallback when the cap can't be met). */
export function fits(placed: readonly RankedItem[], next: RankedItem, config: EngineConfig, runsOnly = false): boolean {
  const cook = next.item.cookId;
  if (runLength(placed, (r) => r.item.cookId, cook) >= config.maxRunPerCook) return false;
  if (next.item.cuisine && runLength(placed, (r) => r.item.cuisine, next.item.cuisine) >= config.maxRunPerCuisine) return false;
  if (runsOnly) return true;
  const pageStart = Math.floor(placed.length / config.pageSize) * config.pageSize;
  const onPage = placed.slice(pageStart).filter((r) => r.item.cookId === cook).length;
  return onPage < config.maxPerCookPerPage;
}

const isExplore = (r: RankedItem) => r.sources.includes('explore') || (r.sources.length === 1 && r.sources[0] === 'popular');

/** `ranked` is best first. Returns a new order with the same items. */
export function rerank(ranked: readonly RankedItem[], config: EngineConfig, limit = ranked.length): RankedItem[] {
  const left = [...ranked];
  const placed: RankedItem[] = [];
  while (placed.length < limit && left.length) {
    const slot = placed.length + 1;
    const exploreSlot = config.exploreEvery > 0 && slot % config.exploreEvery === 0;
    let at = -1;
    if (exploreSlot) at = left.findIndex((r) => isExplore(r) && fits(placed, r, config));
    if (at < 0) at = left.findIndex((r) => fits(placed, r, config));
    if (at < 0) at = left.findIndex((r) => fits(placed, r, config, true));
    if (at < 0) at = 0;
    placed.push(left.splice(at, 1)[0]!);
  }
  return placed;
}
