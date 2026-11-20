// A store build loads recipes.store.json and titles.json instead of the whole catalogue
// (PERF-1). Both are generated; this fails when someone rebuilds recipes.json without them.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';

import { shipsInStoreBuilds } from '../src/domain/recipes/provenance.ts';
import type { Recipe } from '../src/domain/recipes/types.ts';

const read = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, '../src/data/catalogue', name), 'utf8')) as unknown;
const all = read('recipes.json') as Recipe[];

it('the store catalogue is exactly the recipes that ship (run npm run catalogue:photos if not)', () => {
  const store = read('recipes.store.json') as Recipe[];
  assert.deepEqual(
    store.map((r) => r.id),
    all.filter((r) => shipsInStoreBuilds(r.provenance)).map((r) => r.id),
  );
  assert.deepEqual(
    store,
    all.filter((r) => shipsInStoreBuilds(r.provenance)),
  );
});

it('titles.json names every recipe, drafts included', () => {
  assert.deepEqual(read('titles.json'), Object.fromEntries(all.map((r) => [r.id, r.title])));
});
