// The Cupboard tab's measurements, from v1's PantryModal (spec §4.7, §4.9,
// §7 Cupboard). Kept in one place so the redesign changes numbers here, not
// in the screen.

export const CUPBOARD = {
  /** Category tabs above the "stock the cupboard" grid: text tabs with an underline in the category colour. */
  tabGap: 18,
  tabPadTop: 6,
  tabPadBottom: 12,
  tabUnderline: 1.5,
  /** The tiles: three across, an italic initial over the name. */
  tileMinHeight: 90,
  tilePadY: 16,
  tilePadX: 8,
  tileGap: 8,
  tileWidth: '31.7%',
  gridTop: 14,
  /** Jar groups: a spaced-out name, a faint rule in the category colour, an italic count. */
  groupGap: 18,
  groupHeadGap: 10,
  groupNameOpacity: 0.85,
  groupRuleOpacity: 0.5,
  jarGap: 6,
  /** The jar's × is quieter than its initial. */
  jarCloseOpacity: 0.55,
  /** Quick adds: one scrolling row of light outlined chips. */
  quickGap: 8,
  quickPadLeft: 12,
  quickPadRight: 14,
  quickPadY: 8,
  quickIconGap: 6,
  quickIcon: 12,
  quickIconOpacity: 0.55,
  /** "Add one thing": an italic numeral column, hairlines between rows. */
  numeralWidth: 32,
  unlockPadY: 16,
  unlockGap: 16,
  unlockTextGap: 3,
  /** The small matching pills on each row: 32 tall, with slop to make a full tap target. */
  actionHeight: 32,
  actionPadX: 12,
  actionGap: 6,
  actionSlop: 6,
  actionIcon: 14,
  /** The settings rows at the foot of the page. */
  settingPadY: 16,
} as const;
