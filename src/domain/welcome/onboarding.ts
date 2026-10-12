// The welcome's questions and their order (P7, v1's OnboardingModal), as pure
// data so the screen stays a thin switch and the rules are tested on their own.
//
// Order: hello (with the terms, once they're published) → what you came for →
// what you eat and avoid → cuisines → weeknight time and skill → what's in the
// cupboard (D-041's step, kept because it makes Home's first view useful) →
// "Tonight, for you" → the notification primer. Every step can be skipped.

import type { Difficulty } from '../recipes/types';

/** What brought the cook here. It orders the first-run checklist; it never hides anything. */
export const INTENTS = ['tonight', 'plan', 'pantry', 'discover', 'household'] as const;
export type Intent = (typeof INTENTS)[number];

export const INTENT_LABELS: Readonly<Record<Intent, string>> = {
  tonight: 'Tonight’s dinner',
  plan: 'Plan my week',
  pantry: 'Use what I’ve got',
  discover: 'Find new recipes',
  household: 'Cook with my household',
};

/** How sure the cook is in the kitchen. It only lifts recipes that suit, like weeknight time (D-023). */
export const SKILLS = ['starting', 'comfortable', 'confident'] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LABELS: Readonly<Record<Skill, { label: string; sub: string }>> = {
  starting: { label: 'Just starting', sub: 'Keep it simple' },
  comfortable: { label: 'Comfortable', sub: 'Happy with most recipes' },
  confident: { label: 'Confident', sub: 'Up for a challenge' },
};

const SKILL_FITS: Readonly<Record<Skill, readonly Difficulty[]>> = {
  starting: ['easy'],
  comfortable: ['easy', 'medium'],
  confident: ['medium', 'hard'],
};

/** How much a recipe's difficulty lifts it for this cook. Never negative: a hard dish still shows for a beginner. */
export function skillLift(difficulty: Difficulty, skill: Skill | undefined): number {
  if (!skill || !SKILL_FITS[skill].includes(difficulty)) return 0;
  // A beginner's fit matters more than a confident cook's taste for a challenge.
  return skill === 'starting' ? 2 : 1;
}

export type WelcomeStep = 'hello' | 'intent' | 'eat' | 'cuisines' | 'time' | 'cupboard' | 'reveal' | 'notify';

/** The question pages after hello, in order. */
export const QUESTION_STEPS: readonly WelcomeStep[] = ['intent', 'eat', 'cuisines', 'time', 'cupboard', 'reveal', 'notify'];

export type StepOptions = {
  /** The Sunday reminder is already on (a redo), so the primer has nothing to ask. */
  reminderOn: boolean;
};

function steps(options: StepOptions): readonly WelcomeStep[] {
  return ['hello', ...QUESTION_STEPS.filter((s) => !(s === 'notify' && options.reminderOn))];
}

/** The step after this one, or 'done' at the end. */
export function nextStep(step: WelcomeStep, options: StepOptions): WelcomeStep | 'done' {
  const all = steps(options);
  return all[all.indexOf(step) + 1] ?? 'done';
}

/** The step Back goes to. Hello and the primer have none: the primer comes after a choice that's already made. */
export function previousStep(step: WelcomeStep): WelcomeStep | undefined {
  if (step === 'hello' || step === 'notify') return undefined;
  const all = steps({ reminderOn: false });
  return all[all.indexOf(step) - 1];
}

/** How far along the bar is on a question page, 0 to 1. */
export function stepProgress(step: WelcomeStep, options: StepOptions): number {
  const questions = steps(options).slice(1);
  const at = questions.indexOf(step);
  return at < 0 ? 0 : (at + 1) / questions.length;
}

/** Adds or removes one intent, keeping INTENTS' order so the checklist reads the same however they were tapped. */
export function toggleIntent(current: readonly Intent[], intent: Intent): Intent[] {
  const next = current.includes(intent) ? current.filter((i) => i !== intent) : [...current, intent];
  return INTENTS.filter((i) => next.includes(i));
}
