// What the screen reader and the motion setting need from every screen, in one
// place. Plain React Native, not Reanimated, so any component can use it
// (Reanimated can't load under Jest, and shared sheets are in many tests).
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Announces now, on every platform that has a screen reader to tell. */
export function announce(message: string): void {
  if (!message) return;
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Says `message` out loud each time it changes to something non-empty: an
 * error under a field, a timer finishing, the tour moving on.
 * `accessibilityLiveRegion` does this on Android only, so it's skipped there to
 * avoid hearing it twice; iOS needs the explicit announcement, or a VoiceOver
 * user never hears that the name was taken or the pasta is done.
 */
export function useAnnounce(message: string | undefined | false | null): void {
  useEffect(() => {
    if (!message || Platform.OS === 'android') return;
    announce(message);
  }, [message]);
}

/** A system accessibility switch, read once and kept current as it changes. */
function useSystemSetting(read: () => Promise<boolean>, event: 'reduceMotionChanged' | 'screenReaderChanged'): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    read()
      .then((v) => {
        if (live) setOn(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener(event, setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, [read, event]);
  return on;
}

/** Settings › Accessibility › Motion › Reduce Motion. */
export function useReduceMotion(): boolean {
  return useSystemSetting(AccessibilityInfo.isReduceMotionEnabled, 'reduceMotionChanged');
}

/** VoiceOver (or TalkBack) is on. */
export function useScreenReader(): boolean {
  return useSystemSetting(AccessibilityInfo.isScreenReaderEnabled, 'screenReaderChanged');
}
