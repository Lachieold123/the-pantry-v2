// L2 probe: why does the Recent tab show two carbonara cards (library.spec.ts:18)?
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4412';
const PREFIX = 'the-pantry-v2';
const seed: Record<string, [unknown, number]> = {
  preferences: [{ onboarded: true, appearance: 'system', diet: 'everything' }, 3],
  tour: [{ seen: true }, 1],
  saved: [{ bookmarks: [], collections: [], hidden: [], recentlyViewed: ['carbonara'] }, 1],
};

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript((entries: [string, string][]) => {
    if (sessionStorage.getItem('s')) return;
    sessionStorage.setItem('s', '1');
    for (const [k, v] of entries) localStorage.setItem(k, v);
  }, Object.entries(seed).map(([k, [s, v]]): [string, string] => [`${PREFIX}/${k}`, JSON.stringify({ state: s, version: v })]));
  await page.goto(BASE + '/library');
  await page.getByTestId('library-tab-recent').click();
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-testid="recipe-card-carbonara"]'));
    return els.map((el) => {
      const chain: string[] = [];
      let n: Element | null = el;
      while (n) {
        const t = n.getAttribute('data-testid');
        if (t) chain.push(t);
        n = n.parentElement;
      }
      const r = el.getBoundingClientRect();
      return { chain, rect: [r.x, r.y, r.width, r.height], text: (el as HTMLElement).innerText.slice(0, 80) };
    });
  });
  console.log(JSON.stringify(info, null, 1));
  const ls = await page.evaluate(() => localStorage.getItem('the-pantry-v2/saved'));
  console.log('saved after:', ls);
  await page.screenshot({ path: 'docs/audits/2026-11-20-deep-audit/evidence/L2/recent-dup.png' });
  await browser.close();
}
main();
