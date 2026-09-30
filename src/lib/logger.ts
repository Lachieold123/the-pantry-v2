// One place for errors the app catches and carries on from. In development they
// print to the console so they're seen; in a release build they go to a sink that
// does nothing yet. When Sentry is set up (KNOWN-ISSUES K-8), it plugs in here with
// setLogSink and every caller starts reporting, with no other change.

export type LogLevel = 'warn' | 'error';
export type LogSink = (level: LogLevel, scope: string, message: string, error?: unknown) => void;

const consoleSink: LogSink = (level, scope, message, error) => {
  const print = level === 'error' ? console.error : console.warn;
  if (error === undefined) print(`[${scope}] ${message}`);
  else print(`[${scope}] ${message}`, error);
};

const silentSink: LogSink = () => undefined;

// __DEV__ is Metro's; plain Node (the domain test runner) doesn't define it, and that's development.
const isDev = typeof __DEV__ === 'undefined' ? true : __DEV__;

let sink: LogSink = isDev ? consoleSink : silentSink;

/** Swaps where logs go: Sentry in a release build, or a spy in a test. Returns the previous sink. */
export function setLogSink(next: LogSink): LogSink {
  const previous = sink;
  sink = next;
  return previous;
}

export const logger = {
  /** Something failed but the app handled it (a share sheet that didn't open, a slow load). */
  warn: (scope: string, message: string, error?: unknown) => sink('warn', scope, message, error),
  /** Something broke that the cook saw: a crashed screen. */
  error: (scope: string, message: string, error?: unknown) => sink('error', scope, message, error),
};
