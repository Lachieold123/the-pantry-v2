// Lane 5: contact sheets (1024 px wide, 4 x 2 screens each) from evidence/L5/shots.
// Run: npx tsx docs/audits/2026-11-20-deep-audit/tools/L5/sheets.ts [light|dark] [filter]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIR = path.resolve('docs/audits/2026-11-20-deep-audit/evidence/L5/shots');
const OUT = path.resolve('docs/audits/2026-11-20-deep-audit/evidence/L5/sheets');
const scheme = process.argv[2] ?? 'light';
const filter = process.argv[3] ?? '';

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(`-${scheme}.png`) && f.includes(filter))
    .sort();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  for (let i = 0; i < files.length; i += 8) {
    const group = files.slice(i, i + 8);
    const cells = group
      .map((f) => {
        const b64 = fs.readFileSync(path.join(DIR, f)).toString('base64');
        return `<figure><img src="data:image/png;base64,${b64}"><figcaption>${f.replace('.png', '')}</figcaption></figure>`;
      })
      .join('');
    await page.setContent(
      `<style>body{margin:0;background:#888;font:11px sans-serif}main{display:grid;grid-template-columns:repeat(4,252px);gap:4px;padding:2px}figure{margin:0}img{width:252px;display:block}figcaption{background:#000;color:#fff;padding:1px 3px}</style><main>${cells}</main>`,
    );
    const name = `${scheme}${filter ? '-' + filter : ''}-${String(i / 8 + 1).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(OUT, name), fullPage: true });
    console.log(name, group.length);
  }
  await browser.close();
}
void main();
