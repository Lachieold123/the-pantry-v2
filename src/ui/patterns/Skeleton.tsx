// A quiet placeholder while content loads. It breathes slowly, and holds
// still when the cook has Reduce Motion on.
import { useEffect } from 'react';
import { type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { RADIUS } from '@/ui/tokens/type';

type Props = { width?: DimensionValue; height: number; radius?: number };

export function Skeleton({ width = '100%', height, radius = RADIUS.sm }: Props) {
  const { colours } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) opacity.value = withRepeat(withTiming(0.5, { duration: 900 }), -1, true);
  }, [opacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[{ width, height, borderRadius: radius, backgroundColor: colours.bgSoft }, style]}
    />
  );
}
