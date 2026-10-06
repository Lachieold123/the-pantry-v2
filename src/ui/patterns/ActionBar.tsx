// Sticky actions at the foot of a page: Save · Plan · Cook on a recipe.
import { useIsFocused } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { SPACE } from '@/ui/tokens/type';
import { useToastFloor } from './Toast';

export function ActionBar({ children }: { children: ReactNode }) {
  const { colours } = useTheme();
  const insets = useSafeAreaInsets();
  // A toast never covers the page's main buttons: it sits just above the bar.
  const [height, setHeight] = useState(0);
  useToastFloor(height, useIsFocused());
  return (
    <View
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={{
        flexDirection: 'row',
        gap: SPACE.xs,
        paddingHorizontal: SPACE.gutter,
        paddingTop: SPACE.sm,
        paddingBottom: Math.max(insets.bottom, SPACE.sm),
        backgroundColor: colours.bg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colours.border,
      }}
    >
      {children}
    </View>
  );
}
