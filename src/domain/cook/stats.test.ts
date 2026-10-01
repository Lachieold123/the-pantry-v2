import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromISODate } from '../plan/week';
import type { CookEvent } from './cook';
import { cooksThisWeek, currentStreak, kitchenStats, longestStreak, topCounts } from './stats';

// 6pm local on the given day, so every event sits well inside its day.
const at = (d: string, hour = 18) => fromISODate(d).getTime() + hour * 3600 * 1000;
let n = 0;
const cook = (recipeId: string, d: string, hour?: number): CookEvent => ({ id: String(++n), recipeId, cookedAt: at(d, hour) });

describe('cooking streaks', () => {
  const log = [
    cook('a', '2026-09-20'),
    cook('b', '2026-09-22'),
    cook('a', '2026-09-23'),
    cook('c', '2026-09-23', 8),
    cook('b', '2026-09-24'),
  ];

  it('counts consecutive days, however many cooks a day has', () => {
    assert.equal(currentStreak(log, new Date(at('2026-09-24', 20))), 3);
  });
  it('today not cooked yet keeps the streak until the day is over', () => {
    assert.equal(currentStreak(log, new Date(at('2026-09-25', 9))), 3);
    assert.equal(currentStreak(log, new Date(at('2026-09-26', 9))), 0);
  });
  it('the best streak is the longest run ever', () => {
    assert.equal(longestStreak(log), 3);
    assert.equal(longestStreak([cook('a', '2026-09-01'), cook('a', '2026-09-02'), cook('a', '2026-09-03'), cook('a', '2026-09-04')]), 4);
  });
  it('streaks cross a month end and a daylight-saving change', () => {
    // Sydney clocks go forward on Sunday 4 October 2026.
    const run = [
      cook('a', '2026-09-30'),
      cook('a', '2026-10-01'),
      cook('a', '2026-10-03'),
      cook('a', '2026-10-04'),
      cook('a', '2026-10-05'),
    ];
    assert.equal(longestStreak(run), 3);
    assert.equal(currentStreak(run, new Date(at('2026-10-05'))), 3);
  });
  it('an empty log is all zeros', () => {
    assert.equal(currentStreak([], new Date()), 0);
    assert.equal(longestStreak([]), 0);
  });
});

describe('cooks this week', () => {
  it('counts from Monday, local time', () => {
    const log = [cook('a', '2026-09-27'), cook('a', '2026-09-28', 7), cook('b', '2026-09-29'), cook('c', '2026-09-30', 9)];
    // Wednesday 30 September 2026: Monday the 28th starts the week; Sunday the 27th is last week.
    assert.equal(cooksThisWeek(log, new Date(at('2026-09-30', 12))), 3);
    // On Sunday the week still began the Monday before.
    assert.equal(cooksThisWeek(log, new Date(at('2026-09-27', 20))), 1);
  });
});

describe('rankings', () => {
  const log = [
    cook('a', '2026-09-01'),
    cook('b', '2026-09-02'),
    cook('a', '2026-09-03'),
    cook('c', '2026-09-04'),
    cook('gone', '2026-09-05'),
  ];
  const cuisine: Record<string, string> = { a: 'italian', b: 'thai', c: 'thai' };
  const cuisineOf = (id: string) => cuisine[id];

  it('ranks by count, ties to the most recent, skipping unknown recipes', () => {
    assert.deepEqual(
      topCounts(log, (id) => (cuisine[id] ? id : undefined), 3),
      [
        { key: 'a', count: 2 },
        { key: 'c', count: 1 },
        { key: 'b', count: 1 },
      ],
    );
  });
  it('groups by any key and respects the limit', () => {
    assert.deepEqual(topCounts(log, cuisineOf, 1), [{ key: 'thai', count: 2 }]);
  });
  it('builds the whole page from the log', () => {
    const stats = kitchenStats(log, new Date(at('2026-09-05', 20)), cuisineOf);
    assert.equal(stats.total, 5);
    assert.equal(stats.streak, 5);
    assert.equal(stats.best, 5);
    assert.deepEqual(stats.topCuisines, [
      { key: 'thai', count: 2 },
      { key: 'italian', count: 2 },
    ]);
    assert.deepEqual(
      stats.mostCooked.map((r) => r.key),
      ['a', 'c', 'b'],
    );
  });
});
