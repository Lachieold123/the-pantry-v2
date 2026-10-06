// The Cupboard tab's measurements, from v1's PantryModal (spec §4.7, §4.9,
// §7 Cupboard). Kept in one place so the redesign changes numbers here, not
// in the screen.

export const CUPBOARD = {
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
  /** Small outline pills (the recipe page's cupboard actions): 32 tall, with slop to make a full tap target. The quick adds share the slop. */
  actionHeight: 32,
  actionPadX: 12,
  actionGap: 6,
  actionSlop: 6,
  actionIcon: 14,
  /** The settings rows at the foot of the page. */
  settingPadY: 16,
} as const;
