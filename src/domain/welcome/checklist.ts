// The first-run checklist on Home (v1's FirstRunChecklist), rebuilt so each
// step is worked out from what the cook has actually done, never a flag that
// can drift: a step is done because the cupboard has something in it, not
// because a button was tapped once.
//
// The steps answer the welcome's "What brings you here?": the ones picked
// come first, and "Share your kitchen" only shows for someone who asked for it.

import type { Intent } from './onboarding';

export type ChecklistStepId = 'cupboard' | 'plan' | 'save' | 'cook' | 'household';

/** What the cook has done so far, counted from the stores. */
export type ChecklistFacts = {
  cupboard: number;
  planned: number;
  saved: number;
  cooked: number;
  inHousehold: boolean;
};

export type ChecklistStep = { id: ChecklistStepId; done: boolean };

const BASE: readonly ChecklistStepId[] = ['cupboard', 'plan', 'save', 'cook'];

const FOR_INTENT: Readonly<Record<Intent, ChecklistStepId>> = {
  pantry: 'cupboard',
  plan: 'plan',
  discover: 'save',
  tonight: 'cook',
  household: 'household',
};

function isDone(id: ChecklistStepId, f: ChecklistFacts): boolean {
  if (id === 'cupboard') return f.cupboard > 0;
  if (id === 'plan') return f.planned > 0;
  if (id === 'save') return f.saved > 0;
  if (id === 'cook') return f.cooked > 0;
  return f.inHousehold;
}

export function checklistSteps(intents: readonly Intent[], facts: ChecklistFacts): ChecklistStep[] {
  const first = intents.map((i) => FOR_INTENT[i]);
  const order = [...new Set([...first, ...BASE])];
  return order.map((id) => ({ id, done: isDone(id, facts) }));
}

export function checklistProgress(list: readonly ChecklistStep[]): { done: number; total: number; complete: boolean } {
  const done = list.filter((s) => s.done).length;
  return { done, total: list.length, complete: list.length > 0 && done === list.length };
}
