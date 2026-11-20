// Lane 1: extract route, domain, rules-as-code tables from source. Output: evidence/L1/inv-*.md
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = 'docs/audits/2026-11-20-deep-audit/evidence/L1';
fs.mkdirSync(OUT, { recursive: true });

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
const read = (f) => fs.readFileSync(f, 'utf8');
const src = walk('src').filter((f) => /\.(ts|tsx)$/.test(f));
const nonTest = src.filter((f) => !/\.test\.(ts|tsx)$/.test(f) && !f.endsWith('.testing.ts'));
const lines = (t) => t.split('\n').length;

// ---- routes
const routes = nonTest.filter((f) => f.startsWith('src/app/') && /\.tsx$/.test(f));
let md = '| file | lines | imports (from features/store/lib) | params / router targets | testIDs |\n|---|---|---|---|---|\n';
for (const f of routes) {
  const t = read(f);
  const imps = [...t.matchAll(/from '(@\/(?:features|store|lib|domain)\/[^']+)'/g)].map((m) => m[1].replace('@/', ''));
  const params = [...new Set([...t.matchAll(/useLocalSearchParams<[^>]*>|useGlobalSearchParams<[^>]*>/g)].map((m) => m[0].replace(/\s+/g, ' ')))];
  const tgt = [...new Set([...t.matchAll(/(?:href|pathname)[=:] ?['"{`]+([^'"`}]+)/g)].map((m) => m[1]))];
  const ids = [...new Set([...t.matchAll(/testID=["'{`]+([^"'`}]+)/g)].map((m) => m[1]))];
  md += `| ${f.replace('src/app/', '')} | ${lines(t)} | ${imps.join(', ')} | ${[...params, ...tgt].join('; ')} | ${ids.join(', ')} |\n`;
}
fs.writeFileSync(`${OUT}/inv-routes.md`, md);

// ---- testIDs per feature file
md = '| file | testIDs |\n|---|---|\n';
for (const f of nonTest.filter((f) => f.startsWith('src/features') || f.startsWith('src/ui'))) {
  const t = read(f);
  const ids = [...new Set([...t.matchAll(/testID=(?:["']([^"']+)["']|\{`([^`]+)`\}|\{['"]([^'"]+)['"]\})/g)].map((m) => m[1] || m[2] || m[3]))];
  const idsProp = [...new Set([...t.matchAll(/testID: ['"`]([^'"`]+)/g)].map((m) => m[1]))];
  const all = [...ids, ...idsProp];
  if (all.length) md += `| ${f.replace('src/', '')} | ${all.join(', ')} |\n`;
}
fs.writeFileSync(`${OUT}/inv-testids.md`, md);

// ---- domain modules: lines, exports, importers outside own test, test file exists
const dom = nonTest.filter((f) => f.startsWith('src/domain/'));
const importersOf = (f) => {
  const base = f.replace(/^src\//, '').replace(/\.(ts|tsx)$/, '');
  const alias = `@/${base}`;
  const rel = path.basename(base);
  let n = 0; const who = new Set();
  for (const g of nonTest) {
    if (g === f) continue;
    const t = read(g);
    const re = new RegExp(`from '(?:${alias.replace(/[/.]/g, '\\$&')}|(?:\\.\\.?/)+[^']*/${rel}|\\./${rel})'`);
    if (re.test(t)) { n++; who.add(g.split('/').slice(1, 3).join('/')); }
  }
  return [n, [...who].slice(0, 5)];
};
md = '| module | lines | exports | importers (non-test files) | where | test |\n|---|---|---|---|---|---|\n';
for (const f of dom) {
  const t = read(f);
  const ex = (t.match(/^export /gm) || []).length;
  const [n, who] = importersOf(f);
  const hasTest = fs.existsSync(f.replace(/\.ts$/, '.test.ts')) || fs.existsSync(f.replace(/\.ts$/, '.test.tsx'));
  md += `| ${f.replace('src/domain/', '')} | ${lines(t)} | ${ex} | ${n} | ${who.join(', ')} | ${hasTest ? 'yes' : 'no'} |\n`;
}
fs.writeFileSync(`${OUT}/inv-domain.md`, md);

// ---- rules as code
const rep = [];
const over = nonTest.filter((f) => lines(read(f)) > 300).map((f) => `${f} ${lines(read(f))}`);
rep.push('## files over 300 lines (non-test src)', ...over);
const over2 = src.filter((f) => /\.test\./.test(f) && lines(read(f)) > 300).map((f) => `${f} ${lines(read(f))}`);
rep.push('## test files over 300 lines', ...over2);
// features importing features
const cross = [];
for (const f of nonTest.filter((f) => f.startsWith('src/features/'))) {
  const own = f.split('/')[2];
  for (const m of read(f).matchAll(/from '@\/features\/([a-z-]+)\//g)) if (m[1] !== own) cross.push(`${f} -> ${m[1]}`);
}
rep.push('## features importing other features', ...new Set(cross));
// domain impurity
const imp = [];
for (const f of src.filter((f) => f.startsWith('src/domain/') && !/\.test\./.test(f))) {
  for (const m of read(f).matchAll(/from '([^']+)'/g)) {
    const s = m[1];
    if (!s.startsWith('.') && !s.startsWith('node:')) imp.push(`${f} imports ${s}`);
    else if (/\/(store|lib|features|ui)\//.test(s) || s.startsWith('@/')) imp.push(`${f} imports ${s}`);
  }
}
rep.push('## src/domain imports of packages or app layers', ...new Set(imp));
// literals outside tokens
const lit = { hex: [], fontSize: [], spacing: [] };
for (const f of nonTest.filter((f) => (f.startsWith('src/features') || f.startsWith('src/app') || f.startsWith('src/ui')) && !f.startsWith('src/ui/tokens'))) {
  const t = read(f);
  const h = (t.match(/['"`]#[0-9a-fA-F]{3,8}['"`]/g) || []).length;
  const fsz = (t.match(/fontSize: ?\d+/g) || []).length;
  const sp = (t.match(/\b(?:padding|margin|gap)(?:Horizontal|Vertical|Top|Bottom|Left|Right)?: ?\d+/g) || []).length;
  if (h) lit.hex.push(`${f} ${h}`);
  if (fsz) lit.fontSize.push(`${f} ${fsz}`);
  if (sp) lit.spacing.push(`${f} ${sp}`);
}
rep.push(`## hex literals outside tokens (${lit.hex.length} files)`, ...lit.hex, `## fontSize literals (${lit.fontSize.length} files)`, ...lit.fontSize, `## spacing literals (${lit.spacing.length} files)`, ...lit.spacing);
// thin routes: >60 lines
rep.push('## routes over 40 lines', ...routes.map((f) => `${f} ${lines(read(f))}`).filter((s) => +s.split(' ')[1] > 40));
// markers
const mk = { TODO: [], FIXME: [], 'console.log': [], '@ts-ignore': [], '@ts-expect-error': [], ': any': [], 'as any': [], 'eslint-disable': [], 'it.skip/xit/describe.skip/test.skip/it.failing/it.todo': [] };
for (const f of src) {
  const t = read(f);
  const c = (re) => (t.match(re) || []).length;
  if (c(/\bTODO\b/g)) mk.TODO.push(`${f} ${c(/\bTODO\b/g)}`);
  if (c(/\bFIXME\b/g)) mk.FIXME.push(`${f} ${c(/\bFIXME\b/g)}`);
  if (c(/console\.log\(/g)) mk['console.log'].push(`${f} ${c(/console\.log\(/g)}`);
  if (c(/@ts-ignore/g)) mk['@ts-ignore'].push(`${f} ${c(/@ts-ignore/g)}`);
  if (c(/@ts-expect-error/g)) mk['@ts-expect-error'].push(`${f} ${c(/@ts-expect-error/g)}`);
  if (c(/: any\b|<any>|any\[\]/g)) mk[': any'].push(`${f} ${c(/: any\b|<any>|any\[\]/g)}`);
  if (c(/as any\b/g)) mk['as any'].push(`${f} ${c(/as any\b/g)}`);
  if (c(/eslint-disable/g)) mk['eslint-disable'].push(`${f} ${c(/eslint-disable/g)}`);
  if (c(/\b(?:it|test|describe)\.(?:skip|todo|failing)\b|\bxit\(|\bxdescribe\(/g)) mk['it.skip/xit/describe.skip/test.skip/it.failing/it.todo'].push(`${f} ${c(/\b(?:it|test|describe)\.(?:skip|todo|failing)\b|\bxit\(|\bxdescribe\(/g)}`);
}
for (const [k, v] of Object.entries(mk)) rep.push(`## ${k} (${v.length} files)`, ...v);
fs.writeFileSync(`${OUT}/inv-rules.md`, rep.join('\n') + '\n');

// ---- test coverage per feature dir
md = '| feature | non-test files | test files |\n|---|---|---|\n';
const feats = fs.readdirSync('src/features');
for (const d of feats) {
  const fs2 = src.filter((f) => f.startsWith(`src/features/${d}/`));
  const tests = fs2.filter((f) => /\.test\./.test(f)).length;
  md += `| ${d} | ${fs2.length - tests} | ${tests} |\n`;
}
for (const d of fs.readdirSync('src/store').filter((x) => /\.test\./.test(x)).length ? ['store'] : []) {
  const a = src.filter((f) => f.startsWith('src/store/'));
  const t = a.filter((f) => /\.test\./.test(f)).length;
  md += `| store | ${a.length - t} | ${t} |\n`;
}
fs.writeFileSync(`${OUT}/inv-featuretests.md`, md);

// ---- unused exports (cheap): named exports never imported elsewhere
const names = [];
for (const f of nonTest) {
  const t = read(f);
  for (const m of t.matchAll(/^export (?:async )?(?:function|const|class|type|interface) ([A-Za-z0-9_]+)/gm)) names.push([f, m[1]]);
}
const all = nonTest.map((f) => [f, read(f)]).concat(src.filter((f) => /\.test\./.test(f)).map((f) => [f, read(f)]));
const unused = [];
for (const [f, n] of names) {
  if (f.startsWith('src/app/')) continue;
  const re = new RegExp(`\\b${n}\\b`);
  const usedElsewhere = all.some(([g, t]) => g !== f && re.test(t));
  const usedInternally = (read(f).match(new RegExp(`\\b${n}\\b`, 'g')) || []).length > 1;
  if (!usedElsewhere) unused.push(`${f} ${n}${usedInternally ? ' (internal use only)' : ' (UNUSED)'}`);
}
fs.writeFileSync(`${OUT}/inv-unused-exports.md`, unused.join('\n') + '\n');

// ---- feature file listing
md = '';
for (const d of feats) md += `${d}: ${src.filter((f) => f.startsWith(`src/features/${d}/`) && !/\.test\./.test(f)).map((f) => path.basename(f)).join(' ')}\n`;
fs.writeFileSync(`${OUT}/inv-featurefiles.txt`, md);
console.log('done', routes.length, 'routes', dom.length, 'domain', unused.length, 'unused');
