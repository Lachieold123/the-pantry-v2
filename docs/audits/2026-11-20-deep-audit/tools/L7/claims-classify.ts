// Splits the unhedged text claims into certain (an ingredient that plainly breaks the claim) and label-dependent.
import { readFileSync, writeFileSync } from 'node:fs';
import { EV, csv } from './load.ts';
const LABEL = new Set(['baking-powder', 'cornflour', 'smoked-sausage', 'italian-sausage', 'pork-sausage', 'chorizo', 'dark-chocolate', 'vegetable-stock', 'chicken-stock', 'beef-stock', 'mustard-powder', 'english-mustard', 'asafoetida', 'rolled-oats', 'stuffing-mix', 'gravy', 'puff-pastry', 'crisps', 'curry-powder', 'miso', 'bread-roll', 'burger-bun', 'white-bread']);
const text = readFileSync(EV + 'text-claims-vs-lines.csv', 'utf8');
const lines = text.trim().split('\n');
const head = lines.shift()!.split(',');
// quick CSV split honouring quotes
const split = (s: string) => { const out: string[] = []; let c = '', q = false; for (let i = 0; i < s.length; i++) { const ch = s[i]!; if (q) { if (ch === '"' && s[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; } else if (ch === '"') q = true; else if (ch === ',') { out.push(c); c = ''; } else c += ch; } out.push(c); return out; };
const rows = lines.map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v])));
const out = rows.filter((r) => r.hedged === 'no').map((r) => {
  const ids = r.breakingLines!.split(' || ').map((b) => b.split(' => ')[1]!);
  const certain = ids.some((id) => !LABEL.has(id));
  return { ...r, certainty: certain ? 'certain' : 'review (label-dependent: ' + ids.join('|') + ')', correctedValue: `reword the "${r.claim}" claim or change the breaking line` };
});
const c = out.filter((r) => r.certainty === 'certain');
console.log('unhedged', out.length, 'certain', c.length, 'recipes', new Set(c.map((r) => r.slug)).size);
for (const r of c) console.log(` ${r.slug} | ${r.claim} | "${r.sentence}" <- ${r.breakingLines!.slice(0, 110)}`);
writeFileSync(EV + 'text-claims-false.csv', csv(out));
