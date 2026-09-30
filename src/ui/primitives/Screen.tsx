// The page every screen sits on: theme background, safe areas, side margin.
// Tab screens sit under the app header (which handles the top safe area) and
// over the floating tab bar, so they leave room for it at the bottom.
import type { ReactNode, Ref } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { CARD, SPACE } from '@/ui/tokens/type';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  /** 'top' pads for the status bar; 'none' when a header above already does. */
  edges?: 'top' | 'none';
  /** A tab screen: no top inset (the header has it) and room for the tab bar. */
  tab?: boolean;
  /** The page colour: most pages are `bg`; Settings and Filters sit on `bgSoft`. */
  surface?: 'bg' | 'bgSoft';
  testID?: string;
  /** For screens that jump back to the top, like switching the Plan tab's views. */
  scrollRef?: Ref<ScrollView>;
} & Pick<ScrollViewProps, 'refreshControl'>;

export function Screen({ children, scroll = true, edges = 'top', tab = false, surface = 'bg', refreshControl, testID, scrollRef }: Props) {
  const { colours } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    // A tab's title block brings its own top space, as v1's did under the masthead.
    paddingTop: (edges === 'top' && !tab ? insets.top : 0) + (tab ? 0 : SPACE.md),
    paddingHorizontal: SPACE.gutter,
    paddingBottom: tab ? CARD.scrollBottom : SPACE.xxl + insets.bottom,
    gap: SPACE.lg,
  };
  const background = { flex: 1, backgroundColor: colours[surface] };
  if (!scroll) {
    return (
      <View style={[background, padding]} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      ref={scrollRef}
      style={background}
      contentContainerStyle={padding}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      testID={testID}
      {...(refreshControl ? { refreshControl } : {})}
    >
      {children}
    </ScrollView>
  );
}
