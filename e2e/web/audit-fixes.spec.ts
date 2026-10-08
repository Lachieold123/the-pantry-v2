// What the 8 October audit fixes show on screen: how recipes are made (REL-23),
// the list agreeing with What I have (BUG-06), and taking someone out of a
// household (SEC-15).
import { expect, ONBOARDED, open, STOCKED, test } from './kitchen';

test('a recipe says how it was made, and Settings › About explains it', async ({ page }) => {
  await open(page, '/recipe/carbonara', ONBOARDED);
  await expect(page.getByTestId('recipe-origin')).toContainText('Drafted with AI help');
  await page.goto('/settings');
  await expect(page.getByText('How our recipes are made')).toBeVisible();
});

test('shelf items a planned dish uses sit under Already in your cupboard, not on the list', async ({ page }) => {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const plan = { entries: [{ id: 'e1', recipeId: 'chana-masala', day: iso(sunday), slot: 'dinner', servings: 4 }], listEdits: {} };
  await open(page, '/list?week=this', { ...STOCKED, plan });
  await expect(page.getByTestId('shopping-back-ground-cumin')).toBeVisible();
  await expect(page.getByTestId('shopping-item-ground-cumin')).toHaveCount(0);
});

test('in a household, each other member can be removed, and unused codes cancelled', async ({ page }) => {
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
  await page.route(/supabase\.co/, (route) => route.abort('internetdisconnected'));
  await open(page, '/household', { ...ONBOARDED, household });
  await expect(page.getByTestId('household-remove-s')).toBeVisible();
  await expect(page.getByTestId('household-remove-me')).toHaveCount(0);
  await page.getByTestId('household-remove-s').click();
  await expect(page.getByText('Remove Sam? They stop sharing Our kitchen.', { exact: false })).toBeVisible();
  await expect(page.getByTestId('household-cancel-invites')).toBeVisible();
});
