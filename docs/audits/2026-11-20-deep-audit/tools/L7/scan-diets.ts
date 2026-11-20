// Lane 7: recompute diet tags and allergen links from every recipe's own words,
// independent of the project's checker, then compare with the project's answers.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deriveDiets } from '../../../../../src/domain/recipes/diets.ts';
import { allLines, type DietTag } from '../../../../../src/domain/recipes/types.ts';
import { dietTextProblems } from '../../../../../scripts/recipe-text-checks.mts';
import { families, MEATS, type Fam } from './families.ts';
import { recipes, byId, routeOf, EV, csv } from './load.ts';
import { FAM_GROUP } from './fam-group.ts';

mkdirSync(EV, { recursive: true });
const RULE: Record<DietTag, Fam[]> = {
  vegan: [...MEATS, 'fish', 'shellfish', 'dairy', 'egg', 'honey', 'rennet-gelatine'],
  vegetarian: [...MEATS, 'fish', 'shellfish', 'rennet-gelatine'],
  pescatarian: [...MEATS],
  'no-gluten': ['gluten'],
  'no-dairy': ['dairy'],
};
// Words that can mean the family but often don't: always "review", never "certain".
const AMBIG = new Set(
  'stock stock cube bouillon gravy sausage sausages mince noodle noodles vermicelli wrap wraps tortilla tortillas cracker crackers biscuit biscuits cookie cookies cake sponge batter muffin muffins english muffin pancake pancakes naan brioche custard curd curds whites white yolk yolks seafood bug bugs ling sole roe blood liver livers chestnut chestnuts nuts oat oats malt ale lager stout chuck rump kidney kidneys crema massaman satay dukkah romesco carbonara frittata omelette gado gado butter chicken caesar dressing kare kare pavlova challah baklava raita tzatziki lassi cereal granola muesli financier financiers hummus houmous furikake hot dog hot dogs frankfurt frankfurts roux bran kulfi alfredo bechamel béchamel pesto steak steaks beer scones scone cookies pastry hot_dog hot_dogs gado_gado butter_chicken caesar_dressing kare_kare english_muffin stock_cube'.replace(/_/g, ' ').split(
    ' ',
  ),
);
const MEAT_GROUPS = ['meat', 'beef', 'pork', 'lamb', 'poultry'];
const hasGroup = (groups: readonly string[], f: Fam) =>
  MEATS.includes(f) ? (f === 'meat' ? groups.some((g) => MEAT_GROUPS.includes(g)) : groups.includes(FAM_GROUP[f]) || (groups.includes('meat') && f !== 'poultry' && false)) : groups.includes(FAM_GROUP[f]);

type Row = Record<string, string | number | boolean>;
const tagRows: Row[] = [];
const linkRows: Row[] = [];
const staleRows: Row[] = [];
const theirs = new Map<string, string[]>();
const stepRows: Row[] = [];
const SWAP = /\b(swap|instead|replace|or use|vegan|vegetarian|gluten-free|dairy-free|substitut|omit|leave out|check|label|optional|if you|alternative|works with|try)\b/i;

for (const r of recipes) {
  const lines = allLines(r);
  const route = routeOf(r.id);
  // 1. Is the stored tag what deriveDiets gives today?
  const now = deriveDiets(lines, byId).sort().join(',');
  const stored = [...r.diets].sort().join(',');
  if (now !== stored) staleRows.push({ slug: r.id, route, stored, derivedNow: now });
  // 2. The project's own word check on the built recipe.
  const p = dietTextProblems(r.diets, lines.map((l) => `${l.item}${l.optional ? ' (optional)' : ''}`));
  if (p.length) theirs.set(r.id, p);
  const lineFams: Set<Fam> = new Set();
  for (const l of lines) {
    const item = l.item.toLowerCase();
    const raw = l.raw.toLowerCase();
    const groups = l.ingredientId ? byId.get(l.ingredientId)?.groups ?? [] : [];
    const fi = families(item);
    const fr = families(raw);
    for (const f of fr.keys()) lineFams.add(f);
    // 3. Line names an allergen family but its link lacks the group: the avoid list and diets miss it.
    for (const [f, words] of fi) {
      if (f === 'meat' && groups.some((g) => MEAT_GROUPS.includes(g))) continue;
      if (hasGroup(groups, f)) continue;
      const ambiguous = words.every((x) => AMBIG.has(x)) || / or /.test(item);
      linkRows.push({ slug: r.id, route, provenance: r.provenance ?? '', family: f, missingGroup: FAM_GROUP[f], words: words.join('|'), item: l.item, raw: l.raw, linkedId: l.ingredientId ?? '', linkedGroups: groups.join('|'), optional: !!l.optional, certainty: ambiguous ? 'review' : 'certain' });
    }
    // 4. Tag check, line by line.
    for (const tag of r.diets) {
      for (const f of RULE[tag]) {
        const inItem = fi.get(f);
        const inRaw = fr.get(f);
        if (!inItem && !inRaw) continue;
        let certainty = 'certain';
        let why = 'item names it';
        if (!inItem) { certainty = 'review'; why = 'only in note/brackets/prep ("or" alternative or serving)'; }
        else if (l.optional) { certainty = 'review'; why = 'optional line (deriveDiets skips it)'; }
        else if (inItem.every((x) => AMBIG.has(x))) { certainty = 'review'; why = 'ambiguous word'; }
        else if (/ or /.test(item)) { certainty = 'review'; why = '"or" in item'; }
        tagRows.push({ slug: r.id, route, provenance: r.provenance ?? '', tag, family: f, words: (inItem ?? inRaw)!.join('|'), raw: l.raw, linkedId: l.ingredientId ?? '', linkedGroups: groups.join('|'), certainty, why, correctedValue: `remove "${tag}" (or relink/reword the line)`, projectCheckFlags: p.length > 0 });
      }
    }
  }
  // 5. Steps and notes that use a tag-breaking ingredient the list never names.
  const text = [...r.steps.map((s) => s.text), ...(r.notes ?? [])];
  for (const tag of r.diets) {
    for (const f of RULE[tag]) {
      if (lineFams.has(f)) continue;
      for (const t of text) {
        for (const sentence of t.split(/(?<=[.!?])\s+/)) {
          if (SWAP.test(sentence)) continue;
          const m = families(sentence).get(f);
          if (m && !m.every((x) => AMBIG.has(x))) stepRows.push({ slug: r.id, route, provenance: r.provenance ?? '', tag, family: f, words: m.join('|'), sentence: sentence.slice(0, 200), certainty: 'review' });
        }
      }
    }
  }
}

const by = (rows: Row[], k: string) => rows.reduce<Record<string, number>>((a, r) => ((a[String(r[k])] = (a[String(r[k])] ?? 0) + 1), a), {});
const uniq = (rows: Row[]) => new Set(rows.map((r) => r.slug)).size;
console.log('stale stored diets vs deriveDiets now:', staleRows.length, staleRows.slice(0, 5));
console.log('project dietTextProblems flags on built catalogue:', theirs.size);
const certainTag = tagRows.filter((r) => r.certainty === 'certain');
console.log('tag rows', tagRows.length, 'recipes', uniq(tagRows), 'certain rows', certainTag.length, 'certain recipes', uniq(certainTag));
console.log('certain by tag', by(certainTag, 'tag'), 'by family', by(certainTag, 'family'));
console.log('review by why', by(tagRows.filter((r) => r.certainty === 'review'), 'why'));
for (const r of certainTag.slice(0, 40)) console.log(` C ${r.slug} [${r.provenance}] ${r.tag}/${r.family} "${r.raw}" -> ${r.linkedId}{${r.linkedGroups}} theirs=${r.projectCheckFlags}`);
const certLink = linkRows.filter((r) => r.certainty === 'certain');
console.log('link-miss rows', linkRows.length, 'certain', certLink.length, 'by family', by(certLink, 'family'));
const pairs = by(certLink.map((r) => ({ k: `${r.linkedId}<-${r.words}` }) as Row), 'k');
console.log('certain link-miss pairs', Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 70).map(([k, n]) => `${k} x${n}`).join(' ; '));
console.log('step/notes mentions', stepRows.length, 'recipes', uniq(stepRows), by(stepRows, 'family'));
writeFileSync(EV + 'diet-tag-offenders.csv', csv(tagRows));
writeFileSync(EV + 'allergen-link-misses.csv', csv(linkRows));
writeFileSync(EV + 'stale-diets.csv', csv(staleRows));
writeFileSync(EV + 'steps-mention-tag-breakers.csv', csv(stepRows));
writeFileSync(EV + 'project-text-check-flags.json', JSON.stringify(Object.fromEntries(theirs), null, 1));
