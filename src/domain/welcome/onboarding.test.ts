import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { INTENTS, nextStep, previousStep, QUESTION_STEPS, skillLift, stepProgress, toggleIntent, type WelcomeStep } from './onboarding';

const fresh = { reminderOn: false };

describe('the welcome’s order', () => {
  it('walks hello → intent → eat → cuisines → time → cupboard → reveal → notify → done', () => {
    const seen: WelcomeStep[] = [];
    let at: WelcomeStep | 'done' = 'hello';
    while (at !== 'done') {
      seen.push(at);
      at = nextStep(at, fresh);
    }
    assert.deepEqual(seen, ['hello', ...QUESTION_STEPS]);
  });

  it('leaves out the notification primer when the Sunday reminder is already on', () => {
    assert.equal(nextStep('reveal', { reminderOn: true }), 'done');
    assert.equal(stepProgress('reveal', { reminderOn: true }), 1);
  });

  it('goes back one question at a time, but not from hello or the primer', () => {
    assert.equal(previousStep('intent'), 'hello');
    assert.equal(previousStep('cupboard'), 'time');
    assert.equal(previousStep('reveal'), 'cupboard');
    assert.equal(previousStep('hello'), undefined);
    assert.equal(previousStep('notify'), undefined);
  });

  it('fills the bar evenly and ends full', () => {
    assert.equal(stepProgress('hello', fresh), 0);
    assert.equal(stepProgress('intent', fresh), 1 / 7);
    assert.equal(stepProgress('notify', fresh), 1);
  });
});

describe('intents', () => {
  it('toggle on and off and keep a fixed order', () => {
    let picked = toggleIntent([], 'household');
    picked = toggleIntent(picked, 'tonight');
    assert.deepEqual(picked, ['tonight', 'household']);
    assert.deepEqual(toggleIntent(picked, 'tonight'), ['household']);
    assert.equal(INTENTS.length, 5);
  });
});

describe('skill', () => {
  it('only ever lifts, and a beginner’s easy dish most', () => {
    assert.equal(skillLift('easy', 'starting'), 2);
    assert.equal(skillLift('hard', 'starting'), 0);
    assert.equal(skillLift('medium', 'comfortable'), 1);
    assert.equal(skillLift('hard', 'confident'), 1);
    assert.equal(skillLift('easy', 'confident'), 0);
    assert.equal(skillLift('easy', undefined), 0);
  });
});
