import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { advance, OVERLAP_MS, pullAfter } from './cursor';

describe('pullAfter (K-36)', () => {
  it('pulls everything without a mark', () => {
    assert.equal(pullAfter(undefined, 'h1'), undefined);
  });

  it('pulls everything when the mark belongs to another household or account', () => {
    assert.equal(pullAfter({ scope: 'h0', at: 1_000_000 }, 'h1'), undefined);
  });

  it('starts a little before the mark, for writes still in flight', () => {
    assert.equal(pullAfter({ scope: 'h1', at: 1_000_000 }, 'h1'), 1_000_000 - OVERLAP_MS);
  });

  it('never asks for a stamp below zero', () => {
    assert.equal(pullAfter({ scope: 'h1', at: 10 }, 'h1'), 0);
  });

  it('treats a broken mark as no mark', () => {
    assert.equal(pullAfter({ scope: 'h1', at: Number.NaN }, 'h1'), undefined);
  });
});

describe('advance (K-36)', () => {
  it('marks the newest stamp pulled', () => {
    assert.deepEqual(advance(undefined, 'h1', 500), { scope: 'h1', at: 500 });
  });

  it('keeps the mark when a pull answered nothing', () => {
    const mark = { scope: 'h1', at: 500 };
    assert.equal(advance(mark, 'h1', undefined), mark);
    assert.equal(advance(undefined, 'h1', undefined), undefined);
  });

  it('never moves the mark back (a pull that only re-read the overlap)', () => {
    assert.deepEqual(advance({ scope: 'h1', at: 500 }, 'h1', 400), { scope: 'h1', at: 500 });
  });

  it("drops another scope's mark", () => {
    assert.deepEqual(advance({ scope: 'h0', at: 900 }, 'h1', 400), { scope: 'h1', at: 400 });
    assert.equal(advance({ scope: 'h0', at: 900 }, 'h1', undefined), undefined);
  });
});
