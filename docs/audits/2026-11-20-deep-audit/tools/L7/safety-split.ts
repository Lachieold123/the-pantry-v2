// Tally food-safety rows by route (converted vs batch) and certainty; write certain/review splits.
import { readFileSync, writeFileSync } from 'node:fs';
import { EV, csv } from './load.ts';
const text = readFileSync(EV + 'food-safety.csv', 'utf8').trim().split('\n');
const split = (s: string) => { const out: string[] = []; let c = '', q = false; for (let i = 0; i < s.length; i++) { const ch = s[i]!; if (q) { if (ch === '"' && s[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; } else if (ch === '"') q = true; else if (ch === ',') { out.push(c); c = ''; } else c += ch; } out.push(c); return out; };
const head = split(text.shift()!);
let rows = text.map((l) => Object.fromEntries(split(l).map((v, i) => [head[i]!, v])));
// known false-positive patterns found by eye
rows = rows.map((r) => {
  if (r.check === 'honey-infant' && !/\b(infant|babies|weaning|first foods?|months old)\b/i.test(r.detail!.split(': ').slice(1).join(': '))) return { ...r, certainty: 'refuted (baby potatoes/leaves)' };
  if (r.check === 'poultry-pink' && /prawn|beef|shrimp/i.test(r.detail!)) return { ...r, certainty: 'refuted (prawns/beef pink)' };
  if (r.check === 'mince-rare' && /no pink/i.test(r.detail!)) return { ...r, certainty: 'refuted (says no pink, 75C)' };
  return r;
});
const kind = (r: Record<string, string>) => (r.route!.includes('recipe-fixes') ? 'converted' : 'batch');
const t: Record<string, Record<string, number>> = {};
for (const r of rows) { const k = `${r.check} ${r.certainty!.split(' ')[0]}`; t[k] ??= {}; t[k]![kind(r)] = (t[k]![kind(r)] ?? 0) + 1; }
for (const [k, v] of Object.entries(t).sort()) console.log(k, JSON.stringify(v));
const shipped = rows.filter((r) => r.provenance === 'reviewed' && r.certainty === 'certain');
console.log('certain rows on reviewed (store build) recipes', shipped.length, 'recipes', new Set(shipped.map((r) => r.slug)).size);
writeFileSync(EV + 'food-safety-certain.csv', csv(rows.filter((r) => r.certainty === 'certain')));
writeFileSync(EV + 'food-safety-review.csv', csv(rows.filter((r) => r.certainty !== 'certain')));
