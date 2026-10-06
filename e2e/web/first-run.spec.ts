// A first launch: the welcome, skipped, lands on Home, and the four-stop tour
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
