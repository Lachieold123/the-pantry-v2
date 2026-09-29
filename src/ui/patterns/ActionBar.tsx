// Sticky actions at the foot of a page: Save · Plan · Cook on a recipe.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { SPACE } from '@/ui/tokens/type';

export function ActionBar({ children }: { children: ReactNode }) {
  const { colours } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: SPACE.xs,
        paddingHorizontal: SPACE.screen,
        paddingTop: SPACE.sm,
        paddingBottom: Math.max(insets.bottom, SPACE.sm),
        backgroundColor: colours.bg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colours.rule,
      }}
    >
      {children}
    </View>
  );
}
