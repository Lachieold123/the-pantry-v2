// Where a tapped notification takes the cook (audit F133). Phones only: the web
// build uses notificationTaps.web.ts, because useLastNotificationResponse throws
// on web and took the whole web build down.
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

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
