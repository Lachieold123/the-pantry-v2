// The avatar's You page: one place for everything that isn't a tab (Lachlan,
// 6 October). The side menu and the centre "+" are gone, so the tab bar has
// exactly four tabs, and every row on You opens a real page.
import { expect, ONBOARDED, open, test } from './kitchen';

test('the tab bar has exactly four tabs, and no menu button', async ({ page }) => {
  await open(page, '/', ONBOARDED);
  await expect(page.getByTestId('feed-screen')).toBeVisible();
  const tabs = page.locator('[data-testid^="tab-"]');
  await expect(tabs).toHaveCount(4);
  for (const id of ['tab-index', 'tab-plan', 'tab-list', 'tab-cupboard']) await expect(page.getByTestId(id)).toBeVisible();
  await expect(page.getByTestId('tab-add')).toHaveCount(0);
  await expect(page.getByTestId('header-menu')).toHaveCount(0);
});

test('the avatar opens You, with the library counts', async ({ page }) => {
  await open(page, '/', {
    ...ONBOARDED,
    saved: { bookmarks: [{ recipeId: 'carbonara', savedAt: 1 }], collections: [], hidden: [], recentlyViewed: [] },
  });
  await page.getByTestId('header-avatar').click();
  await expect(page.getByTestId('you-screen')).toBeVisible();
  await expect(page.getByTestId('you-cookmarks')).toHaveAccessibleName('Cookmarks, 1');
  await expect(page.getByTestId('you-household')).toHaveAccessibleName('Household, Not sharing');
  await page.getByTestId('back').click();
  await expect(page.getByTestId('feed-screen')).toBeVisible();
});

// Each library row opens the one library page on its own tab.
const LIBRARY_ROWS = [
  { row: 'you-cookmarks', tab: 'cookmarks' },
  { row: 'you-collections', tab: 'collections' },
  { row: 'you-my-recipes', tab: 'mine' },
  { row: 'you-recent', tab: 'recent' },
] as const;

for (const { row, tab } of LIBRARY_ROWS) {
  test(`${row} opens the library on ${tab}`, async ({ page }) => {
    await open(page, '/you', ONBOARDED);
    await page.getByTestId(row).click();
    await expect(page).toHaveURL(new RegExp(`/library\\?tab=${tab}`));
    await expect(page.getByTestId(`library-tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
  });
}

// The rest of the page: Kitchen, then Sharing and Pro, then Settings.
const PAGE_ROWS = [
  { row: 'you-stats', lands: 'stats-screen' },
  { row: 'you-post', lands: 'post-screen' },
  { row: 'you-surprise', lands: 'surprise-screen' },
  { row: 'you-household', lands: 'household-screen' },
  { row: 'you-pro', lands: 'pro-benefits' },
  { row: 'you-settings', lands: 'settings-screen' },
] as const;

for (const { row, lands } of PAGE_ROWS) {
  test(`${row} opens its page`, async ({ page }) => {
    await open(page, '/you', ONBOARDED);
    await page.getByTestId(row).click();
    await expect(page.getByTestId(lands)).toBeVisible();
  });
}

test('Settings no longer carries Household or the Pro row', async ({ page }) => {
  await open(page, '/settings', ONBOARDED);
  await expect(page.getByTestId('settings-screen')).toBeVisible();
  await expect(page.getByTestId('settings-household')).toHaveCount(0);
  await expect(page.getByTestId('settings-pro')).toHaveCount(0);
});
