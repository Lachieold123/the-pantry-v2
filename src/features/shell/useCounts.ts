// The number on the Plan tab: dinners still to come.
import { toISODate, upcomingCount } from '@/domain/plan/week';
import { usePlan } from '@/store/plan';

export function usePlanBadge(): number {
  // Today's date is read on render; the tab bar re-renders on every tab change, which is often enough.
  const today = toISODate(new Date());
  return usePlan((s) => upcomingCount(s.entries, today));
}
