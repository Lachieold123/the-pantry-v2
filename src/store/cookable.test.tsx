// Cupboard matching is worked out once and shared by every screen that asks (PERF-2).
import { cookableFor } from './cookable';
import { useCupboard } from './cupboard';
import { usePreferences } from './preferences';

const inputs = (items = useCupboard.getState().items) => {
  const p = usePreferences.getState();
  return [items, useCupboard.getState().shelf, p.diet, p.avoid, [], [], [], '2026-11-20'] as Parameters<typeof cookableFor>[0];
};

it('screens asking with the same inputs share one answer', () => {
  const same = inputs();
  expect(cookableFor([...same] as typeof same)).toBe(cookableFor([...same] as typeof same));
});

it('a cupboard change works it out again', () => {
  const before = cookableFor(inputs());
  expect(cookableFor(inputs([]))).not.toBe(before);
});
