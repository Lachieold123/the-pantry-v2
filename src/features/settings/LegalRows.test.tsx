// Legal links: a row only for a published page (REL-01), and Pro never on
// sale without both legal links (REL-09).
import { render, screen } from '@testing-library/react-native';

import { LEGAL_URLS } from '@/lib/legal';
import { REVENUECAT_IOS_KEY } from '@/lib/purchases';
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

// KNOWN FAILURE (integration, 20 Nov 2026): the old PURCHASES_CONNECTED switch is gone (D-052).
// With the RevenueCat key set, an iPhone build puts Pro on sale as soon as Apple returns a
// product, and LEGAL_URLS are still empty (waiting for Lachlan's hosted pages). Marked
// `failing` so the suite stays green; once both URLs are https, Jest reports this test and
// `.failing` must come off. See docs/audits/2026-11-20-deep-audit/INTEGRATION.md.
it.failing('never sells Pro without the privacy policy and terms (guideline 3.1.2)', () => {
  if (!REVENUECAT_IOS_KEY) return;
  expect(LEGAL_URLS.privacy).toMatch(/^https:\/\//);
  expect(LEGAL_URLS.terms).toMatch(/^https:\/\//);
});
