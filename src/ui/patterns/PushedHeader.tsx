// The header of a screen opened on top of a tab (Settings, Recently viewed,
// Kitchen stats): a square back button, an amber kicker and a serif title,
// with an optional action on the right (spec §4.4).
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

type Props = { kicker?: string | undefined; title: string; action?: ReactNode; onBack?: (() => void) | undefined };

export function PushedHeader({ kicker, title, action, onBack }: Props) {
  const router = useRouter();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACE.sm,
        paddingHorizontal: SPACE.gutter,
        paddingTop: SPACE.sm,
        paddingBottom: 14,
      }}
    >
      <View style={{ marginTop: SPACE.xxs }}>
        <IconButton icon="back" label="Back" shape="square" size={24} onPress={onBack ?? (() => router.back())} testID="back" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {kicker ? (
          <Text variant="kicker" colour="accent">
            {kicker}
          </Text>
        ) : null}
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}
