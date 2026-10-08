// Running timers for one cooking session. Each also schedules a local
// notification, so a timer that finishes with the phone locked still alerts.
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';

import { isFinished, startTimer, type CookTimer } from '@/domain/cook/timers';
import { newId } from '@/lib/ids';
import { cancelScheduled, ensureNotificationPermission, scheduleAt } from '@/lib/notifications';

export function useCookTimers(recipeTitle: string) {
  const [timers, setTimers] = useState<CookTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const scheduled = useRef(new Map<string, string | undefined>());
  const announced = useRef(new Set<string>());
  /** Timers not yet dismissed, and whether Cook Mode is still open: checked after the slow permission prompt. */
  const live = useRef(new Set<string>());
  const alive = useRef(true);

  useEffect(() => {
    if (timers.length === 0) return;
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(tick);
  }, [timers.length]);

  useEffect(() => {
    for (const t of timers) {
      if (isFinished(t, now) && !announced.current.has(t.id)) {
        announced.current.add(t.id);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [timers, now]);

  // Leaving Cook Mode cancels any alerts still waiting.
  useEffect(() => {
    const pending = scheduled.current;
    alive.current = true;
    return () => {
      alive.current = false;
      for (const id of pending.values()) void cancelScheduled(id);
    };
  }, []);

  const start = async (label: string, stepIndex: number, seconds: number, segment?: number) => {
    const timer = startTimer(newId(), label, stepIndex, seconds, Date.now(), segment);
    live.current.add(timer.id);
    setTimers((list) => [...list, timer]);
    setNow(Date.now());
    if (!(await ensureNotificationPermission())) return;
    const id = await scheduleAt(timer.endsAt, `${label} is up`, `${recipeTitle}, step ${stepIndex + 1}`);
    // Dismissed, or Cook Mode closed, while the permission prompt was up: don't leave the alert behind (BUG-22).
    if (!alive.current || !live.current.has(timer.id)) {
      void cancelScheduled(id);
      return;
    }
    scheduled.current.set(timer.id, id);
  };

  const dismiss = (id: string) => {
    live.current.delete(id);
    void cancelScheduled(scheduled.current.get(id));
    scheduled.current.delete(id);
    setTimers((list) => list.filter((t) => t.id !== id));
  };

  return { timers, now, start, dismiss };
}
