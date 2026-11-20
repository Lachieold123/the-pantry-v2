import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checklistProgress, checklistSteps, type ChecklistFacts } from './checklist';

const nothing: ChecklistFacts = { cupboard: 0, planned: 0, saved: 0, cooked: 0, inHousehold: false };
const ids = (list: { id: string }[]) => list.map((s) => s.id);

describe('the first-run checklist', () => {
  it('has four steps, none done, for a brand-new cook', () => {
    const list = checklistSteps([], nothing);
    assert.deepEqual(ids(list), ['cupboard', 'plan', 'save', 'cook']);
    assert.deepEqual(checklistProgress(list), { done: 0, total: 4, complete: false });
  });

  it('puts what the cook came for first', () => {
    assert.deepEqual(ids(checklistSteps(['plan', 'tonight'], nothing)), ['plan', 'cook', 'cupboard', 'save']);
  });

  it('only offers sharing the kitchen to someone who asked for it', () => {
    assert.ok(!checklistSteps(['pantry'], nothing).some((s) => s.id === 'household'));
    assert.equal(checklistSteps(['household'], nothing)[0]?.id, 'household');
  });

  it('works each step out from what has actually happened', () => {
    const list = checklistSteps(['household'], { cupboard: 3, planned: 1, saved: 0, cooked: 2, inHousehold: true });
    assert.deepEqual(ids(list.filter((s) => s.done)), ['household', 'cupboard', 'plan', 'cook']);
    assert.deepEqual(checklistProgress(list), { done: 4, total: 5, complete: false });
    // What's left leads the row.
    assert.equal(list[0]?.id, 'save');
  });

  it('is complete when every step is done', () => {
    const all = { cupboard: 1, planned: 1, saved: 1, cooked: 1, inHousehold: false };
    assert.equal(checklistProgress(checklistSteps([], all)).complete, true);
    assert.equal(checklistProgress([]).complete, false);
  });
});
