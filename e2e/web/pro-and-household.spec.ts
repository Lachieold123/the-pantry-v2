// Pro (D-038) is honest while it isn't on sale, and its limits work when
// previewed. Household (D-039) says plainly when it can't reach the server,
// and shows who you share with once you do.
import { expect, isoDay, ONBOARDED, open, test } from './kitchen';

test('the Pro page says it isn’t on sale yet, and nothing is limited', async ({ page }) => {
  await open(page, '/you', ONBOARDED);
  await expect(page.getByTestId('you-pro')).toHaveAccessibleName('The Pantry Pro, Free, nothing limited yet');
  await page.getByTestId('you-pro').click();
  await expect(page.getByTestId('pro-benefits')).toContainText('Plan further ahead');
  await expect(page.getByTestId('pro-not-on-sale')).toBeVisible();
  await expect(page.getByTestId('pro-buy')).toHaveCount(0);
});

test('with the free limits previewed, a day past the shopping week is Pro', async ({ page }) => {
  await open(page, '/plan', {
    ...ONBOARDED,
    pro: { entitlement: { isPro: false }, importsAt: [], previewLimits: true, pretendPro: false },
  });
  // Next week's Wednesday is past the shopping week every day but Sunday.
  test.skip(new Date().getDay() === 0, 'On Sundays the week ahead is free');
  const dow = (new Date().getDay() + 6) % 7;
  await page.getByTestId(`plan-day-${isoDay(7 - dow + 2)}`).click();
  await expect(page.getByTestId('plan-pro-nudge')).toBeVisible();
  await page.getByTestId('plan-pro-nudge').click();
  // The paywall opens worded for what you tried, and honest that Pro isn't on sale yet.
  await expect(page.getByTestId('pro-not-on-sale')).toBeVisible();
});

test('starting a household offline says so instead of failing quietly', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort('internetdisconnected'));
  await open(page, '/household', ONBOARDED);
  await page.getByTestId('household-name').fill('Lachlan');
  await page.getByTestId('household-start').click();
  await expect(page.getByTestId('household-problem')).toContainText('Couldn’t reach The Pantry');
});

test('in a household, the page lists who’s in and the List says who it’s shared with', async ({ page }) => {
  const household = {
    household: {
      id: 'h1',
      name: 'Our kitchen',
      members: [
        { userId: 'me', name: 'Lachlan' },
        { userId: 's', name: 'Sam' },
      ],
    },
    userId: 'me',
    mirror: {},
    pending: {},
    sharedRecipes: {},
    lastSyncedAt: 1,
  };
  // No server here: the sync quietly stays offline.
  await page.route(/supabase\.co/, (route) => route.abort('internetdisconnected'));
  await open(page, '/household', { ...ONBOARDED, household });
  await expect(page.getByText('Lachlan (you)')).toBeVisible();
  await expect(page.getByText('Sam', { exact: true })).toBeVisible();
  await page.goto('/list');
  await expect(page.getByTestId('shopping-shared')).toContainText('Shared with Sam');
});
