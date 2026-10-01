import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { index } from '../testing/fixtures';
import { guessesFromScan, pruneScans, SCAN_LIMITS, scanAllowance, startTicked } from './scan';

describe('scan review', () => {
  it('matches what the reader spotted, collapsing duplicates and keeping receipt notes', () => {
    const guesses = guessesFromScan(
      {
        kind: 'receipt',
        items: [
          { name: 'Eggs', note: 'Free range 12pk' },
          { name: 'eggs' },
          { name: 'Brown onion' },
          { name: 'Dish soap' },
          { name: '  ' },
        ],
      },
      index,
    );
    assert.deepEqual(
      guesses.map((g) => g.id ?? `?${g.text}`),
      ['egg', 'brown-onion', '?Dish soap'],
    );
    assert.equal(guesses[0]?.note, 'Free range 12pk');
  });
  it('starts hedged photo guesses and things you have unticked', () => {
    const guesses = guessesFromScan(
      {
        kind: 'food',
        items: [
          { name: 'Eggs', confidence: 0.95 },
          { name: 'Feta', confidence: 0.6 },
          { name: 'Brown onion', confidence: 0.9 },
        ],
      },
      index,
    );
    assert.equal(guesses.find((g) => g.id === 'feta')?.unsure, true);
    assert.deepEqual([...startTicked(guesses, new Set(['brown-onion']))], ['egg']);
  });
});

describe('scan allowance', () => {
  const now = new Date(2026, 9, 15, 12); // 15 October
  const at = (month: number, day: number) => new Date(2026, month, day, 9).getTime();
  it('gives 3 free scans a calendar month, back on the first', () => {
    assert.equal(scanAllowance([], now, false).left, SCAN_LIMITS.freePerMonth);
    const used = [at(8, 30), at(9, 1), at(9, 14)];
    const a = scanAllowance(used, now, false);
    assert.equal(a.left, 1);
    assert.equal(a.window, 'month');
    assert.equal(a.resetsAt.getTime(), new Date(2026, 10, 1).getTime());
    assert.equal(scanAllowance([...used, at(9, 15)], now, false).left, 0);
  });
  it('gives Pro about 15 a day', () => {
    const today = Array.from({ length: 15 }, () => at(9, 15));
    assert.equal(scanAllowance(today, now, true).left, 0);
    assert.equal(scanAllowance([at(9, 14), at(9, 14)], now, true).left, SCAN_LIMITS.proPerDay);
  });
  it('forgets scans from before this month', () => {
    assert.deepEqual(pruneScans([at(8, 30), at(9, 2)], now), [at(9, 2)]);
  });
});
