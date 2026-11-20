// sync-diets.ts <rebuild log> : sets each batch recipe's stated diets to what its ingredients now give, from the
// rebuild's "diets stated [..] but the ingredients give [..]" lines. Removals always; an added tag only if it's
// pescatarian (a fish dish that had been linked to beef); anything else is printed and left for a decision.
import { readFileSync } from 'node:fs';
import { all } from './batch-io.ts';
const rx = /✗ (\S+): diets stated \[(.*)\] but the ingredients give \[(.*)\]/;
const want = new Map<string, string[]>();
for (const line of readFileSync(process.argv[2]!, 'utf8').split('\n')) {
  const m = rx.exec(line);
  if (m) want.set(m[1]!, m[3] ? m[3].split(', ') : []);
}
const dirty = new Set<any>();
let done = 0;
for (const { h, batch } of all()) {
  const to = want.get(h.id);
  if (!to) continue;
  const added = to.filter((t) => !h.diets.includes(t));
  if (added.some((t) => t !== 'pescatarian') && !process.argv.slice(3).includes(h.id)) {
    console.log(`HELD ${h.id}: would add [${added.join(', ')}]`);
    continue;
  }
  console.log(`${h.id}: [${h.diets.join(', ')}] -> [${to.join(', ')}]`);
  h.diets = to;
  dirty.add(batch);
  done++;
}
for (const b of dirty) b.save();
console.log(done, 'recipes updated', want.size - done, 'held or not found');
