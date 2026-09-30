import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromISODate } from '../plan/week';
import { hasCooked, localiseStepText, recentlyCooked, splitStepTimers, weeklyStreak, type CookEvent } from './cook';
import { formatCountdown, isFinished, secondsLeft, startTimer } from './timers';

describe('Cook Mode timers', () => {
  it('finds timers and uses the upper bound of a range', () => {
    const segs = splitStepTimers('Simmer for 8–10 minutes, then rest 30 seconds.');
    const timers = segs.filter((s) => s.type === 'timer');
    assert.deepEqual(
      timers.map((t) => (t.type === 'timer' ? t.seconds : 0)),
      [600, 30],
    );
    assert.equal(segs.map((s) => (s.type === 'text' ? s.text : s.label)).join(''), 'Simmer for 8–10 minutes, then rest 30 seconds.');
  });
  it('leaves storage times and long plans as text', () => {
    for (const text of ['Keeps for 3 days in the fridge.', 'Make up to 2 hours ahead.', 'Marinate for at least 8 hours or overnight.']) {
      assert.ok(
        splitStepTimers(text).every((s) => s.type === 'text'),
        text,
      );
    }
  });
  it('handles hours', () => {
    const t = splitStepTimers('Bake 1.5 hours.').find((s) => s.type === 'timer');
    assert.equal(t?.type === 'timer' ? t.seconds : 0, 5400);
  });
  const timers = (text: string) => splitStepTimers(text).flatMap((s) => (s.type === 'timer' ? [[s.label, s.seconds]] : []));
  it('reads mixed and unicode fractions (F36)', () => {
    assert.deepEqual(timers('Bake 1 1/2 hours.'), [['1 1/2 hours', 5400]]);
    assert.deepEqual(timers('Bake 1½ hours.'), [['1½ hours', 5400]]);
  });
  it('makes "1 hour 15 minutes" one timer, not two (F36)', () => {
    assert.deepEqual(timers('Braise 1 hour 15 minutes, then rest.'), [['1 hour 15 minutes', 4500]]);
    assert.deepEqual(timers('Braise 1 hour and 15 minutes.'), [['1 hour and 15 minutes', 4500]]);
  });
  it('times a rest before serving, and a range by its upper bound (F36)', () => {
    assert.deepEqual(timers('Rest 10 minutes before serving.'), [['10 minutes', 600]]);
    assert.deepEqual(timers('Simmer 1½–2 hours.'), [['1½–2 hours', 7200]]);
  });
});

describe('localiseStepText (F49)', () => {
  it('leaves metric steps alone', () => {
    assert.equal(localiseStepText('Heat the oven to 200°C.', 'metric'), 'Heat the oven to 200°C.');
  });
  it('gives imperial cooks °F, rounded to the nearest 5', () => {
    assert.equal(localiseStepText('Heat the oven to 200°C.', 'imperial'), 'Heat the oven to 390°F.');
    assert.equal(localiseStepText('Roast at 180–200 °C (fan-forced).', 'imperial'), 'Roast at 355–390°F (fan).');
    assert.equal(localiseStepText('Set it to 220 degrees C.', 'imperial'), 'Set it to 430°F.');
  });
  it('doesn’t print °F twice when the recipe already gives it', () => {
    assert.equal(localiseStepText('As hot as it goes (250°C / 480°F).', 'imperial'), 'As hot as it goes (480°F).');
    assert.equal(localiseStepText('Heat to 250°C (480°F).', 'imperial'), 'Heat to 480°F.');
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
  it('ignores old-app cooks with no real date, so an import can’t fake a streak', () => {
    const imported: CookEvent[] = [
      { id: 'v1-a', recipeId: 'c', cookedAt: day('2026-09-29'), dateUnknown: true },
      { id: 'v1-b', recipeId: 'd', cookedAt: day('2026-09-29'), dateUnknown: true },
    ];
    assert.equal(weeklyStreak(imported, fromISODate('2026-09-30')), 0);
    assert.equal(weeklyStreak([...log, ...imported], fromISODate('2026-09-30')), 2);
  });
  it('lists undated cooks after every real one', () => {
    const undated: CookEvent = { id: 'v1-c', recipeId: 'c', cookedAt: day('2026-09-29'), dateUnknown: true };
    assert.deepEqual(recentlyCooked([undated, ...log]), ['a', 'b', 'c']);
  });
});

describe('Cook Mode timer clock', () => {
  it('counts from an end time, so it survives the phone locking', () => {
    const t = startTimer('t1', '10 minutes', 1, 600, 1_000_000);
    assert.equal(secondsLeft(t, 1_000_000), 600);
    assert.equal(secondsLeft(t, 1_000_000 + 299_500), 301);
    assert.equal(secondsLeft(t, 1_000_000 + 600_000), 0);
    assert.ok(isFinished(t, 2_000_000));
  });
  it('formats countdowns', () => {
    assert.equal(formatCountdown(545), '9:05');
    assert.equal(formatCountdown(3750), '1:02:30');
    assert.equal(formatCountdown(0), '0:00');
  });
});
