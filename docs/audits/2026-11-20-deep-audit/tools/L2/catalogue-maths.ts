// L2: how often the maths edge cases hit real recipes (counts and a few slugs only; never prints the catalogue).
import fs from 'node:fs';
import { formatLine, scaleLine } from '../../../../../src/domain/ingredients/format';
import { splitStepTimers } from '../../../../../src/domain/cook/cook';
import { shipsInStoreBuilds } from '../../../../../src/domain/recipes/provenance';

type Line = { item: string; raw: string; quantity?: number | { min: number; max: number }; unit?: string; note?: string };
type R = { id: string; servings: number; provenance?: unknown; ingredientGroups: { items: Line[] }[]; steps: ({ text: string } | string)[] };
const all = JSON.parse(fs.readFileSync('src/data/catalogue/recipes.json', 'utf8')) as R[];
const store = all.filter((r) => shipsInStoreBuilds(r.provenance as never));
console.log('recipes', all.length, 'ship in store builds', store.length);

const tally: Record<string, { n: number; recipes: Set<string>; eg: string[] }> = {};
const hit = (k: string, r: R, eg: string) => {
  const t = (tally[k] ??= { n: 0, recipes: new Set(), eg: [] });
  t.n++; t.recipes.add(r.id); if (t.eg.length < 4) t.eg.push(`${r.id}: ${eg}`);
};
const servingsSeen = new Map<number, number>();
for (const r of all) {
  servingsSeen.set(r.servings, (servingsSeen.get(r.servings) ?? 0) + 1);
  if (!(r.servings > 0)) hit('servings not > 0', r, String(r.servings));
  for (const g of r.ingredientGroups) for (const l of g.items) {
    if (l.note && /\d\s*(g|kg|ml|l|oz|lb|cups?|tbsp|tsp)\b/i.test(l.note) && l.quantity !== undefined) hit('note holds an amount that never scales', r, `${l.raw}`);
    // scale to 1 serving
    if (l.quantity !== undefined && r.servings > 1) {
      const one = formatLine(scaleLine(l as never, 1 / r.servings), 'metric');
      if (/^0 /.test(one) || /(^|\s)0 (tsp|tbsp|cup)/.test(one)) hit('shows "0 …" at 1 serving', r, `${l.raw} -> ${one}`);
      const twelve = formatLine(scaleLine(l as never, 12 / r.servings), 'metric');
      if (/^\d+\.\d (cups?|tsp|tbsp)/.test(twelve)) hit('decimal spoon/cup at 12 servings', r, `${l.raw} -> ${twelve}`);
      if (/^0\.\d kg/.test(one)) hit('"0.x kg" at 1 serving', r, `${l.raw} -> ${one}`);
    }
  }
  for (const s of r.steps) {
    const text = typeof s === 'string' ? s : s.text;
    const timers = splitStepTimers(text).filter((x) => x.type === 'timer');
    if (/\b\d+\s*(minutes?|mins?)\s*(and\s*)?\d+\s*(seconds?|secs?)\b/i.test(text)) hit('minutes+seconds split into two timers', r, text.slice(0, 90));
    if (/\b\d+\s*(minutes?|mins?)\s*(to|-|–)\s*\d+\s*(hours?|hrs?)\b/i.test(text)) hit('min-to-hour range gives two timers', r, text.slice(0, 90));
    if (/\b(overnight)\b/i.test(text) && timers.length) hit('overnight step still has a timer', r, text.slice(0, 90));
    if (/\b\d+\s*(minutes?|mins?|hours?)\b/i.test(text) && !timers.length && !/(keeps?|lasts?|store|up to|ahead|advance|within|every|marinat)/i.test(text)) hit('a time in a step with no timer', r, text.slice(0, 90));
  }
}
for (const [k, t] of Object.entries(tally)) console.log(`\n${k}: ${t.n} lines in ${t.recipes.size} recipes\n  ` + t.eg.join('\n  '));
console.log('\nservings values', [...servingsSeen.entries()].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s}:${n}`).join(' '));
