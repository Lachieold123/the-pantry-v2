// Screen reader helpers. `accessibilityLiveRegion` only exists on Android, so an
// iPhone with VoiceOver heard nothing when a step, a timer or a result changed
// (audit F97). Everything that must be spoken goes through announce() instead,
// which both platforms honour; call sites drop their live regions so Android
// doesn't say it twice.
import { useEffect, useRef, useState, type RefObject } from 'react';
import { AccessibilityInfo } from 'react-native';

/** A native view VoiceOver can focus: a View or a Text. */
type Focusable = Parameters<typeof AccessibilityInfo.sendAccessibilityEvent>[0];

/** Say something to VoiceOver or TalkBack. Does nothing when no screen reader is on. */
export function announce(message: string): void {
  if (message.trim()) AccessibilityInfo.announceForAccessibility(message);
}

type AnnounceOptions = {
  /** Wait for the message to settle (typing in search) and only say the last one. */
  delayMs?: number;
  /** Also speak the first value, not only changes to it. */
  initial?: boolean;
};

/**
 * Announce `message` whenever it changes. The first value is skipped by default,
 * because opening a screen already reads it; pass `initial` for things that
 * appear already changed (a validation error, an error screen).
 */
export function useAnnounce(message: string | null | undefined, { delayMs = 0, initial = false }: AnnounceOptions = {}): void {
  const first = useRef(true);
  useEffect(() => {
    const skip = first.current && !initial;
    first.current = false;
    if (skip || !message) return;
    if (delayMs <= 0) {
      announce(message);
      return;
    }
    const timer = setTimeout(() => announce(message), delayMs);
    return () => clearTimeout(timer);
  }, [message, delayMs, initial]);
}

/**
 * Move the screen reader's focus to a view, usually a new heading, when the
 * button just pressed has gone (audit F101). Waits a frame so the view exists.
 */
export function focusOn(ref: RefObject<Focusable | null>): void {
  setTimeout(() => {
    if (ref.current) AccessibilityInfo.sendAccessibilityEvent(ref.current, 'focus');
  }, 0);
}

/** Whether VoiceOver or TalkBack is on right now, following changes. */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (live) setEnabled(on);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return enabled;
}
