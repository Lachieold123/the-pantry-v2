// One icon set, Ionicons, as in the original app (D-025). Each icon is named
// once here by its job, so screens ask for "plan", not a glyph.
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/ui/theme/ThemeProvider';
import type { ColourTokens } from '@/ui/tokens/colour';

const ICONS = {
  menu: 'menu-outline',
  inbox: 'paper-plane-outline',
  feed: 'home-outline',
  browse: 'search-outline',
  search: 'search-outline',
  cupboard: 'grid-outline',
  plan: 'calendar-outline',
  add: 'add',
  back: 'chevron-back',
  arrowBack: 'arrow-back',
  forward: 'chevron-forward',
  arrowForward: 'arrow-forward',
  down: 'chevron-down',
  close: 'close',
  clear: 'close-circle',
  filter: 'options-outline',
  check: 'checkmark',
  checkCircle: 'checkmark-circle',
  saved: 'bookmark-outline',
  savedFilled: 'bookmark',
  comment: 'chatbubble-outline',
  share: 'share-outline',
  send: 'paper-plane-outline',
  cook: 'restaurant-outline',
  flame: 'flame-outline',
  list: 'list-outline',
  time: 'time-outline',
  difficulty: 'bar-chart-outline',
  people: 'people-outline',
  info: 'information-circle-outline',
  infoFilled: 'information-circle',
  aisles: 'file-tray-stacked-outline',
  refresh: 'refresh',
  refreshOutline: 'refresh-outline',
  hand: 'hand-left-outline',
  notifications: 'notifications-outline',
  collections: 'albums-outline',
  surprise: 'sync-outline',
  settings: 'settings-outline',
  camera: 'camera-outline',
  receipt: 'receipt-outline',
  compose: 'create-outline',
  edit: 'create-outline',
  link: 'link-outline',
  more: 'ellipsis-horizontal',
  heart: 'heart-outline',
  heartFilled: 'heart',
  timer: 'timer-outline',
  remove: 'remove',
  pause: 'pause',
  substitute: 'return-down-forward-outline',
  mail: 'mail-outline',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
  palette: 'color-palette-outline',
  contrast: 'contrast-outline',
  speed: 'speedometer-outline',
  leaf: 'leaf-outline',
  globe: 'globe-outline',
  logOut: 'log-out-outline',
  trash: 'trash-outline',
  block: 'ban-outline',
  flag: 'flag-outline',
  sparkles: 'sparkles-outline',
  basket: 'basket-outline',
  dice: 'dice-outline',
  person: 'person-outline',
  warning: 'warning-outline',
  circle: 'ellipse-outline',
} as const satisfies Record<string, ComponentProps<typeof Ionicons>['name']>;

export type IconName = keyof typeof ICONS;

type Props = { name: IconName; size?: number; colour?: keyof ColourTokens; tone?: string | undefined };

export function Icon({ name, size = 22, colour = 'ink', tone }: Props) {
  const { colours } = useTheme();
  return (
    <Ionicons name={ICONS[name]} size={size} color={tone ?? colours[colour]} accessibilityElementsHidden importantForAccessibility="no" />
  );
}
