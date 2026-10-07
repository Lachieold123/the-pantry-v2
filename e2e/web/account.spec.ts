// Accounts (D-043) on the web build. Sign in with Apple is iPhone only, and
// Continue with email stays hidden until email codes can be sent
// (EMAIL_CODES_CONNECTED, src/lib/emailCodes.ts), so the web has no way in
// yet. Settings must say so honestly instead of opening a sheet with nothing
// to tap, and the sign-in routes must explain rather than offer dead controls.
// When the flag flips, put back the email checks (offline send, the code step).
import { expect, ONBOARDED, open, test } from './kitchen';

// Never reach the real backend from a test: none of these states needs it.
test.beforeEach(async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort('internetdisconnected'));
});

test('signed out on the web, Settings says backing up works on iPhone, and nothing opens a dead end', async ({ page }) => {
  await open(page, '/settings', ONBOARDED);
  const row = page.getByTestId('settings-account-unavailable');
  await expect(row).toBeVisible();
  await expect(row).toContainText('Back up your kitchen');
  await expect(row).toContainText('Backing up with your Apple ID is available on iPhone.');
  await expect(page.getByTestId('settings-account-backup')).toHaveCount(0);
  // Not a button: tapping it goes nowhere and changes nothing.
  await row.click();
  await expect(page).toHaveURL(/\/settings$/);
});

test('an old link to the sign-in sheet explains, with only a way out', async ({ page }) => {
  await open(page, '/account', ONBOARDED);
  await expect(page.getByTestId('account-unavailable')).toContainText('Backing up with your Apple ID is available on iPhone.');
  await expect(page.getByTestId('account-email')).toHaveCount(0);
  await expect(page.getByTestId('account-apple')).toHaveCount(0);
  await expect(page.getByTestId('account-done')).toBeVisible();
});

test('an old link to the email step says it’s coming soon, with no form', async ({ page }) => {
  await open(page, '/account/email', ONBOARDED);
  await expect(page.getByText('Email sign-in is coming soon')).toBeVisible();
  await expect(page.getByTestId('account-email-field')).toHaveCount(0);
  await expect(page.getByTestId('account-send')).toHaveCount(0);
  await expect(page.getByTestId('account-done')).toBeVisible();
});
