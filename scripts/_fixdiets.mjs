import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const f = process.argv[2];
const p = new URL('./data/house-recipes/' + f, import.meta.url);
const j = JSON.parse(readFileSync(p));
let o = ''; try { o = execSync('npm run -s catalogue:validate -- ' + f + ' 2>&1', { cwd: new URL('..', import.meta.url), encoding: 'utf8', maxBuffer: 1e8 }); } catch (e) { o = e.stdout || ''; }
for (const m of o.matchAll(/FAIL\s+(\S+)\s+\[repo\] diets stated \[\] but the ingredients give \[([^\]]*)\]/g)) {
  const r = j.recipes.find(x => x.id === m[1]); if (r) r.diets = m[2].split(',').map(s => s.trim()).filter(Boolean);
}
writeFileSync(p, JSON.stringify(j, null, 1));
