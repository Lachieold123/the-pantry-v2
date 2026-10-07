// What every stage of a tick needs.

import type { Config, Sql } from './db.ts';

export type Ctx = {
  sql: Sql;
  cfg: Config;
  anthropicKey?: string;
  pexelsKey?: string;
  /** Wall-clock time (ms) by which the tick must stop starting new work. */
  deadline: number;
  /** False when paused, over the spending cap, or missing the key. */
  aiAllowed: boolean;
  log: Record<string, unknown>;
};

/**
 * True when the error is the API account running out of credit. Stops paid
 * work for the rest of this tick and for the next 30 minutes, so an empty
 * account costs nothing and fails no recipes.
 */
export async function outOfCredit(ctx: Ctx, e: unknown): Promise<boolean> {
  if (!(e instanceof Error) || e.name !== 'OutOfCredit') return false;
  if (ctx.aiAllowed) {
    ctx.aiAllowed = false;
    ctx.log.out_of_credit = true;
    await ctx.sql`
      insert into seed.config (key, value) values ('ai_blocked_until', to_jsonb(now() + interval '30 minutes'))
      on conflict (key) do update set value = excluded.value`;
  }
  return true;
}

export function timeLeft(ctx: Ctx): number {
  return ctx.deadline - Date.now();
}

export function count(ctx: Ctx, key: string, by = 1): void {
  ctx.log[key] = ((ctx.log[key] as number | undefined) ?? 0) + by;
}

export function note(ctx: Ctx, key: string, message: string): void {
  const list = (ctx.log[key] as string[] | undefined) ?? [];
  if (list.length < 10) list.push(message.slice(0, 300));
  ctx.log[key] = list;
}

/** Runs tasks with at most `limit` at once. */
export async function inParallel<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await task(item);
  });
  await Promise.all(workers);
}
