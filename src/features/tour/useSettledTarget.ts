// Where the tour's current target sits on screen, once it has stopped moving.
//
// The card used to appear before the target had been measured (centred, the
// no-target fallback), then jump when the reading arrived; and a reading taken
// while Home was still laying out could be stale a moment later. Lachlan saw
// the card land in one spot and leap to another (6 October). So the overlay
// shows nothing until this settles: it re-measures until two readings agree,
// and only then hands back a place, which never changes for that step.
import { useEffect, useState } from 'react';

import { tourTarget, type TourTarget } from '@/store/tour';
import { TOUR } from '@/ui/tokens/screens';

type Rect = { x: number; y: number; width: number; height: number };

/** `rect` is undefined when the target isn't on screen: the card then shows centred, without a spotlight. */
type Settled = { step: number; rect: Rect | undefined };

/** Within a point: sub-pixel rounding between two readings isn't movement. */
function same(a: Rect, b: Rect): boolean {
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
}

/** Where this step's target settled ('measuring' until it has; undefined when there's nothing to point at). */
export function useSettledTarget(step: number | undefined, target: TourTarget | undefined, screen: string): Rect | undefined | 'measuring' {
  const [settled, setSettled] = useState<Settled | undefined>();

  useEffect(() => {
    if (step === undefined || !target) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last: Rect | undefined;
    let tries = 0;
    const settle = (rect: Rect | undefined) => {
      if (alive) setSettled({ step, rect });
    };
    const read = () => {
      const view = tourTarget(target);
      // Nothing registered (a screen not built yet): no point waiting.
      if (!view) return settle(undefined);
      view.measureInWindow((x, y, width, height) => {
        if (!alive) return;
        const rect = width > 0 && height > 0 ? { x, y, width, height } : undefined;
        tries += 1;
        if (rect && last && same(rect, last)) return settle(rect);
        // Still moving after every try: use the latest reading rather than keep the tour waiting.
        if (tries >= TOUR.settleTries) return settle(rect);
        last = rect;
        timer = setTimeout(read, TOUR.settleEvery);
      });
    };
    read();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
    // `screen` (the window size) re-measures after a rotation; the old place is kept until the new one settles.
  }, [step, target, screen]);

  if (!settled || settled.step !== step) return 'measuring';
  return settled.rect;
}
