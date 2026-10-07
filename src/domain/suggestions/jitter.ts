// A small fixed nudge per dish per day. Home's ranking, Plan's ideas, Browse
// and the cupboard engine all break near-ties with it, so lists hold still
// within a day (no reshuffle on every visit) but don't go stale across days.

/** A cheap, stable 0–1 number per recipe and seed (FNV-1a), so ties break the same way all day. */
export function stableJitter(seed: string, id: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${seed}:${id}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 0xffffffff;
}
