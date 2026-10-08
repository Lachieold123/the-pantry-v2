// Legal links: a row only for a published page (REL-01), and Pro never on
// sale without both legal links (REL-09).
import { render, screen } from '@testing-library/react-native';

import { LEGAL_URLS } from '@/lib/legal';
import { PURCHASES_CONNECTED } from '@/lib/purchases';
import { LegalRows } from './LegalRows';

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

it('never sells Pro without the privacy policy and terms (guideline 3.1.2)', () => {
  if (!PURCHASES_CONNECTED) return;
  expect(LEGAL_URLS.privacy).toMatch(/^https:\/\//);
  expect(LEGAL_URLS.terms).toMatch(/^https:\/\//);
});
