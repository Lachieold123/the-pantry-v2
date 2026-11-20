// Writes two ffmpeg concat lists (30 photos each) from photo-sample.tsv, skipping missing files.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { EV, ROOT } from './load.ts';
const rows = readFileSync(EV + 'photo-sample.tsv', 'utf8').trim().split('\n').map((l) => l.split('\t'));
const ok = rows.filter(([, key]) => existsSync(`${ROOT}assets/recipes/${key}.webp`));
for (const [n, part] of [ok.slice(0, 30), ok.slice(30, 60)].entries()) {
  writeFileSync(EV + `sheet${n + 1}.txt`, part.map(([, key]) => `file '${ROOT}assets/recipes/${key}.webp'\nduration 1`).join('\n'));
  writeFileSync(EV + `sheet${n + 1}-index.tsv`, part.map(([id, , t], i) => `${i}\t${id}\t${t}`).join('\n'));
  console.log(`sheet${n + 1}`, part.length);
}
