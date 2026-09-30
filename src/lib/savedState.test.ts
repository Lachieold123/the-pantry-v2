import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { backupKey, backupsToPrune, isNewerThan, mergeSaved, readSaved, withTimeout } from './savedState';

describe('reading saved stores', () => {
  it('reads a good blob', () => {
    assert.deepEqual(readSaved('{"state":{"a":1},"version":2}'), { saved: { state: { a: 1 }, version: 2 } });
  });
  it('treats nothing saved as a fresh start, not a problem', () => {
    assert.deepEqual(readSaved(null), { saved: null });
  });
  it('flags a truncated blob instead of throwing', () => {
    assert.deepEqual(readSaved('{"state":{"a":'), { saved: null, problem: 'unreadable' });
  });
  it('flags blobs of the wrong shape', () => {
    for (const raw of ['[]', '"x"', '{"version":1}', '{"state":[]}', '{"state":{},"version":"2"}', 'null']) {
      assert.equal(readSaved(raw).problem, 'wrong-shape', raw);
    }
  });
  it('names backups by store and time', () => {
    assert.equal(backupKey('the-pantry-v2/plan', 5), 'the-pantry-v2/plan.corrupt.5');
  });
});

describe('backups', () => {
  it('keeps only the newest few per store', () => {
    const keys = ['p.corrupt.1', 'p.corrupt.30', 'p.corrupt.200', 'p.corrupt.4', 'q.corrupt.1', 'p', 'p.corrupt.x'];
    assert.deepEqual(backupsToPrune(keys, 'p'), ['p.corrupt.4', 'p.corrupt.1']);
    assert.deepEqual(backupsToPrune(['p.corrupt.1'], 'p'), []);
  });
});

describe('saved versions', () => {
  it('spots data from a newer build', () => {
    assert.ok(isNewerThan({ state: {}, version: 3 }, 2));
    assert.ok(!isNewerThan({ state: {}, version: 2 }, 2));
    assert.ok(!isNewerThan({ state: {}, version: 1 }, 2));
    assert.ok(!isNewerThan({ state: {} }, 2));
    assert.ok(!isNewerThan(null, 2));
  });
});

describe('merging saved fields over defaults', () => {
  const action = () => 1;
  const defaults = {
    bookmarks: [] as string[],
    units: 'metric',
    count: 0,
    on: false,
    map: {},
    optional: undefined as string | undefined,
    act: action,
  };
  it('keeps fields of the right kind', () => {
    const merged = mergeSaved({ bookmarks: ['a'], units: 'us', count: 2, on: true, map: { a: 1 }, optional: 'x' }, defaults);
    assert.deepEqual(merged.bookmarks, ['a']);
    assert.equal(merged.units, 'us');
    assert.equal(merged.optional, 'x');
  });
  it('drops wrong-shaped fields instead of crashing later', () => {
    const merged = mergeSaved({ bookmarks: 'oops', units: null, count: '2', map: [], act: 'boom' }, defaults);
    assert.deepEqual(merged.bookmarks, []);
    assert.equal(merged.units, 'metric');
    assert.equal(merged.count, 0);
    assert.deepEqual(merged.map, {});
    assert.equal(merged.act, action);
  });
  it('ignores a saved state that is not an object', () => {
    assert.equal(mergeSaved(undefined, defaults), defaults);
    assert.equal(mergeSaved([1], defaults), defaults);
  });
});

describe('startup waits', () => {
  it('finish when the thing is ready', async () => {
    assert.equal(await withTimeout(Promise.resolve(), 50), 'ready');
  });
  it('give up rather than hang', async () => {
    assert.equal(await withTimeout(new Promise<void>(() => {}), 10), 'timed-out');
  });
});
