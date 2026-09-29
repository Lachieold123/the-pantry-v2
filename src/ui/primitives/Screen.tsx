// The page every screen sits on: theme background, safe areas, side margin.
import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { SPACE } from '@/ui/tokens/type';

type Props = { children: ReactNode; scroll?: boolean; edges?: 'top' | 'none' } & Pick<ScrollViewProps, 'refreshControl'>;

export function Screen({ children, scroll = true, edges = 'top', refreshControl }: Props) {
  const { colours } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: (edges === 'top' ? insets.top : 0) + SPACE.md,
    paddingHorizontal: SPACE.screen,
    paddingBottom: SPACE.xxl,
    gap: SPACE.lg,
  };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: colours.bg }, padding]}>{children}</View>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colours.bg }}
      contentContainerStyle={padding}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      {...(refreshControl ? { refreshControl } : {})}
    >
      {children}
    </ScrollView>
  );
}
