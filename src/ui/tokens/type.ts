// Type, space, shape and motion tokens (map §9).

export const FONT = {
  serif: 'Newsreader',
  serifItalic: 'Newsreader-Italic',
  serifMedium: 'Newsreader-Medium',
  sans: 'Manrope',
  sansMedium: 'Manrope-Medium',
  sansBold: 'Manrope-Bold',
} as const;

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'ui' | 'kicker' | 'meta' | 'numeral';

export type TextStyleToken = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'uppercase';
};

export const TYPE: Readonly<Record<TextVariant, TextStyleToken>> = {
  display: { fontFamily: FONT.serif, fontSize: 44, lineHeight: 48, letterSpacing: -0.5 },
  title: { fontFamily: FONT.serif, fontSize: 28, lineHeight: 34, letterSpacing: -0.2 },
  heading: { fontFamily: FONT.serifMedium, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: FONT.serif, fontSize: 17, lineHeight: 26 },
  ui: { fontFamily: FONT.sansMedium, fontSize: 15, lineHeight: 20 },
  kicker: { fontFamily: FONT.sansBold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' },
  meta: { fontFamily: FONT.sans, fontSize: 13, lineHeight: 18 },
  numeral: { fontFamily: FONT.serifItalic, fontSize: 20, lineHeight: 26 },
};

/** 4-point scale. Screen side margin is `screen`. */
export const SPACE = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64, screen: 20 } as const;

export const RADIUS = { sm: 8, md: 14, lg: 22 } as const;

/** Nothing bounces. The spinner is the one deliberate exception and defines its own curve. */
export const MOTION = { quick: 200, standard: 240, slow: 280 } as const;

/** Minimum tap target, in points (map §11). */
export const TAP_TARGET = 44;

export const ASPECT = { card: 4 / 5, hero: 4 / 3, thumb: 1 } as const;
