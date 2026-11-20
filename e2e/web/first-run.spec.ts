// A first launch, in v1's order (P7): what brings you here, what you eat and
// avoid, cuisines, weeknight time and skill, what's in your cupboard, "Tonight,
// for you" and the notification primer, then Home with the first-run checklist
// and the four-stop tour. Skip from anywhere lands on Home too.
import type { Page } from '@playwright/test';

import { expect, open, test } from './kitchen';

async function throughTheQuestions(page: Page) {
  await page.getByTestId('welcome-start').click();

  await expect(page.getByText('What brings you here?')).toBeVisible();
  await page.getByTestId('intent-plan').click();
  await page.getByTestId('welcome-next').click();

  // Nothing is required, so the way on says "None of these" until something is ticked.
  await expect(page.getByText('Anything you don’t eat?')).toBeVisible();
  await expect(page.getByTestId('welcome-next')).toHaveText(/None of these/);
  await page.getByTestId('avoid-nuts').click();
  await expect(page.getByTestId('welcome-next')).toHaveText(/Continue/);
  await page.getByTestId('welcome-next').click();

  await expect(page.getByText('What do you love eating?')).toBeVisible();
  await page.getByTestId('cuisine-italian').click();
  await page.getByTestId('welcome-next').click();

  await expect(page.getByText('How long do you have?')).toBeVisible();
  await page.getByTestId('weeknight-under-30').click();
  await page.getByTestId('skill-starting').click();
  await page.getByTestId('welcome-next').click();
}

test('the welcome can be skipped, the tour shows once, and Skip ends it', async ({ page }) => {
  await open(page, '/');
  await page.getByTestId('welcome-skip').click();
  await expect(page.getByTestId('feed-screen')).toBeVisible();
  await expect(page.getByTestId('tour')).toBeVisible();
  await expect(page.getByText('1 of 4')).toBeVisible();
  await page.getByTestId('tour-next').click();
  await expect(page.getByText('Fill your cupboard').first()).toBeVisible();
  await page.getByTestId('tour-skip').click();
  await expect(page.getByTestId('tour')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('feed-screen')).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('tour')).toHaveCount(0);
});

test('the whole welcome: answers, a stocked cupboard, tonight planned, then Home on What I have', async ({ page }) => {
  await open(page, '/');
  await throughTheQuestions(page);

  // The cupboard: tap three things; the count follows.
  await expect(page.getByText('What’s in your cupboard?')).toBeVisible();
  await expect(page.getByTestId('welcome-note')).toHaveText('Tap what you have');
  for (const id of ['garlic', 'egg', 'chicken-thigh']) await page.getByTestId(`welcome-cupboard-${id}`).click();
  await expect(page.getByTestId('welcome-note')).toHaveText('3 things');
  await page.getByTestId('welcome-next').click();

  // The reveal: three picks, choose the second, put it on tonight.
  await expect(page.getByText('Your menu’s ready')).toBeVisible();
  const picks = page.getByTestId(/^welcome-pick-/);
  await expect(picks).toHaveCount(3);
  await picks.nth(1).click();
  await page.getByTestId('welcome-next').click();

  // The primer; on the web nothing can be scheduled, so "Maybe later".
  await expect(page.getByText('Plan the week?', { exact: false })).toBeVisible();
  await page.getByTestId('welcome-later').click();

  // Garlic, egg and chicken thigh (with a stocked shelf) make something tonight, so Home leads with What I have.
  await expect(page.getByTestId('feed-screen')).toBeVisible();
  await expect(page.getByText('From 3 things in your cupboard', { exact: false })).toBeVisible();
  await expect(page.getByTestId('tour')).toBeVisible();
  await page.getByTestId('tour-skip').click();

  // The checklist leads with planning (asked for), and the cupboard and the plan are already ticked off.
  await expect(page.getByTestId('checklist')).toBeVisible();
  await expect(page.getByTestId('checklist-count')).toHaveText('2/4');
  await page.getByTestId('checklist-dismiss').click();
  await expect(page.getByTestId('checklist')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('feed-screen')).toBeVisible();
  await expect(page.getByTestId('checklist')).toHaveCount(0);
});

test('Skip for now on the cupboard and Not tonight still reach Home, and the tour starts', async ({ page }) => {
  await open(page, '/');
  await throughTheQuestions(page);
  await page.getByTestId('welcome-cupboard-skip').click();
  await page.getByTestId('welcome-not-tonight').click();
  await page.getByTestId('welcome-later').click();
  await expect(page.getByTestId('feed-screen')).toBeVisible();
  await expect(page.getByTestId('tour')).toBeVisible();
});

test('a checklist step opens where it’s done', async ({ page }) => {
  await open(page, '/');
  await page.getByTestId('welcome-skip').click();
  await page.getByTestId('tour-skip').click();
  await expect(page.getByTestId('checklist-count')).toHaveText('0/4');
  await page.getByTestId('checklist-cook').click();
  await expect(page).toHaveURL(/\/surprise/);
});
