// For actions that save something and then leave the screen (Cook's Done, a
// plan sheet's Add). The screen takes a moment to go, and a second tap in that
// moment would log the cook or plan the dinner twice (audit F163).
import { useCallback, useRef } from 'react';

/** Wraps a handler so only its first call runs for the life of the screen. */
export function useOnce(): <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => void {
  const done = useRef(false);
  return useCallback(
    <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        if (done.current) return;
        done.current = true;
        fn(...args);
      },
    [],
  );
}
