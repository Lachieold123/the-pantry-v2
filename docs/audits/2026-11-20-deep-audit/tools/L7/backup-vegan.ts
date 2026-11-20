// Which slugs are vegan in the 17 Oct backups and payloads (to compare with the live feed's vegan set).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { ROOT, EV } from './load.ts';
const B = ROOT + 'docs/backups/';
const out: Record<string, string[]> = {};
const walk = (v: any, file: string) => {
  if (Array.isArray(v)) return v.forEach((x) => walk(x, file));
  if (v && typeof v === 'object') {
    const slug = v.slug ?? v.recipe?.id ?? (typeof v.id === 'string' && !/^[0-9a-f]{8}-/.test(v.id) ? v.id : undefined);
    const diets = v.diets ?? v.recipe?.diets;
    if (typeof slug === 'string' && Array.isArray(diets) && diets.includes('vegan')) (out[file] ??= []).push(slug);
    else for (const x of Object.values(v)) walk(x, file);
  }
};
const files = ['supabase-2026-10-17/published_recipes.json', 'feed-payloads-2026-10-17/feed-inserts.json', 'feed-payloads-2026-10-17/feed-updates.json', 'feed-payloads-2026-10-17/feed-compact-updates.json', ...readdirSync(B + 'feed-payloads-2026-10-17/chunks').map((f) => 'feed-payloads-2026-10-17/chunks/' + f)];
for (const f of files) {
  const raw = readFileSync(B + f, 'utf8');
  try { walk(JSON.parse(raw), f); } catch { const m = [...raw.matchAll(/'([a-z0-9-]+)'[^;]{0,4000}?ARRAY\[[^\]]*'vegan'/g)].map((x) => x[1]!); if (m.length) out[f] = m; }
}
for (const [f, s] of Object.entries(out)) console.log(f, s.length);
const idSlug = new Map<string, string>((JSON.parse(readFileSync(B + 'supabase-2026-10-17/published_recipes.json', 'utf8')) as any[]).map((r) => [r.id, r.slug]));
const all = [...new Set(Object.values(out).flat().map((s) => idSlug.get(s) ?? s))].sort();
for (const [f, s] of Object.entries(out)) writeFileSync(EV + 'backup-vegan-' + f.split('/').pop()!.replace('.json', '') + '.txt', s.map((x) => idSlug.get(x) ?? x).sort().join('\n'));
console.log('distinct vegan slugs in backups', all.length);
writeFileSync(EV + 'backup-vegan-slugs.txt', all.join('\n'));
console.log(all.map((s) => `'${s}'`).join(','));
