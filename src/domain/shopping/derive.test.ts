import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PlanEntry } from '../plan/week';
import type { Recipe } from '../recipes/types';
import { index, makeRecipe } from '../testing/fixtures';
import {
  deriveShoppingList,
  EMPTY_EDITS,
  formatListForSharing,
  mergeAmounts,
  removeItem,
  toggleChecked,
  type WeekListEdits,
} from './derive';
import { parseIngredientLine } from '../ingredients/parse';

const bolognese = makeRecipe('bolognese', ['1 brown onion, diced', '500g beef mince', '2 tbsp olive oil', '1 tsp salt']);
const curry = makeRecipe('curry', ['2 brown onions, sliced', '1 tbsp ground cumin', '1 tsp ground cumin', '400ml coconut milk']);
const soup = makeRecipe('soup', ['200g brown onion', '1L vegetable stock'], { servings: 2 });
const recipes = new Map<string, Recipe>([bolognese, curry, soup].map((r) => [r.id, r]));

let n = 0;
const entry = (recipeId: string, servings = 4, day = '2026-10-05'): PlanEntry => ({
  id: `e${++n}`,
  recipeId,
  day,
  slot: 'dinner',
  servings,
});

function list(entries: PlanEntry[], opts: { edits?: WeekListEdits; cupboard?: string[] } = {}) {
  return deriveShoppingList({
    entries,
    getRecipe: (id) => recipes.get(id),
    index,
    cupboard: new Set(opts.cupboard ?? []),
    edits: opts.edits ?? EMPTY_EDITS,
    units: 'metric',
  });
}
const find = (l: ReturnType<typeof list>, name: string) => l.sections.flatMap((s) => s.items).find((i) => i.name === name);

describe('mergeAmounts', () => {
  const parse = (s: string) => parseIngredientLine(s, index.match).line;
  it('adds amounts in convertible units', () => {
    assert.deepEqual(mergeAmounts([parse('500g beef mince'), parse('1kg beef mince')]), [{ quantity: 1500, unit: 'g' }]);
  });
  it('keeps spoons in the largest spoon used', () => {
    assert.deepEqual(mergeAmounts([parse('1 tbsp cumin'), parse('1 tsp cumin')]), [{ quantity: 1.25, unit: 'tbsp' }]);
  });
  it('keeps unrelated units side by side: "1 onion" + "200g onion"', () => {
    assert.equal(mergeAmounts([parse('1 onion'), parse('200g onion')]).length, 2);
  });
});

describe('deriveShoppingList', () => {
  it('merges the same ingredient from two recipes into one line with the right total', () => {
    const l = list([entry('bolognese'), entry('curry')]);
    assert.equal(find(l, 'brown onion')?.amount, '3');
    assert.equal(find(l, 'ground cumin')?.amount, '1¼ tbsp');
  });
  it('shows counts and weights of the same thing on one line', () => {
    const l = list([entry('bolognese'), entry('soup', 2)]);
    assert.equal(find(l, 'brown onion')?.amount, '1 + 200 g');
  });
  it('scales to each plan entry’s servings', () => {
    assert.equal(find(list([entry('bolognese', 8)]), 'beef mince')?.amount, '1 kg');
    assert.equal(find(list([entry('bolognese', 2)]), 'beef mince')?.amount, '250 g');
  });
  it('counts the same recipe planned twice', () => {
    assert.equal(find(list([entry('bolognese'), entry('bolognese')]), 'beef mince')?.amount, '1 kg');
  });
  it('puts staples and cupboard items in their own section instead of dropping them', () => {
    const l = list([entry('curry')], { cupboard: [find(list([entry('curry')]), 'coconut milk')?.key ?? ''] });
    assert.equal(find(l, 'coconut milk'), undefined);
    assert.ok(l.inCupboard.some((i) => i.name === 'coconut milk'));
    const withStaples = list([entry('bolognese')]);
    assert.ok(withStaples.inCupboard.some((i) => i.key === 'salt'));
    assert.ok(withStaples.inCupboard.some((i) => i.key === 'olive-oil'));
  });
  it('does not repeat a unit the name already says: "2 bay leaves", not "2 leaves bay leaf"', () => {
    recipes.set('stew', makeRecipe('stew', ['2 bay leaves']));
    const bay = list([entry('stew')])
      .sections.flatMap((s) => s.items)
      .find((i) => i.key === 'bay-leaf');
    assert.equal(bay?.amount, '2');
  });
  it('ignores entries whose recipe no longer exists', () => {
    assert.equal(list([entry('deleted-recipe')]).sections.length, 0);
  });
  it('groups by aisle in supermarket order', () => {
    const l = list([entry('bolognese'), entry('curry')]);
    const aisles = l.sections.map((s) => s.aisle);
    assert.ok(aisles.indexOf('fruit-veg') < aisles.indexOf('meat'));
  });
});

describe('list edits', () => {
  it('a tick survives until more of that item is needed', () => {
    const e1 = entry('bolognese');
    const first = list([e1]);
    const onion = find(first, 'brown onion');
    assert.ok(onion);
    const edits = toggleChecked(EMPTY_EDITS, onion);
    assert.equal(find(list([e1], { edits }), 'brown onion')?.checked, true);
    assert.equal(find(list([e1, entry('curry')], { edits }), 'brown onion')?.checked, false);
  });
  it('a removal applies only to the plan it was made on', () => {
    const e1 = entry('bolognese');
    const onion = find(list([e1]), 'brown onion');
    assert.ok(onion);
    const edits = removeItem(EMPTY_EDITS, onion);
    const after = list([e1], { edits });
    assert.equal(find(after, 'brown onion'), undefined);
    assert.equal(after.removedCount, 1);
    // Plan another onion recipe: the removal no longer fits, so the line comes back.
    assert.ok(find(list([e1, entry('curry')], { edits }), 'brown onion'));
  });
  it('shares unticked items as plain text grouped by aisle', () => {
    const l = list([entry('bolognese')], { edits: { ...EMPTY_EDITS, extras: [{ id: 'x', text: 'Dishwashing liquid', addedAt: 0 }] } });
    const text = formatListForSharing(l, (a) => a.toUpperCase(), 'Shopping list');
    assert.match(text, /^Shopping list/);
    assert.match(text, /- beef mince, 500 g/);
    assert.match(text, /Also\n- Dishwashing liquid/);
    assert.doesNotMatch(text, /salt/);
  });
});
