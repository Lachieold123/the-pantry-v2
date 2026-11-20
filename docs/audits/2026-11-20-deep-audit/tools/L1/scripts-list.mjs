// First comment line and size of each scripts/* file, plus Supabase migrations and edge functions.
import fs from 'node:fs';
const rows = ['| file | lines | first comment |', '|---|---|---|'];
for (const f of fs.readdirSync('scripts').filter((x) => fs.statSync('scripts/' + x).isFile())) {
  const t = fs.readFileSync('scripts/' + f, 'utf8').split('\n');
  const c = t.slice(0, 6).find((l) => /^(\/\/|#)\s*\S/.test(l) && !l.startsWith('#!')) || '';
  rows.push(`| scripts/${f} | ${t.length} | ${c.replace(/^(\/\/|#)\s*/, '').replace(/\|/g, '/').slice(0, 140)} |`);
}
fs.writeFileSync('docs/audits/2026-11-20-deep-audit/evidence/L1/inv-scripts.md', rows.join('\n') + '\n');

const m = ['| migration | lines | first comment |', '|---|---|---|'];
for (const d of ['supabase/migrations', 'supabase/migrations/_pending']) {
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.sql'))) {
    const t = fs.readFileSync(`${d}/${f}`, 'utf8').split('\n');
    const c = t.find((l) => l.startsWith('--') && l.length > 4) || '';
    m.push(`| ${d.replace('supabase/', '')}/${f} | ${t.length} | ${c.replace(/^--\s*/, '').replace(/\|/g, '/').slice(0, 130)} |`);
  }
}
fs.writeFileSync('docs/audits/2026-11-20-deep-audit/evidence/L1/inv-migrations.md', m.join('\n') + '\n');
// Tests list per area for coverage table
const walk = (d, a = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; e.isDirectory() ? walk(p, a) : a.push(p); } return a; };
const tests = walk('src').filter((f) => /\.test\.(ts|tsx)$/.test(f));
const dom = tests.filter((f) => f.startsWith('src/domain') || f.startsWith('src/lib/') && !/\.test\.tsx$/.test(f));
fs.writeFileSync('docs/audits/2026-11-20-deep-audit/evidence/L1/inv-tests.txt', tests.join('\n') + '\n');
console.log(tests.length, 'test files');
