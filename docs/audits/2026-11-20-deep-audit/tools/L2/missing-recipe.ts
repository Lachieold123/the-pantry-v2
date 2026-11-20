// Lane 3 hand-over: what each screen shows when a stored id points at a recipe that no longer exists.
import { done, ONBOARDED, openApp, shot } from './lib';

const today = new Date();
const iso = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const GONE = 'gone-recipe';
const MINE_GONE = 'mine-deleted-123';
const seed = {
  ...ONBOARDED,
  plan: { entries: [
    { id: 'e1', recipeId: GONE, day: iso(0), slot: 'dinner', servings: 4 },
    { id: 'e2', recipeId: MINE_GONE, day: iso(1), slot: 'dinner', servings: 2 },
    { id: 'e3', recipeId: 'carbonara', day: iso(1), slot: 'lunch', servings: 2 },
  ], listEdits: {} },
  saved: { bookmarks: [{ recipeId: GONE, savedAt: 1 }, { recipeId: 'carbonara', savedAt: 2 }], collections: [{ id: 'c1', name: 'Gone ones', recipeIds: [GONE, MINE_GONE], createdAt: 1, updatedAt: 1 }], hidden: [], recentlyViewed: [GONE, MINE_GONE] },
  'cook-log': { log: [{ id: 'k1', recipeId: GONE, cookedAt: Date.now() - 86400000 }, { id: 'k2', recipeId: GONE, cookedAt: Date.now() - 2 * 86400000 }] },
};

async function main() {
  const pages: [string, string, string[]][] = [
    ['/', 'missing-home', ['feed-screen']],
    ['/plan', 'missing-plan', ['plan-screen']],
    ['/list', 'missing-list', ['shopping-screen']],
    ['/library', 'missing-cookmarks', ['library-screen']],
    ['/library?tab=recent', 'missing-recent', ['library-screen']],
    ['/collections/c1', 'missing-collection', ['collection-screen', 'collection-missing']],
    ['/stats', 'missing-stats', ['stats-screen']],
    ['/recipe/' + GONE, 'missing-recipe-page', ['recipe-missing']],
    ['/recipe/' + GONE + '/cook', 'missing-cook', ['cook-missing']],
    ['/recipe/' + GONE + '/plan', 'missing-plan-sheet', []],
    ['/recipe/' + GONE + '/list', 'missing-list-sheet', []],
    ['/recipe/' + GONE + '/collect', 'missing-collect-sheet', []],
    ['/plate/nope', 'missing-plate', ['plate-missing']],
    ['/collections/nope', 'missing-collection-id', ['collection-missing']],
    ['/my-recipe/edit?id=nope', 'missing-editor', ['editor-missing']],
  ];
  for (const [path, name, ids] of pages) {
    const { page, errors } = await openApp(path, seed);
    await page.waitForTimeout(800);
    const found = [];
    for (const id of ids) found.push(`${id}=${await page.getByTestId(id).count()}`);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 420);
    console.log(`\n## ${path}\n ids: ${found.join(' ')}\n errors: ${JSON.stringify(errors.slice(0, 3))}\n text: ${text}`);
    await shot(page, name);
    await page.context().close();
  }
  await done();
}
main();
