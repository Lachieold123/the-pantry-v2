// The "mustard greens -> Dijon" class: a line links to one ingredient while the rest of
// its words name another ingredient with different allergen or diet groups.
import { writeFileSync } from 'node:fs';
import { normaliseWords } from '../../../../../src/domain/ingredients/database.ts';
import { allLines } from '../../../../../src/domain/recipes/types.ts';
import { recipes, defs, byId, index, routeOf, EV, csv } from './load.ts';

const phrases = defs.flatMap((d) => [d.name, ...d.aliases].map((p) => ({ id: d.id, words: normaliseWords(p) })));
phrases.sort((a, b) => b.words.length - a.words.length);
const find = (words: string[], ph: string[]) => {
  for (let i = 0; i + ph.length <= words.length; i++) if (ph.every((w, j) => words[i + j] === w)) return i;
  return -1;
};
const SIG = new Set(['meat', 'beef', 'pork', 'lamb', 'poultry', 'fish', 'shellfish', 'dairy', 'egg', 'gluten', 'tree-nuts', 'peanuts', 'sesame', 'soy', 'animal-product', 'non-vegetarian']);
type Pair = { item: string; linked: string; matched: string; other: string; lost: string; gained: string; n: number; slugs: Set<string> };
const pairs = new Map<string, Pair>();
let distinct = new Set<string>();
for (const r of recipes) {
  for (const l of allLines(r)) {
    if (!l.ingredientId) continue;
    distinct.add(l.item.toLowerCase() + '>' + l.ingredientId);
    const words = normaliseWords(l.item);
    const hit = phrases.find((p) => p.id === l.ingredientId && find(words, p.words) >= 0);
    if (!hit) continue;
    const at = find(words, hit.words);
    const rest = [...words.slice(0, at), '|', ...words.slice(at + hit.words.length)].join(' ');
    const otherId = index.match(rest.replace('|', ' ')) ;
    // also try each side separately
    const sides = rest.split('|').map((s) => s.trim()).filter(Boolean);
    const others = new Set([otherId, ...sides.map((s) => index.match(s))].filter((x): x is string => !!x && x !== l.ingredientId));
    for (const o of others) {
      const lg = new Set((byId.get(l.ingredientId)?.groups ?? []).filter((g) => SIG.has(g)));
      const og = new Set((byId.get(o)?.groups ?? []).filter((g) => SIG.has(g)));
      const lost = [...og].filter((g) => !lg.has(g));
      const gained = [...lg].filter((g) => !og.has(g));
      if (!lost.length && !gained.length) continue;
      const k = l.item.toLowerCase() + '>' + l.ingredientId + '>' + o;
      const p = pairs.get(k) ?? { item: l.item.toLowerCase(), linked: l.ingredientId, matched: hit.words.join(' '), other: o, lost: lost.join('|'), gained: gained.join('|'), n: 0, slugs: new Set<string>() };
      p.n++;
      p.slugs.add(r.id);
      pairs.set(k, p);
    }
  }
}
const list = [...pairs.values()].sort((a, b) => b.n - a.n);
console.log('distinct item>id pairs', distinct.size, 'suspicious', list.length, 'with lost groups', list.filter((p) => p.lost).length);
for (const p of list.filter((p) => p.lost)) console.log(`${p.item} => ${p.linked} (via "${p.matched}") also names ${p.other}; link loses [${p.lost}] x${p.n}`);
writeFileSync(EV + 'link-word-clash.csv', csv(list.map((p) => ({ item: p.item, linkedId: p.linked, matchedPhrase: p.matched, otherIngredientNamed: p.other, groupsTheLinkLoses: p.lost, groupsTheLinkAdds: p.gained, lines: p.n, slugs: [...p.slugs].join(' '), routes: [...new Set([...p.slugs].map(routeOf))].join(' ') }))));
