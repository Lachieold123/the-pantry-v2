// FIX-LOGIC PERF-4: how many rows a full week's shopping list really has (21 meals, empty cupboard), and how long deriving it takes.
import '../L2/dev-global';
import { CATALOGUE, INGREDIENTS } from '../../../../../src/data/catalogue/catalogue';
import { deriveShoppingList, EMPTY_EDITS } from '../../../../../src/domain/shopping/derive';
import { addDays, SLOTS, weekStart, type PlanEntry } from '../../../../../src/domain/plan/week';

const byId = new Map(CATALOGUE.map((r) => [r.id, r]));
const start = weekStart('2026-11-16');
const counts: number[] = [];
let slowest = 0;
for (let trial = 0; trial < 50; trial++) {
  const entries: PlanEntry[] = [];
  for (let d = 0; d < 7; d++)
    for (const slot of SLOTS) {
      const pool = CATALOGUE.filter((r) => r.mealTypes.includes(slot));
      const r = pool[(trial * 97 + d * 31 + slot.length * 13) % pool.length]!;
      entries.push({ id: `${d}${slot}`, recipeId: r.id, day: addDays(start, d), slot, servings: 4 });
    }
  const t = performance.now();
  const list = deriveShoppingList({ entries, getRecipe: (id) => byId.get(id), index: INGREDIENTS, cupboard: new Set(), edits: EMPTY_EDITS, units: 'metric' });
  slowest = Math.max(slowest, performance.now() - t);
  counts.push(list.sections.reduce((n, s) => n + s.items.length, 0) + list.inCupboard.length);
}
counts.sort((a, b) => a - b);
console.log('rows over 50 full weeks: min', counts[0], 'median', counts[25], 'max', counts[49], '| slowest derive', slowest.toFixed(1), 'ms');
