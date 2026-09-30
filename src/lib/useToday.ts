// "Today" as a live value (audit F16). Tab screens stay mounted for days and
// only re-render when a store changes, so a date read once at render goes
// stale overnight: Tonight shows yesterday and "Have this tonight" writes to
// the past. This re-renders its readers at local midnight and whenever the
// app comes back to the foreground (timers don't run while suspended).
import { useSyncExternalStore } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';

import { toISODate, type ISODate } from '@/domain/plan/week';

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let appState: NativeEventSubscription | undefined;
let last = toISODate(new Date());

function check() {
  const now = toISODate(new Date());
  if (now !== last) {
    last = now;
    listeners.forEach((l) => l());
  }
}

// One timer for every reader, aimed just past the next local midnight. Re-aimed
// after each firing, so DST and clock changes only delay it until the next check.
function aimAtMidnight() {
  if (timer) clearTimeout(timer);
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  timer = setTimeout(
    () => {
      check();
      aimAtMidnight();
    },
    midnight.getTime() - now.getTime() + 1000,
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    last = toISODate(new Date());
    aimAtMidnight();
    appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      check();
      aimAtMidnight();
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    if (timer) clearTimeout(timer);
    timer = undefined;
    appState?.remove();
    appState = undefined;
  };
}

// Read fresh each time: a string compares by value, so this only re-renders on a real change.
const snapshot = () => toISODate(new Date());

/** The phone's local date, kept current across midnight and app resumes. */
export function useToday(): ISODate {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
