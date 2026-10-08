// The shopping list over time and between phones (audit 8 October: BUG-01,
// BUG-03, BUG-06, BUG-09, BUG-19). Each case failed before the fix.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { coverFor, DEFAULT_SHELF } from '../cupboard/cookable';
import type { UnitSystem } from '../ingredients/format';
import { entriesInWeek, isPast, listWeek, type PlanEntry } from '../plan/week';
import type { Recipe } from '../recipes/types';
import { index, kitchen, makeRecipe } from '../testing/fixtures';
import { listKey } from './amounts';
import { addExtras, countToBuy, deriveShoppingList, EMPTY_EDITS, toggleChecked, type ShoppingList, type WeekListEdits } from './derive';
import { recipeListRows } from './fromRecipe';

const recipes = new Map<string, Recipe>();
const add = (r: Recipe) => recipes.set(r.id, r);
add(makeRecipe('mon', ['2 brown onions', '500 g beef mince']));
add(makeRecipe('wed', ['1 brown onion', '400 g chickpeas']));
const entries: PlanEntry[] = [
  { id: 'e1', recipeId: 'mon', day: '2026-10-05', slot: 'dinner', servings: 4 },
  { id: 'e2', recipeId: 'wed', day: '2026-10-07', slot: 'dinner', servings: 4 },
];

function weekList(
  today: string,
  edits: WeekListEdits,
  units: UnitSystem = 'metric',
  cupboard: string[] = [],
  plan = entries,
): ShoppingList {
  const upcoming = entriesInWeek(plan, '2026-10-05').filter((e) => !isPast(e.day, today));
  const have = new Set(cupboard);
  const cover = (id: string) => coverFor(id, have, DEFAULT_SHELF, kitchen);
  return deriveShoppingList({ entries: upcoming, getRecipe: (id) => recipes.get(id), index, cupboard: have, edits, units, cover });
}
const items = (l: ShoppingList) => l.sections.flatMap((s) => s.items);
const tickAll = (l: ShoppingList) => items(l).reduce((e, i) => toggleChecked(e, i), EMPTY_EDITS);

describe('ticks hold until more is needed (BUG-01)', () => {
  const ticked = tickAll(weekList('2026-10-05', EMPTY_EDITS));
  const cupboard = ['brown-onion', 'beef-mince', 'chickpeas'];

  it('holds when a planned day passes and the amount goes down', () => {
    const tue = weekList('2026-10-06', ticked, 'metric', cupboard);
    assert.equal(countToBuy(tue), 0);
    assert.ok(items(tue).every((i) => i.checked));
  });
  it('holds when the units switch', () => {
    assert.equal(countToBuy(weekList('2026-10-05', ticked, 'imperial', cupboard)), 0);
  });
  it('holds on a household phone set to other units', () => {
    const imperialTicks = tickAll(weekList('2026-10-05', EMPTY_EDITS, 'imperial'));
    assert.equal(countToBuy(weekList('2026-10-05', imperialTicks, 'metric', cupboard)), 0);
  });
  it('lapses when more is needed, and the line shows to buy', () => {
    const more = [...entries, { id: 'e3', recipeId: 'wed', day: '2026-10-08', slot: 'dinner', servings: 4 } as PlanEntry];
    const l = weekList('2026-10-05', ticked, 'metric', cupboard, more);
    assert.equal(items(l).find((i) => i.key === 'brown-onion')?.checked, false);
    assert.equal(items(l).find((i) => i.key === 'beef-mince')?.checked, true);
  });
  it('keeps a tick made before the change while its amount text matches', () => {
    const old: WeekListEdits = { ...EMPTY_EDITS, checked: { 'beef-mince': '500 g' } };
    assert.equal(items(weekList('2026-10-05', old)).find((i) => i.key === 'beef-mince')?.checked, true);
  });
});

describe('list keys fit the server (BUG-03)', () => {
  it('shortens a very long line the database does not know, and keeps it unique', () => {
    const long =
      'grandmas special homemade quandong and wattleseed damper that she always brings round on the first weekend of every month wrapped in a tea towel';
    const a = listKey({ item: long });
    const b = listKey({ item: `${long} again` });
    assert.ok(a.length <= 120);
    assert.ok(`2026-10-05|${a}`.length <= 200);
    assert.notEqual(a, b);
    assert.equal(listKey({ item: 'dishwashing liquid' }), 'text:dishwashing liquid');
  });
});

describe('the list agrees with "What I have" (BUG-06)', () => {
  it('puts stand-ins and shelf items under "In your cupboard", naming the stand-in', () => {
    add(makeRecipe('ready', ['1 white onion', '2 tsp ground cumin', '400 g chickpeas']));
    const plan: PlanEntry[] = [{ id: 'r1', recipeId: 'ready', day: '2026-10-08', slot: 'dinner', servings: 4 }];
    const l = weekList('2026-10-05', EMPTY_EDITS, 'metric', ['brown-onion', 'chickpeas'], plan);
    assert.equal(countToBuy(l), 0);
    const onion = l.inCupboard.find((i) => i.key === 'white-onion');
    assert.equal(onion?.coveredBy, 'brown-onion');
    assert.equal(l.inCupboard.find((i) => i.key === 'ground-cumin')?.coveredBy, 'shelf');
  });
});

describe('a recipe added to the list, then planned, counts once (BUG-09)', () => {
  it('drops the added lines while the same recipe is planned that week', () => {
    const rows = recipeListRows({
      recipe: recipes.get('mon') as Recipe,
      servings: 4,
      index,
      has: () => false,
      onList: new Set(),
      units: 'metric',
    });
    let n = 0;
    const edits = addExtras(
      EMPTY_EDITS,
      rows.map((r) => r.addition),
      () => `x${n++}`,
      1,
    ).edits;
    const plannedMon = [entries[0] as PlanEntry];
    const l = weekList('2026-10-05', edits, 'metric', [], plannedMon);
    assert.equal(items(l).find((i) => i.key === 'beef-mince')?.amount, '500 g');
    assert.equal(items(l).find((i) => i.key === 'brown-onion')?.amount, '2');
  });
});

describe('zest and juice of the same fruit (BUG-19)', () => {
  it('buys one lemon for "1 tbsp lemon zest" and "juice of 1 lemon"', () => {
    add(makeRecipe('cod', ['1 tbsp lemon zest', 'Juice of 1 lemon', '2 cod fillets']));
    const plan: PlanEntry[] = [{ id: 'c1', recipeId: 'cod', day: '2026-10-08', slot: 'dinner', servings: 4 }];
    const lemon = items(weekList('2026-10-05', EMPTY_EDITS, 'metric', [], plan)).find((i) => i.key === 'lemon');
    assert.equal(lemon?.amount, '1');
  });
  it('still adds a fruit when the zest needs more than the juice gives', () => {
    add(makeRecipe('cake', ['3 tbsp lemon zest', 'Juice of 1 lemon']));
    const plan: PlanEntry[] = [{ id: 'k1', recipeId: 'cake', day: '2026-10-08', slot: 'dinner', servings: 4 }];
    assert.equal(items(weekList('2026-10-05', EMPTY_EDITS, 'metric', [], plan)).find((i) => i.key === 'lemon')?.amount, '3');
  });
});

describe('the week the List tab shows (BUG-08)', () => {
  it('is next week on a Sunday once next week has anything, otherwise this week', () => {
    assert.equal(listWeek('2026-10-11', true), '2026-10-12');
    assert.equal(listWeek('2026-10-11', false), '2026-10-05');
    assert.equal(listWeek('2026-10-08', true), '2026-10-05');
  });
});
