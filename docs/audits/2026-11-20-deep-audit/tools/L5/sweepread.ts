// Lane 5: summarise sweep.json (small controls, unnamed controls, headings, page errors, non-GET requests).
// Run: npx tsx docs/audits/2026-11-20-deep-audit/tools/L5/sweepread.ts
import fs from 'node:fs';

const r = JSON.parse(fs.readFileSync('docs/audits/2026-11-20-deep-audit/evidence/L5/sweep.json', 'utf8')) as Record<string, any>;
const small = new Map<string, string[]>();
for (const [screen, s] of Object.entries(r)) {
  const controls: any[] = s.controls ?? s.clickables ?? [];
  const unnamed = controls.filter((c) => !String(c.name ?? '').trim());
  for (const c of controls) {
    const w = c.w ?? c.width, h = c.h ?? c.height;
    if (w && h && (w < 44 || h < 44) && w > 0) {
      const k = `${String(c.name).slice(0, 40)} ${Math.round(w)}x${Math.round(h)}`;
      small.set(k, [...(small.get(k) ?? []), screen]);
    }
  }
  const heads = (s.headings ?? []).length;
  const errs = (s.errors ?? []).filter((e: string) => !/supabase|ERR_INTERNET|Failed to fetch|net::/i.test(e));
  const writes = (s.requests ?? []).filter((q: string) => !/^GET|ABORT/.test(q));
  if (unnamed.length || !heads || errs.length || writes.length)
    console.log(screen, '| unnamed', unnamed.length, '| headings', heads, '| errors', errs.slice(0, 2).join(' / ').slice(0, 160), '| writes', writes.slice(0, 2).join(' '));
}
console.log('\nSMALL CONTROLS (under 44 either side; hitSlop not measured)');
for (const [k, v] of [...small.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 25)) console.log(`${v.length}x ${k} :: ${v.slice(0, 3).join(',')}`);
console.log('\nkeys of one screen:', Object.keys(Object.values(r)[0] ?? {}).join(','));
