// A page whose body is a long list, as a virtualised FlatList, so only the
// rows near the screen are mounted (REL-14: 285 Cookmarks used to mount every
// card and photo at once). The same background, margins and bottom room as
// Screen; the header scrolls with the list.
import type { ReactElement, ReactNode } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { SPACE } from '@/ui/tokens/type';

type Props<T> = {
  header: ReactNode;
  items: readonly T[];
  renderItem: (item: T) => ReactElement;
  keyOf: (item: T) => string;
  /** Space between rows. */
  gap: number;
  /** Rows to draw before the first scroll: enough to fill a big phone. */
  initialRows?: number;
  testID?: string;
};

export function ListScreen<T>({ header, items, renderItem, keyOf, gap, initialRows = 4, testID }: Props<T>) {
  const { colours } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => renderItem(item)}
      keyExtractor={keyOf}
      ListHeaderComponent={<View style={{ marginBottom: SPACE.lg }}>{header}</View>}
      ItemSeparatorComponent={() => <View style={{ height: gap }} />}
      initialNumToRender={initialRows}
      maxToRenderPerBatch={initialRows}
      windowSize={7}
      style={{ flex: 1, backgroundColor: colours.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + SPACE.md,
        paddingHorizontal: SPACE.gutter,
        paddingBottom: SPACE.xxl + insets.bottom,
      }}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      testID={testID}
    />
  );
}
