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
    return () => {
      for (const id of pending.values()) void cancelScheduled(id);
    };
  }, []);

  const start = async (label: string, stepIndex: number, seconds: number) => {
    const timer = startTimer(newId(), label, stepIndex, seconds, Date.now());
    setTimers((list) => [...list, timer]);
    setNow(Date.now());
    if (await ensureNotificationPermission()) {
      scheduled.current.set(timer.id, await scheduleAt(timer.endsAt, `${label} is up`, `${recipeTitle}, step ${stepIndex + 1}`));
    }
  };

  const dismiss = (id: string) => {
    void cancelScheduled(scheduled.current.get(id));
    scheduled.current.delete(id);
    setTimers((list) => list.filter((t) => t.id !== id));
  };

  return { timers, now, start, dismiss };
}
