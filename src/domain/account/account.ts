// The small rules behind signing in (D-043): what counts as an email, how a
// code is typed, when one can be sent again, and how "Backed up" reads.

/** Supabase sends a 6-digit code (set in the dashboard: docs/ACCOUNTS.md). */
export const CODE_LENGTH = 6;
/** A new code can be asked for after this long, so a slow email isn't answered with three more. */
export const RESEND_AFTER_MS = 60_000;
/** Supabase's default: an email code lasts an hour. */
export const CODE_LIFETIME_MS = 60 * 60_000;

/** The email as it will be sent: no spaces around it, lower case. */
export const cleanEmail = (email: string) => email.trim().toLowerCase();

/** A light check that catches typos ("name@", "name.com"); the code arriving is the real test. */
export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail(email));
}

/** Just the digits, at most six: pasted codes often carry spaces ("123 456"). */
export const cleanCode = (typed: string) => typed.replace(/\D/g, '').slice(0, CODE_LENGTH);

/** Whole seconds until a code can be resent (0 means now). */
export function resendIn(sentAt: number, now: number): number {
  return Math.max(0, Math.ceil((sentAt + RESEND_AFTER_MS - now) / 1000));
}

/**
 * Supabase answers a wrong code and an old one with the same error, so the
 * difference comes from when the code was sent.
 */
export function codeProblem(sentAt: number, now: number): 'code-wrong' | 'code-expired' {
  return now - sentAt > CODE_LIFETIME_MS ? 'code-expired' : 'code-wrong';
}

/** "Backed up · just now", "Backed up · 5 min ago", or why it isn't yet. */
export function backupLine(s: { lastSyncedAt: number | undefined; waiting: number; offline: boolean; now: number }): string {
  if (s.waiting > 0) return s.offline ? 'Waiting to go online' : 'Backing up…';
  if (s.lastSyncedAt === undefined) return s.offline ? 'Waiting to go online' : 'Backing up…';
  const mins = Math.floor((s.now - s.lastSyncedAt) / 60_000);
  if (mins < 1) return 'Backed up · just now';
  if (mins < 60) return `Backed up · ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Backed up · ${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `Backed up · ${days === 1 ? 'yesterday' : `${days} days ago`}`;
}

/** The moments an account is offered, once each (docs/ACCOUNTS.md). */
export const MOMENTS = ['household', 'cookmarks', 'own-recipe'] as const;
export type Moment = (typeof MOMENTS)[number];
export const isMoment = (v: unknown): v is Moment => (MOMENTS as readonly unknown[]).includes(v);

/** The Cookmark that earns the offer. */
export const COOKMARKS_OFFER_AT = 10;

/** Whether a count going from `before` to `after` reaches a moment: it went up and is at least `at`. */
export const reached = (before: number, after: number, at: number) => after > before && after >= at;
