// Find test() / it() blocks with no assertion, and assertion-light files. Crude: splits on it(/test( at line start.
import fs from 'node:fs';
const walk = (d, a = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules') continue; const p = d + '/' + e.name; e.isDirectory() ? walk(p, a) : a.push(p); } return a; };
const files = [...walk('src'), ...walk('e2e/web'), ...walk('scripts'), ...walk('supabase/tests')].filter((f) => /\.test\.(ts|tsx|mts|mjs)$|\.spec\.ts$/.test(f));
let total = 0, empty = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const parts = t.split(/^\s*(?=(?:it|test)(?:\.\w+)?\(['"`])/m).slice(1);
  for (const p of parts) {
    total++;
    const name = (p.match(/^(?:it|test)(?:\.\w+)?\(['"`]([^'"`]+)/) || [])[1];
    if (!/expect\(|assert\b|assert\.|\.rejects|\.toThrow|toBe|ok\(/.test(p)) empty.push(`${f}: ${name}`);
  }
}
console.log('tests scanned', total, 'with no assertion token', empty.length);
console.log(empty.join('\n'));
