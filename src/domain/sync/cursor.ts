// Where the next pull starts (K-36). The server stamps every row it takes
// with its own clock (`received_at`), so a phone can ask for "what changed
// since I last looked" without trusting any phone's clock. The phone keeps the
// newest stamp it has pulled, for the scope it pulled it from.
//
// Two things the mark must survive:
// - A write still in flight when a pull reads can be stamped a moment before
//   rows the pull already saw, and only become visible afterwards. So the
//   next pull starts a little before the mark (OVERLAP_MS). Rows read twice
//   are harmless: merging is newest-wins.
// - A mark from another household or account means nothing here: that pull
//   starts from scratch (a full pull).

/** Generous next to a single write (milliseconds); costs only a few rows read twice. */
export const OVERLAP_MS = 5 * 60_000;

export type Cursor = {
  /** The household or account the mark belongs to. */
  scope: string;
  /** The newest `received_at` pulled, in the server's milliseconds. */
  at: number;
};

/** The stamp to pull after, or undefined for a full pull. */
export function pullAfter(cursor: Cursor | undefined, scope: string): number | undefined {
  if (!cursor || cursor.scope !== scope || !Number.isFinite(cursor.at)) return undefined;
  return Math.max(0, cursor.at - OVERLAP_MS);
}

/**
 * The mark after a pull. `newest` is the newest `received_at` the pull
 * answered (undefined when it answered nothing, or the server has no stamps
 * yet). The mark never moves back, so a pull that only re-read the overlap
 * keeps it where it was.
 */
export function advance(cursor: Cursor | undefined, scope: string, newest: number | undefined): Cursor | undefined {
  const kept = cursor?.scope === scope ? cursor : undefined;
  if (newest === undefined || !Number.isFinite(newest)) return kept;
  return { scope, at: Math.max(kept?.at ?? 0, newest) };
}
