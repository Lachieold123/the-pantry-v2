// The library (one page, four tabs), saving, collections (with Pro's free
// limit of 3, D-038), searching, and writing your own recipe, including the
// "1.5 kg" amount the health check found being read as "5 kg".
import { expect, ONBOARDED, open, test } from './kitchen';

test('saving a recipe puts it in Cookmarks', async ({ page }) => {
  await open(page, '/recipe/carbonara', ONBOARDED);
  await page.getByTestId('recipe-save').click();
  // The old address still works: it opens the library on Cookmarks.
  await page.goto('/saved');
  await expect(page.getByTestId('library-screen')).toContainText('Library');
  await expect(page.getByTestId('library-tab-cookmarks')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('cookmarks-screen')).toBeVisible();
  await expect(page.getByLabel('1 saved recipe', { exact: true })).toBeVisible();
  await expect(page.getByTestId('recipe-card-carbonara')).toBeVisible();
});

test('the library switches tabs in place, and a link opens the tab it names', async ({ page }) => {
  await open(page, '/library', {
    ...ONBOARDED,
    saved: { bookmarks: [], collections: [], hidden: [], recentlyViewed: ['carbonara'] },
  });
  await expect(page.getByTestId('cookmarks-empty')).toBeVisible();
  await page.getByTestId('library-tab-collections').click();
  await expect(page.getByTestId('collections-empty')).toBeVisible();
  await page.getByTestId('library-tab-mine').click();
  await expect(page.getByTestId('mine-empty')).toBeVisible();
  await page.getByTestId('library-tab-recent').click();
  await expect(page.getByTestId('recipe-card-carbonara')).toBeVisible();
  await expect(page.getByLabel('1 recipe', { exact: true })).toBeVisible();
  // Switching is local: the address doesn't change, so Back leaves the library.
  await expect(page).toHaveURL(/\/library$/);

  // Opening a recipe and coming back keeps the tab.
  await page.getByTestId('recipe-card-carbonara').click();
  await expect(page.getByTestId('recipe-screen')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('library-tab-recent')).toHaveAttribute('aria-selected', 'true');

  await page.goto('/library?tab=collections');
  await expect(page.getByTestId('collections-new')).toBeVisible();
});

test('a fourth collection opens Pro when the free limits apply, and none is made', async ({ page }) => {
  const collections = ['Weeknights', 'Guests', 'Summer'].map((name, i) => ({
    id: `c${i}`,
    name,
    recipeIds: [],
    createdAt: 1,
    updatedAt: 1,
  }));
  await open(page, '/collections', {
    ...ONBOARDED,
    saved: { bookmarks: [], collections, hidden: [], recentlyViewed: [] },
    pro: { entitlement: { isPro: false }, importsAt: [], previewLimits: true, pretendPro: false },
  });
  await page.getByTestId('collections-new').click();
  await expect(page.getByTestId('pro-benefits')).toBeVisible();
  await expect(page.getByText('More collections')).toBeVisible();
});

test('searching finds a dish, and a search with no match says so', async ({ page }) => {
  await open(page, '/browse', ONBOARDED);
  await page.getByTestId('browse-search').fill('carbonara');
  await expect(page.getByTestId('recipe-card-carbonara')).toBeVisible();
  await page.getByTestId('browse-search').fill('zzqqxx');
  await expect(page.getByTestId('browse-empty')).toBeVisible();
});

test('a recipe you write keeps decimal amounts whole', async ({ page }) => {
  await open(page, '/my-recipe/edit', ONBOARDED);
  await page.getByTestId('editor-title').fill('Slow lamb shoulder');
  await page.getByTestId('editor-ingredients').fill('1.5 kg lamb shoulder\n0.5 tsp salt\n2 brown onions');
  await page.getByTestId('editor-method').fill('1. Season the lamb.\n2. Roast for 4 hours.');
  await page.getByTestId('editor-cuisine-greek').click();
  await page.getByTestId('editor-save').click();
  await expect(page.getByTestId('recipe-screen')).toBeVisible();
  // The page writes 1.5 as a kitchen fraction.
  await expect(page.getByText('1½ kg lamb shoulder')).toBeVisible();
  await expect(page.getByText('½ tsp salt')).toBeVisible();
  await expect(page.getByText(/^5 kg lamb/)).toHaveCount(0);
});
