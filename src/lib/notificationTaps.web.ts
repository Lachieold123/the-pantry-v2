// Web has no local notifications, so there is never a tap to follow. Metro picks
// this file over notificationTaps.ts for the web build.
export function useNotificationTaps(_open: (path: string) => void): void {}
