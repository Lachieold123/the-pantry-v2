import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addCollection, collectionNamed, renameCollection, type NamedCollection } from './collections';

const make = (id: string, name: string, recipeIds: string[] = [], createdAt = 1): NamedCollection => ({
  id,
  name,
  recipeIds,
  createdAt,
  updatedAt: createdAt,
});

describe('collection names are unique', () => {
  const list = [make('a', 'Weeknights', ['r1'], 1), make('b', 'Vego', [], 2)];

  it('finds a clash ignoring case and spaces', () => {
    assert.equal(collectionNamed(list, '  weeknights ')?.id, 'a');
    assert.equal(collectionNamed(list, 'weeknights', 'a'), undefined);
  });

  it('adds a new name in creation order', () => {
    assert.deepEqual(
      addCollection(list, make('c', ' Soups ', [], 0)).map((c) => c.name),
      ['Soups', 'Weeknights', 'Vego'],
    );
  });

  it('folds a case-only twin into the existing one instead of making two', () => {
    const next = addCollection(list, make('c', 'WEEKNIGHTS', ['r2', 'r1'], 5));
    assert.equal(next.length, 2);
    assert.deepEqual(next.find((c) => c.id === 'a')?.recipeIds, ['r1', 'r2']);
  });

  it('undoing a delete after a same-named collection was made keeps one', () => {
    const deleted = list[0]!;
    const remade = addCollection(
      list.filter((c) => c.id !== 'a'),
      make('d', 'weeknights', ['r3'], 9),
    );
    const restored = addCollection(remade, deleted);
    assert.equal(restored.filter((c) => c.name.toLowerCase() === 'weeknights').length, 1);
    assert.deepEqual(restored.find((c) => c.id === 'd')?.recipeIds, ['r3', 'r1']);
  });

  it('adding the same id twice changes nothing', () => {
    assert.deepEqual(addCollection(list, list[0]!), list);
  });

  it('refuses a rename onto another collection’s name, or an empty one', () => {
    assert.deepEqual(renameCollection(list, 'b', 'weeknights', 9), list);
    assert.deepEqual(renameCollection(list, 'b', '  ', 9), list);
    assert.equal(renameCollection(list, 'b', ' Veg ', 9)[1]?.name, 'Veg');
    assert.equal(renameCollection(list, 'a', 'WEEKNIGHTS', 9)[0]?.name, 'WEEKNIGHTS');
  });
});
