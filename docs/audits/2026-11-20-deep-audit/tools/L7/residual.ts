// Distinct item -> ingredient pairs where the item has words the matched phrase does not cover.
import { writeFileSync } from 'node:fs';
import { normaliseWords } from '../../../../../src/domain/ingredients/database.ts';
import { allLines } from '../../../../../src/domain/recipes/types.ts';
import { recipes, defs, EV } from './load.ts';
const STOP = new Set(
  'a an the of and with in for to fresh large small medium extra virgin dried ground whole raw cooked frozen tinned canned good quality thick thin fine finely ripe firm soft hard baby young old free range organic plain light dark lean full fat low reduced salt unsalted salted sweet sour hot mild smoky smoked white red green yellow black brown golden pink purple mixed packet store bought homemade leftover cold warm boiling day jar bottled bunch handful piece pieces sprig sprigs clove cloves stick sticks sheet sheets slice slices block can tin tins cup cups g kg ml l tbsp tsp pinch good-quality optional extra-virgin whole-milk skinless boneless bone-in thigh fillet fillets breast'.split(' '),
);
const phrasesById = new Map<string, string[][]>();
for (const d of defs) phrasesById.set(d.id, [d.name, ...d.aliases].map(normaliseWords));
const seen = new Map<string, number>();
for (const r of recipes) for (const l of allLines(r)) {
  if (!l.ingredientId) continue;
  const k = l.item.toLowerCase() + ' => ' + l.ingredientId;
  seen.set(k, (seen.get(k) ?? 0) + 1);
}
const out: string[] = [];
for (const [k, n] of seen) {
  const [item, id] = k.split(' => ');
  const words = normaliseWords(item!);
  const cover = new Set((phrasesById.get(id!) ?? []).flat());
  const resid = words.filter((w) => !cover.has(w) && !STOP.has(w) && !/^\d/.test(w));
  if (resid.length) out.push(`${item}=>${id}${n > 1 ? ' x' + n : ''}`);
}
console.log(out.length);
console.log(out.join(' ; '));
writeFileSync(EV + 'residual-words.txt', out.join('\n'));
