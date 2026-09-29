// The frame for short, focused tasks shown as sheets (map §6): a title, a
// close button and the content. Sheets are routes presented as form sheets.
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { SPACE } from '@/ui/tokens/type';
import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = { title: string; onClose: () => void; children: ReactNode };

export function Sheet({ title, onClose, children }: Props) {
  const { colours } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colours.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: SPACE.screen, paddingRight: SPACE.xs, paddingTop: SPACE.sm }}>
        <Text variant="title" style={{ flex: 1 }} accessibilityRole="header">
          {title}
        </Text>
        <IconButton icon="close" label="Close" onPress={onClose} />
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACE.screen, gap: SPACE.lg }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}
