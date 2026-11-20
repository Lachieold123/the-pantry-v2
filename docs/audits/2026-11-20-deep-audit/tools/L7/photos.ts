// Photo hygiene: every image has a credit, licence and source; files exist; sample for contact sheets.
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { recipes, routeOf, EV, ROOT, csv } from './load.ts';
const withImg = recipes.filter((r: any) => r.image);
console.log('recipes', recipes.length, 'with image', withImg.length, 'keys', [...new Set(withImg.flatMap((r: any) => Object.keys(r.image)))].join(','));
const rows: Record<string, string>[] = [];
const lic: Record<string, number> = {};
const src: Record<string, number> = {};
for (const r of withImg as any[]) {
  const im = r.image;
  const credit = JSON.stringify(im.credit ?? im.attribution ?? '');
  const l = String(im.licence ?? im.license ?? im.credit?.licence ?? im.credit?.license ?? (credit.match(/CC[- ]BY[- A-Z0-9.]*|CC0|Pexels|public domain/i)?.[0] ?? 'none'));
  lic[l] = (lic[l] ?? 0) + 1;
  const s = String(im.source ?? im.credit?.source ?? (credit.match(/wikimedia|commons|pexels|unsplash|ai|generated/i)?.[0] ?? 'none'));
  src[s] = (src[s] ?? 0) + 1;
  const problems: string[] = [];
  if (credit === '""' || credit === '{}') problems.push('no credit');
  if (/BY/i.test(l) && !/author|by |©|\w+ \w+/.test(credit)) problems.push('CC BY without author');
  if (/BY/i.test(l) && !/http|url|link|source/i.test(credit + JSON.stringify(im))) problems.push('CC BY without source link');
  if (/pexels/i.test(credit + s) && !/pexels\.com\/photo|https?:/i.test(JSON.stringify(im))) problems.push('Pexels with no link');
  if (/\b(ai|generated|midjourney|dall|imagen|flux)\b/i.test(credit + s)) problems.push('AI image');
  rows.push({ slug: r.id, route: routeOf(r.id), provenance: r.provenance ?? '', key: im.key ?? '', licence: l, source: s, problems: problems.join('|'), credit: credit.slice(0, 160) });
}
console.log('licences', lic, 'sources', src);
const bad = rows.filter((r) => r.problems);
const p: Record<string, number> = {};
for (const r of bad) for (const x of r.problems!.split('|')) p[x] = (p[x] ?? 0) + 1;
console.log('problems', p);
for (const r of bad.slice(0, 4)) console.log(' ', r.slug, r.problems, r.credit);
// files on disk
const dirs = ['assets/recipes', 'assets/images/recipes', 'src/assets/recipes', 'assets/recipe-photos'].filter((d) => existsSync(ROOT + d));
const files = dirs.flatMap((d) => readdirSync(ROOT + d).map((f) => f.replace(/\.(webp|jpe?g|png)$/i, '')));
const keys = new Set(rows.map((r) => r.key));
console.log('image dirs', dirs, 'files', files.length, 'keys missing a file', rows.filter((r) => files.length && !files.includes(r.key!)).length, 'files with no recipe', files.filter((f) => !keys.has(f)).length);
writeFileSync(EV + 'photos.csv', csv(rows));
// a spread sample of 60 for contact sheets
const sample = withImg.filter((_, i) => i % Math.max(1, Math.floor(withImg.length / 60)) === 0).slice(0, 60).map((r: any) => `${r.id}\t${r.image.key}\t${r.title}`);
writeFileSync(EV + 'photo-sample.tsv', sample.join('\n'));
