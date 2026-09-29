// Colour tokens. Screens use these names, never hex values (map §9, rule 8).
// Tokens are named for their job, not their colour, so dark mode and high
// contrast are just different values for the same names.
// These values are the §9 starting proposal (D-012), for Lachlan to approve
// from the design gallery.

export type ColourTokens = {
  bg: string;
  surface: string;
  surfaceSunken: string;
  ink: string;
  inkSecondary: string;
  inkMuted: string;
  rule: string;
  accent: string;
  /** Text or icons placed on an accent-filled button. */
  onAccent: string;
  accentSoft: string;
  danger: string;
};

export const paper: ColourTokens = {
  bg: '#F7F3EA',
  surface: '#FFFDF8',
  surfaceSunken: '#EFE9DC',
  ink: '#1A1714',
  inkSecondary: '#4A443C',
  inkMuted: '#6E665A',
  rule: 'rgba(26,23,20,0.12)',
  accent: '#8E6232',
  onAccent: '#FFFDF8',
  accentSoft: '#F1E3CC',
  danger: '#B3443A',
};

export const night: ColourTokens = {
  bg: '#0A0A0A',
  surface: '#141312',
  surfaceSunken: '#1C1A17',
  ink: '#F7F3EA',
  inkSecondary: '#CFC8BA',
  inkMuted: '#9C968C',
  rule: 'rgba(247,243,234,0.12)',
  accent: '#E8C891',
  onAccent: '#1A1714',
  accentSoft: '#3D2C13',
  danger: '#FF7A6B',
};

/** High contrast keeps the same character with stronger ink and rules. */
export const paperHighContrast: ColourTokens = {
  ...paper,
  inkSecondary: '#2E2A24',
  inkMuted: '#4A443C',
  rule: 'rgba(26,23,20,0.4)',
  accent: '#6B4520',
};

export const nightHighContrast: ColourTokens = {
  ...night,
  inkSecondary: '#EDE7DA',
  inkMuted: '#CFC8BA',
  rule: 'rgba(247,243,234,0.4)',
  accent: '#F4DDB0',
};

export type ThemeName = 'paper' | 'night';
export const THEMES: Readonly<Record<ThemeName, { normal: ColourTokens; highContrast: ColourTokens }>> = {
  paper: { normal: paper, highContrast: paperHighContrast },
  night: { normal: night, highContrast: nightHighContrast },
};

/**
 * One quiet tone per cuisine, used only for the small cuisine label above a
 * title, never as a fill (map §9). No greens anywhere (brand rule). Two
 * values each so the label passes contrast on both paper and night.
 */
export const CUISINE_TONES: Readonly<Record<string, { paper: string; night: string }>> = {
  italian: { paper: '#9A4630', night: '#E4937C' },
  french: { paper: '#5E5494', night: '#B3A8E6' },
  spanish: { paper: '#9C3F2E', night: '#EE9A84' },
  greek: { paper: '#2F5E8C', night: '#8FB6DE' },
  turkish: { paper: '#8C3B46', night: '#E698A3' },
  'middle-eastern': { paper: '#8A5A1E', night: '#E2B574' },
  'north-african': { paper: '#94521F', night: '#EAA56E' },
  'west-african': { paper: '#8F4A1C', night: '#E9A26F' },
  'south-african': { paper: '#7E4B2A', night: '#DDA784' },
  indian: { paper: '#9A4E1E', night: '#EDA16C' },
  thai: { paper: '#8E3F5E', night: '#E596B5' },
  vietnamese: { paper: '#3F5A8C', night: '#9CB3E3' },
  chinese: { paper: '#9A3A32', night: '#EE958C' },
  japanese: { paper: '#A03A2E', night: '#F0978A' },
  korean: { paper: '#7A3F72', night: '#D99ACF' },
  malaysian: { paper: '#8A4E36', night: '#E4A68D' },
  indonesian: { paper: '#8E4A2A', night: '#E8A283' },
  filipino: { paper: '#39588A', night: '#98B2E0' },
  mexican: { paper: '#9C4A1E', night: '#EFA06C' },
  'latin-american': { paper: '#8A3E52', night: '#E498AB' },
  american: { paper: '#7C5A22', night: '#DDB679' },
  british: { paper: '#4C4F7A', night: '#A9ACDA' },
  'central-european': { paper: '#6A4F7E', night: '#C4A8DA' },
  scandinavian: { paper: '#3E5A7A', night: '#9FB9D8' },
  'modern-australian': { paper: '#7A5A3A', night: '#D9B891' },
};
