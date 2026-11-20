// photo-todo.ts : FOOD-10. From evidence/L7/photos.csv (tools/L7/photos.ts), which CC BY credits already have a Commons
// file page in src/data/catalogue/photoSources.ts, and the rest, written to FIX-L7-PHOTOS-TODO.csv for the owner.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PHOTO_SOURCES } from '../../../../../src/data/catalogue/photoSources.ts';
const ROOT = new URL('../../../../../', import.meta.url).pathname;
const D = ROOT + 'docs/audits/2026-11-20-deep-audit/';
const [head, ...lines] = readFileSync(D + 'evidence/L7/photos.csv', 'utf8').trim().split('\n');
// The CSV quotes fields with commas; the first five fields never have them.
const rows = lines.map((l) => ({ l, f: l.split(',') }));
const cols = head!.split(',');
const pi = cols.indexOf('problems');
const todo: string[] = ['slug,provenance,key,licence,problem,credit,what is needed'];
const tally: Record<string, number> = {};
for (const { l } of rows) {
  const m = /^([^,]+),("[^"]*"|[^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),(.*)$/.exec(l);
  if (!m) continue;
  const [, slug, , prov, key, licence, , problems, credit] = m;
  if (!problems) continue;
  for (const p of problems.split('|')) {
    if (p === 'AI image') { tally['AI image: false hit (letters in a name)'] = (tally['AI image: false hit (letters in a name)'] ?? 0) + 1; continue; }
    if (p === 'CC BY without source link' && PHOTO_SOURCES[slug!]) { tally['CC BY: Commons page in photoSources.ts'] = (tally['CC BY: Commons page in photoSources.ts'] ?? 0) + 1; continue; }
    if (p === 'Pexels with no link') { tally['Pexels: no attribution needed'] = (tally['Pexels: no attribution needed'] ?? 0) + 1; continue; }
    tally[p] = (tally[p] ?? 0) + 1;
    const need = p === 'no credit' ? 'where the old-app photo came from, its author and licence' : 'the Commons file page (source link)';
    todo.push([slug, prov, key, licence, p, credit, need].join(','));
  }
}
void pi;
// K-30: image keys with no file in assets/recipes.
const files = new Set(readdirSync(ROOT + 'assets/recipes').map((f) => f.replace(/\.(webp|jpe?g|png)$/i, '')));
for (const { l } of rows) {
  const m = /^([^,]+),("[^"]*"|[^,]*),([^,]*),([^,]*),([^,]*)/.exec(l);
  if (m && m[4] && !files.has(m[4])) (todo.push([m[1], m[3], m[4], m[5], 'no image file (K-30)', '', 'the photo file or drop the image key'].join(',')), (tally['no image file'] = (tally['no image file'] ?? 0) + 1));
}
writeFileSync(D + 'FIX-L7-PHOTOS-TODO.csv', todo.join('\n') + '\n');
console.log(tally, 'todo rows', todo.length - 1);
