import type { Provenance } from './types';

// Store builds show only the recipes that passed the editorial review or a cook
// test (D-008, D-036). The catalogue filters on this, and the photo map
// generator uses the same rule so a draft's photo stays out of a store build
// exactly when the draft does (K-30).
const SHIPS: ReadonlySet<Provenance> = new Set(['reviewed', 'vetted']);

/** Whether a recipe appears in store builds. A recipe with no provenance is a draft. */
export function shipsInStoreBuilds(provenance: Provenance | undefined): boolean {
  return SHIPS.has(provenance ?? 'ai-draft');
}
