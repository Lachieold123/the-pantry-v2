import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CookEvent } from '../cook/cook';
import { IMPORT_VERSION, mergeBookmarks, mergeCooks, shouldImport, wipeableKeys } from './merge';

describe('when the old-app import runs', () => {
  it('runs on first launch', () => {
    assert.deepEqual(shouldImport(null), { run: true, importedBefore: false });
  });
  it('runs again after the importer changes, even if the old one recorded a failure', () => {
    assert.deepEqual(shouldImport('{"at":1,"found":true,"imported":false}'), { run: true, importedBefore: false });
    assert.deepEqual(shouldImport('{"at":1,"found":true,"imported":true}'), { run: true, importedBefore: true });
  });
  it('doesn’t run twice with the same importer', () => {
    assert.equal(shouldImport(JSON.stringify({ version: IMPORT_VERSION, imported: false })).run, false);
  });
  it('runs if the marker is unreadable', () => {
    assert.equal(shouldImport('{oops').run, true);
  });
});

describe('wiping v2’s storage', () => {
  it('keeps the import marker and leaves other apps’ keys alone', () => {
    const keys = ['the-pantry-v2/saved', 'the-pantry-v2/old-app-import', 'the-pantry-v2/plan.corrupt.5', 'the-pantry/v1', 'the-pantry-v2x'];
    assert.deepEqual(wipeableKeys(keys, 'the-pantry-v2', 'the-pantry-v2/old-app-import'), [
      'the-pantry-v2/saved',
      'the-pantry-v2/plan.corrupt.5',
    ]);
  });
});

describe('merging an import', () => {
  it('puts old favourites after the ones saved here, newest first, dated to match', () => {
    const merged = mergeBookmarks([{ recipeId: 'x', savedAt: 500 }], ['b', 'x', 'a'], 1000);
    assert.deepEqual(
      merged.map((b) => b.recipeId),
      ['x', 'b', 'a'],
    );
    assert.ok(merged[1]!.savedAt < 500 && merged[2]!.savedAt < merged[1]!.savedAt);
  });
  it('adds each imported cook once, however many times it runs', () => {
    const real: CookEvent = { id: 'r1', recipeId: 'a', cookedAt: 5 };
    const imported: CookEvent[] = [{ id: 'v1-cooked-a', recipeId: 'a', cookedAt: 10, dateUnknown: true }];
    const once = mergeCooks([real], imported);
    assert.deepEqual(mergeCooks(once, imported), once);
    assert.equal(once.length, 2);
  });
});
