// Lane 1: do .maestro flows and Playwright specs reference testIDs / text that still exist in src?
import fs from 'node:fs';
import path from 'node:path';

const walk = (d, a = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, a) : a.push(p);
  }
  return a;
};
const srcFiles = walk('src').filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
const srcText = srcFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
// dynamic ids: build regexes from template literals e.g. recipe-card-${slug}
const idLits = new Set([...srcText.matchAll(/(?:testID|testId|id)[=:] ?\{?[`'"]([A-Za-z0-9_${}.:\-]+)[`'"]/g)].map((m) => m[1]));
const patterns = [...idLits].map((s) => new RegExp('^' + s.replace(/[.*+?^()|[\]\\]/g, '\\$&').replace(/\$\{[^}]*\}/g, '.+') + '$'));
const exists = (id) => srcText.includes(`'${id}'`) || srcText.includes(`"${id}"`) || srcText.includes(`\`${id}\``) || patterns.some((p) => p.test(id));
const out = [];
const check = (file, ids, label) => {
  const miss = [...new Set(ids)].filter((i) => !exists(i));
  out.push(`${file}: ${new Set(ids).size} ids, ${miss.length} missing ${label}${miss.length ? ' -> ' + miss.join(', ') : ''}`);
};
for (const f of walk('.maestro').filter((f) => f.endsWith('.yaml'))) {
  const t = fs.readFileSync(f, 'utf8');
  const ids = [...t.matchAll(/\bid: ['"]?([A-Za-z0-9_\-.]+)['"]?/g)].map((m) => m[1]);
  check(f, ids, '');
  // text taps
  const texts = [...t.matchAll(/(?:tapOn|assertVisible|assertNotVisible): ['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const missT = [...new Set(texts)].filter((x) => !srcText.includes(x.replace(/\.\*$/, '')) && !/[\\^$]/.test(x));
  if (missT.length) out.push(`   text not found literally in src: ${missT.join(' | ')}`);
}
for (const f of walk('e2e/web').filter((f) => f.endsWith('.ts') || f.endsWith('.mjs'))) {
  const t = fs.readFileSync(f, 'utf8');
  const ids = [...t.matchAll(/getByTestId\(['"`]([^'"`]+)['"`]\)/g)].map((m) => m[1]);
  check(f, ids, '');
}
console.log(out.join('\n'));
