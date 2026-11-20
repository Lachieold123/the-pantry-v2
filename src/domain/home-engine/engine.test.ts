import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_CONFIG, withConfig } from './config';
import { recommend, sectionsOf } from './engine';
import { appendEvent, isEvent, LOG_MAX, summarise } from './events';
import { coOccurrence, collabScore, cosine, itemVector, pantryMatch, popularity } from './features';
import { rerank } from './rerank';
import type { EngineEvent, EngineItem, RankedItem, Viewer } from './types';

const NOW = Date.parse('2026-10-12T00:00:00Z');
const HOUR = 3600_000;

function item(id: string, over: Partial<EngineItem> = {}): EngineItem {
  return {
    id,
    cookId: 'c1',
    cookName: 'Ana',
    title: id,
    cuisine: 'italian',
    mealTypes: ['dinner'],
    diets: [],
    difficulty: 'easy',
    totalMinutes: 30,
    ingredientIds: ['garlic', 'tomato'],
    needIds: ['garlic', 'tomato'],
    publishedAt: NOW - 24 * HOUR,
    authorQuality: 0.5,
    ...over,
  };
}

const viewer = (over: Partial<Viewer> = {}): Viewer => ({ id: 'v', follows: new Set(), pantry: new Set(), events: [], ...over });
const ev = (type: EngineEvent['type'], itemId: string, at = NOW - HOUR, viewerId = 'v'): EngineEvent => ({ type, itemId, at, viewerId });

// 40 items across 4 cooks and 4 cuisines.
const CUISINES = ['italian', 'thai', 'indian', 'mexican'];
const world: EngineItem[] = Array.from({ length: 40 }, (_, i) =>
  item(`r${i}`, {
    cookId: `c${i % 4}`,
    cookName: `Cook ${i % 4}`,
    cuisine: CUISINES[Math.floor(i / 10)]!,
    publishedAt: NOW - i * HOUR,
    ingredientIds: [`ing${i % 7}`, `ing${(i + 1) % 7}`, 'garlic'],
    needIds: [`ing${i % 7}`, `ing${(i + 1) % 7}`, 'garlic'],
    diets: i % 3 === 0 ? ['vegetarian'] : [],
  }),
);

describe('home engine', () => {
  it('ranks followed cooks first and says so', () => {
    const feed = recommend({ items: world, viewer: viewer({ follows: new Set(['c2']) }), now: NOW, seed: 'd', limit: 10 });
    const followed = feed.filter((r) => r.item.cookId === 'c2').length;
    assert.ok(followed >= 4, `followed ${followed}`);
    assert.equal(feed[0]?.item.cookId, 'c2');
    assert.equal(feed[0]?.explanation, 'Because you follow Cook 2');
  });

  it('lifts what you can cook now, with the count', () => {
    const pantry = new Set(['ing3', 'ing4', 'garlic']);
    const feed = recommend({ items: world, viewer: viewer({ pantry }), now: NOW, seed: 'd', limit: 5 });
    assert.deepEqual(feed[0]?.pantry.missing, []);
    assert.match(feed[0]!.explanation, /You can cook this now: 3\/3 ingredients/);
  });

  it('learns from saves: similar recipes rise, with "Because you liked"', () => {
    const events = ['r20', 'r21', 'r22'].map((id) => ev('save', id));
    const feed = recommend({ items: world, viewer: viewer({ events }), now: NOW, seed: 'd', limit: 8 });
    const indian = feed.filter((r) => r.item.cuisine === 'indian').length;
    assert.ok(indian >= 3, `indian ${indian}`);
    assert.ok(feed.some((r) => /Because you liked r2\d/.test(r.explanation)));
  });

  it('applies diet and allergen filters as hard rules', () => {
    const veg = recommend({ items: world, viewer: viewer({ dietAnyOf: ['vegetarian', 'vegan'] }), now: NOW, seed: 'd' });
    assert.ok(veg.length > 0 && veg.every((r) => r.item.diets.includes('vegetarian')));
    const noGarlic = recommend({ items: world, viewer: viewer({ avoidIngredientIds: new Set(['garlic']) }), now: NOW, seed: 'd' });
    assert.equal(noGarlic.length, 0);
  });

  it('never shows hidden items and sinks ones shown often without an open', () => {
    const hidden = recommend({ items: world, viewer: viewer({ events: [ev('hide', 'r0')] }), now: NOW, seed: 'd' });
    assert.ok(!hidden.some((r) => r.item.id === 'r0'));
    const base = recommend({ items: world, viewer: viewer(), now: NOW, seed: 'd' });
    const top = base[0]!.item.id;
    const seen = [0, 1, 2, 3, 4].map((k) => ev('impression', top, NOW - (k + 1) * 2 * HOUR));
    const after = recommend({ items: world, viewer: viewer({ events: seen }), now: NOW, seed: 'd' });
    assert.ok(after.findIndex((r) => r.item.id === top) > 0);
  });

  it('keeps the page varied: no more than 2 in a row from one cook', () => {
    const feed = recommend({ items: world, viewer: viewer({ follows: new Set(['c1']) }), now: NOW, seed: 'd', limit: 20 });
    for (let i = 2; i < feed.length; i++) {
      const same = feed[i]!.item.cookId === feed[i - 1]!.item.cookId && feed[i]!.item.cookId === feed[i - 2]!.item.cookId;
      assert.ok(!same, `three in a row at ${i}`);
    }
  });

  it('cold start still gives a full, explained feed', () => {
    const feed = recommend({ items: world, viewer: viewer(), now: NOW, seed: 'd' });
    assert.ok(feed.length >= 30);
    assert.ok(feed.every((r) => r.explanation.length > 0));
    assert.ok(feed.some((r) => r.sources.includes('explore')));
  });

  it('is deterministic for the same seed and honours config', () => {
    const a = recommend({ items: world, viewer: viewer(), now: NOW, seed: 'x', limit: 10 }).map((r) => r.item.id);
    const b = recommend({ items: world, viewer: viewer(), now: NOW, seed: 'x', limit: 10 }).map((r) => r.item.id);
    assert.deepEqual(a, b);
    const noFollow = withConfig({
      direct: {},
      heads: { ...DEFAULT_CONFIG.heads, like: { bias: -2, weights: {} }, save: { bias: -2, weights: {} } },
    });
    const feed = recommend({
      items: world,
      viewer: viewer({ follows: new Set(['c3']) }),
      now: NOW,
      seed: 'x',
      limit: 10,
      config: noFollow,
    });
    assert.ok(feed.filter((r) => r.item.cookId === 'c3').length < 10);
  });

  it('groups into sections by headline reason', () => {
    const feed = recommend({
      items: world,
      viewer: viewer({ follows: new Set(['c0']), pantry: new Set(['ing1', 'ing2', 'garlic']) }),
      now: NOW,
      seed: 'd',
      limit: 20,
    });
    const keys = sectionsOf(feed).map((s) => s.key);
    assert.ok(keys.includes('following') && keys.includes('cookable'));
  });
});

describe('home engine parts', () => {
  it('pantry match counts needed ingredients only', () => {
    assert.deepEqual(pantryMatch(item('a', { needIds: ['x', 'y'] }), new Set(['x'])), { have: 1, total: 2, missing: ['y'] });
  });
  it('content similarity: same cuisine and ingredients are close', () => {
    const a = itemVector(item('a'));
    assert.ok(cosine(a, itemVector(item('b'))) > cosine(a, itemVector(item('c', { cuisine: 'thai', ingredientIds: ['lemongrass'] }))));
  });
  it('co-occurrence finds "people who saved this saved that"', () => {
    const events = ['u1', 'u2', 'u3'].flatMap((u) => [ev('save', 'a', NOW, u), ev('save', 'b', NOW, u)]);
    const co = coOccurrence(events);
    assert.equal(collabScore(co, ['a'], 'b').via, 'a');
    assert.ok(collabScore(co, ['a'], 'b').score > 0.9);
  });
  it('popularity decays with time', () => {
    const pop = popularity([ev('save', 'new', NOW), ev('save', 'old', NOW - 30 * 24 * HOUR)], NOW, DEFAULT_CONFIG);
    assert.ok((pop.get('new') ?? 0) > (pop.get('old') ?? 0));
  });
  it('the log drops repeat impressions, bad events, and keeps a cap', () => {
    let log: EngineEvent[] = [];
    log = appendEvent(log, ev('impression', 'a', NOW));
    assert.equal(appendEvent(log, ev('impression', 'a', NOW + 60_000)), log);
    assert.equal(appendEvent(log, { type: 'nope' } as unknown as EngineEvent), log);
    assert.ok(!isEvent({ type: 'save', at: 'x', viewerId: 'v' }));
    for (let i = 0; i < LOG_MAX + 10; i++) log = appendEvent(log, ev('open', `i${i}`, NOW + i));
    assert.equal(log.length, LOG_MAX);
  });
  it('summarise folds follows, saves and unsaves', () => {
    const s = summarise(
      [ev('save', 'a', 1), ev('unsave', 'a', 2), { type: 'follow', at: 3, viewerId: 'v', cookId: 'c9' }],
      DEFAULT_CONFIG,
      () => 'c1',
    );
    assert.equal(s.items.get('a')?.saved, false);
    assert.equal(s.followChanges.get('c9'), true);
  });
  it('re-rank falls back to the best item when nothing fits', () => {
    const one = (id: string): RankedItem => ({
      item: item(id),
      score: 1,
      sources: ['fresh'],
      features: { follow: 0, affinity: 0, pantry: 0, similarity: 0, collab: 0, popularity: 0, freshness: 0, quality: 0, quick: 0 },
      predictions: { save: 0, cook: 0, like: 0, dwell: 0 },
      pantry: { have: 0, total: 0, missing: [] },
      reasons: [],
      explanation: '',
    });
    assert.equal(rerank([one('a'), one('b'), one('c')], DEFAULT_CONFIG).length, 3);
  });
});
