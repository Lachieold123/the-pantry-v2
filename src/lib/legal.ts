// Where the privacy policy, terms of use and help page are published
// (docs/launch). Undefined until Lachlan hosts them (REL-01, a decision of
// his); Settings › About and the paywall show each link only once it exists,
// and a test fails if Pro goes on sale before both legal links do (REL-09:
// Apple requires them beside a subscription).
export const LEGAL_URLS: { privacy?: string | undefined; terms?: string | undefined; support?: string | undefined } = {};

export type LegalLink = { label: string; url: string };

/** The links to show, in order, leaving out any not published yet. */
export function legalLinks(urls: typeof LEGAL_URLS = LEGAL_URLS): LegalLink[] {
  return [
    { label: 'Privacy policy', url: urls.privacy },
    { label: 'Terms of use', url: urls.terms },
    { label: 'Help and contact', url: urls.support },
  ].filter((l): l is { label: string; url: string } => typeof l.url === 'string' && /^https:\/\//.test(l.url));
}

/**
 * What the welcome asks the cook to agree to: the terms and the privacy
 * policy, whichever are published. Empty until the terms are, so the welcome
 * never asks anyone to agree to a page that doesn't exist.
 */
export function agreementLinks(urls: typeof LEGAL_URLS = LEGAL_URLS): LegalLink[] {
  const [terms] = legalLinks({ terms: urls.terms });
  return terms ? [terms, ...legalLinks({ privacy: urls.privacy })] : [];
}
