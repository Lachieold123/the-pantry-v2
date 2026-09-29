// A kicker-style heading that starts a group within a screen.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, minHeight: 32 }}>
      <Text variant="kicker" accessibilityRole="header">
        {title}
      </Text>
      {action}
    </View>
  );
}
