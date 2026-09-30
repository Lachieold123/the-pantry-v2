// Search on the real catalogue: what people actually type, including the
// first letter of a word and the odd typo (audit F24–F27, F87).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { catalogue, index, makeRecipe } from '../testing/fixtures';
import { editDistance, indexForSearch, searchRecipes } from './search';
import type { Recipe } from './types';

const searchIndex = indexForSearch(catalogue, (c) => c, index.byId);
const search = (q: string) => searchRecipes(searchIndex, q);
const text = (r: Recipe) => `${r.title} ${r.ingredientGroups.flatMap((g) => g.items.map((i) => i.item)).join(' ')}`.toLowerCase();

describe('search: exact and prefix matches before typos', () => {
  it('"corn" finds only dishes with corn in them, not Cordon Bleu', () => {
    const results = search('corn');
    assert.ok(results.length > 10);
    for (const r of results) assert.match(text(r), /corn/, r.title);
  });
  it('"mint" finds mint, not minestrone or mince', () => {
    const results = search('mint');
    assert.ok(results.length > 5);
    for (const r of results) assert.match(text(r), /mint/, r.title);
  });
  it('"pear" finds what the recipe says (pear, pearl onions), not couscous or pepper', () => {
    const results = search('pear');
    assert.ok(results.length > 0);
    for (const r of results) assert.match(text(r), /pear/, r.title);
  });
  it('still forgives typos when nothing matches as typed', () => {
    assert.ok(
      search('chiken')
        .slice(0, 10)
        .every((r) => /chicken/i.test(r.title)),
    );
    assert.ok(search('chik').some((r) => /chicken/i.test(r.title)));
    assert.ok(search('lasgna').length > 0);
    assert.ok(search('lasgna').every((r) => /lasagn/i.test(r.title)));
  });
  it('mixes a typo with a correct word', () => {
    const results = search('chiken curry');
    assert.ok(results.length > 0);
    for (const r of results) assert.match(text(r), /curry/, r.title);
  });
});

describe('search: the word being typed', () => {
  it('one letter narrows the list rather than emptying it', () => {
    const results = search('c');
    assert.ok(results.length > 0 && results.length < catalogue.length);
  });
  it('"chicken t" keeps chicken dishes with a word starting with t', () => {
    const results = search('chicken t');
    assert.ok(results.length > 10);
    for (const r of results) assert.match(text(r), /chicken/, r.title);
    assert.match(results[0]?.title ?? '', /chicken t/i);
  });
  it('a finished one-letter word does not prefix-match everything', () => {
    assert.ok(search('c chicken').length <= search('chicken').length);
  });
});

describe('search: odd input', () => {
  it('symbols, emoji or non-Latin text find nothing (not the whole catalogue)', () => {
    for (const q of ['&', '!!!', '🍕', '鸡肉']) assert.deepEqual(search(q), [], q);
  });
  it('a blank query returns everything', () => {
    assert.equal(search('   ').length, catalogue.length);
  });
  it('spells out ø, œ, æ and ß instead of dropping them', () => {
    const idx = indexForSearch(
      [makeRecipe('a', ['1 brown onion'], { title: 'Smørrebrød' }), makeRecipe('b', ['1 brown onion'], { title: 'Bœuf Strüdel' })],
      (c) => c,
    );
    assert.equal(searchRecipes(idx, 'smorrebrod')[0]?.id, 'a');
    assert.equal(searchRecipes(idx, 'SMØRREBRØD')[0]?.id, 'a');
    assert.equal(searchRecipes(idx, 'boeuf')[0]?.id, 'b');
  });
});

describe('search: ingredient names from the database', () => {
  it('"aubergine" finds the eggplant dishes', () => {
    const results = search('aubergine');
    assert.ok(results.length >= 3);
    assert.ok(results.every((r) => /eggplant/.test(text(r))));
  });
  it('a synonym has to be typed in full', () => {
    // "corn" is the start of "cornichon" (pickles), which must not pull in every burger.
    assert.ok(!search('corn').some((r) => /pickle/.test(text(r)) && !/corn/.test(text(r))));
  });
});

describe('editDistance', () => {
  it('counts an adjacent swap as one edit', () => {
    assert.equal(editDistance('chikcen', 'chicken', 2), 1);
    assert.equal(editDistance('kitten', 'sitting', 3), 3);
    assert.equal(editDistance('pie', 'pig', 0), 1);
  });
  it('gives up past the limit', () => {
    assert.equal(editDistance('abcdef', 'uvwxyz', 1), 2);
  });
});

describe('search speed on the full catalogue', () => {
  it('each keystroke stays well inside a frame budget', () => {
    // Every prefix of a few real searches, as if typed. Generous for CI; the
    // app on a phone is slower, so this catches regressions by an order of magnitude.
    const typed = ['chicken tikka masala', 'aubergine', 'xyzzy plugh', 'chiken curry'].flatMap((q) =>
      Array.from({ length: q.length }, (_, i) => q.slice(0, i + 1)),
    );
    search('warm up');
    const start = performance.now();
    for (const q of typed) search(q);
    const perKey = (performance.now() - start) / typed.length;
    assert.ok(perKey < 15, `${perKey.toFixed(1)} ms per keystroke`);
  });
  it('builds the index quickly', () => {
    const start = performance.now();
    indexForSearch(catalogue, (c) => c, index.byId);
    assert.ok(performance.now() - start < 250);
  });
});
