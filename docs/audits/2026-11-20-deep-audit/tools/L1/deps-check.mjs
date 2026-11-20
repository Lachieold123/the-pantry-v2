// Which package.json dependencies are never mentioned in src, e2e, scripts, app.json, jest/eslint config, or as an expo plugin.
import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const walk = (d, a = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (['node_modules', 'dist', '.expo'].includes(e.name)) continue; const p = d + '/' + e.name; e.isDirectory() ? walk(p, a) : a.push(p); } return a; };
const files = [...walk('src'), ...walk('e2e'), ...walk('scripts').filter((f) => /\.(mts|mjs|ts|js)$/.test(f)), 'app.json', 'jest.config.js', 'jest.setup.js', 'eslint.config.js', 'tsconfig.json'].filter((f) => fs.existsSync(f) && !f.endsWith('.json') || f === 'app.json' || f === 'tsconfig.json');
const text = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const out = [];
for (const [section, deps] of [['dependencies', pkg.dependencies], ['devDependencies', pkg.devDependencies]]) {
  for (const name of Object.keys(deps)) {
    const used = text.includes(`'${name}`) || text.includes(`"${name}`) || text.includes(`${name}/`);
    if (!used) out.push(`${section}: ${name}`);
  }
}
console.log(out.join('\n'));
for (const n of ['plainKitchen', 'purchasesConfigured', 'refreshToday']) {
  const hits = files.filter((f) => fs.readFileSync(f, 'utf8').includes(n));
  console.log(n, '->', hits.join(', '));
}
