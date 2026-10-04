// The first-use tour's four stops (D-035): what Lachlan asked it to cover,
// in the order a first evening goes. One short line each, nothing to read twice.
import type { TourTarget } from '@/store/tour';

/** The spotlight follows the shape of what it points at: a pill for the switch, a soft tile for a tab. */
export type TourStep = { target: TourTarget; shape: 'pill' | 'tile'; title: string; body: string };

export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: 'home-pantry',
    shape: 'pill',
    title: 'What I have',
    body: 'Dishes you can cook right now with what’s in your cupboard. Tap Everything to see the rest.',
  },
  {
    target: 'tab-cupboard',
    shape: 'tile',
    title: 'Fill your cupboard',
    body: 'Search, tap what you have, paste a list or scan a receipt. The more you add, the more you can cook.',
  },
  {
    target: 'tab-plan',
    shape: 'tile',
    title: 'Plan the week',
    body: 'Pick a day and add dinner. Your week stays here.',
  },
  {
    target: 'tab-list',
    shape: 'tile',
    title: 'Your shopping list',
    body: 'Built from your plan, minus what you already have. Tick as you shop, or send it to someone.',
  },
];
