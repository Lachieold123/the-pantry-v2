// Colour tokens. Screens use these names, never hex values.
// The values reproduce the original app's look (D-025, docs/design/V1-DESIGN-SPEC.md §1)
// so the later redesign is a change here, not in every screen. Tokens are named for
// their job, so dark mode and high contrast are different values for the same names.

export type ColourTokens = {
  /** Page background; also the text colour on ink-filled buttons and cards. */
  bg: string;
  /** The page colour at zero opacity: where a fade into the page starts (behind the tab bar). */
  bgFade: string;
  /** Inputs, chips, tiles, sunken cards, pressed rows. */
  bgSoft: string;
  /** Raised cards, the drawer panel, round buttons over photos. */
  card: string;
  /** Every 1pt border, divider and progress track. */
  border: string;
  /** Primary text, and the fill of every "black" pill or card (cream in dark mode). */
  ink: string;
  /** Body copy, step text, secondary labels. */
  inkSoft: string;
  /** Meta, kickers, placeholders, inactive tabs. */
  inkMuted: string;
  /** Handles, rules, disabled text, big italic numerals. */
  inkSubtle: string;
  accent: string;
  accentDeep: string;
  accentSoft: string;
  /** Amber text and icons on the page: kickers, aisle labels, "on" states. `accent` is for fills only (2.7:1 as text on white). */
  accentText: string;
  /** Text or icons on an accent fill. Dark ink: white on amber is 2.7:1 (health check 2026-10-05 #2). */
  onAccent: string;
  /** The small dot beside each ingredient. */
  bullet: string;
  danger: string;
  /** Text or icons on a danger fill (badges). */
  onDanger: string;
  /** Soft category fills: cuisines, meal types, difficulty. */
  tintOrange: string;
  tintPeach: string;
  tintButter: string;
  tintMint: string;
  tintSky: string;
  tintLavender: string;
  tintRose: string;
  tintNeutral: string;
};

export const light: ColourTokens = {
  bg: '#FFFFFF',
  bgFade: 'rgba(255,255,255,0)',
  bgSoft: '#F7F7F7',
  card: '#FFFFFF',
  border: 'rgba(0,0,0,0.06)',
  ink: '#1A1A1A',
  inkSoft: '#4A4A4A',
  inkMuted: '#6E6E6E',
  inkSubtle: '#BCBCBC',
  accent: '#C99155',
  // The original's #A2723D read at 3.6:1 on accentSoft; this is a shade darker and passes AA.
  accentDeep: '#8F6232',
  accentSoft: '#FBEDD6',
  accentText: '#8F6232',
  onAccent: '#1A1A1A',
  bullet: '#F5B945',
  // The original's #D85A5A was 3.8:1 on white.
  danger: '#B33A3A',
  onDanger: '#FFFFFF',
  tintOrange: '#FCE9C5',
  tintPeach: '#FBDDD0',
  tintButter: '#FFF3CC',
  tintMint: '#D6EFE0',
  tintSky: '#D6E6F2',
  tintLavender: '#E3DCF3',
  tintRose: '#F8D2DD',
  tintNeutral: '#F4F4F4',
};

export const dark: ColourTokens = {
  bg: '#0A0A0A',
  bgFade: 'rgba(10,10,10,0)',
  bgSoft: '#141414',
  card: '#141414',
  border: 'rgba(255,255,255,0.10)',
  ink: '#F7F3EA',
  inkSoft: '#D1D1D6',
  inkMuted: '#9C968C',
  inkSubtle: '#48484A',
  accent: '#E0AC6E',
  accentDeep: '#C99155',
  accentSoft: '#3D2C13',
  accentText: '#E0AC6E',
  onAccent: '#0A0A0A',
  bullet: '#F5B945',
  danger: '#FF6B6B',
  onDanger: '#0A0A0A',
  // The original kept light tints in dark mode by accident (spec §8.2); these are its own dark values.
  tintOrange: '#3A2C12',
  tintPeach: '#3A201A',
  tintButter: '#3A2F18',
  tintMint: '#1F3D2C',
  tintSky: '#1F2E3D',
  tintLavender: '#28213D',
  tintRose: '#3D202A',
  tintNeutral: '#1F1F1F',
};

/** High contrast: pure ink, solid borders, deeper accents. Everything else inherits. */
export const lightHighContrast: ColourTokens = {
  ...light,
  bgSoft: '#F0F0F0',
  border: 'rgba(0,0,0,0.55)',
  ink: '#000000',
  inkSoft: '#1A1A1A',
  inkMuted: '#363636',
  inkSubtle: '#595959',
  accent: '#8A5A22',
  accentDeep: '#6E4A1C',
  accentText: '#6E4A1C',
  // High contrast's deeper amber carries white text at 5.9:1.
  onAccent: '#FFFFFF',
};

export const darkHighContrast: ColourTokens = {
  ...dark,
  bg: '#000000',
  bgFade: 'rgba(0,0,0,0)',
  bgSoft: '#101010',
  card: '#000000',
  border: 'rgba(255,255,255,0.6)',
  ink: '#FFFFFF',
  inkSoft: '#F0F0F0',
  inkMuted: '#C8C8C8',
  inkSubtle: '#9A9A9A',
  accent: '#F0C081',
  accentDeep: '#E0AC6E',
  accentText: '#F0C081',
};

export type ThemeName = 'light' | 'dark';
export const THEMES: Readonly<Record<ThemeName, { normal: ColourTokens; highContrast: ColourTokens }>> = {
  light: { normal: light, highContrast: lightHighContrast },
  dark: { normal: dark, highContrast: darkHighContrast },
};

/** Colours that are the same in every theme because they sit on photos, video or fixed cream surfaces. */
export const FIXED = {
  onPhoto: '#FFFFFF',
  onPhotoCream: '#F7F3EA',
  onPhotoMuted: 'rgba(255,255,255,0.85)',
  onPhotoFaint: 'rgba(255,255,255,0.75)',
  onPhotoDot: 'rgba(255,255,255,0.55)',
  /** The white disc behind a bookmark or heart on a photo. */
  photoDisc: 'rgba(255,255,255,0.92)',
  photoDiscInk: '#1A1A1A',
  scrim: 'rgba(0,0,0,0.5)',
  scrimDrawer: 'rgba(0,0,0,0.42)',
  scrimHidden: 'rgba(0,0,0,0.4)',
  toastBg: '#F7F3EA',
  toastInk: '#0A0A0A',
  /** The cream recipe cards in Saved and Collections, the same in both modes. */
  libraryCard: '#F7F3EA',
  libraryCardInk: '#0E0E0E',
  libraryCardMeta: 'rgba(20,18,16,0.55)',
  libraryWell: '#1A1815',
  amberLight: '#E8C891',
  amberRule: 'rgba(232,200,145,0.85)',
  /** Darkens Surprise me's peek cards so they read as the deck, not choices. */
  peekDim: 'rgba(0,0,0,0.55)',
  shadow: '#000000',
  /** The welcome and its steps sit on a dark photo in both modes, as v1's video did. */
  videoBg: '#000000',
  videoInk: '#1A1A1A',
  videoKicker: 'rgba(255,255,255,0.9)',
  videoSoft: 'rgba(255,255,255,0.82)',
  videoSub: 'rgba(255,255,255,0.7)',
  videoQuiet: 'rgba(255,255,255,0.45)',
  glassTile: 'rgba(255,255,255,0.12)',
  glassChip: 'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.16)',
  glassPill: 'rgba(255,255,255,0.18)',
  glassTrack: 'rgba(255,255,255,0.22)',
  glassOutline: 'rgba(255,255,255,0.3)',
  videoScrim50: 'rgba(0,0,0,0.5)',
  videoScrim70: 'rgba(0,0,0,0.7)',
  videoScrim88: 'rgba(0,0,0,0.88)',
} as const;

/** Photo scrims, as gradient stops. */
export const GRADIENTS = {
  heroBottom: { colors: ['transparent', 'rgba(0,0,0,0.78)'], locations: [0.4, 1] },
  shelfBottom: { colors: ['transparent', 'rgba(0,0,0,0.75)'], locations: [0.55, 1] },
  feedBottom: { colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)'], locations: [0.45, 1] },
  surpriseBottom: { colors: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.92)'], locations: [0.3, 0.45, 0.92] },
  photoTop: { colors: ['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)'], locations: [0, 1] },
  /** Behind the Surprise me card's cuisine label, which vanished on pale photos (health check #5). */
  surpriseTop: { colors: ['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)'], locations: [0, 0.3] },
  /** The faint warm air behind the Surprise me deck. */
  surpriseGlow: { colors: ['transparent', 'rgba(232,200,145,0.05)', 'transparent'], locations: [0.2, 0.55, 0.9] },
  surpriseGlowFoot: { colors: ['transparent', 'rgba(232,200,145,0.04)'], locations: [0.7, 1] },
} as const;
