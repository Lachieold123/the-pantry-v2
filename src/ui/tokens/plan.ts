// The Plan tab (spec §4.11–4.13) and the List: v1's sizes and the space between its sections.
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
