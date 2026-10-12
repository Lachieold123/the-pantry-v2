import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shipsInStoreBuilds } from './provenance';

describe('shipsInStoreBuilds', () => {
  it('ships reviewed and cook-tested recipes', () => {
    assert.equal(shipsInStoreBuilds('reviewed'), true);
    assert.equal(shipsInStoreBuilds('vetted'), true);
  });

  it('holds back drafts, including a recipe with no provenance', () => {
    assert.equal(shipsInStoreBuilds('ai-draft'), false);
    assert.equal(shipsInStoreBuilds(undefined), false);
  });
});
