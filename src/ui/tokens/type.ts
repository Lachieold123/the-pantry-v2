// Type, space, shape, shadow and motion tokens. Values reproduce the original
// app (D-025, spec §2–3), consolidated: where the original used near-identical
// styles for the same job, there is one token.

/** Georgia is built into iOS; Android and web use their serif. The sans is the system face. */
export const FONT_FAMILY = {
  serif: { ios: 'Georgia', android: 'serif', web: 'Georgia, "Times New Roman", serif' },
} as const;

export type TextStyleToken = {
  family: 'serif' | 'sans';
  size: number;
  /** Georgia has only regular and bold on iOS: serif weights are 400 or 700. */
  weight: '400' | '500' | '600' | '700' | '800';
  lineHeight?: number;
  letterSpacing?: number;
  upper?: boolean;
  italic?: boolean;
};

const serif = (size: number, weight: TextStyleToken['weight'], lineHeight?: number, letterSpacing?: number): TextStyleToken => ({
  family: 'serif',
  size,
  weight,
  ...(lineHeight ? { lineHeight } : {}),
  ...(letterSpacing !== undefined ? { letterSpacing } : {}),
});
const sans = (size: number, weight: TextStyleToken['weight'], lineHeight?: number, letterSpacing?: number): TextStyleToken => ({
  family: 'sans',
  size,
  weight,
  ...(lineHeight ? { lineHeight } : {}),
  ...(letterSpacing !== undefined ? { letterSpacing } : {}),
});
const upper = (t: TextStyleToken): TextStyleToken => ({ ...t, upper: true });
const italic = (t: TextStyleToken): TextStyleToken => ({ ...t, italic: true });

export const TYPE = {
  // Headings (serif)
  wordmark: serif(24, '700', 30, -0.4),
  displayLibrary: serif(52, '400', 52, -1.8),
  displayWelcome: serif(44, '700', 48, -1),
  display: serif(38, '700', 44, -0.8),
  recipeTitle: serif(32, '700', 36, -0.6),
  title: serif(30, '700', 34, -0.6),
  dayName: serif(26, '700', 30, -0.4),
  sectionTitle: serif(22, '700', 26, -0.4),
  brandMark: serif(20, '700', 24),
  jarInitial: italic(serif(16, '400', 18)),
  cardTitleLarge: serif(18, '700', 20, -0.3),
  cardTitle: serif(17, '700', 20, -0.3),
  cardTitleMedium: serif(16, '700', 19, -0.3),
  cardTitleSmall: serif(15, '700', 18, -0.2),
  onPhotoLarge: serif(30, '700', 33, -0.6),
  onPhoto: serif(26, '700', 30, -0.5),
  onPhotoSmall: serif(19, '700', 23, -0.3),
  cookStepText: serif(22, '400', 32, -0.2),
  // Numbers (serif)
  numberHuge: serif(72, '700', 76, -2),
  numberStep: italic(serif(64, '400', 64, -2)),
  numberLarge: serif(32, '700', 36, -1),
  numberTile: serif(28, '700', 32, -0.6),
  numberDay: serif(18, '700', 22, -0.4),
  numberItalic: italic(serif(16, '400', 18, -0.3)),
  // Kickers and eyebrows (sans, uppercase)
  kicker: upper(sans(11, '800', 14, 3)),
  kickerSection: upper(sans(11, '800', 14, 2.5)),
  kickerSmall: upper(sans(10, '800', 13, 2)),
  eyebrow: upper(sans(9.5, '800', 12, 1.8)),
  eyebrowLarge: upper(sans(10.5, '800', 13, 2)),
  // Body and controls (sans)
  headingSans: sans(20, '800', 25, -0.4),
  headingSansSmall: sans(16, '800', 20, -0.3),
  body: sans(15, '400', 22),
  bodyMedium: sans(14, '400', 20),
  bodySmall: sans(13, '400', 19),
  caption: sans(12, '400', 17),
  note: italic(sans(12, '400', 17)),
  row: sans(15, '600', 20),
  rowSmall: sans(14, '600', 19),
  value: sans(13, '500', 18),
  name: sans(14, '800', 18, -0.2),
  label: sans(14, '800', 18, 0.3),
  labelLarge: sans(16, '700', 20),
  chip: sans(13, '700', 17, 0.1),
  meta: sans(12, '600', 16),
  metaSmall: sans(11, '600', 14),
  tabBar: sans(11, '700', 14),
  badge: sans(11, '800', 13),
  pill: upper(sans(9, '800', 11, 1)),
  infoValue: sans(16, '800', 20, -0.2),
  infoLabel: upper(sans(10, '700', 13, 0.5)),
  stepNumber: sans(22, '800', 26),
  toast: sans(14, '700', 18, 0.1),
} as const satisfies Record<string, TextStyleToken>;

export type TextVariant = keyof typeof TYPE;

/** Screen gutter is 20, the recipe sheet and Cook Mode use 24. */
export const SPACE = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64, gutter: 20, sheet: 24 } as const;

export const RADIUS = { xs: 6, sm: 10, md: 12, lg: 14, xl: 16, card: 18, sheetSmall: 22, big: 24, sheet: 32, pill: 999 } as const;

type Shadow = { shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number };
export const SHADOW = {
  fab: { shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  toast: { shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  drawer: { shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 6, height: 0 }, elevation: 8 },
  sheet: { shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 12 },
  photoDisc: { shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  hero: { shadowOpacity: 0.55, shadowRadius: 30, shadowOffset: { width: 0, height: 30 }, elevation: 10 },
} as const satisfies Record<string, Shadow>;

/** The original's timings. Nothing bounces except the spinner, which defines its own curve. */
export const MOTION = { quick: 180, standard: 240, slow: 320, toast: 2500 } as const;

/** Minimum tap target, in points. */
export const TAP_TARGET = 44;

export const ASPECT = { card: 4 / 3, hero: 16 / 9, square: 1, portrait: 4 / 5 } as const;

/** Fixed chrome sizes (spec §3.6). */
export const CHROME = {
  headerRow: 40,
  avatar: 36,
  fab: 56,
  fabRing: 5,
  tabIcon: 24,
  drawerMax: 320,
  drawerMin: 280,
  recipeHero: 280,
  titleBottom: 18,
  headerBottom: 10,
  /** The tab bar: visible height, the fade above it, and the gaps inside. */
  tabBar: 86,
  tabFade: 110,
  tabPadY: 6,
  tabGap: 5,
  tabHide: 180,
  fabBottom: 6,
  drawerMark: 36,
  drawerBrandY: 18,
  drawerSection: 14,
  drawerAvatar: 42,
} as const;

/** Recipe card measurements from the original (spec §3.2, §4.6), kept exact so cards match. */
export const CARD = {
  bodyX: 12,
  bodyTop: 10,
  bodyBottom: 13,
  heroBodyX: 18,
  heroBodyBottom: 16,
  thumb: 64,
  rowGap: 14,
  rankWidth: 44,
  disc: 28,
  discIcon: 15,
  discInset: 8,
  shelfWidth: 260,
  /** The ink "what you can cook" card on the Cupboard rail (spec §4.6). */
  matchWidth: 196,
  matchPillInset: 10,
  shelfBody: 14,
  /** Space kept clear under content so the floating tab bar never covers it. */
  scrollBottom: 160,
} as const;

/** The recipe page (spec §4.18): a fixed photo with the sheet sliding up over it. */
export const RECIPE = {
  hero: 280,
  overlap: 32,
  handleWidth: 44,
  handleHeight: 5,
  bullet: 9,
  stepRule: 2,
  stepNumber: 22,
  iconDisc: 30,
  byline: 32,
  heroButton: 44,
} as const;

/** v1's cupboard "jar" chip (spec §4.7). */
export const JAR = { gap: 7, padY: 6, padX: 9, initial: 12, matchBody: 14 } as const;

/** Pressed feedback: the original dims, it never scales cards. */
export const PRESSED = { card: 0.94, row: 0.7, subtle: 0.85 } as const;
