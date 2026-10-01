// Measurements for three screens rebuilt to v1's look: Settings, Filters and
// Welcome (spec §4.21, §7 Settings and Filters). Kept here, not in the screens,
// so the redesign can change them without touching feature code.
import { FIXED, type ColourTokens } from './colour';

/** Settings: grey page, white grouped cards under small uppercase labels (SettingsModal.tsx). */
export const SETTINGS = {
  labelGap: 8,
  labelInset: 4,
  cardPadX: 14,
  helperTop: 4,
  helperBottom: 12,
  buttonPadY: 14,
  buttonGap: 12,
  icon: 20,
  buttonIcon: 18,
  footerTop: 6,
} as const;

/** Filters: grey page, sans title, live count, pastel chips (FiltersModal.tsx, Chip.tsx). */
export const FILTERS = {
  headTop: 12,
  headBottom: 8,
  bodyX: 24,
  bodyTop: 16,
  countBottom: 24,
  sectionBottom: 12,
  chipGap: 8,
  groupBottom: 20,
  chipPadY: 9,
  chipPadX: 16,
  clearPadY: 16,
  clearTop: 16,
  /** A control with nothing to do yet (Clear with no filters on). */
  disabled: 0.45,
} as const;

type Tint = keyof ColourTokens;

/** Active chip fills. v1 used these same pastels (spec §1.2); the tokens have dark values, so ink text reads in both modes. */
export const FILTER_TINTS = {
  diet: { everything: 'tintPeach', vegetarian: 'tintMint', vegan: 'tintMint', pescatarian: 'tintSky' },
  meal: { breakfast: 'tintButter', lunch: 'tintMint', dinner: 'tintLavender', snack: 'tintPeach' },
  time: { 'under-15': 'tintMint', 'under-30': 'tintMint', 'under-45': 'tintButter', 'under-60': 'tintButter', 'over-60': 'tintPeach' },
  difficulty: { easy: 'tintMint', medium: 'tintOrange', hard: 'tintRose' },
  onePot: 'tintMint',
  season: 'tintButter',
} as const satisfies {
  diet: Record<string, Tint>;
  meal: Record<string, Tint>;
  time: Record<string, Tint>;
  difficulty: Record<string, Tint>;
  onePot: Tint;
  season: Tint;
};

/** Welcome and the taste quiz (OnboardingModal.tsx). */
export const WELCOME = {
  padX: 24,
  /** v1's soft top fade behind the Skip pill. */
  topScrim: 180,
  topPadX: 20,
  topPadY: 12,
  skipPadY: 8,
  skipPadX: 14,
  titleBottom: 24,
  kickerBottom: 14,
  displayBottom: 16,
  subtitleMax: 340,
  footerBottom: 12,
  pillPadY: 16,
  pillPadX: 20,
  pillGap: 10,
  /** The quiz: progress bar, body, tiles, chips and the footer. */
  progress: 4,
  barGap: 14,
  barPadY: 10,
  bodyTop: 22,
  bodyBottom: 28,
  kickerGap: 10,
  titleGap: 14,
  sectionTop: 24,
  tileGap: 10,
  tilePadY: 16,
  tilePadX: 18,
  chipPadY: 10,
  chipPadX: 14,
  chipGap: 8,
  backMin: 70,
  backPad: 14,
  /** The reveal's other picks and the reminder's bell. */
  thumb: 60,
  bell: 84,
  bellIcon: 34,
  disabled: 0.45,
} as const;

/** Dark scrims over the welcome photo, as v1 laid them over its video. */
export const WELCOME_SCRIMS = {
  quiz: { colors: [FIXED.videoScrim50, FIXED.videoScrim70, FIXED.videoScrim88], locations: [0, 0.45, 1] },
  reveal: { colors: [FIXED.videoScrim55, FIXED.videoScrim72, FIXED.videoScrim90], locations: [0, 0.45, 1] },
} as const;
