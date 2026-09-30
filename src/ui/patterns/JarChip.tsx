// An ingredient in the cupboard, as v1's tinted "jar" (spec §4.7): the italic
// serif initial in the category's ink, the name, and a small ×. Tapping it
// takes the ingredient out (the screen offers undo).
import { Pressable, Text as RNText } from 'react-native';

import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { textStyle } from '@/ui/theme/fonts';
import { PANTRY_CATEGORY, PANTRY_CHIP_INK, type PantryCategory } from '@/ui/tokens/cuisine';
import { JAR, PRESSED, RADIUS, SPACE, TYPE } from '@/ui/tokens/type';

type Props = { name: string; category: PantryCategory; onRemove: () => void; testID: string };

export function JarChip({ name, category, onRemove, testID }: Props) {
  const c = PANTRY_CATEGORY[category];
  return (
    <Pressable
      onPress={onRemove}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${name}. Remove from cupboard`}
      hitSlop={{ top: SPACE.xxs, bottom: SPACE.xxs }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: JAR.gap,
        paddingVertical: JAR.padY,
        paddingHorizontal: JAR.padX,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: c.soft,
        backgroundColor: c.tint,
        opacity: pressed ? PRESSED.subtle : 1,
      })}
    >
      <RNText style={[textStyle(TYPE.jarInitial), { color: c.bold, width: JAR.initial }]} maxFontSizeMultiplier={1.3}>
        {name.charAt(0).toUpperCase()}
      </RNText>
      <Text variant="bodySmall" tone={PANTRY_CHIP_INK} numberOfLines={1}>
        {name.charAt(0).toUpperCase() + name.slice(1)}
      </Text>
      <Icon name="close" size={11} tone={c.bold} />
    </Pressable>
  );
}
