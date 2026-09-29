// One icon set: SF Symbols on iOS, Material Symbols elsewhere (map §8).
// Each icon is named once here, so screens ask for "plan", not a glyph.
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/ui/theme/ThemeProvider';
import type { ColourTokens } from '@/ui/tokens/colour';

const ICONS = {
  today: { ios: 'sun.horizon', android: 'wb_twilight', web: 'wb_twilight' },
  recipes: { ios: 'book', android: 'menu_book', web: 'menu_book' },
  plan: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  shop: { ios: 'basket', android: 'shopping_basket', web: 'shopping_basket' },
  saved: { ios: 'bookmark', android: 'bookmark', web: 'bookmark' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  forward: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  remove: { ios: 'minus', android: 'remove', web: 'remove' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  filter: { ios: 'line.3.horizontal.decrease', android: 'filter_list', web: 'filter_list' },
  timer: { ios: 'timer', android: 'timer', web: 'timer' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, colour = 'ink' }: { name: IconName; size?: number; colour?: keyof ColourTokens }) {
  const { colours } = useTheme();
  return <SymbolView name={ICONS[name]} size={size} tintColor={colours[colour]} weight="regular" accessible={false} />;
}
