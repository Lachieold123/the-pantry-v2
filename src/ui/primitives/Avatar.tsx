// A person's round tile: their initial, or a person icon before they've given
// a name. Grey fill with a hairline, as in the original header (spec §4.1).
// Another cook's avatar shows their photo, with the initial behind it while it loads.
import { Image } from 'expo-image';
import { View } from 'react-native';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { RADIUS } from '@/ui/tokens/type';
import { Icon } from './Icon';
import { Text } from './Text';

export function Avatar({ name, size, uri }: { name?: string | undefined; size: number; uri?: string | undefined }) {
  const { colours } = useTheme();
  const initial = name?.trim().charAt(0).toUpperCase();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: colours.border,
        backgroundColor: colours.bgSoft,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {initial ? (
        <Text variant={size > 40 ? 'headingSansSmall' : 'name'} maxFontSizeMultiplier={1}>
          {initial}
        </Text>
      ) : (
        <Icon name="person" size={Math.round(size * 0.5)} colour="inkSoft" />
      )}
      {uri ? (
        <Image source={{ uri }} style={{ position: 'absolute', width: size, height: size }} contentFit="cover" accessible={false} />
      ) : null}
    </View>
  );
}
