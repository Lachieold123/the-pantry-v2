import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromISODate } from '../plan/week';
import { hasCooked, recentlyCooked, splitStepTimers, weeklyStreak, type CookEvent } from './cook';

describe('Cook Mode timers', () => {
  it('finds timers and uses the upper bound of a range', () => {
    const segs = splitStepTimers('Simmer for 8–10 minutes, then rest 30 seconds.');
    const timers = segs.filter((s) => s.type === 'timer');
    assert.deepEqual(timers.map((t) => (t.type === 'timer' ? t.seconds : 0)), [600, 30]);
    assert.equal(segs.map((s) => (s.type === 'text' ? s.text : s.label)).join(''), 'Simmer for 8–10 minutes, then rest 30 seconds.');
  });
  it('leaves storage times and long plans as text', () => {
    for (const text of ['Keeps for 3 days in the fridge.', 'Make up to 2 hours ahead.', 'Marinate for at least 8 hours or overnight.']) {
      assert.ok(splitStepTimers(text).every((s) => s.type === 'text'), text);
    }
  });
  it('handles hours', () => {
    const t = splitStepTimers('Bake 1.5 hours.').find((s) => s.type === 'timer');
    assert.equal(t?.type === 'timer' ? t.seconds : 0, 5400);
  });
});

describe('cooked log', () => {
  const day = (d: string) => fromISODate(d).getTime() + 18 * 3600 * 1000;
  const log: CookEvent[] = [
    { id: '1', recipeId: 'a', cookedAt: day('2026-09-15') },
    { id: '2', recipeId: 'b', cookedAt: day('2026-09-22') },
    { id: '3', recipeId: 'a', cookedAt: day('2026-09-24') },
  ];
  it('lists recent cooks once each, newest first', () => {
    assert.deepEqual(recentlyCooked(log), ['a', 'b']);
    assert.ok(hasCooked(log, 'b'));
  });
  it('a streak counts consecutive weeks and doesn’t break before the week is over', () => {
    assert.equal(weeklyStreak(log, fromISODate('2026-09-28')), 2); // Monday, nothing cooked yet this week
    assert.equal(weeklyStreak(log, fromISODate('2026-10-06')), 0); // a whole week missed
  });
});
