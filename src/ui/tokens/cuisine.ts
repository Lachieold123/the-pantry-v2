// Category colours, from the original app (spec §1.2–1.4). The original had
// eight coarse cuisines; v2 has 25, so each maps to its original family's colour.

import type { CuisineId } from '../../domain/recipes/types';
import type { ColourTokens } from './colour';

type Family =
  'italian' | 'mexican' | 'asian' | 'japanese' | 'korean' | 'indian' | 'middleEastern' | 'american' | 'european' | 'french' | 'other';

/** The small uppercase cuisine label above a card title. Same in light and dark, as in the original. */
const EYEBROW: Readonly<Record<Family, string>> = {
  italian: '#B85A3D',
  mexican: '#C87838',
  asian: '#B05060',
  japanese: '#C04A38',
  korean: '#3D9C6E',
  indian: '#C66A3C',
  middleEastern: '#3D9E82',
  american: '#B88E47',
  european: '#8A6FB0',
  french: '#7C6FB8',
  other: '#B88E47',
};

/** The soft fill behind a recipe with no photo, as a colour token name. */
const TINT: Readonly<Record<Family, keyof ColourTokens>> = {
  italian: 'tintPeach',
  mexican: 'tintOrange',
  asian: 'tintRose',
  japanese: 'tintRose',
  korean: 'tintRose',
  indian: 'tintButter',
  middleEastern: 'tintMint',
  american: 'tintSky',
  european: 'tintLavender',
  french: 'tintLavender',
  other: 'tintNeutral',
};

// `satisfies` makes adding a cuisine without choosing its colours a type error, not a silent grey.
const FAMILY = {
  italian: 'italian',
  french: 'french',
  spanish: 'european',
  greek: 'european',
  turkish: 'middleEastern',
  'middle-eastern': 'middleEastern',
  'north-african': 'middleEastern',
  'west-african': 'other',
  'south-african': 'other',
  indian: 'indian',
  thai: 'asian',
  vietnamese: 'asian',
  chinese: 'asian',
  japanese: 'japanese',
  korean: 'korean',
  malaysian: 'asian',
  indonesian: 'asian',
  filipino: 'asian',
  mexican: 'mexican',
  'latin-american': 'mexican',
  american: 'american',
  british: 'european',
  'central-european': 'european',
  scandinavian: 'european',
  'modern-australian': 'other',
} as const satisfies Readonly<Record<CuisineId, Family>>;

// Callers may hold a cuisine from an older save or none at all (a cover with no recipe), so look up by string.
function familyOf(cuisine: string): Family {
  return (FAMILY as Readonly<Record<string, Family>>)[cuisine] ?? 'other';
}

export function cuisineEyebrow(cuisine: string): string {
  return EYEBROW[familyOf(cuisine)];
}

export function cuisineTint(cuisine: string): keyof ColourTokens {
  return TINT[familyOf(cuisine)];
}

/**
 * Cupboard categories: a pastel fill, a bold ink for the initial and ×, and a
 * soft line colour. Kept light in both modes, as in the original, because the
 * chips carry their own dark ink.
 */
export const PANTRY_CATEGORY = {
  proteins: { tint: '#FFDBD2', bold: '#973023', soft: '#D37D6F' },
  vegetables: { tint: '#CFF3D5', bold: '#006C28', soft: '#63AB74' },
  fruit: { tint: '#F9E6BF', bold: '#7B4E00', soft: '#B7933F' },
  sauces: { tint: '#FFDEC8', bold: '#923900', soft: '#CF8358' },
  pantry: { tint: '#FDE4BF', bold: '#814A00', soft: '#BD8F41' },
  dairy: { tint: '#F3E8BF', bold: '#715400', soft: '#AE9740' },
  herbs: { tint: '#D8F1CC', bold: '#316800', soft: '#7AA761' },
  other: { tint: '#FFE0C4', bold: '#8D3E00', soft: '#CA874E' },
} as const;
export type PantryCategory = keyof typeof PANTRY_CATEGORY;
export const PANTRY_CHIP_INK = '#2A2218';
