// Cook Mode timers are stored as an end time, not a countdown, so they stay
// right when the phone locks or the app is in the background: a countdown
// would freeze while JavaScript is paused.

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

/** True while any timer is still counting down: leaving Cook Mode would silence it. */
export function anyRunning(timers: readonly CookTimer[], now: number): boolean {
  return timers.some((t) => !isFinished(t, now));
}

/** A second tap on the same time in the same step shouldn't start a twin (audit F45). */
export function isRunningAlready(timers: readonly CookTimer[], stepIndex: number, label: string, now: number): boolean {
  return timers.some((t) => t.stepIndex === stepIndex && t.label === label && !isFinished(t, now));
}

const SNIPPET_LENGTH = 90;

/**
 * What the lock screen says when a timer ends. The step number and what the
 * step was doing tell you which pot to check; "8–10 minutes is up" didn't (audit F185).
 */
export function timerNotice(stepIndex: number, label: string, stepText: string): { title: string; body: string } {
  const text = stepText.replace(/\s+/g, ' ').trim();
  let body = text;
  if (text.length > SNIPPET_LENGTH) {
    const cut = text.slice(0, SNIPPET_LENGTH);
    const space = cut.lastIndexOf(' ');
    body = `${(space > SNIPPET_LENGTH / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '')}…`;
  }
  return { title: `Step ${stepIndex + 1} timer done`, body: body || `${label} is up` };
}
