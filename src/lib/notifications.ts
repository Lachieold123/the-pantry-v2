// Local notifications only (map §3: no server push in v1). Used for Cook Mode
// timers finishing while the phone is locked, and the Sunday planning reminder.
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { logger } from './logger';

let configured = false;

/**
 * Called once at startup (root layout). Without a handler, a notification that
 * fires while the app is open isn't shown at all, so a Sunday reminder that
 * lands mid-browse used to vanish (audit F74). Keep the sound: in Cook Mode
 * it's the only audible cue that a timer finished (audit F185).
 */
export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
  } catch {
    // Not supported on this platform (web): there's nothing to show anyway.
  }
}

export type NotificationPermission = 'granted' | 'undetermined' | 'blocked';

/** Where the phone stands, without asking. "blocked" means only the phone's Settings can change it. */
export async function notificationPermission(): Promise<NotificationPermission> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    return current.canAskAgain ? 'undetermined' : 'blocked';
  } catch (e) {
    logger.warn('notifications', "couldn't read the permission", e);
    return 'blocked';
  }
}

/** Asks only when the cook first wants a notification (a timer, the Sunday reminder). Returns false if they said no. */
export async function ensureNotificationPermission(): Promise<boolean> {
  configureNotifications();
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch (e) {
    // A failed permission check must not break the caller (audit F46): treat it as "no".
    logger.warn('notifications', "couldn't check or ask for permission", e);
    return false;
  }
}

type ScheduleOptions = {
  /**
   * Breaks through Focus and Scheduled Summary on iOS. Only for cook timers
   * (Lachlan, 30 Sep 2026): an overcooked dinner is worth interrupting for, a
   * nudge to plan isn't. Needs the time-sensitive entitlement in app.json.
   */
  timeSensitive?: boolean;
};

export async function scheduleAt(when: number, title: string, body: string, options: ScheduleOptions = {}): Promise<string | undefined> {
  configureNotifications();
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, ...(options.timeSensitive ? { interruptionLevel: 'timeSensitive' as const } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch (e) {
    // Scheduling can fail on web or without permission; the in-app timer still runs.
    logger.warn('notifications', "couldn't schedule", e);
    return undefined;
  }
}

export async function cancelScheduled(id: string | undefined): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or never scheduled: nothing to cancel.
  }
}

const SUNDAY_REMINDER = 'sunday-plan';

/**
 * A weekly nudge at 4pm on Sunday to plan the week. Returns whether it's on:
 * false if notifications aren't allowed, so the switch can say so honestly.
 */
export async function setSundayReminder(on: boolean): Promise<boolean> {
  configureNotifications();
  try {
    await Notifications.cancelScheduledNotificationAsync(SUNDAY_REMINDER);
  } catch {
    // Nothing scheduled yet.
  }
  if (!on) return false;
  try {
    if (!(await ensureNotificationPermission())) return false;
    await Notifications.scheduleNotificationAsync({
      identifier: SUNDAY_REMINDER,
      // The url is where a tap lands (audit F133): see useNotificationTaps.
      content: { title: 'Plan the week?', body: 'Pick a few dinners and your shopping list writes itself.', data: { url: '/plan' } },
      // Expo counts weekdays from Sunday = 1.
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 16, minute: 0 },
    });
    return true;
  } catch (e) {
    logger.warn('notifications', "couldn't schedule the Sunday reminder", e);
    return false;
  }
}

/**
 * Calls `open` with the in-app path a tapped notification carries, including
 * the tap that cold-started the app. Each tap is handled once, so a remount
 * doesn't send the cook back to the same screen.
 */
export function useNotificationTaps(open: (path: string) => void): void {
  const response = Notifications.useLastNotificationResponse();
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const url: unknown = response.notification.request.content.data?.url;
    try {
      Notifications.clearLastNotificationResponse();
    } catch {
      // Not available on this platform.
    }
    // Only our own paths: a notification can't send the app somewhere outside it.
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) latest.current(url);
  }, [response]);
}
