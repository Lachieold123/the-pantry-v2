import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CuisineId } from '../recipes/types';
import { diversify, type Ranked } from './diversify';
import type { Protein } from './signals';

const item = (id: string, score: number, cuisine: CuisineId, protein?: Protein): Ranked<string> => ({
  item: id,
  score,
  facets: { cuisine, protein },
});

describe('diversify', () => {
  it('splits up the same cuisine when something close is there', () => {
    const out = diversify(
      [item('t1', 10, 'thai'), item('t2', 9.5, 'thai'), item('t3', 9, 'thai'), item('i1', 8, 'italian'), item('j1', 7.5, 'japanese')],
      5,
    );
    assert.deepEqual(out, ['t1', 'i1', 't2', 'j1', 't3']);
  });

  it('keeps score order when everything is the same cuisine (nothing better to do)', () => {
    const out = diversify([item('a', 3, 'thai'), item('b', 2, 'thai'), item('c', 1, 'thai')], 3);
    assert.deepEqual(out, ['a', 'b', 'c']);
  });

  it('won’t promote a much worse dish just to vary the cuisine', () => {
    const out = diversify([item('t1', 20, 'thai'), item('t2', 19, 'thai'), item('x', 1, 'italian')], 3);
    assert.deepEqual(out, ['t1', 't2', 'x']);
  });

  it('separates the same protein too', () => {
    const out = diversify([item('a', 10, 'thai', 'poultry'), item('b', 9.8, 'italian', 'poultry'), item('c', 9, 'mexican', 'beef')], 3);
    assert.deepEqual(out, ['a', 'c', 'b']);
  });

  it('doesn’t count two meat-free dishes as the same protein', () => {
    const out = diversify([item('a', 10, 'thai'), item('b', 9.8, 'italian'), item('c', 9, 'mexican')], 3);
    assert.deepEqual(out, ['a', 'b', 'c']);
  });

  it('only re-ranks the top, and keeps everything', () => {
    const list = [item('a', 5, 'thai'), item('b', 4, 'thai'), item('c', 3, 'italian'), item('d', 2, 'thai'), item('e', 1, 'thai')];
    const out = diversify(list, 2);
    assert.deepEqual(out.slice(0, 2), ['a', 'c']);
    assert.deepEqual(out.slice(2), ['b', 'd', 'e']);
    assert.equal(diversify([], 5).length, 0);
  });

  it('is stable: same input, same output, ties in incoming order', () => {
    const list = [item('a', 1, 'thai'), item('b', 1, 'italian'), item('c', 1, 'greek')];
    assert.deepEqual(diversify(list, 3), diversify(list, 3));
    assert.deepEqual(diversify(list, 3), ['a', 'b', 'c']);
  });
});
