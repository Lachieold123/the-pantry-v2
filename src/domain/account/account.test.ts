import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { backupLine, cleanCode, codeProblem, looksLikeEmail, reached, resendIn } from './account';

const MIN = 60_000;

describe('signing in with an email code', () => {
  it('catches a mistyped email and accepts a real one, spaces and capitals included', () => {
    assert.equal(looksLikeEmail(' Lachlan@Example.com '), true);
    assert.equal(looksLikeEmail('lachlan@'), false);
    assert.equal(looksLikeEmail('lachlan.example.com'), false);
    assert.equal(looksLikeEmail('lachlan@example.c'), false);
  });
  it('reads a pasted code with spaces, and stops at six digits', () => {
    assert.equal(cleanCode('123 456'), '123456');
    assert.equal(cleanCode('1234567'), '123456');
  });
  it('offers a new code after a minute', () => {
    assert.equal(resendIn(0, 0), 60);
    assert.equal(resendIn(0, 59_500), 1);
    assert.equal(resendIn(0, 60_000), 0);
  });
  it('calls a code wrong, unless it was sent over an hour ago', () => {
    assert.equal(codeProblem(0, 5 * MIN), 'code-wrong');
    assert.equal(codeProblem(0, 61 * MIN), 'code-expired');
  });
});

describe('how “Backed up” reads', () => {
  const now = 1_000 * MIN;
  it('says how long ago', () => {
    assert.equal(backupLine({ lastSyncedAt: now - 10_000, waiting: 0, offline: false, now }), 'Backed up · just now');
    assert.equal(backupLine({ lastSyncedAt: now - 5 * MIN, waiting: 0, offline: false, now }), 'Backed up · 5 min ago');
    assert.equal(backupLine({ lastSyncedAt: now - 3 * 60 * MIN, waiting: 0, offline: false, now }), 'Backed up · 3 hr ago');
    assert.equal(backupLine({ lastSyncedAt: now - 30 * 60 * MIN, waiting: 0, offline: false, now }), 'Backed up · yesterday');
  });
  it('is honest when changes are waiting', () => {
    assert.equal(backupLine({ lastSyncedAt: now, waiting: 2, offline: true, now }), 'Waiting to go online');
    assert.equal(backupLine({ lastSyncedAt: now, waiting: 2, offline: false, now }), 'Backing up…');
  });
});

describe('the moments an account is offered', () => {
  it('reaches a moment only by going up to it', () => {
    assert.equal(reached(9, 10, 10), true);
    assert.equal(reached(14, 15, 10), true);
    assert.equal(reached(11, 10, 10), false);
    assert.equal(reached(0, 1, 1), true);
  });
});
