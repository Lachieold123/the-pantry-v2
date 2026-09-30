// A recipe photo at a fixed shape. With no photo, the cuisine's soft tint and a
// quiet cooking icon stand in, as in the original app (spec §4.6).
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '@/ui/primitives/Icon';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { cuisineTint } from '@/ui/tokens/cuisine';
import { ASPECT, RADIUS } from '@/ui/tokens/type';

type Props = {
  source: number | undefined;
  shape: keyof typeof ASPECT;
  cuisine: string;
  radius?: number;
  /** Size of the fallback icon: big on heroes, small on thumbnails. */
  iconSize?: number;
  /** Overlays drawn on top of the photo (scrims, discs, pills). */
  children?: ReactNode;
};

export function RecipeImage({ source, shape, cuisine, radius = RADIUS.md, iconSize = 32, children }: Props) {
  const { colours } = useTheme();
  const frame = {
    width: '100%' as const,
    aspectRatio: ASPECT[shape],
    borderRadius: radius,
    overflow: 'hidden' as const,
    backgroundColor: source === undefined ? colours[cuisineTint(cuisine)] : colours.bgSoft,
  };
  return (
    <View style={frame}>
      {source === undefined ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Icon name="cook" size={iconSize} colour="inkMuted" />
        </View>
      ) : (
        <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} accessible={false} />
      )}
      {children}
    </View>
  );
}
