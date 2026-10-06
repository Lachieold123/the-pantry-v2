// "What I have" (D-034): with a stocked cupboard Home opens on dishes you can
// cook now; Everything shows the rest; the line under the switch opens the Cupboard.
import { countIn, expect, open, STOCKED, ONBOARDED, test } from './kitchen';

test('What I have shows what you can cook, and switches to Everything and back', async ({ page }) => {
  await open(page, '/', STOCKED);
  const pantry = page.getByTestId('home-mode-pantry');
  // Opens on What I have: its line shows, and the switch says how many dishes are ready.
  await expect(page.getByTestId('home-pantry-line')).toContainText('From 18 things in your cupboard');
  await expect(pantry).toHaveAccessibleName(/What I have, [1-9]\d* dish(es)? ready/);
  expect(await countIn(page, 'home-mode-pantry')).toBeGreaterThan(0);
  await page.getByTestId('home-mode-all').click();
  await expect(page.getByTestId('home-pantry-line')).toHaveCount(0);
  await pantry.click();
  await page.getByTestId('home-pantry-line').click();
  await expect(page.getByTestId('cupboard-screen')).toBeVisible();
});

test('an empty cupboard says what to do instead of showing nothing', async ({ page }) => {
  await open(page, '/', ONBOARDED);
  await page.getByTestId('home-mode-pantry').click();
  await expect(page.getByTestId('home-pantry-empty')).toBeVisible();
  await expect(page.getByTestId('home-pantry-line')).toContainText('Your cupboard is empty');
});

test('Home filters by Time and Cuisine only; Meal and Difficulty are in Browse', async ({ page }) => {
  await open(page, '/', ONBOARDED);
  await expect(page.getByTestId('home-filter-time')).toBeVisible();
  await expect(page.getByTestId('home-filter-cuisine')).toBeVisible();
  await expect(page.getByTestId('home-filter-meal')).toHaveCount(0);
  await expect(page.getByTestId('home-filter-difficulty')).toHaveCount(0);
  // A filter nothing matches says so, and clearing it brings the cards back.
  await page.getByTestId('home-filter-cuisine').click();
  await page.getByTestId('home-filter-option-scandinavian').click();
  await page.getByTestId('home-filter-time').click();
  await page.getByTestId('home-filter-option-under-15').click();
  await expect(page.getByTestId('home-no-match')).toBeVisible();
  await page.getByTestId('home-no-match-action').click();
  await expect(page.getByTestId('home-heroes')).toBeVisible();
});

test('search opens Browse, which finds recipes and has no add button', async ({ page }) => {
  await open(page, '/', ONBOARDED);
  await page.getByTestId('home-search').click();
  await expect(page.getByTestId('browse-search')).toBeVisible();
  await expect(page.getByTestId('browse-add-recipe')).toHaveCount(0);
  await page.getByTestId('browse-filters').click();
  await expect(page.getByTestId('filter-meal-breakfast')).toBeVisible();
  await expect(page.getByTestId('filter-difficulty-easy')).toBeVisible();
});
