// Photo credits as links (D-045, K-17). CC BY and CC BY-SA ask for three
// things beside the credit: a link to the source, a link to the licence, and
// a note that the photo was changed (every house photo is cropped and resized).
//
// The licence is read from the credit itself ("... (CC BY-SA 4.0)"), so the
// credit stays the one source of truth; only the file page is stored apart.
// An unrecognised licence gets no link rather than a guessed one.

export type PhotoLicence = {
  /** As the credit names it: "CC BY-SA 4.0", "CC0", "public domain". */
  name: string;
  /** The Creative Commons deed. Public domain photos have none. */
  url?: string;
};

export type PhotoCredit = {
  /** The credit as written: "Photo: Name / Wikimedia Commons (CC BY 2.0)". */
  text: string;
  /** The photo's own page, where its author and licence can be checked. */
  page?: string;
  licence?: PhotoLicence;
  /** True when the credit should say the photo was changed (cropped). */
  adapted: boolean;
};

// The versions Creative Commons publishes for each licence, so "CC BY 9.9" is refused, not linked.
const CC_VERSIONS: Readonly<Record<string, readonly string[]>> = {
  BY: ['1.0', '2.0', '2.5', '3.0', '4.0'],
  'BY-SA': ['1.0', '2.0', '2.5', '3.0', '4.0'],
};

const LICENCE_AT_END = /\(([^()]+)\)\s*$/;

/** The licence a credit names, with its deed's address where there is one. */
export function photoLicence(credit: string): PhotoLicence | undefined {
  const name = LICENCE_AT_END.exec(credit)?.[1]?.trim();
  if (!name) return undefined;
  if (name === 'CC0') return { name, url: 'https://creativecommons.org/publicdomain/zero/1.0/' };
  if (name.toLowerCase() === 'public domain') return { name };
  const cc = /^CC (BY(?:-SA)?) (\d\.\d)$/.exec(name);
  if (!cc) return undefined;
  const [, kind = '', version = ''] = cc;
  if (!CC_VERSIONS[kind]?.includes(version)) return undefined;
  return { name, url: `https://creativecommons.org/licenses/${kind.toLowerCase()}/${version}/` };
}

/** Only Wikimedia Commons file pages are linked: that's where every house photo comes from. */
export function isCommonsFilePage(url: string): boolean {
  return /^https:\/\/commons\.wikimedia\.org\/wiki\/File:\S+$/.test(url);
}

/** Everything the recipe page needs to show a credit with its links. */
export function photoCredit(text: string, page: string | undefined): PhotoCredit {
  const licence = photoLicence(text);
  const linkedPage = page !== undefined && isCommonsFilePage(page) ? page : undefined;
  return {
    text,
    ...(linkedPage ? { page: linkedPage } : {}),
    ...(licence ? { licence } : {}),
    // Only the Commons photos were cropped for the app; the old Pexels credits stay as they were.
    adapted: linkedPage !== undefined,
  };
}
