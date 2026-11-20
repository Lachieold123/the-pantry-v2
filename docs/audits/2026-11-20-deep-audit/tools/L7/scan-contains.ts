// Recipes whose own "Contains ..." allergen note disagrees with their tags or their linked groups.
import { writeFileSync } from 'node:fs';
import { allLines } from '../../../../../src/domain/recipes/types.ts';
import { recipes, byId, routeOf, EV, csv } from './load.ts';

const NOTE_WORDS: [string, RegExp][] = [
  ['gluten', /\b(gluten|wheat|barley|rye|oats)\b/],
  ['dairy', /\b(milk|dairy|lactose)\b/],
  ['egg', /\beggs?\b/],
  ['fish', /\bfish\b/],
  ['shellfish', /\b(shellfish|crustacean|crustaceans|mollusc|molluscs|prawn|prawns|shrimp)\b/],
  ['tree-nuts', /\b(tree nuts?|nuts|almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|pine nuts?)\b/],
  ['peanuts', /\bpeanuts?\b/],
  ['sesame', /\bsesame\b/],
  ['soy', /\b(soy|soya|soybeans?)\b/],
];
const TAG_FOR: Record<string, string[]> = { gluten: ['no-gluten'], dairy: ['no-dairy', 'vegan'], egg: ['vegan'], fish: ['vegan', 'vegetarian'], shellfish: ['vegan', 'vegetarian'] };
const rows: Record<string, string>[] = [];
let withNote = 0;
for (const r of recipes) {
  const notes = (r.notes ?? []).filter((n) => /\b(contains|allergens?)\b/i.test(n));
  if (!notes.length) continue;
  withNote++;
  const groups = new Set(allLines(r).flatMap((l) => (l.ingredientId ? byId.get(l.ingredientId)?.groups ?? [] : [])));
  for (const n of notes) {
    // only the positive part: stop at "free"/"no"/"check"
    const pos = n.toLowerCase().replace(/\b[a-z]+[- ]free\b/g, ' ').replace(/\b(free of|free from|no|without|check)\b[^.;]*/g, ' ');
    if (!/\bcontains\b/.test(pos)) continue;
    const part = pos.slice(pos.indexOf('contains'));
    for (const [a, rx] of NOTE_WORDS) {
      if (!rx.test(part)) continue;
      const hedged = /\bmay\b|\bcheck\b|\bsome\b|\bif\b/.test(part);
      for (const t of TAG_FOR[a] ?? []) if (r.diets.includes(t as never)) rows.push({ slug: r.id, route: routeOf(r.id), provenance: r.provenance ?? '', kind: 'note-contradicts-tag', allergen: a, tag: t, note: n, certainty: hedged ? 'review' : 'certain', correctedValue: `remove "${t}" or fix the line/note` });
      if (!groups.has(a as never)) rows.push({ slug: r.id, route: routeOf(r.id), provenance: r.provenance ?? '', kind: 'note-says-contains-but-no-linked-line-has-group(avoid list misses it)', allergen: a, tag: '', note: n, certainty: hedged ? 'review' : 'certain', correctedValue: `link the line that carries ${a} to an ingredient with the ${a} group` });
    }
    // and the reverse: linked allergen groups missing from the note
    for (const g of ['peanuts', 'tree-nuts', 'sesame', 'shellfish', 'fish', 'egg', 'soy', 'gluten', 'dairy']) {
      const named = NOTE_WORDS.find(([a]) => a === g)![1].test(part);
      if (groups.has(g as never) && !named) rows.push({ slug: r.id, route: routeOf(r.id), provenance: r.provenance ?? '', kind: 'note-omits-allergen-the-lines-have', allergen: g, tag: '', note: n, certainty: 'review', correctedValue: `add ${g} to the Contains note` });
    }
  }
}
const by = (k: string, rs = rows) => rs.reduce<Record<string, number>>((a, r) => ((a[r[k]!] = (a[r[k]!] ?? 0) + 1), a), {});
console.log('recipes with a Contains note', withNote, 'rows', rows.length, by('kind'));
const cert = rows.filter((r) => r.certainty === 'certain');
console.log('certain', cert.length, by('kind', cert), by('allergen', cert));
for (const r of cert.filter((x) => x.kind === 'note-contradicts-tag').slice(0, 30)) console.log(` ${r.slug} [${r.provenance}] ${r.tag} vs ${r.allergen}: ${r.note.slice(0, 120)}`);
for (const r of cert.filter((x) => x.kind !== 'note-contradicts-tag' && x.kind !== 'note-omits-allergen-the-lines-have').slice(0, 30)) console.log(` M ${r.slug} ${r.allergen}: ${r.note.slice(0, 120)}`);
console.log('omits by allergen', by('allergen', rows.filter((r) => r.kind === 'note-omits-allergen-the-lines-have')));
writeFileSync(EV + 'contains-note-mismatches.csv', csv(rows));
