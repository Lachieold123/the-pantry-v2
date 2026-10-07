import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { quickAdds } from '../cupboard/cookable';
import { totalMinutes, type Recipe } from '../recipes/types';
import { catalogue, index, kitchen, makeRecipe } from '../testing/fixtures';
import { at, cupboardOf, DAY, falseReason, NO_TASTE, rankInput, TUESDAY_6PM } from '../testing/home';
import { HERO_COUNT } from './home';
import { explainScore, rankHome } from './rank';
import { NO_HISTORY } from './signals';

const ids = (list: readonly Recipe[]) => list.map((r) => r.id);
const top = (n: number, list: readonly Recipe[]) => list.slice(0, n);
const byId = new Map(catalogue.map((r) => [r.id, r]));
const recipe = (id: string) => byId.get(id) as Recipe;
const cookedAgo = (recipeId: string, days: number) => ({ recipeId, cookedAt: TUESDAY_6PM.nowMs - days * DAY });
const BIG_CUPBOARD = quickAdds(catalogue, new Set(), index, kitchen, 40);

describe('cold start: a new cook, Tuesday 6pm', () => {
  const first = top(HERO_COUNT, rankHome(rankInput()).picks);

  it('fills the cards with photographed, reviewed dinners', () => {
    assert.equal(first.length, HERO_COUNT);
    for (const r of first) {
      assert.ok(r.mealTypes.includes('dinner'), r.id);
      assert.ok(r.image, r.id);
      assert.notEqual(r.provenance, 'ai-draft', r.id);
    }
  });

  it('keeps them weeknight-friendly', () => {
    assert.ok(first.filter((r) => totalMinutes(r) <= 45).length >= 4, ids(first).join());
  });

  it('is varied: no cuisine twice in a row, and at least four cuisines', () => {
    for (let i = 1; i < first.length; i++) assert.notEqual(first[i]?.cuisine, first[i - 1]?.cuisine, ids(first).join());
    assert.ok(new Set(first.map((r) => r.cuisine)).size >= 4);
  });

  it('stays varied every day for a month', () => {
    for (let d = 1; d <= 30; d++) {
      const moment = at(`2026-11-${String(d).padStart(2, '0')}`, 18);
      const cards = top(HERO_COUNT, rankHome(rankInput({ moment })).picks);
      for (let i = 1; i < cards.length; i++)
        assert.notEqual(cards[i]?.cuisine, cards[i - 1]?.cuisine, `${moment.today}: ${ids(cards).join()}`);
    }
  });
});

describe('stability', () => {
  it('gives the same order all evening, and a new one tomorrow', () => {
    const six = ids(top(10, rankHome(rankInput()).picks));
    assert.deepEqual(six, ids(top(10, rankHome(rankInput({ moment: at('2026-10-06', 20, 45) })).picks)));
    assert.notDeepEqual(six, ids(top(10, rankHome(rankInput({ moment: at('2026-10-07', 18) })).picks)));
  });

  it('moves on at midnight, not before', () => {
    const before = ids(top(10, rankHome(rankInput({ moment: at('2026-10-06', 23, 59) })).picks));
    const same = ids(top(10, rankHome(rankInput({ moment: at('2026-10-06', 22) })).picks));
    const after = ids(top(10, rankHome(rankInput({ moment: at('2026-10-07', 0, 1) })).picks));
    assert.deepEqual(before, same);
    assert.notDeepEqual(before, after);
  });
});

describe('fit to now', () => {
  it('leads with breakfast in the morning, without dropping dinner', () => {
    const cards = top(HERO_COUNT, rankHome(rankInput({ moment: at('2026-10-06', 7, 30) })).picks);
    assert.ok(cards[0]?.mealTypes.includes('breakfast'), ids(cards).join());
    assert.ok(cards.filter((r) => r.mealTypes.includes('breakfast')).length >= 2);
  });

  it('shows no breakfast-only dish near the top at dinner time', () => {
    const shown = top(29, rankHome(rankInput()).picks);
    assert.ok(shown.every((r) => !(r.mealTypes.length === 1 && r.mealTypes[0] === 'breakfast')));
  });

  it('keeps a weeknight inside the cook’s time, and allows longer at the weekend', () => {
    const taste = { ...NO_TASTE, weeknight: 'under-30' as const };
    const longOnes = (date: string) =>
      top(10, rankHome(rankInput({ taste, moment: at(date, 18) })).picks).filter((r) => totalMinutes(r) > 30).length;
    for (const date of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']) {
      const cards = top(HERO_COUNT, rankHome(rankInput({ taste, moment: at(date, 18) })).picks);
      assert.ok(
        cards.every((r) => totalMinutes(r) <= 30),
        `${date}: ${ids(cards).join()}`,
      );
    }
    const weeknights = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'].map(longOnes).reduce((a, b) => a + b);
    const weekends = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-17'].map(longOnes).reduce((a, b) => a + b);
    assert.ok(weekends > weeknights, `weekend ${weekends} vs weeknight ${weeknights}`);
  });

  it('lifts dishes in season and lowers the opposite season', () => {
    const winter = makeRecipe('stew', ['1 onion'], { seasons: ['winter'] });
    assert.equal(explainScore(winter, rankInput({ moment: at('2026-07-14', 18) }), 'all').season, 1.5);
    assert.equal(explainScore(winter, rankInput({ moment: at('2027-01-12', 18) }), 'all').season, -1.5);
  });
});

describe('taste', () => {
  it('favours the cuisines the cook chose, and says so', () => {
    const r = rankHome(rankInput({ taste: { ...NO_TASTE, cuisines: ['thai'] } }));
    const cards = top(HERO_COUNT, r.picks);
    assert.equal(cards[0]?.cuisine, 'thai');
    assert.ok(cards.filter((x) => x.cuisine === 'thai').length >= 2, 'more than once, split up by others');
    assert.equal(r.reasons.get(cards[0]?.id ?? '')?.text, 'Because you like Thai');
  });

  it('brings up a Cookmark not yet cooked', () => {
    const plain = rankHome(rankInput()).picks;
    const saved = plain[40] as Recipe;
    const r = rankHome(rankInput({ history: { ...NO_HISTORY, bookmarks: [{ recipeId: saved.id, savedAt: 0 }] } }));
    assert.ok(ids(top(10, r.picks)).includes(saved.id));
    assert.equal(r.reasons.get(saved.id)?.text, 'Saved, not cooked yet');
  });

  it('brings back a regular, but not the night after', () => {
    const fav = rankHome(rankInput()).picks[30] as Recipe;
    const regular = rankHome(rankInput({ history: { ...NO_HISTORY, cookLog: [cookedAgo(fav.id, 60), cookedAgo(fav.id, 30)] } }));
    assert.ok(regular.picks.indexOf(fav) < 30);
    assert.equal(regular.reasons.get(fav.id)?.text, 'A regular · cooked 2 times');
    const justHad = rankHome(rankInput({ history: { ...NO_HISTORY, cookLog: [cookedAgo(fav.id, 30), cookedAgo(fav.id, 1)] } }));
    assert.ok(!ids(top(29, justHad.picks)).includes(fav.id));
  });

  it('learns a cuisine from what they cook', () => {
    const japanese = catalogue.filter((r) => r.cuisine === 'japanese' && r.mealTypes.includes('dinner')).slice(0, 4);
    const cookLog = japanese.map((r, i) => cookedAgo(r.id, 30 + i));
    const r = rankHome(rankInput({ history: { ...NO_HISTORY, cookLog } }));
    const cards = top(HERO_COUNT, r.picks);
    assert.ok(
      cards.some((x) => x.cuisine === 'japanese'),
      ids(cards).join(),
    );
    const fresh = cards.find((x) => x.cuisine === 'japanese' && !japanese.includes(x));
    if (fresh) assert.equal(r.reasons.get(fresh.id)?.text, 'You often cook Japanese');
  });

  it('notices what was opened lately', () => {
    const looked = rankHome(rankInput()).picks[20] as Recipe;
    const r = rankHome(rankInput({ history: { ...NO_HISTORY, recentlyViewed: [looked.id] } }));
    assert.equal(r.reasons.get(looked.id)?.kind, 'viewed');
    assert.ok(r.picks.indexOf(looked) < 20);
  });
});

describe('freshness', () => {
  it('keeps what was cooked in the last ten days off the screen', () => {
    const shown = top(29, rankHome(rankInput()).picks);
    const cookLog = shown.slice(0, 10).map((r, i) => cookedAgo(r.id, i));
    const next = top(29, rankHome(rankInput({ history: { ...NO_HISTORY, cookLog } })).picks);
    for (const e of cookLog) assert.ok(!ids(next).includes(e.recipeId), e.recipeId);
  });

  it('moves this week’s planned dishes off the cards', () => {
    const cards = top(HERO_COUNT, rankHome(rankInput()).picks);
    const plannedThisWeek = new Set(ids(cards));
    const next = top(HERO_COUNT, rankHome(rankInput({ history: { ...NO_HISTORY, plannedThisWeek } })).picks);
    assert.ok(next.every((r) => !plannedThisWeek.has(r.id)));
  });

  it('still fills the screen for a cook who has made everything', () => {
    const cookLog = catalogue.map((r, i) => cookedAgo(r.id, i % 60));
    const r = rankHome(rankInput({ history: { ...NO_HISTORY, cookLog } }));
    const cards = top(HERO_COUNT, r.picks);
    assert.equal(cards.length, HERO_COUNT);
    for (const c of cards) assert.ok(catalogue.indexOf(c) % 60 > 10, `${c.id} was cooked in the last ten days`);
  });
});

describe('what you have', () => {
  const cupboard = cupboardOf(BIG_CUPBOARD);

  it('ranks only ready dishes as ready, and the nearly shelf fewest-missing first', () => {
    const r = rankHome(rankInput({ cupboard }));
    const tier = new Map(cupboard.map((m) => [m.recipe.id, m]));
    assert.ok(r.ready.length > 5);
    assert.ok(r.ready.every((x) => tier.get(x.id)?.tier === 'ready'));
    const missing = r.nearly.map((x) => tier.get(x.id)?.result.missing.length ?? 0);
    assert.deepEqual(
      missing,
      [...missing].sort((a, b) => a - b),
    );
    assert.ok(r.nearly.every((x) => tier.get(x.id)?.tier === 'nearly'));
  });

  it('lifts cupboard dishes in Everything without letting them take over', () => {
    const r = rankHome(rankInput({ cupboard }));
    const readyIds = new Set(cupboard.filter((m) => m.tier === 'ready').map((m) => m.recipe.id));
    const cards = top(HERO_COUNT, r.picks);
    assert.ok(cards.filter((x) => readyIds.has(x.id)).length < HERO_COUNT);
  });

  it('applies diet and leave-outs to the cupboard lists too', () => {
    const r = rankHome(rankInput({ cupboard, taste: { ...NO_TASTE, diet: 'vegetarian' } }));
    for (const x of [...r.ready, ...r.nearly]) assert.ok(x.diets.includes('vegetarian') || x.diets.includes('vegan'), x.id);
  });
});

describe('edges', () => {
  it('returns nothing from nothing', () => {
    const r = rankHome(rankInput({ recipes: [] }));
    assert.deepEqual([r.picks, r.ready, r.nearly], [[], [], []]);
  });

  it('returns nothing when the filters leave nothing', () => {
    const r = rankHome(rankInput({ filters: { cuisine: 'scandinavian', difficulty: 'hard' } }));
    assert.equal(r.picks.length, 0);
  });

  it('shows the whole of a tiny pool, rather than nothing', () => {
    const taste = { ...NO_TASTE, diet: 'vegan' as const, avoid: { options: ['nuts' as const, 'soy' as const], custom: ['chickpeas'] } };
    const r = rankHome(rankInput({ taste }));
    assert.ok(r.picks.length > 0 && r.picks.length < 10, String(r.picks.length));
  });

  it('copes with recipes missing their time, meal, photo and provenance', () => {
    const bare = [
      makeRecipe('no-time', ['1 egg'], { prepMinutes: 0, cookMinutes: 0 }),
      makeRecipe('no-meal', ['1 egg'], { mealTypes: [] }),
      makeRecipe('own', ['1 egg'], { source: 'user' }),
    ];
    const r = rankHome(rankInput({ recipes: bare }));
    assert.equal(r.picks.length, 3);
    assert.equal(r.reasons.get('no-time')?.kind === 'quick', false);
    assert.ok(Number.isFinite(explainScore(bare[0] as Recipe, rankInput({ recipes: bare }), 'all').quality ?? 0));
  });

  it('a Meal filter picks the meal, whatever the clock says', () => {
    const r = rankHome(rankInput({ filters: { meal: 'breakfast' } }));
    assert.ok(r.picks.length > 0);
    assert.ok(r.picks.every((x) => x.mealTypes.includes('breakfast')));
  });

  it('every reason it gives on the first screen is true', () => {
    const input = rankInput({
      cupboard: cupboardOf(BIG_CUPBOARD),
      taste: { ...NO_TASTE, cuisines: ['italian'], weeknight: 'under-45' },
      history: { ...NO_HISTORY, bookmarks: [{ recipeId: recipe('arancini').id, savedAt: 0 }], recentlyViewed: ['arepas'] },
    });
    const r = rankHome(input);
    for (const x of top(29, r.picks)) {
      const why = r.reasons.get(x.id);
      if (why) assert.equal(falseReason(x, why, input), undefined);
    }
  });
});
