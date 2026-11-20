// merge-fixes.ts <file.json> : appends {id: Fix} entries to scripts/data/recipe-fixes.json (arrays appended, skipping exact repeats).
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const FILE = ROOT + 'scripts/data/recipe-fixes.json';
const data = JSON.parse(readFileSync(FILE, 'utf8'));
const add: Record<string, Record<string, unknown[]>> = JSON.parse(readFileSync(process.argv[2]!, 'utf8'));
let n = 0;
for (const [id, fix] of Object.entries(add)) {
  const cur = (data.fixes[id] ??= {});
  for (const [k, v] of Object.entries(fix)) {
    const list: unknown[] = (cur[k] ??= []);
    for (const x of v) if (!list.some((y) => JSON.stringify(y) === JSON.stringify(x))) (list.push(x), n++);
  }
}
writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
console.log(n, 'fix entries added');
