// A recipe photo at one of the three fixed shapes (map §9). With no photo,
// a quiet block with the cuisine's initial stands in: never an emoji.
import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { ASPECT, RADIUS } from '@/ui/tokens/type';

type Props = { source: number | undefined; shape: keyof typeof ASPECT; initial: string; radius?: number };

export function RecipeImage({ source, shape, initial, radius = RADIUS.md }: Props) {
  const { colours } = useTheme();
  const frame = {
    width: '100%' as const,
    aspectRatio: ASPECT[shape],
    borderRadius: radius,
    overflow: 'hidden' as const,
    backgroundColor: colours.surfaceSunken,
  };
  if (source === undefined) {
    return (
      <View style={[frame, { alignItems: 'center', justifyContent: 'center' }]} accessibilityElementsHidden importantForAccessibility="no">
        <Text variant="title" colour="inkMuted">
          {initial}
        </Text>
      </View>
    );
  }
  return (
    <View style={frame}>
      <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} accessible={false} />
    </View>
  );
}
