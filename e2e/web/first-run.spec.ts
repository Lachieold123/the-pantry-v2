// A first launch: the two-step welcome ("Anything you don't eat?", then
// "What's in your cupboard?") or Skip lands on Home, and the four-stop tour
// starts by itself; Skip ends it and it doesn't come back.
import { expect, open, test } from './kitchen';

test('the welcome can be skipped, the tour shows once, and Skip ends it', async ({ page }) => {
  await open(page, '/');
  await page.getByTestId('welcome-skip').click();
  await expect(page.getByTestId('feed-screen')).toBeVisible();
  await expect(page.getByTestId('tour')).toBeVisible();
  await expect(page.getByText('1 of 4')).toBeVisible();
  await page.getByTestId('tour-next').click();
  await expect(page.getByText('Fill your cupboard')).toBeVisible();
  await page.getByTestId('tour-skip').click();
  await expect(page.getByTestId('tour')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('feed-screen')).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('tour')).toHaveCount(0);
});

test('the welcome fills the cupboard and Home opens on What I have', async ({ page }) => {
  await open(page, '/');
  await page.getByTestId('welcome-start').click();

  // Step 1: nothing is required, so the way on says "None of these" until something is ticked.
  await expect(page.getByText('Anything you don’t eat?')).toBeVisible();
  await expect(page.getByTestId('welcome-next')).toHaveText(/None of these/);
  await page.getByTestId('avoid-nuts').click();
  await expect(page.getByTestId('welcome-next')).toHaveText(/Continue/);
  await page.getByTestId('welcome-next').click();

  // Step 2: tap three things; the count follows.
  await expect(page.getByText('What’s in your cupboard?')).toBeVisible();
  await expect(page.getByTestId('welcome-note')).toHaveText('Tap what you have');
  for (const id of ['garlic', 'egg', 'chicken-thigh']) await page.getByTestId(`welcome-cupboard-${id}`).click();
  await expect(page.getByTestId('welcome-note')).toHaveText('3 things');
  await page.getByTestId('welcome-finish').click();

  // Garlic, egg and chicken thigh (with a stocked shelf) make something tonight, so Home leads with What I have.
  await expect(page.getByTestId('feed-screen')).toBeVisible();
  await expect(page.getByText('From 3 things in your cupboard', { exact: false })).toBeVisible();
  await expect(page.getByTestId('tour')).toBeVisible();
});

test('Skip for now on the cupboard step still finishes, and the tour starts', async ({ page }) => {
  await open(page, '/');
  await page.getByTestId('welcome-start').click();
  await page.getByTestId('welcome-next').click();
  await page.getByTestId('welcome-cupboard-skip').click();
  await expect(page.getByTestId('feed-screen')).toBeVisible();
  await expect(page.getByTestId('tour')).toBeVisible();
});
