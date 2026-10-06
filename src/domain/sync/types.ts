// What syncs, as rows, and where each kind of row lives (D-039, D-043).
//
// A row is one record: a planned meal, a tick, a Cookmark, a cooked dish. Two
// scopes hold rows: the household (the shared kitchen) and your account
// (everything personal, plus the kitchen when you're not in a household).
// Each record lives in exactly one scope at a time, so there's one truth.

/** The kitchen: plan, list edits, cupboard, and copies of your planned recipes for the household. */
export const KITCHEN_KINDS = ['plan', 'tick', 'removal', 'extra', 'cupboard', 'recipe'] as const;
/** Yours alone, whoever you share a kitchen with. */
export const PERSONAL_KINDS = ['bookmark', 'collection', 'hidden', 'myrecipe', 'recent', 'cooklog', 'prefs'] as const;

export type KitchenKind = (typeof KITCHEN_KINDS)[number];
export type PersonalKind = (typeof PERSONAL_KINDS)[number];
export type RowKind = KitchenKind | PersonalKind;

export type Row = {
  kind: RowKind;
  key: string;
  data: unknown;
  /** Removed (an entry deleted, a tick undone). Kept as a row so the removal syncs. */
  deleted: boolean;
  /** Milliseconds; the newest wins. */
  updatedAt: number;
  updatedBy?: string | undefined;
};

export type Scope = 'household' | 'account';

const PERSONAL = new Set<RowKind>(PERSONAL_KINDS);

/**
 * Where a kind of row syncs. Personal kinds always go to the account. The
 * kitchen goes to the household while you're in one, and to the account when
 * you're not. A `recipe` row is a copy of one of your own recipes for the
 * other members, so it only exists in a household: your account already
 * keeps every recipe you wrote as a `myrecipe` row.
 */
export function scopeOf(kind: RowKind, inHousehold: boolean): Scope | undefined {
  if (PERSONAL.has(kind)) return 'account';
  if (kind === 'recipe') return inHousehold ? 'household' : undefined;
  return inHousehold ? 'household' : 'account';
}

export const rowId = (kind: RowKind, key: string) => `${kind}:${key}`;
