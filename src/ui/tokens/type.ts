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
  // Cupboard (v1 PantryModal): tile initials, jar-group counts, "Add one thing" rows.
  cupboardTileInitial: italic(serif(22, '400', 24, -0.4)),
  cupboardGroupCount: italic(serif(13, '400', 16, -0.1)),
  cupboardNumeral: italic(serif(22, '400', 26, -0.4)),
  cupboardUnlockTitle: serif(18, '700', 22, -0.3),
  cupboardTab: sans(14, '600', 18),
  cupboardTileName: sans(12.5, '500', 16, 0.1),
  cupboardTileNameOn: sans(12.5, '700', 16, 0.1),
  cupboardGroupName: upper(sans(10.5, '700', 13, 2.8)),
  cupboardQuickAdd: sans(13, '500', 17),
  drawerProfileSub: sans(12, '500', 16),
  // Settings, Filters and Welcome (group C): v1's sizes for those screens.
  titleOnboarding: serif(34, '700', 38, -0.8),
  titleSansLarge: sans(28, '800', 32, -0.8),
  lead: sans(14, '500', 20),
  leadLarge: sans(16, '500', 24),
  kickerList: upper(sans(11, '800', 14, 2)),
  kickerWide: upper(sans(11, '800', 14, 4)),
  labelOnVideo: sans(15, '800', 20, 0.3),
  pillLabel: sans(13, '700', 17, 0.3),
  chipLarge: sans(14, '700', 18),
  tileLabel: sans(16, '800', 20, -0.2),
  /** Library pages (Saved, Collections): the italic amber count, "4 items" (v1 15 italic). */
  countLibrary: italic(serif(15, '400', 18, -0.1)),
  /** Library pages: the small kicker after the 22×1 rule (v1 10.5/700/2.5). */
  kickerLibrary: upper(sans(10.5, '700', 13, 2.5)),
  /** Kitchen stats: the label under a tile's number (v1 11/700/0.3). */
  statLabel: sans(11, '700', 14, 0.3),
  /** Cook Mode: a time inside the step text, bold so it reads as a tappable chip. */
  cookStepTimer: serif(22, '700', 32, -0.2),
  /** Cook Mode's "COOK MODE" header kicker (v1 9.5/800/2.5). */
  cookKicker: upper(sans(9.5, '800', 12, 2.5)),
  displaySurprise: serif(48, '400', 52, -1.2),
  displaySurpriseAccent: italic(serif(48, '400', 52, -1.2)),
  counter: serif(18, '700', 22, -0.2),
  counterSlash: serif(16, '400', 22),
  counterTotal: serif(14, '400', 22),
  reasonValue: serif(13.5, '400', 19),
  // Kickers and eyebrows (sans, uppercase)
  kicker: upper(sans(11, '800', 14, 3)),
  kickerSection: upper(sans(11, '800', 14, 2.5)),
  kickerSmall: upper(sans(10, '800', 13, 2)),
  eyebrow: upper(sans(9.5, '800', 12, 1.8)),
  eyebrowLarge: upper(sans(10.5, '800', 13, 2)),
  chipSmall: sans(11.5, '600', 15),
  eyebrowSurprise: upper(sans(10, '800', 13, 2.8)),
  reasonKey: upper(sans(10.5, '700', 13, 2.3)),
  hint: upper(sans(11, '600', 14, 0.7)),
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
  peek: { shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 12 }, elevation: 4 },
} as const satisfies Record<string, Shadow>;

/** The original's timings. Nothing bounces except Surprise me's deck, which defines its own curve. */
export const MOTION = { quick: 180, standard: 240, slow: 320, toast: 2500 } as const;

/** Minimum tap target, in points. */
export const TAP_TARGET = 44;
/** v1's compact controls (small segmented, the Cook pill). They reach TAP_TARGET through hitSlop. */
export const SMALL_CONTROL = 36;
/** Invisible padding that brings a control `height` tall up to TAP_TARGET (health check #12). */
export const slopFor = (height: number) => Math.max(0, Math.ceil((TAP_TARGET - height) / 2));

export const ASPECT = { card: 4 / 3, hero: 16 / 9, square: 1, portrait: 4 / 5, surprise: 4 / 5.2 } as const;

/** Fixed chrome sizes (spec §3.6). */
export const CHROME = {
  headerRow: 40,
  avatar: 36,
  /** The centre "+": the button, the ring of page colour round it, and its lift. */
  fab: 56,
  fabRing: 5,
  fabBottom: 6,
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
  /** The basket beside "Add to list" in the Ingredients heading. */
  addIcon: 16,
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

/** The Plan tab (spec §4.11–4.13): day cells, slot cards, suggestion cards, the progress track. */
/** The Plan tab (spec §4.11–4.13): v1's sizes and the space between its sections. */
export const PLAN = {
  dayWidth: 52,
  dayHeight: 70,
  dot: 4,
  thumb: 56,
  suggestion: 158,
  progress: 4,
  slotPad: 10,
  /** Space under each part of the page, top to bottom. */
  afterProgress: 14,
  afterStrip: 22,
  afterDayName: 10,
  afterSlots: 28,
  afterSectionHead: 14,
  afterRail: 24,
  /** Suggestion card body and the shopping card. */
  cardBodyX: 12,
  cardBodyTop: 10,
  cardBodyBottom: 12,
  listCardY: 14,
  chipX: 10,
  chipY: 5,
  rowY: 14,
  rowX: 16,
  aisleGap: 18,
  chipGap: 6,
  pillY: 6,
  /** The small gap between a card's title and its meta, and the servings pill's height padding. */
  hair: 2,
  addRowMin: 48,
} as const;

/** v1's cupboard "jar" chip (spec §4.7). */
export const JAR = { gap: 7, padY: 6, padX: 9, initial: 12, matchBody: 14 } as const;

/** Pressed feedback: the original dims, it never scales cards. */
export const PRESSED = { card: 0.94, row: 0.7, subtle: 0.85 } as const;

/** The Surprise me deck and motion (spec §4.19, §6). v1's numbers, kept so it moves the same. */
export const SURPRISE = {
  heroMax: 320,
  peekMax: 260,
  /** A peek card is this share of the stage width. */
  peekShare: 0.78,
  radius: 22,
  stagePadX: 28,
  cornerInset: 18,
  cornerRule: 24,
  cornerGap: 10,
  labelTop: 30,
  labelBottom: 22,
  metaGap: 6,
  peek: { x: 22, xOpen: 30, y: 14, yOpen: 18, tilt: 7, tiltOpen: 11 },
  tick: { x: 8, tilt: 2, scale: 0.97, ms: 140 },
  settle: { scale: 1.04, ms: 220, backMs: 200 },
  driftMs: 400,
  hintMs: 250,
  hintDim: 0.4,
  iconMs: 600,
  iconTurns: 720,
  /** Bezier control points: the settle overshoots a little; the drift eases out. */
  settleCurve: [0.34, 1.56, 0.64, 1],
  driftCurve: [0.2, 0.7, 0.3, 1],
  reasonKeyWidth: 78,
} as const;
