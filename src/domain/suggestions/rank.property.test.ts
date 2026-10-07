// Property tests: hundreds of random cooks (diets, leave-outs, hidden dishes,
// filters, cupboards, histories, any hour of any day) against the real
// catalogue. Whatever the inputs, the hard rules hold and every reason is true.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { quickAdds } from '../cupboard/cookable';
import { AVOID_OPTIONS, containsAvoided, fitsDietPreference, type AvoidOption, type DietPreference } from '../recipes/diets';
import { matchesFilters, type TimeFilter } from '../recipes/search';
import { CUISINES, DIFFICULTIES, MEAL_TYPES } from '../recipes/types';
import { catalogue, index, kitchen } from '../testing/fixtures';
import { at, cupboardOf, DAY, falseReason, rankInput } from '../testing/home';
import { asRecipeFilters, HERO_COUNT, homeFeed, type HomeFilters } from './home';
import { rankHome, type RankInput } from './rank';

/** A small seeded generator (mulberry32), so a failure can be replayed exactly. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIETS: DietPreference[] = ['everything', 'everything', 'vegetarian', 'vegan', 'pescatarian'];
const TIMES: TimeFilter[] = ['under-15', 'under-30', 'under-45', 'under-60', 'over-60'];
const STOCK = quickAdds(catalogue, new Set(), index, kitchen, 60);

function scenario(seed: number): RankInput {
  const rnd = seeded(seed);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)] as T;
  const some = <T>(list: readonly T[], p: number): T[] => list.filter(() => rnd() < p);
  const ids = catalogue.map((r) => r.id);
  const filters: HomeFilters = {
    ...(rnd() < 0.25 ? { meal: pick(MEAL_TYPES) } : {}),
    ...(rnd() < 0.25 ? { time: pick(TIMES) } : {}),
    ...(rnd() < 0.15 ? { cuisine: pick(CUISINES) } : {}),
    ...(rnd() < 0.15 ? { difficulty: pick(DIFFICULTIES) } : {}),
  };
  const month = 1 + Math.floor(rnd() * 12);
  const day = 1 + Math.floor(rnd() * 28);
  const moment = at(
    `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    Math.floor(rnd() * 24),
    Math.floor(rnd() * 60),
  );
  const cookLog = Array.from({ length: Math.floor(rnd() * 40) }, () => ({
    recipeId: pick(ids),
    cookedAt: moment.nowMs - Math.floor(rnd() * 400) * DAY,
  }));
  return rankInput({
    taste: {
      diet: pick(DIETS),
      avoid: {
        options: some(Object.keys(AVOID_OPTIONS) as AvoidOption[], 0.12),
        custom: rnd() < 0.2 ? [pick(['chickpeas', 'mushroom', 'coriander', 'olives'])] : [],
      },
      cuisines: some(CUISINES, 0.08),
      weeknight: rnd() < 0.5 ? pick(TIMES) : undefined,
    },
    hidden: new Set(some(ids, 0.05)),
    filters,
    history: {
      cookLog,
      bookmarks: some(ids, 0.04).map((recipeId) => ({ recipeId, savedAt: 0 })),
      recentlyViewed: some(ids, 0.04).slice(0, 20),
      plannedThisWeek: new Set(some(ids, 0.02)),
    },
    cupboard: rnd() < 0.7 ? cupboardOf(some(STOCK, rnd())) : [],
    moment,
  });
}

const RUNS = 150;

describe('ranking properties over the real catalogue', () => {
  it('never breaks a hard rule: diet, leave-outs, hidden, filters', () => {
    for (let s = 1; s <= RUNS; s++) {
      const input = scenario(s);
      const r = rankHome(input);
      const rf = asRecipeFilters(input.filters);
      for (const x of [...r.picks, ...r.ready, ...r.nearly]) {
        const where = `seed ${s}, ${x.id}`;
        assert.ok(fitsDietPreference(x, input.taste.diet), `${where}: diet`);
        assert.equal(containsAvoided(x, input.taste.avoid, index), false, `${where}: leave-out`);
        assert.ok(!input.hidden.has(x.id), `${where}: hidden`);
        assert.ok(matchesFilters(x, rf), `${where}: filters`);
      }
    }
  });

  it('only ever says true things, and short enough for one line', () => {
    let checked = 0;
    for (let s = 1; s <= RUNS; s++) {
      const input = scenario(s);
      const r = rankHome(input);
      for (const x of r.picks) {
        const why = r.reasons.get(x.id);
        if (!why) continue;
        checked++;
        assert.equal(falseReason(x, why, input), undefined, `seed ${s}`);
        assert.ok(why.text.length <= 34, `seed ${s}: "${why.text}" is too long for the card`);
      }
    }
    assert.ok(checked > 1000, `only ${checked} reasons checked`);
  });

  it('keeps every dish that passes the rules, once each, and puts cupboard dishes in the right lists', () => {
    for (let s = 1; s <= RUNS; s++) {
      const input = scenario(s);
      const r = rankHome(input);
      assert.equal(new Set(r.picks.map((x) => x.id)).size, r.picks.length, `seed ${s}: duplicate pick`);
      const tier = new Map(input.cupboard.map((m) => [m.recipe.id, m.tier]));
      const picked = new Set(r.picks.map((x) => x.id));
      for (const x of r.ready) assert.ok(tier.get(x.id) === 'ready' && picked.has(x.id), `seed ${s}: ${x.id}`);
      for (const x of r.nearly) assert.ok(tier.get(x.id) === 'nearly' && picked.has(x.id), `seed ${s}: ${x.id}`);
    }
  });

  it('is the same every time for the same cook at the same moment', () => {
    for (let s = 1; s <= 30; s++) {
      const a = rankHome(scenario(s));
      const b = rankHome(scenario(s));
      assert.deepEqual(
        a.picks.map((x) => x.id),
        b.picks.map((x) => x.id),
      );
    }
  });

  it('lays out a Home with no dish twice and at most five cards, in both modes', () => {
    for (let s = 1; s <= RUNS; s++) {
      const input = scenario(s);
      const r = rankHome(input);
      for (const mode of ['pantry', 'all'] as const) {
        const tonight = s % 3 === 0 ? r.picks[7] : undefined;
        const feed = homeFeed({
          mode,
          tonight,
          ready: r.ready,
          nearly: r.nearly,
          forYou: r.picks,
          filters: input.filters,
          gridCount: 24,
          why: r.reasons,
        });
        const shown = [...feed.heroes.map((h) => h.recipe.id), ...feed.grid.map((x) => x.id), ...feed.nearly.map((x) => x.id)];
        assert.equal(new Set(shown).size, shown.length, `seed ${s} ${mode}`);
        assert.ok(feed.heroes.length <= HERO_COUNT);
        if (mode === 'pantry')
          assert.ok(
            feed.heroes.every((h) => h.reason !== 'pick'),
            `seed ${s}: a pick in What I have`,
          );
      }
    }
  });
});
