// Shared loader: catalogue, ingredient index, and which batch file each recipe lives in.
import { readFileSync, readdirSync } from 'node:fs';
import { buildIngredientIndex, type IngredientDef } from '../../../../../src/domain/ingredients/database.ts';
import type { Recipe } from '../../../../../src/domain/recipes/types.ts';

export const ROOT = '/Users/lachlanoldfield/Developer/the-pantry-v2/.claude/worktrees/audit-1120/';
export const EV = ROOT + 'docs/audits/2026-11-20-deep-audit/evidence/L7/';
export const recipes: Recipe[] = JSON.parse(readFileSync(ROOT + 'src/data/catalogue/recipes.json', 'utf8'));
export const defs: IngredientDef[] = JSON.parse(readFileSync(ROOT + 'src/data/ingredients/ingredients.json', 'utf8'));
export const index = buildIngredientIndex(defs);
export const byId = index.byId;

export const batchOf = new Map<string, string>();
export const batchRecipe = new Map<string, any>();
const dir = ROOT + 'scripts/data/house-recipes/';
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  for (const h of JSON.parse(readFileSync(dir + f, 'utf8')).recipes) {
    batchOf.set(h.id, 'scripts/data/house-recipes/' + f);
    batchRecipe.set(h.id, h);
  }
}
/** Where a fix for this recipe goes (D-044 batch file, or D-014 recipe-fixes.json for converted old-app recipes). */
export const routeOf = (id: string) => batchOf.get(id) ?? 'scripts/data/recipe-fixes.json (converted, D-014)';

export const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]!);
  const q = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => q(r[k])).join(','))].join('\n') + '\n';
};
