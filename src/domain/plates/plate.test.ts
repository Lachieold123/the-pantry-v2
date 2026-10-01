import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addPhotos, plateMeta, draftHasContent, EMPTY_PLATE, linkRecipe, makePlate, PLATE_LIMITS, plateProblems } from './plate';

describe('plates', () => {
  it('needs a photo and a name before it can be shared', () => {
    assert.deepEqual(plateProblems(EMPTY_PLATE), ['Add a photo', 'Name the dish']);
    assert.deepEqual(plateProblems({ ...EMPTY_PLATE, photoUris: ['a'], title: '  ' }), ['Name the dish']);
    assert.deepEqual(plateProblems({ ...EMPTY_PLATE, photoUris: ['a'], title: 'Pho' }), []);
  });
  it('keeps at most five photos, without repeats', () => {
    const d = addPhotos(addPhotos(EMPTY_PLATE, ['a', 'b', 'a']), ['c', 'd', 'e', 'f', 'g']);
    assert.deepEqual(d.photoUris, ['a', 'b', 'c', 'd', 'e']);
    assert.equal(d.photoUris.length, PLATE_LIMITS.photos);
  });
  it('fills blanks from a linked recipe but keeps what was typed', () => {
    const recipe = { id: 'beef-pho', title: 'Beef Pho', totalMinutes: 180, servings: 4, difficulty: 'medium' as const };
    const linked = linkRecipe({ ...EMPTY_PLATE, title: 'Sunday pho' }, recipe);
    assert.equal(linked.title, 'Sunday pho');
    assert.equal(linked.recipeId, 'beef-pho');
    assert.equal(linked.minutes, 180);
    assert.equal(linked.serves, 4);
    assert.equal(linkRecipe(EMPTY_PLATE, recipe).title, 'Beef Pho');
  });
  it('tidies the text when it becomes a plate', () => {
    const p = makePlate({ ...EMPTY_PLATE, photoUris: ['a'], title: '  Pho  ', caption: ' so good ' }, 'p1', 5);
    assert.equal(p.title, 'Pho');
    assert.equal(p.caption, 'so good');
    assert.equal('recipeId' in p, false);
  });
  it('describes a plate in one line', () => {
    assert.equal(plateMeta({ minutes: 45, serves: 4, difficulty: 'easy' }), '45m · Serves 4 · Easy');
    assert.equal(plateMeta({ minutes: 0, serves: 1 }), 'Serves 1');
  });
  it('knows when a draft is worth keeping', () => {
    assert.equal(draftHasContent(EMPTY_PLATE), false);
    assert.equal(draftHasContent({ ...EMPTY_PLATE, caption: 'x' }), true);
  });
});
