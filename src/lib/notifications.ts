// Local notifications only (map §3: no server push in v1). Used for Cook Mode
// timers finishing while the phone is locked, and later the Sunday reminder.
import * as Notifications from 'expo-notifications';

let configured = false;

function configure(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Asks once, only when the cook first starts a timer. Returns false if they said no. */
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
