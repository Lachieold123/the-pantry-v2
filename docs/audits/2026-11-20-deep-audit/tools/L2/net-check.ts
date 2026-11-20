// Did my earlier unblocked probes (/library, /) send anything to Supabase? Log the requests the app tries at launch.
import { chromium } from '@playwright/test';
import { BASE, ONBOARDED } from './lib';

async function main() {
  const b = await chromium.launch();
  for (const path of ['/library', '/']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const seen: string[] = [];
    await ctx.route(/supabase\.co/, (r) => { seen.push(r.request().method() + ' ' + r.request().url().replace(/\?.*/, '')); return r.abort(); });
    const page = await ctx.newPage();
    await page.addInitScript((e: [string, string][]) => { for (const [k, v] of e) localStorage.setItem(k, v); },
      Object.entries(ONBOARDED).map(([k, s]): [string, string] => ['the-pantry-v2/' + k, JSON.stringify({ state: s, version: 1 })]));
    await page.goto(BASE + path);
    await page.waitForTimeout(4000);
    console.log(path, seen);
    await ctx.close();
  }
  await b.close();
}
main();
