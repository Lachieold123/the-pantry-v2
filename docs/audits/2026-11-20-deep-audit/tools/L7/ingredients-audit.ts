// Every ingredient's name and aliases against its groups, using lane 7's word lists.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { families, type Fam } from './families.ts';
const root = '/Users/lachlanoldfield/Developer/the-pantry-v2/.claude/worktrees/audit-1120/';
const ev = root + 'docs/audits/2026-11-20-deep-audit/evidence/L7/';
mkdirSync(ev, { recursive: true });
export const FAM_GROUP: Record<Fam, string> = {
  meat: 'meat', poultry: 'poultry', pork: 'pork', beef: 'beef', lamb: 'lamb', fish: 'fish', shellfish: 'shellfish',
  dairy: 'dairy', egg: 'egg', gluten: 'gluten', 'tree-nuts': 'tree-nuts', peanuts: 'peanuts', sesame: 'sesame', soy: 'soy',
  honey: 'animal-product', 'rennet-gelatine': 'non-vegetarian',
};
const defs: any[] = JSON.parse(readFileSync(root + 'src/data/ingredients/ingredients.json', 'utf8'));
const rows: any[] = [];
const gcount = new Map<string, number>();
for (const d of defs) {
  for (const g of d.groups) gcount.set(g, (gcount.get(g) ?? 0) + 1);
  for (const phrase of [d.name, ...d.aliases]) {
    for (const [f, words] of families(phrase)) {
      const g = FAM_GROUP[f];
      const has = d.groups.includes(g) || (f === 'meat' && d.groups.some((x: string) => ['meat', 'beef', 'pork', 'lamb', 'poultry'].includes(x)));
      if (!has) rows.push({ id: d.id, name: d.name, phrase, missingGroup: g, words: words.join('|'), groups: d.groups.join(',') });
    }
  }
}
// meat-subgroup without meat
for (const d of defs) if (d.groups.some((x: string) => ['beef', 'pork', 'lamb', 'poultry'].includes(x)) && !d.groups.includes('meat')) rows.push({ id: d.id, name: d.name, phrase: '', missingGroup: 'meat', words: 'subgroup without meat', groups: d.groups.join(',') });
console.log('groups', Object.fromEntries(gcount));
console.log('mismatch rows', rows.length);
const seen = new Set<string>();
for (const r of rows) {
  const k = r.id + r.missingGroup;
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`${r.id} | -${r.missingGroup} | "${r.phrase}" [${r.words}] | has ${r.groups}`);
}
writeFileSync(ev + 'ingredient-group-gaps.raw.json', JSON.stringify(rows, null, 1));
