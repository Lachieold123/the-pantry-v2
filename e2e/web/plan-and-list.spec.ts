// The North Star (PRODUCT.md): plan a dinner, the List builds itself, tick at
// the shops. And D-037: add a recipe's ingredients without planning it.
import { countIn, expect, ONBOARDED, open, test } from './kitchen';

test('planning a dinner puts its shopping on the List, and ticking takes one off', async ({ page }) => {
  await open(page, '/recipe/carbonara', ONBOARDED);
  await page.getByTestId('recipe-plan').click();
  await page.getByTestId('plan-day-this-0').click();
  await page.getByTestId('plan-confirm').click();
  await expect(page.getByText(/Carbonara planned for/)).toBeVisible();

  await page.goto('/list');
  await expect(page.getByTestId('shopping-item-guanciale')).toBeVisible();
  const before = await countIn(page, 'shopping-count');
  await page.getByTestId('shopping-item-guanciale').click();
  await expect.poll(() => countIn(page, 'shopping-count')).toBe(before - 1);
  // Ticked things stay where they are, so nothing jumps around mid-shop.
  await expect(page.getByTestId('shopping-item-guanciale')).toBeVisible();
});

test('Add to list puts a recipe’s ingredients on the List without planning it', async ({ page }) => {
  await open(page, '/recipe/carbonara', ONBOARDED);
  await page.getByTestId('recipe-add-to-list').click();
  await expect(page.getByText('You need')).toBeVisible();
  await page.getByTestId('list-row-pecorino').click();
  await expect(page.getByTestId('list-confirm')).toHaveText(/Add 3 to list/);
  await page.getByTestId('list-confirm').click();
  await expect(page.getByText('3 added to your shopping list')).toBeVisible();

  await page.goto('/list');
  await expect(page.getByTestId('shopping-item-spaghetti')).toBeVisible();
  await expect(page.getByTestId('shopping-item-pecorino')).toHaveCount(0);
});
