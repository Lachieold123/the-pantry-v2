// L2: deep links with junk params (no join links: those create live users).
import { done, ONBOARDED, openApp, shot } from './lib';

const paths = [
  '/plan/add?day=garbage', '/plan/add', '/plan/add?day=2026-02-30&slot=dinner', '/plan/add?day=2030-01-01&slot=dinner', '/plan/add?day=2020-01-01&slot=brunch',
  '/recipe/carbonara/list?servings=-3', '/recipe/carbonara/list?servings=1e9', '/recipe/carbonara/cook?servings=abc', '/recipe/carbonara/cook?servings=0.5',
  '/library?tab=zzz', '/cupboard/scan?kind=zzz', '/pro?from=zzz', '/browse?search=%F0%9F%8D%9D', '/recipe/%20', '/my-recipe/edit?from=zzz&title=' + 'x'.repeat(500),
  '/my-recipe/import', '/dev/gallery', '/dev/home-viewer', '/nope/nope', '/account?moment=zzz',
];
async function main() {
  for (const p of paths) {
    const { page, errors } = await openApp(p, ONBOARDED);
    await page.waitForTimeout(700);
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 220);
    console.log(`\n## ${p}\n errors: ${JSON.stringify(errors.filter((e) => !e.includes('ERR_FAILED')).slice(0, 2)).slice(0, 300)}\n text: ${body}`);
    if (p.startsWith('/plan/add?day=garbage') || p.includes('1e9') || p.includes('servings=0.5')) await shot(page, 'bad-' + p.replace(/[^a-z0-9]/gi, '_').slice(0, 40));
    await page.context().close();
  }
  await done();
}
main();
