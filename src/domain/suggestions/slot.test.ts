// Plan's ideas use Home's scorer, scored for the meal being planned rather than
// for now. These replace the old dinner-only "For you" tests (forYou.ts): the
// same promises (hard rules, taste first, planned and cooked dishes move down,
// stable all day) plus the ones that list couldn't keep (the right meal, the
// right day).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PlanEntry, Slot } from '../plan/week';
import { containsAvoided, fitsDietPreference } from '../recipes/diets';
import { totalMinutes, type Recipe } from '../recipes/types';
import { catalogue, index } from '../testing/fixtures';
import { at, DAY, falseReason, NO_TASTE } from '../testing/home';
import { rankForSlot, slotMoment, slotRankInput, type SlotInput } from './slot';

/** Monday 5 October 2026, 7am: planning the week. */
const NOW = at('2026-10-05', 7).nowMs;
const TUESDAY = '2026-10-06';
const SATURDAY = '2026-10-10';
const NEXT_THURSDAY = '2026-10-15';

const input = (over: Partial<SlotInput> = {}): SlotInput => ({
  recipes: catalogue,
  taste: NO_TASTE,
  hidden: new Set(),
  history: { cookLog: [], bookmarks: [], recentlyViewed: [] },
  plan: [],
  cupboard: [],
  index,
  day: TUESDAY,
  slot: 'dinner',
  nowMs: NOW,
  depth: 25,
  ...over,
});
const picks = (over: Partial<SlotInput> = {}) => rankForSlot(input(over)).picks;
const ids = (list: readonly Recipe[]) => list.map((r) => r.id);
const entry = (recipeId: string, day: string, slot: Slot = 'dinner'): PlanEntry => ({
  id: `e-${recipeId}-${day}`,
  recipeId,
  day,
  slot,
  servings: 4,
});

describe('the right meal', () => {
  for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
    it(`a ${slot} slot only offers ${slot} dishes`, () => {
      const list = picks({ slot });
      assert.ok(list.length > 0);
      for (const r of list) assert.ok(r.mealTypes.includes(slot), `${r.id} isn't a ${slot}`);
    });
  }

  it('offers every breakfast the cook may eat, not a dinner cut down to a few', () => {
    const breakfasts = catalogue.filter((r) => r.mealTypes.includes('breakfast'));
    assert.deepEqual(new Set(ids(picks({ slot: 'breakfast' }))), new Set(ids(breakfasts)));
  });
});

describe('the right day', () => {
  // A cook who wants weeknight dinners inside 30 minutes, so the weekend's extra hour shows.
  const taste = { ...NO_TASTE, weeknight: 'under-30' as const };
  const longOnes = (list: readonly Recipe[]) => list.slice(0, 20).filter((r) => totalMinutes(r) > 45).length;

  it('lets Saturday dinner run longer than Tuesday dinner', () => {
    const tuesday = picks({ taste, day: TUESDAY });
    const saturday = picks({ taste, day: SATURDAY });
    assert.equal(longOnes(tuesday), 0, ids(tuesday.slice(0, 20)).join());
    assert.ok(longOnes(saturday) >= 3, ids(saturday.slice(0, 20)).join());
  });

  it('scores the planned day, not today', () => {
    const m = slotMoment(SATURDAY, 'dinner', NOW);
    assert.equal(m.today, SATURDAY);
    assert.equal(m.hour, 18);
    assert.equal(m.nowMs, NOW, 'history is still measured from now');
  });

  it('only says things that are true of that meal on that day', () => {
    for (const day of [TUESDAY, SATURDAY, '2026-12-27', '2027-06-14']) {
      for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
        const scored = slotRankInput(input({ taste, day, slot }));
        const ranking = rankForSlot(input({ taste, day, slot }));
        for (const r of ranking.picks) {
          const reason = ranking.reasons.get(r.id);
          if (reason) assert.equal(falseReason(r, reason, scored), undefined);
        }
      }
    }
  });
});

describe('taste and freshness', () => {
  it('puts a loved cuisine that fits the weeknight first', () => {
    const first = picks({ taste: { ...NO_TASTE, cuisines: ['thai'], weeknight: 'under-30' } })[0];
    assert.equal(first?.cuisine, 'thai');
    assert.ok(first && totalMinutes(first) <= 30);
  });

  it('moves a dish already planned that week down', () => {
    const top = picks()[0];
    assert.ok(top);
    const after = ids(picks({ plan: [entry(top.id, '2026-10-05')] }));
    assert.ok(after.indexOf(top.id) >= 5, `still at ${after.indexOf(top.id)}`);
  });

  it('reads "that week" from the planned day, not from today', () => {
    const top = picks({ day: NEXT_THURSDAY })[0];
    assert.ok(top);
    // On next Monday's plan: already coming next Thursday's week.
    assert.notEqual(picks({ day: NEXT_THURSDAY, plan: [entry(top.id, '2026-10-12')] })[0]?.id, top.id);
    // On this week's plan only: it's not coming next week, so it can lead.
    assert.equal(picks({ day: NEXT_THURSDAY, plan: [entry(top.id, '2026-10-06')] })[0]?.id, top.id);
  });

  it('moves a dish cooked in the last few days off the top', () => {
    const top = picks()[0];
    assert.ok(top);
    const after = ids(picks({ history: { cookLog: [{ recipeId: top.id, cookedAt: NOW - 2 * DAY }], bookmarks: [], recentlyViewed: [] } }));
    assert.ok(after.indexOf(top.id) >= 10, `still at ${after.indexOf(top.id)}`);
  });

  it('keeps the same order all day, and a different one for another day', () => {
    assert.deepEqual(ids(picks()), ids(picks({ nowMs: NOW + 3 * 60 * 60 * 1000 })));
    assert.notDeepEqual(ids(picks().slice(0, 10)), ids(picks({ day: '2026-10-07' }).slice(0, 10)));
  });
});

describe('hard rules', () => {
  it('never breaks the diet, leave-outs or "not for us", even for picky answers', () => {
    const avoid = { options: ['nuts' as const], custom: ['chickpeas'] };
    const hidden = new Set(
      catalogue
        .filter((r) => r.diets.includes('vegan'))
        .slice(0, 3)
        .map((r) => r.id),
    );
    for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
      const list = picks({ slot, hidden, taste: { diet: 'vegan', avoid, cuisines: ['british'], weeknight: 'under-30' } });
      for (const r of list) {
        assert.ok(fitsDietPreference(r, 'vegan'), r.id);
        assert.equal(containsAvoided(r, avoid, index), false, r.id);
        assert.ok(!hidden.has(r.id), r.id);
        assert.ok(r.mealTypes.includes(slot), r.id);
      }
    }
  });

  it('offers nothing, rather than breaking a rule, when nothing fits', () => {
    const avoid = {
      options: ['nuts' as const, 'soy' as const, 'gluten' as const, 'sesame' as const],
      custom: ['chickpeas', 'lentils', 'beans', 'tofu', 'oats', 'bread', 'eggs'],
    };
    for (const r of picks({ slot: 'breakfast', taste: { ...NO_TASTE, diet: 'vegan', avoid } }))
      assert.equal(containsAvoided(r, avoid, index), false, r.id);
  });
});
