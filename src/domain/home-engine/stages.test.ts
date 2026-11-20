// The ranking and re-ranking stages on their own (REPO-12): engine.test.ts
// drives them only through recommend(), so a broken rule could hide behind
// the rest of the pipeline.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { withConfig } from './config';
import { decay, pantryShare, timeBucket } from './features';
import { predict, sigmoid } from './rank';
import { fits, rerank } from './rerank';
import type { EngineItem, Features, RankedItem, Source } from './types';

const ZERO: Features = { follow: 0, affinity: 0, pantry: 0, similarity: 0, collab: 0, popularity: 0, freshness: 0, quality: 0, quick: 0 };

function ranked(id: string, cookId: string, cuisine: string, sources: Source[] = ['similar']): RankedItem {
  const item = { id, cookId, cuisine } as EngineItem;
  return {
    item,
    score: 0,
    sources,
    features: ZERO,
    predictions: { save: 0, cook: 0, like: 0, dwell: 0 },
    pantry: { have: 0, total: 0, missing: [] },
    reasons: [],
    explanation: '',
  };
}

describe('ranking: the logistic heads', () => {
  it('a head with no features is its bias, and more of a positive feature means more', () => {
    const head = { bias: -2, weights: { pantry: 3 } };
    assert.equal(predict(head, ZERO), sigmoid(-2));
    assert.ok(predict(head, { ...ZERO, pantry: 1 }) > predict(head, { ...ZERO, pantry: 0.5 }));
    assert.ok(predict(head, { ...ZERO, pantry: 1 }) < 1);
  });
});

describe('ranking: features', () => {
  it('freshness halves every half-life and never goes above 1', () => {
    assert.equal(decay(0, 72), 1);
    assert.equal(decay(72 * 3600_000, 72), 0.5);
    assert.equal(decay(-5, 72), 1);
  });
  it('pantry share is 0 with nothing in it, else have over total', () => {
    assert.equal(pantryShare({ have: 0, total: 4, missing: [] }), 0);
    assert.equal(pantryShare({ have: 3, total: 4, missing: [] }), 0.75);
    assert.equal(pantryShare({ have: 0, total: 0, missing: [] }), 0);
  });
  it('time buckets have firm edges', () => {
    assert.deepEqual([undefined, 20, 21, 45, 90, 91].map(timeBucket), ['unknown', 'quick', 'weeknight', 'weeknight', 'slow', 'project']);
  });
});

describe('re-ranking', () => {
  const config = withConfig({ maxRunPerCook: 2, maxRunPerCuisine: 3, maxPerCookPerPage: 4, pageSize: 10, exploreEvery: 0 });

  it('breaks a run of one cook after two', () => {
    const list = [ranked('a', 'c1', 'x'), ranked('b', 'c1', 'y'), ranked('c', 'c1', 'z'), ranked('d', 'c2', 'w')];
    assert.deepEqual(
      rerank(list, config).map((r) => r.item.id),
      ['a', 'b', 'd', 'c'],
    );
  });

  it('breaks a run of one cuisine after three', () => {
    const list = ['a', 'b', 'c', 'd'].map((id, i) => ranked(id, `c${i}`, 'thai')).concat(ranked('e', 'c9', 'italian'));
    assert.deepEqual(
      rerank(list, config).map((r) => r.item.id),
      ['a', 'b', 'c', 'e', 'd'],
    );
  });

  it('caps one cook per page, but only in the cap check, not the run check', () => {
    const placed = ['a', 'b', 'c', 'd'].map((id, i) => ranked(id, i % 2 ? 'c1' : 'c2', `k${i}`));
    const more = ranked('e', 'c2', 'k9');
    // c2 already has 2 on the page; with a cap of 2 it doesn't fit, but its run is fine.
    const tight = withConfig({ ...config, maxPerCookPerPage: 2 });
    assert.equal(fits(placed, more, tight), false);
    assert.equal(fits(placed, more, tight, true), true);
  });

  it('saves the explore slot for something exploratory', () => {
    const explore = withConfig({ ...config, exploreEvery: 3 });
    const list = [ranked('a', 'c1', 'x'), ranked('b', 'c2', 'y'), ranked('c', 'c3', 'z'), ranked('far', 'c4', 'w', ['explore'])];
    assert.deepEqual(
      rerank(list, explore).map((r) => r.item.id),
      ['a', 'b', 'far', 'c'],
    );
  });

  it('keeps every item and stops at the limit', () => {
    const list = ['a', 'b', 'c', 'd', 'e'].map((id) => ranked(id, 'c1', 'x'));
    assert.equal(rerank(list, config).length, 5);
    assert.equal(rerank(list, config, 3).length, 3);
  });
});
