// The first-use tour's four stops (D-035): what Lachlan asked it to cover,
// in the order a first evening goes. One short line each, nothing to read twice.
import type { TourTarget } from '@/store/tour';

export type TourStep = { target: TourTarget; title: string; body: string };

export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: 'home-pantry',
    title: 'What I have',
    body: 'Dishes you can cook right now with what’s in your cupboard. Tap Everything to see the rest.',
  },
  {
    target: 'tab-cupboard',
    title: 'Fill your cupboard',
    body: 'Search, tap what you have, paste a list or scan a receipt. The more you add, the more you can cook.',
  },
  {
    target: 'tab-plan',
    title: 'Plan the week',
    body: 'Pick a day and add dinner. Your week stays here.',
  },
  {
    target: 'tab-list',
    title: 'Your shopping list',
    body: 'Built from your plan, minus what you already have. Tick as you shop, or send it to someone.',
  },
];
