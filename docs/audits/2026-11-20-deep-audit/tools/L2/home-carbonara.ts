// Where on Home does the viewed carbonara appear? (root cause for library.spec.ts:18)
import { done, ONBOARDED, openApp, shot } from './lib';

async function main() {
  for (const recent of [['carbonara'], []]) {
    const { page, errors } = await openApp('/', { ...ONBOARDED, saved: { bookmarks: [], collections: [], hidden: [], recentlyViewed: recent } });
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="recipe-card-carbonara"]') as HTMLElement | null;
      if (!el) return null;
      el.scrollIntoView();
      // nearest preceding heading-ish text
      let n: HTMLElement | null = el;
      const ctx: string[] = [];
      for (let i = 0; i < 6 && n; i++) { n = n.parentElement; if (n) ctx.push((n.getAttribute('data-testid') ?? '') + ' :: ' + n.innerText.slice(0, 60).replace(/\n/g, ' | ')); }
      return { label: el.getAttribute('aria-label'), ctx };
    });
    console.log('recent=', JSON.stringify(recent), JSON.stringify(info, null, 1), errors.slice(0, 3));
    if (recent.length) await shot(page, 'home-with-viewed-carbonara');
  }
  await done();
}
main();
