// Contact sheets (1024 px wide, 8 shots each, light next to dark) from the screens fixer's shots.
// Run: npx tsx docs/audits/2026-11-20-deep-audit/tools/FIX-SCREENS/sheets.ts <shotsDir>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIR = path.resolve(process.argv[2]!);
const OUT = path.join(DIR, 'sheets');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const files = fs.readdirSync(DIR).filter((f) => /-(light|dark)\.png$/.test(f)).sort();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  for (let i = 0; i < files.length; i += 8) {
    const cells = files
      .slice(i, i + 8)
      .map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(DIR, f)).toString('base64')}"><figcaption>${f.replace('.png', '')}</figcaption></figure>`)
      .join('');
    await page.setContent(
      `<style>body{margin:0;background:#888;font:11px sans-serif}main{display:grid;grid-template-columns:repeat(4,252px);gap:4px;padding:2px;align-items:start}figure{margin:0}img{width:252px;display:block}figcaption{background:#000;color:#fff;padding:1px 3px}</style><main>${cells}</main>`,
    );
    const name = `sheet-${String(i / 8 + 1).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(OUT, name), fullPage: true });
    console.log(name);
  }
  await browser.close();
}
void main();
