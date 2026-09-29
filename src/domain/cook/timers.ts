// Cook Mode timers are stored as an end time, not a countdown, so they stay
// right when the phone locks or the app is in the background (map Phase 6).

export type CookTimer = { id: string; label: string; stepIndex: number; seconds: number; endsAt: number };

export function startTimer(id: string, label: string, stepIndex: number, seconds: number, now: number): CookTimer {
  return { id, label, stepIndex, seconds, endsAt: now + seconds * 1000 };
}

export function secondsLeft(timer: CookTimer, now: number): number {
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

export function isFinished(timer: CookTimer, now: number): boolean {
  return secondsLeft(timer, now) === 0;
}

/** "9:05", "1:02:30". */
export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
