// Reading rows from one of the two row tables (household_rows, account_rows).
//
// K-36: a pull asks only for rows the server received after a mark
// (domain/sync/cursor), through `<table>_since`, which pages by a whole
// position (received_at, kind, key) so nothing is skipped or read twice. With
// no mark it reads everything the same way. If the server doesn't have that
// function yet (the migration isn't applied), it falls back to reading every
// row, the way it always did, and answers no mark.
import type { Row, RowKind } from '@/domain/sync/types';
import { supabase } from './supabase';

const PAGE = 1000;

export type DbRow = {
  kind: RowKind;
  key: string;
  data: unknown;
  deleted: boolean;
  updated_at: number | string;
  updated_by: string;
  received_at?: number | string | undefined;
};

export const fromDb = (r: DbRow): Row => ({
  kind: r.kind,
  key: r.key,
  data: r.data,
  deleted: r.deleted,
  updatedAt: Number(r.updated_at),
  updatedBy: r.updated_by,
});

export type Pulled = {
  rows: Row[];
  /** The newest `received_at` among them; undefined when there were none or the server has no stamps. */
  newest: number | undefined;
};

export type PullOutcome = { ok: true; value: Pulled } | { ok: false; error: { message?: string; code?: string } };

type Table = 'household_rows' | 'account_rows';
type Owner = { column: 'household_id' | 'user_id'; id: string };

/** PostgREST's "no such function" (PGRST202), or Postgres's (42883): the migration isn't applied yet. */
export function isMissingFunction(error: { code?: string | undefined } | null | undefined): boolean {
  return error?.code === 'PGRST202' || error?.code === '42883';
}

const RPC_OWNER: Record<Owner['column'], string> = { household_id: 'p_household', user_id: 'p_user' };

/** Rows received after `after` (every row when undefined), a page at a time. Never throws. */
export async function pullSince(table: Table, owner: Owner, after: number | undefined): Promise<PullOutcome> {
  const rows: Row[] = [];
  let newest: number | undefined;
  let at = { p_after: after ?? 0, p_kind: '', p_key: '' };
  try {
    for (;;) {
      const { data, error } = await supabase().rpc(`${table}_since`, {
        [RPC_OWNER[owner.column]]: owner.id,
        ...at,
        p_limit: PAGE,
      });
      if (error) return isMissingFunction(error) ? pullEverything(table, owner) : { ok: false, error };
      const page = (data ?? []) as DbRow[];
      rows.push(...page.map(fromDb));
      const last = page[page.length - 1];
      if (last) {
        newest = Number(last.received_at);
        at = { p_after: newest, p_kind: last.kind, p_key: last.key };
      }
      if (page.length < PAGE) return { ok: true, value: { rows, newest } };
    }
  } catch (e) {
    return { ok: false, error: { message: String(e) } };
  }
}

/** The old full read, for a server without `<table>_since`. */
async function pullEverything(table: Table, owner: Owner): Promise<PullOutcome> {
  const rows: Row[] = [];
  try {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase()
        .from(table)
        .select('kind, key, data, deleted, updated_at, updated_by')
        .eq(owner.column, owner.id)
        // A total order (no ties), so paging never skips or repeats a row that isn't changing.
        .order('updated_at')
        .order('kind')
        .order('key')
        .range(from, from + PAGE - 1);
      if (error) return { ok: false, error };
      rows.push(...((data ?? []) as DbRow[]).map(fromDb));
      if (!data || data.length < PAGE) return { ok: true, value: { rows, newest: undefined } };
    }
  } catch (e) {
    return { ok: false, error: { message: String(e) } };
  }
}
