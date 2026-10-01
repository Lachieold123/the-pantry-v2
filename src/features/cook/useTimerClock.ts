// The clock a timer readout counts down against. It ticks inside each readout
// (the bar, the step's chips), never in Cook Mode itself, so the whole screen
// doesn't re-render twice a second (audit F53), and it stops once every timer
// has finished.
import { useEffect, useState } from 'react';

import { anyRunning, type CookTimer } from '@/domain/cook/timers';

const TICK_MS = 500;

export function useTimerClock(timers: readonly CookTimer[]): number {
  const [now, setNow] = useState(() => Date.now());
  const running = anyRunning(timers, now);
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    // Straight away too: a timer just added counts from the real time, not the last tick.
    const first = setTimeout(tick, 0);
    const every = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [running, timers]);
  return now;
}
