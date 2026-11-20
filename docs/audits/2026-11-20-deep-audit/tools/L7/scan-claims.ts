// Notes and summaries that claim "gluten-free", "dairy-free", "vegan", "vegetarian", "nut-free" etc.,
// checked against the derived tags and the linked groups (which lines break the claim).
import { writeFileSync } from 'node:fs';
import { allLines } from '../../../../../src/domain/recipes/types.ts';
import { recipes, byId, routeOf, EV, csv } from './load.ts';
const CLAIMS: [string, RegExp, string[]][] = [
  ['gluten-free', /\bgluten[- ]free\b/i, ['gluten']],
  ['dairy-free', /\bdairy[- ]free\b/i, ['dairy']],
  ['egg-free', /\begg[- ]free\b/i, ['egg']],
  ['nut-free', /\bnut[- ]free\b/i, ['tree-nuts', 'peanuts']],
  ['vegan', /^(?:vegan\b|.*\b(?:is|naturally|fully|completely|and) vegan\b)/i, ['meat', 'fish', 'shellfish', 'dairy', 'egg', 'animal-product', 'non-vegetarian']],
  ['vegetarian', /^(?:vegetarian\b|.*\b(?:is|naturally|fully|and) vegetarian\b)/i, ['meat', 'fish', 'shellfish', 'non-vegetarian']],
];
const HEDGE = /n't|\bnot\b|\bnever\b|\bunless\b|\b(check|if|use|swap|make it|to make|for a|version|option|choose|look for|label|instead|replace|can be|could|substitut)\b/i;
const rows: Record<string, string>[] = [];
for (const r of recipes) {
  const texts = [r.summary ?? '', r.title, ...(r.notes ?? [])];
  for (const t of texts) {
    for (const sentence of t.split(/(?<=[.!?])\s+/)) {
      for (const [claim, rx, groups] of CLAIMS) {
        if (!rx.test(sentence)) continue;
        const breakers = allLines(r).filter((l) => !l.optional && l.ingredientId && (byId.get(l.ingredientId)?.groups ?? []).some((g) => groups.includes(g)));
        if (!breakers.length) continue;
        rows.push({ slug: r.id, route: routeOf(r.id), provenance: r.provenance ?? '', claim, sentence: sentence.slice(0, 160), hedged: HEDGE.test(sentence) ? 'yes' : 'no', breakingLines: breakers.map((l) => `${l.raw} => ${l.ingredientId}`).join(' || '), diets: r.diets.join('|') });
      }
    }
  }
}
const by = (k: string, rs = rows) => rs.reduce<Record<string, number>>((a, r) => ((a[r[k]!] = (a[r[k]!] ?? 0) + 1), a), {});
const plain = rows.filter((r) => r.hedged === 'no');
console.log('claim rows', rows.length, 'unhedged', plain.length, by('claim', plain), by('provenance', plain));
const ing = new Map<string, number>();
for (const r of plain) for (const b of r.breakingLines.split(' || ')) { const id = b.split(' => ')[1]!; ing.set(id, (ing.get(id) ?? 0) + 1); }
console.log('breaking ingredient ids', [...ing].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, n]) => `${k} x${n}`).join(', '));
for (const r of plain.slice(0, 25)) console.log(` ${r.slug} [${r.provenance}] "${r.sentence}" <- ${r.breakingLines.slice(0, 140)}`);
writeFileSync(EV + 'text-claims-vs-lines.csv', csv(rows));
