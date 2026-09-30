import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { backupKey, readSaved, withTimeout } from './savedState';

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

describe('startup waits', () => {
  it('finish when the thing is ready', async () => {
    assert.equal(await withTimeout(Promise.resolve(), 50), 'ready');
  });
  it('give up rather than hang', async () => {
    assert.equal(await withTimeout(new Promise<void>(() => {}), 10), 'timed-out');
  });
});
