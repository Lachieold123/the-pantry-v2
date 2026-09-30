// Running timers for one cooking session. Each also schedules a local
// notification, so a timer that finishes with the phone locked still alerts.
// The countdown itself ticks inside TimerBar, so this hook (and Cook Mode)
// doesn't re-render twice a second (audit F53).
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { isRunningAlready, startTimer, timerNotice, type CookTimer } from '@/domain/cook/timers';
import { newId } from '@/lib/ids';
import { logger } from '@/lib/logger';
import { cancelScheduled, ensureNotificationPermission, scheduleAt } from '@/lib/notifications';
import { useToast } from '@/ui/patterns/Toast';

export function useCookTimers() {
  const toast = useToast();
  const [timers, setTimers] = useState<CookTimer[]>([]);
  // Refs, not state: the async scheduling below must see the latest truth, not a stale render.
  const list = useRef<CookTimer[]>([]);
  const scheduled = useRef(new Map<string, string | undefined>());
  const buzzers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const mounted = useRef(true);
  const warnedOff = useRef(false);

  // Leaving Cook Mode cancels any alerts still waiting.
  useEffect(() => {
    mounted.current = true;
    const pending = scheduled.current;
    const buzz = buzzers.current;
    return () => {
      mounted.current = false;
      for (const id of pending.values()) void cancelScheduled(id);
      pending.clear();
      for (const b of buzz.values()) clearTimeout(b);
      buzz.clear();
    };
  }, []);

  const update = (next: CookTimer[]) => {
    list.current = next;
    setTimers(next);
  };

  const live = (id: string) => mounted.current && list.current.some((t) => t.id === id);

  // Once per Cook session: a timer that can't alert with the phone locked should say so (audit F46).
  const warnNotificationsOff = () => {
    if (warnedOff.current || Platform.OS === 'web') return;
    warnedOff.current = true;
    toast({
      message: 'Notifications are off, so timers can’t alert you with the phone locked.',
      tone: 'problem',
      actionLabel: 'Open Settings',
      undo: () => void Linking.openSettings().catch((e: unknown) => logger.warn('settings', "couldn't open the phone's Settings", e)),
    });
  };

  /** Starts a timer for a time in a step. A repeat tap while it's running is ignored (audit F45). */
  const start = async (label: string, stepIndex: number, seconds: number, stepText = ''): Promise<void> => {
    if (isRunningAlready(list.current, stepIndex, label, Date.now())) {
      toast({ message: `The ${label} timer is already running` });
      return;
    }
    const timer = startTimer(newId(), label, stepIndex, seconds, Date.now());
    update([...list.current, timer]);
    // A buzz when it ends, for the cook who's looking at the stove rather than the phone.
    buzzers.current.set(
      timer.id,
      setTimeout(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), seconds * 1000),
    );

    const allowed = await ensureNotificationPermission();
    // Cancelled or left while the permission prompt was up: nothing to schedule (audit F47).
    if (!live(timer.id)) return;
    if (!allowed) {
      warnNotificationsOff();
      return;
    }
    const notice = timerNotice(stepIndex, label, stepText);
    const id = await scheduleAt(timer.endsAt, notice.title, notice.body, { timeSensitive: true });
    // Cancelled or left while it was being scheduled: the id arrived too late to be cancelled
    // with the timer, so cancel it now or it would buzz for a timer that no longer exists.
    if (!live(timer.id)) void cancelScheduled(id);
    else scheduled.current.set(timer.id, id);
  };

  const dismiss = (id: string) => {
    void cancelScheduled(scheduled.current.get(id));
    scheduled.current.delete(id);
    const buzz = buzzers.current.get(id);
    if (buzz) clearTimeout(buzz);
    buzzers.current.delete(id);
    update(list.current.filter((t) => t.id !== id));
  };

  return { timers, start, dismiss };
}
