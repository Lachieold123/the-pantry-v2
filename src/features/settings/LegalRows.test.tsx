// Legal links: a row only for a published page (REL-01), and Pro never on
// sale without both legal links (REL-09, REL2-2).
import { render, screen } from '@testing-library/react-native';

import { canSellPro, LEGAL_URLS } from '@/lib/legal';
import { LegalRows } from './LegalRows';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-purchases', () => require('@/lib/purchases.testing').revenueCatModule());

it('shows no row for a page that isn’t published', async () => {
  await render(<LegalRows urls={{}} />);
  expect(screen.queryByText('Privacy policy')).toBeNull();
});

it('shows a row for each published page', async () => {
  await render(<LegalRows urls={{ privacy: 'https://example.com/privacy', terms: 'https://example.com/terms' }} />);
  expect(screen.getByText('Privacy policy')).toBeTruthy();
  expect(screen.getByText('Terms of use')).toBeTruthy();
  expect(screen.queryByText('Help and contact')).toBeNull();
});

// Guideline 3.1.2: the paywall and the free limits both ask canSellPro, so
// Pro can't be bought (and nothing is limited) until both pages exist.
// PaywallScreen.test.tsx proves the screen side.
it('never sells Pro without both the privacy policy and the terms (guideline 3.1.2)', () => {
  expect(canSellPro({})).toBe(false);
  expect(canSellPro({ privacy: 'https://example.com/privacy' })).toBe(false);
  expect(canSellPro({ terms: 'https://example.com/terms' })).toBe(false);
  expect(canSellPro({ privacy: 'http://example.com/privacy', terms: 'https://example.com/terms' })).toBe(false);
  expect(canSellPro({ privacy: 'https://example.com/privacy', terms: 'https://example.com/terms' })).toBe(true);
  // Today's app: nothing published, so nothing on sale.
  expect(canSellPro(LEGAL_URLS)).toBe(Boolean(LEGAL_URLS.privacy && LEGAL_URLS.terms));
});
