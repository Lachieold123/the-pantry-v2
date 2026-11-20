// L6: writes /tmp/l6hermes/{all,store}.js, each building the catalogue as a JS literal the way
// Metro bundles a JSON import, and timing that one statement under Hermes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../../../../../', import.meta.url);
const all = JSON.parse(readFileSync(new URL('src/data/catalogue/recipes.json', ROOT), 'utf8')) as { provenance?: string }[];
const store = all.filter((r) => ['reviewed', 'vetted'].includes(r.provenance ?? 'ai-draft'));
mkdirSync('/tmp/l6hermes', { recursive: true });
for (const [name, list] of [['all', all], ['store', store]] as const) {
  const js = `var t0 = Date.now();\nvar r = ${JSON.stringify(list)};\nvar t1 = Date.now();\nprint('${name}', r.length, 'evalMs', t1 - t0);\n`;
  writeFileSync(`/tmp/l6hermes/${name}.js`, js);
  console.log(name, list.length, 'jsBytes', Buffer.byteLength(js));
}
