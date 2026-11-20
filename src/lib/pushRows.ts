// Sending rows to one of the two row tables (household_rows, account_rows).
// The answer says whether the server refused the rows (a check failed, so
// sending them again won't help) or simply couldn't be reached, which the
// sync engine treats very differently (BUG-03).
import type { Row } from '@/domain/sync/types';
import { supabase } from './supabase';

export type PushResult = { ok: true; value: null } | { ok: false; rejected: boolean };

/**
 * Postgres error classes 22 (bad data: too long, malformed) and 23 (a check or
 * constraint failed) are refusals. Anything else, such as no network, an
 * expired session or row security, is worth trying again later.
 */
export function isRejection(error: { code?: string | undefined } | null | undefined): boolean {
  const code = error?.code ?? '';
  return /^2[23][0-9A-Z]{3}$/.test(code);
}

export async function pushTo(
  table: 'household_rows' | 'account_rows',
  owner: Record<string, string>,
  by: string,
  rows: readonly Row[],
  onConflict: string,
): Promise<PushResult> {
  if (rows.length === 0) return { ok: true, value: null };
  try {
    const { error } = await supabase()
      .from(table)
      .upsert(
        rows.map((r) => ({
          ...owner,
          kind: r.kind,
          key: r.key,
          data: r.data,
          deleted: r.deleted,
          updated_at: r.updatedAt,
          updated_by: by,
        })),
        { onConflict },
      );
    return error ? { ok: false, rejected: isRejection(error) } : { ok: true, value: null };
  } catch {
    return { ok: false, rejected: false };
  }
}
