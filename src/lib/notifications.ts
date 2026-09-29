// Local notifications only (map §3: no server push in v1). Used for Cook Mode
// timers finishing while the phone is locked, and the Sunday planning reminder.
import * as Notifications from 'expo-notifications';

let configured = false;

function configure(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Asks only when the cook first wants a notification (a timer, the Sunday reminder). Returns false if they said no. */
export async function ensureNotificationPermission(): Promise<boolean> {
  configure();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function scheduleAt(when: number, title: string, body: string): Promise<string | undefined> {
  configure();
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch {
    // Scheduling can fail on web or without permission; the in-app timer still runs.
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
  configure();
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
      content: { title: 'Plan the week?', body: 'Pick a few dinners and your shopping list writes itself.' },
      // Expo counts weekdays from Sunday = 1.
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 16, minute: 0 },
    });
    return true;
  } catch {
    return false;
  }
}
