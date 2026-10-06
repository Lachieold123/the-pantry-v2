// Cook Mode step by step to the end, filling the cupboard from search or a
// list (with no scan buttons until scanning works), and Surprise me.
import { expect, ONBOARDED, open, test } from './kitchen';

test('Cook Mode steps through a recipe and logs it as cooked', async ({ page }) => {
  await open(page, '/recipe/carbonara', ONBOARDED);
  await page.getByTestId('recipe-cook').click();
  await expect(page.getByTestId('cook-counter')).toContainText('1');
  for (let i = 0; i < 20 && (await page.getByTestId('cook-done').count()) === 0; i++) {
    await page.getByTestId('cook-next').click();
  }
  await page.getByTestId('cook-done').click();
  await expect(page.getByText(/Carbonara cooked/)).toBeVisible();
});

test('searching the cupboard adds an ingredient, and tapping a jar uses it up', async ({ page }) => {
  await open(page, '/cupboard', ONBOARDED);
  await expect(page.getByTestId('cupboard-empty')).toBeVisible();
  await page.getByTestId('cupboard-search').fill('basmati');
  await page.getByTestId('cupboard-add-basmati-rice').click();
  await expect(page.getByTestId('cupboard-item-basmati-rice')).toBeVisible();
  await page.getByTestId('cupboard-item-basmati-rice').click();
  await expect(page.getByText(/used up/)).toBeVisible();
});

test('Surprise me deals a dish', async ({ page }) => {
  await open(page, '/surprise', ONBOARDED);
  await expect(page.getByTestId('surprise-card')).toBeVisible();
  const first = await page.getByTestId('surprise-title').innerText();
  await page.getByTestId('surprise-spin').click();
  await expect.poll(() => page.getByTestId('surprise-title').innerText(), { timeout: 10_000 }).not.toBe(first);
});

test('the Cupboard offers Add a list, and no scanning until it works', async ({ page }) => {
  await open(page, '/cupboard', ONBOARDED);
  await expect(page.getByTestId('cupboard-scan-receipt')).toHaveCount(0);
  await expect(page.getByTestId('cupboard-scan-food')).toHaveCount(0);
  await page.getByTestId('cupboard-add-list').click();
  await expect(page.getByTestId('add-list-input')).toBeVisible();
});
