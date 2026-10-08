// Today's date for screens that stay mounted (the tabs). Without it, Plan
// opened on Tuesday night still thinks it's Tuesday on Wednesday morning, and
// the list keeps yesterday's meals (BUG-12). It changes at local midnight and
// whenever the app comes back to the front, and every screen shares one clock.
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { fromISODate, toISODate, addDays, type ISODate } from '@/domain/plan/week';

let current: ISODate = toISODate(new Date());
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;

function check(): void {
  const now = toISODate(new Date());
  if (now === current) return;
  current = now;
  for (const l of listeners) l();
}

function start(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    // A second past midnight, so the new date is certainly in.
    const wait = Math.max(1000, fromISODate(addDays(current, 1)).getTime() - Date.now() + 1000);
    timer = setTimeout(() => {
      check();
      arm();
    }, wait);
  };
  arm();
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') check();
  });
  return () => {
    if (timer) clearTimeout(timer);
    sub.remove();
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  check();
  stop ??= start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stop) {
      stop();
      stop = undefined;
    }
  };
}

/** Today, as an ISO date, kept current while the screen stays mounted. */
export function useToday(): ISODate {
  return useSyncExternalStore(subscribe, () => current);
}

/** For tests: re-read the clock now. */
export function refreshToday(): void {
  check();
}
