// Database access and the seed kitchen's settings (seed.config).
// The function talks to Postgres directly (SUPABASE_DB_URL, provided to every
// edge function), because the seed schema is deliberately not exposed through
// the API.

import postgres from 'postgres';

export type Sql = ReturnType<typeof postgres>;

export function connect(): Sql {
  const url = Deno.env.get('SUPABASE_DB_URL');
  if (!url) throw new Error('SUPABASE_DB_URL is not set');
  // prepare: false keeps it working through Supabase's connection pooler.
  return postgres(url, { prepare: false, max: 6, idle_timeout: 5, connect_timeout: 10 });
}

export type Config = {
  paused: boolean;
  /** Stops at 'photographed' while false, so a batch can be reviewed before anything goes public. */
  publishing: boolean;
  monthly_cap_usd: number;
  first_run_cap_usd: number;
  models: { writer: string; checker: string };
  prices: Record<string, { in: number; out: number }>;
  per_tick: { write: number; photo: number; menus: number; avatars: number; publish: number };
  pexels_per_hour: number;
  /** Work only on these cooks (a pilot). Empty means everyone. */
  only_cooks: string[];
  /** The first batch is released over this many days, at real times; 0 releases it at once. */
  backlog_spread_days: number;
  /** Set when the API account ran out of credit; paid work waits until then. */
  ai_blocked_until?: string;
};

const DEFAULTS: Config = {
  paused: false,
  publishing: false,
  monthly_cap_usd: 60,
  first_run_cap_usd: 200,
  models: { writer: 'claude-sonnet-5-5', checker: 'claude-haiku-4-5-20251001' },
  prices: {},
  per_tick: { write: 4, photo: 4, menus: 2, avatars: 4, publish: 40 },
  pexels_per_hour: 180,
  only_cooks: [],
  backlog_spread_days: 14,
};

export async function loadConfig(sql: Sql): Promise<Config> {
  const rows = await sql<{ key: string; value: unknown }[]>`select key, value from seed.config`;
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Config>;
  return { ...DEFAULTS, ...stored, per_tick: { ...DEFAULTS.per_tick, ...(stored.per_tick ?? {}) } };
}

/** Cooks this tick may work on: SQL fragment for `cook_id`. */
export function cookFilter(sql: Sql, cfg: Config, column = 'cook_id') {
  return cfg.only_cooks.length === 0
    ? sql`true`
    : sql`${sql(column)} = any(${cfg.only_cooks}::uuid[])`;
}

export async function spentThisMonth(sql: Sql): Promise<number> {
  const [row] = await sql<{ usd: string }[]>`
    select coalesce(sum(usd), 0) as usd from seed.usage
    where purpose <> 'pexels'
      and at >= date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney'`;
  return Number(row?.usd ?? 0);
}

/** True while any house cook still has part of their first batch to come. */
export async function inFirstRun(sql: Sql): Promise<boolean> {
  const [row] = await sql<{ yes: boolean }[]>`
    select exists (
      select 1 from seed.personas p join public.cooks c on c.id = p.cook_id
      where p.active and c.recipe_count < p.backlog_target
    ) as yes`;
  return row?.yes ?? false;
}

export type UsageRow = {
  purpose: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  usd?: number;
};

export async function recordUsage(sql: Sql, row: UsageRow): Promise<void> {
  await sql`
    insert into seed.usage (purpose, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, usd)
    values (${row.purpose}, ${row.model ?? null}, ${row.input_tokens ?? 0}, ${row.output_tokens ?? 0},
            ${row.cache_read_tokens ?? 0}, ${row.cache_write_tokens ?? 0}, ${row.usd ?? 0})`;
}

/** One tick at a time: pg_cron fires every minute, and a slow tick must not overlap the next. */
export async function takeLock(sql: Sql): Promise<boolean> {
  const rows = await sql`
    insert into seed.config (key, value) values ('tick_lock', to_jsonb(now()))
    on conflict (key) do update set value = excluded.value
      where (seed.config.value #>> '{}')::timestamptz < now() - interval '3 minutes'
    returning key`;
  return rows.length > 0;
}

export async function releaseLock(sql: Sql): Promise<void> {
  await sql`update seed.config set value = to_jsonb('1970-01-01T00:00:00Z'::timestamptz) where key = 'tick_lock'`;
}

export async function checkSecret(sql: Sql, given: string | null): Promise<boolean> {
  if (!given) return false;
  const [row] = await sql<{ ok: boolean }[]>`
    select exists (
      select 1 from vault.decrypted_secrets where name = 'seed_cron_secret' and decrypted_secret = ${given}
    ) as ok`;
  return row?.ok ?? false;
}

/** Keys live in the function's secrets; the vault is a fallback so they can also be set with SQL. */
export async function secret(sql: Sql, name: string): Promise<string | undefined> {
  const fromEnv = Deno.env.get(name);
  if (fromEnv) return fromEnv;
  const [row] = await sql<{ v: string }[]>`select decrypted_secret as v from vault.decrypted_secrets where name = ${name}`;
  return row?.v;
}

/** Our objects are plain JSON; postgres.js's JSONValue type just can't see it through Record<string, unknown>. */
export type Json = Parameters<Sql['json']>[0];
export const asJson = (value: unknown): Json => value as Json;
