// Accounts (D-043) on the web build: Settings' "Back up your kitchen" opens
// the sign-in sheet with email only (Sign in with Apple is iPhone only), and
// asking for a code while the server can't be reached says so plainly
// instead of failing quietly. A real sign-in needs a real inbox, so it's
// checked by hand (docs/ACCOUNTS.md).
import { expect, ONBOARDED, open, test } from './kitchen';

test('signed out, Settings offers a backup; the sheet offers email only and explains being offline', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort('internetdisconnected'));
  await open(page, '/settings', ONBOARDED);
  await page.getByTestId('settings-account-backup').click();
  await expect(page.getByText('Back up your kitchen').last()).toBeVisible();
  await expect(page.getByTestId('account-email')).toBeVisible();
  await expect(page.getByTestId('account-apple')).toHaveCount(0);

  await page.getByTestId('account-email').click();
  await page.getByTestId('account-email-field').fill('lachlan@example.com');
  await page.getByTestId('account-send').click();
  await expect(page.getByTestId('account-problem')).toContainText('You’re offline. Signing in needs the internet.');
  // Nothing changed: still on the email step, still signed out.
  await expect(page.getByTestId('account-email-field')).toBeVisible();
});
