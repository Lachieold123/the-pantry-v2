// A small count: amber on the tab bar, ink in the drawer (spec §3.6, §4.3).
// Hidden at zero. The original's drawer badge used white text on an ink fill,
// so it vanished in dark mode; here the text is always the page colour.
import { View } from 'react-native';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { RADIUS, SPACE } from '@/ui/tokens/type';
import { Text } from './Text';

type Props = { count: number; kind?: 'accent' | 'ink'; size?: 'small' | 'medium'; max?: number };

export function Badge({ count, kind = 'accent', size = 'small', max = 99 }: Props) {
  const { colours } = useTheme();
  if (count <= 0) return null;
  const side = size === 'small' ? SPACE.md : SPACE.lg - 2;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        minWidth: side,
        height: side,
        paddingHorizontal: size === 'small' ? SPACE.xxs : 7,
        borderRadius: RADIUS.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: kind === 'accent' ? colours.accent : colours.ink,
      }}
    >
      <Text variant="badge" colour={kind === 'accent' ? 'onAccent' : 'bg'} maxFontSizeMultiplier={1.2}>
        {count > max ? `${max}+` : String(count)}
      </Text>
    </View>
  );
}
