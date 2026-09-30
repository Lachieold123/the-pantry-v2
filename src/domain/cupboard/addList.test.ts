import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { index } from '../testing/fixtures';
import { readPantryList } from './addList';

describe('add a list', () => {
  it('reads a typed list, with amounts, and matches each thing', () => {
    const got = readPantryList('eggs, 2 brown onions\nhalf a cabbage; feta and garlic', index);
    assert.deepEqual(
      got.map((g) => g.id),
      ['egg', 'brown-onion', 'cabbage', 'feta', 'garlic'],
    );
  });
  it('keeps things it cannot match, so the cook can pick or skip them', () => {
    const got = readPantryList('eggs, dragonfruit jelly', index);
    assert.equal(got[1]?.id, undefined);
    assert.equal(got[1]?.text, 'dragonfruit jelly');
  });
  it('collapses duplicates and ignores bullets and blank lines', () => {
    const got = readPantryList('- eggs\n\n- 6 eggs\n• milk', index);
    assert.deepEqual(
      got.map((g) => g.id),
      ['egg', 'milk'],
    );
  });
});
