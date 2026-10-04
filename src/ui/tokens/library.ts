// The library pages (Saved, Collections, Recently viewed, Kitchen stats):
// v1's cream recipe cards, collection mosaics and page head, measured from
// CookmarksModal, CollectionsModal and StatsModal (spec §4.4, §4.6, §4.14).
//
// v1 kept the cream cards light in dark mode, where they glared on black.
// D-025 allows dark variants of v1's light-only colours, so the card here is a
// warm near-black in dark mode with cream text, keeping the "paper" feel.
import type { ThemeName } from './colour';

export type LibraryColours = {
  /** The card's fill. */
  card: string;
  /** Card title and the bookmark disc's icon. */
  title: string;
  /** Time and difficulty under the title. */
  meta: string;
  /** The small dot between time and difficulty. */
  dot: string;
  /** Behind a photo while it loads, and the empty cells of a collection mosaic. */
  well: string;
  /** The cooking icon standing in for a missing photo. */
  wellIcon: string;
  /** The round bookmark disc on a card's photo. */
  disc: string;
  discInk: string;
  /**
   * The italic count ("4 items"). v1's #E8C891 is 1.5:1 on white, so light mode
   * uses a deeper amber that still reads as amber (4.3:1); dark keeps v1's.
   */
  count: string;
};

const LIGHT: LibraryColours = {
  card: '#F7F3EA',
  title: '#0E0E0E',
  // 0.55 was 4.0:1 at 11pt (health check 2026-10-05 #24).
  meta: 'rgba(20,18,16,0.62)',
  dot: 'rgba(0,0,0,0.35)',
  // A light well: the near-black one read as a hole in a light page (#15).
  well: '#ECE6DA',
  wellIcon: '#7A7266',
  disc: '#F7F3EA',
  discInk: '#1A1A1A',
  count: '#A0712F',
};

const DARK: LibraryColours = {
  card: '#1C1915',
  title: '#F7F3EA',
  meta: 'rgba(247,243,234,0.62)',
  dot: 'rgba(247,243,234,0.35)',
  well: '#26221D',
  wellIcon: '#6A6258',
  disc: '#F7F3EA',
  discInk: '#1A1A1A',
  count: '#E8C891',
};

export function libraryColours(theme: ThemeName): LibraryColours {
  return theme === 'dark' ? DARK : LIGHT;
}

/** Measurements (spec §3.2, §4.4, §4.6, §4.14). */
export const LIBRARY = {
  /** Page head: side padding, top and bottom space, the rule before the kicker. */
  headX: 22,
  headTop: 8,
  headBottom: 18,
  ruleWidth: 22,
  ruleHeight: 1,
  ruleGap: 10,
  titleTop: 8,
  countTop: 12,
  /** The back chip row above the head. */
  barX: 18,
  barY: 4,
  /** Grid of cream cards and of mosaics. */
  gridX: 16,
  gridGap: 12,
  mosaicRowGap: 18,
  /** Card body padding and the title's two-line minimum height. */
  bodyX: 13,
  bodyTop: 11,
  bodyBottom: 13,
  cardTitleTop: 4,
  cardTitleBottom: 8,
  cardTitleMinHeight: 38,
  metaIcon: 11,
  dot: 3,
  dotGap: 6,
  wellIcon: 32,
  /** The bookmark disc on a cream card. */
  disc: 28,
  discIcon: 14,
  discInset: 8,
  /** Collection mosaic: the gutter between its four photos and the space above its name. */
  mosaicGutter: 1,
  mosaicBodyTop: 10,
  mosaicBodyX: 2,
  /** The "+ New collection" row: v1's head ended 6 above it and the row added 18; the head already gives 18. */
  actionsTop: 6,
  actionsBottom: 12,
  newPillY: 8,
  newPillX: 14,
  /** The naming dialog. */
  dialogMax: 360,
  dialogPad: 20,
  dialogInputX: 14,
  dialogInputY: 12,
  /** Recently viewed's "Clear" soft pill. */
  clearX: 14,
  clearY: 9,
  /** Kitchen stats. */
  streakY: 32,
  tileY: 18,
  tileGap: 12,
  rankY: 12,
  rankGap: 14,
  rankNumber: 22,
  statsSectionGap: 28,
} as const;
