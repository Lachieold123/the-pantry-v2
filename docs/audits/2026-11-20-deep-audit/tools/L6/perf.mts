// L6: Node floor for the catalogue's cold-start costs. Prints medians only, never the catalogue.
// Run: npx tsx --expose-gc docs/audits/2026-11-20-deep-audit/tools/L6/perf.mts
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { buildKitchen, type KitchenData } from '../../../../../src/domain/cupboard/kitchen';
import { whatCanICook, DEFAULT_SHELF, quickAdds } from '../../../../../src/domain/cupboard/cookable';
import { buildIngredientIndex, type IngredientDef } from '../../../../../src/domain/ingredients/database';
import { withAliases, type HierarchyData } from '../../../../../src/domain/ingredients/hierarchy';
import { shipsInStoreBuilds } from '../../../../../src/domain/recipes/provenance';
import { indexForSearch, searchRecipes, NO_FILTERS } from '../../../../../src/domain/recipes/search';
import type { Recipe } from '../../../../../src/domain/recipes/types';
import { eligibleForSurprise } from '../../../../../src/domain/suggestions/surprise';
import { rankHome } from '../../../../../src/domain/suggestions/rank';
import { momentOf } from '../../../../../src/domain/suggestions/moment';

const ROOT = new URL('../../../../../', import.meta.url);
const gc = (globalThis as { gc?: () => void }).gc ?? (() => undefined);
const RUNS = 7;

function median(fn: () => unknown, runs = RUNS): number {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    fn();
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  return Math.round(times[Math.floor(runs / 2)]! * 10) / 10;
}
const mb = (n: number) => Math.round((n / 1048576) * 10) / 10;

const text = readFileSync(new URL('src/data/catalogue/recipes.json', ROOT), 'utf8');
const out: Record<string, unknown> = { fileBytes: Buffer.byteLength(text) };

gc();
const heap0 = process.memoryUsage().heapUsed;
const all = JSON.parse(text) as Recipe[];
gc();
out.heapAfterParseMB = mb(process.memoryUsage().heapUsed - heap0);
out.parseMs = median(() => JSON.parse(text));
out.recipes = all.length;

const byProv: Record<string, number> = {};
for (const r of all) byProv[r.provenance ?? 'none'] = (byProv[r.provenance ?? 'none'] ?? 0) + 1;
out.byProvenance = byProv;
const store = all.filter((r) => shipsInStoreBuilds(r.provenance));
out.storeRecipes = store.length;
out.storeBytes = Buffer.byteLength(JSON.stringify(store));
out.draftBytes = Buffer.byteLength(JSON.stringify(all.filter((r) => !shipsInStoreBuilds(r.provenance))));

// Which top-level fields weigh most (bytes of JSON per key, whole catalogue).
const fieldBytes: Record<string, number> = {};
for (const r of all) for (const [k, v] of Object.entries(r)) fieldBytes[k] = (fieldBytes[k] ?? 0) + JSON.stringify(v).length + k.length + 4;
out.fieldMB = Object.fromEntries(Object.entries(fieldBytes).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, mb(v)]));

const hierarchy = JSON.parse(readFileSync(new URL('src/data/ingredients/hierarchy.json', ROOT), 'utf8')) as HierarchyData;
const ingredients = JSON.parse(readFileSync(new URL('src/data/ingredients/ingredients.json', ROOT), 'utf8')) as IngredientDef[];
const kitchenData = JSON.parse(readFileSync(new URL('src/data/ingredients/kitchen.json', ROOT), 'utf8')) as KitchenData;
out.ingredientIndexMs = median(() => buildIngredientIndex(withAliases(ingredients, hierarchy)));
const INGREDIENTS = buildIngredientIndex(withAliases(ingredients, hierarchy));
out.kitchenMs = median(() => buildKitchen(INGREDIENTS, kitchenData, hierarchy));
const KITCHEN = buildKitchen(INGREDIENTS, kitchenData, hierarchy);
out.byIdMapMs = median(() => new Map(all.map((r) => [r.id, r])));
out.storeFilterMs = median(() => all.filter((r) => shipsInStoreBuilds(r.provenance)));

for (const [label, list] of [['store', store], ['all', all]] as const) {
  const eat = () => eligibleForSurprise({ recipes: list, filters: NO_FILTERS, diet: 'everything', avoid: { options: [], custom: [] }, hidden: new Set(), index: INGREDIENTS });
  const eatable = eat();
  const res: Record<string, unknown> = { eatable: eatable.length, eatableMs: median(eat) };
  const label2 = (c: string) => c;
  res.searchIndexMs = median(() => indexForSearch(eatable, label2 as never, INGREDIENTS), 5);
  const idx = indexForSearch(eatable, label2 as never, INGREDIENTS);
  for (const q of ['chicken', 'chiken', 'pasta tomato', 'sh']) res[`search:${q}`] = median(() => searchRecipes(idx, q));
  // A cupboard of the 25 most used ingredients.
  const counts = new Map<string, number>();
  for (const r of list) for (const g of r.ingredientGroups) for (const i of g.items) if (i.ingredientId) counts.set(i.ingredientId, (counts.get(i.ingredientId) ?? 0) + 1);
  const have = new Set([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([id]) => id));
  const cook = () => whatCanICook({ recipes: eatable, have, shelf: DEFAULT_SHELF, index: INGREDIENTS, kitchen: KITCHEN, saved: new Set(), seed: '2026-11-20' });
  res.whatCanICookMs = median(cook, 5);
  res.quickAddsMs = median(() => quickAdds(eatable, have, INGREDIENTS, KITCHEN), 5);
  const { ready, nearly } = cook();
  res.ready = ready.length;
  res.nearly = nearly.length;
  const rank = () =>
    rankHome({
      recipes: list,
      taste: { diet: 'everything', avoid: { options: [], custom: [] }, cuisines: [], weeknight: undefined },
      hidden: new Set(),
      filters: {},
      history: { cookLog: [], bookmarks: [], recentlyViewed: [], plannedThisWeek: new Set() },
      cupboard: [...ready, ...nearly],
      index: INGREDIENTS,
      moment: momentOf(new Date('2026-11-20T18:00:00')),
      depth: 17,
    });
  res.rankHomeMs = median(rank, 5);
  out[label] = res;
}
console.log(JSON.stringify(out, null, 1));
