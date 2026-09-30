import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CupboardItem } from '../cupboard/match';
import { formatQuantity } from '../ingredients/format';
import { parseIngredientLine } from '../ingredients/parse';
import type { UnitSystem } from '../ingredients/format';
import { weekStart, type PlanEntry } from '../plan/week';
import type { Recipe } from '../recipes/types';
import { index, makeRecipe } from '../testing/fixtures';
import {
  addExtras,
  carriedExtras,
  deleteExtra,
  deriveShoppingList,
  EMPTY_EDITS,
  formatListForSharing,
  mergeAmounts,
  removeItem,
  toggleChecked,
  toggleExtra,
  untickLeavesCupboard,
  type ShoppingList,
  type WeekListEdits,
} from './derive';
import { migrateListEdits } from './edits';

const recipes = new Map<string, Recipe>(
  [
    makeRecipe('bolognese', ['1 brown onion, diced', '500g beef mince', '2 tbsp olive oil']),
    makeRecipe('curry', ['2 brown onions, sliced', '400ml coconut milk', '2 eggs', '1 tbsp chopped coriander (optional)']),
    makeRecipe('citrus', ['zest of 1 lemon', 'juice of 1 lemon', '1 lime']),
    makeRecipe('foreign', ['2 豆腐', '1 味噌', '1 🍋']),
  ].map((r) => [r.id, r]),
);

// Monday 5 to Sunday 11 October 2026.
const MON = '2026-10-05';
const TUE = '2026-10-06';
const WED = '2026-10-07';
const entry = (id: string, recipeId: string, day: string, servings = 4): PlanEntry => ({ id, recipeId, day, slot: 'dinner', servings });

function derive(entries: PlanEntry[], edits: WeekListEdits, opts: { today?: string; cupboard?: string[]; units?: UnitSystem } = {}) {
  return deriveShoppingList({
    entries,
    ...(opts.today ? { shownFrom: opts.today } : {}),
    getRecipe: (id) => recipes.get(id),
    index,
    cupboard: new Set(opts.cupboard ?? []),
    edits,
    units: opts.units ?? 'metric',
  });
}
const items = (l: ShoppingList) => l.sections.flatMap((s) => s.items);
const byKey = (l: ShoppingList, key: string) => items(l).find((i) => i.key === key);
const tickAll = (l: ShoppingList, edits = EMPTY_EDITS) => items(l).reduce((e, i) => (i.checked ? e : toggleChecked(e, i)), edits);

describe('ticks and removals over the week (F11–F13, F19)', () => {
  const week = [entry('e1', 'bolognese', MON), entry('e2', 'curry', WED)];

  it('a day passing keeps what was ticked on Monday ticked, and hides only the eaten meal', () => {
    const edits = tickAll(derive(week, EMPTY_EDITS, { today: MON }));
    const tuesday = derive(week, edits, { today: TUE });
    assert.ok(items(tuesday).every((i) => i.checked));
    assert.equal(byKey(tuesday, 'brown-onion')?.amount, '2', 'only the curry still ahead');
    assert.equal(byKey(tuesday, 'beef-mince'), undefined, 'Monday’s mince is no longer shown');
  });

  it('a day passing keeps a removal', () => {
    const onion = byKey(derive(week, EMPTY_EDITS, { today: MON }), 'brown-onion');
    assert.ok(onion);
    const tuesday = derive(week, removeItem(EMPTY_EDITS, onion), { today: TUE });
    assert.equal(byKey(tuesday, 'brown-onion'), undefined);
    assert.equal(tuesday.removedCount, 1);
  });

  it('needing less keeps the tick; needing more drops it', () => {
    const edits = tickAll(derive(week, EMPTY_EDITS));
    const less = [week[0] as PlanEntry, entry('e2', 'curry', WED, 2)];
    assert.equal(byKey(derive(less, edits), 'brown-onion')?.checked, true);
    const more = [week[0] as PlanEntry, entry('e2', 'curry', WED, 8)];
    assert.equal(byKey(derive(more, edits), 'brown-onion')?.checked, false);
  });

  it('switching to imperial keeps every tick', () => {
    const edits = tickAll(derive(week, EMPTY_EDITS));
    const imperial = derive(week, edits, { units: 'imperial' });
    assert.ok(items(imperial).length > 3);
    assert.ok(items(imperial).every((i) => i.checked));
  });

  it('a meal planned again after its tick’s meals left the plan comes back to buy', () => {
    const edits = tickAll(derive([week[0] as PlanEntry], EMPTY_EDITS));
    assert.equal(byKey(derive([entry('e9', 'bolognese', WED)], edits), 'brown-onion')?.checked, false);
  });

  it('a removal holds while meals only leave, and lapses when one is added', () => {
    const onion = byKey(derive(week, EMPTY_EDITS), 'brown-onion');
    assert.ok(onion);
    const edits = removeItem(EMPTY_EDITS, onion);
    assert.equal(byKey(derive([week[0] as PlanEntry], edits), 'brown-onion'), undefined);
    assert.ok(byKey(derive([...week, entry('e3', 'bolognese', WED)], edits), 'brown-onion'));
  });
});

describe('unticking a mis-tap (F14)', () => {
  const week = [entry('e1', 'curry', MON)];
  const shop: CupboardItem = { ingredientId: 'coconut-milk', addedAt: 1, source: 'shop' };

  it('a ticked item in the cupboard stays ticked in its aisle', () => {
    const milk = byKey(derive(week, EMPTY_EDITS), 'coconut-milk');
    assert.ok(milk);
    const ticked = derive(week, toggleChecked(EMPTY_EDITS, milk), { cupboard: ['coconut-milk'] });
    assert.equal(byKey(ticked, 'coconut-milk')?.checked, true);
  });

  it('untick takes a shop item back out of the cupboard, so it stays to buy', () => {
    const milk = byKey(derive(week, EMPTY_EDITS), 'coconut-milk');
    assert.ok(milk);
    const ticked = toggleChecked(EMPTY_EDITS, milk);
    const untick = toggleChecked(ticked, { ...milk, checked: true });
    assert.equal(untickLeavesCupboard([shop], 'coconut-milk'), true);
    assert.equal(untickLeavesCupboard([{ ...shop, source: 'manual' }], 'coconut-milk'), false);
    const after = derive(week, untick);
    assert.equal(byKey(after, 'coconut-milk')?.checked, false);
    assert.equal(after.inCupboard.length, 0);
  });
});

describe('sharing the list (F130, F132)', () => {
  const week = [entry('e1', 'bolognese', MON), entry('e2', 'curry', WED)];
  const withExtras = toggleExtra(
    addExtras(
      EMPTY_EDITS,
      ['Bin bags', 'Foil'],
      (() => {
        let n = 0;
        return () => `x${n++}`;
      })(),
      1,
    ).edits,
    'x1',
  );

  it('leaves out ticked lines and ticked extras, marks optional lines, uses plurals', () => {
    const l = derive(week, withExtras);
    const mince = byKey(l, 'beef-mince');
    assert.ok(mince);
    const text = formatListForSharing(derive(week, toggleChecked(withExtras, mince)), (a) => a, 'Shopping list, this week (5 – 11 Oct)');
    assert.match(text, /^Shopping list, this week \(5 – 11 Oct\)/);
    assert.doesNotMatch(text, /mince/i);
    assert.match(text, /- Brown onions, 3/);
    assert.match(text, /- Eggs, 2/);
    assert.match(text, /- Coriander, 1 tbsp \(optional\)/);
    assert.match(text, /Also\n- Bin bags$/);
    assert.doesNotMatch(text, /Foil/);
  });

  it('is empty when everything is ticked, so a bare title is never sent', () => {
    const l = derive(week, toggleExtra(tickAll(derive(week, withExtras), withExtras), 'x0'));
    assert.equal(
      formatListForSharing(l, (a) => a, 'Shopping list'),
      '',
    );
  });

  it('names a single one in the singular', () => {
    assert.equal(byKey(derive([entry('e1', 'bolognese', MON)], EMPTY_EDITS), 'brown-onion')?.name, 'brown onion');
  });
});

describe('amounts (F20, F190, F196)', () => {
  const parse = (s: string) => parseIngredientLine(s, index.match).line;
  it('steps spoons up to a larger measure', () => {
    assert.deepEqual(mergeAmounts([parse('4 tsp cumin'), parse('4 tsp cumin')]), [{ quantity: 2, unit: 'tbsp' }]);
    assert.deepEqual(mergeAmounts([parse('3 tsp cumin'), parse('3 tsp cumin')]), [{ quantity: 1.5, unit: 'tbsp' }]);
    assert.deepEqual(mergeAmounts([parse('2 tsp cumin')]), [{ quantity: 2, unit: 'tsp' }]);
    const cups = mergeAmounts([parse('12 tbsp flour'), parse('12 tbsp flour')])[0];
    assert.equal(cups?.unit, 'cup');
  });
  it('agrees the unit with the number printed, and snaps pounds to quarters', () => {
    assert.equal(formatQuantity(1.02, 'cup', 'metric'), '1 cup');
    assert.equal(formatQuantity(1500, 'g', 'imperial'), '3¼ lb');
  });
  it('counts the zest and juice of one lemon as one lemon', () => {
    assert.equal(byKey(derive([entry('e1', 'citrus', MON)], EMPTY_EDITS), 'lemon')?.amount, '1');
    assert.equal(byKey(derive([entry('e1', 'citrus', MON), entry('e2', 'citrus', WED)], EMPTY_EDITS), 'lemon')?.amount, '2');
  });
  it('keeps items in other scripts or emoji on their own rows', () => {
    const other = derive([entry('e1', 'foreign', MON)], EMPTY_EDITS).sections.find((s) => s.aisle === 'other')?.items ?? [];
    assert.equal(other.length, 3);
  });
});

describe('extras', () => {
  const extra = (id: string, text: string) => ({ id, text, addedAt: 0 });
  const all: Record<string, WeekListEdits> = {
    '2026-09-21': { ...EMPTY_EDITS, extras: [extra('a', 'Bin bags'), extra('b', 'Foil')], checkedExtras: ['b'] },
    '2026-09-28': { ...EMPTY_EDITS, extras: [extra('c', 'Sponges')] },
  };
  it('unticked extras from an ended week come forward (F134)', () => {
    assert.deepEqual(
      carriedExtras(all, '2026-10-05', '2026-10-05').map((x) => x.extra.text),
      ['Bin bags', 'Sponges'],
    );
    // A week still under way keeps its own extras.
    assert.deepEqual(
      carriedExtras(all, '2026-10-05', '2026-09-28').map((x) => x.extra.text),
      ['Bin bags'],
    );
  });
  it('one ticked in a later week stops coming forward', () => {
    const ticked = { ...all, '2026-09-28': { ...(all['2026-09-28'] as WeekListEdits), checkedExtras: ['a'] } };
    assert.deepEqual(
      carriedExtras(ticked, '2026-10-05', '2026-10-05').map((x) => x.extra.text),
      ['Sponges'],
    );
  });
  it('deleting an extra drops its tick too (F19), and duplicates are skipped (F135)', () => {
    const edits = deleteExtra(all['2026-09-21'] as WeekListEdits, 'b');
    assert.deepEqual(edits.checkedExtras, []);
    assert.equal(addExtras(EMPTY_EDITS, ['bin BAGS'], () => 'z', 1, ['Bin bags']).added.length, 0);
  });
});

describe('migrating saved edits', () => {
  it('reads version 1 ticks (amount text) back as base amounts', () => {
    const week = [entry('e1', 'bolognese', MON)];
    const migrated = migrateListEdits(
      { [MON]: { checked: { 'brown-onion': '1', 'beef-mince': '1.1 lb', x: '2 florps' }, removed: {}, extras: [], checkedExtras: [] } },
      week,
      weekStart,
    );
    const l = derive(week, migrated[MON] ?? EMPTY_EDITS);
    assert.equal(byKey(l, 'brown-onion')?.checked, true);
    assert.equal(byKey(l, 'beef-mince')?.checked, true);
    assert.equal(migrated[MON]?.checked.x, undefined);
  });
  it('never throws on garbage', () => {
    assert.deepEqual(migrateListEdits('nope', [], weekStart), {});
    assert.deepEqual(migrateListEdits({ w: { checked: 3, extras: [null] } }, [{ id: 'e', day: 'bad' } as PlanEntry], weekStart), {
      w: EMPTY_EDITS,
    });
  });
});
