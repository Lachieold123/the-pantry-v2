// The top of a tab: a kicker, a serif title and an optional action.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Divider } from '@/ui/primitives/Divider';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

type Props = { kicker?: string; title: string; action?: ReactNode };

export function Masthead({ kicker, title, action }: Props) {
  return (
    <View style={{ gap: SPACE.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.sm }}>
        <View style={{ flex: 1, gap: SPACE.xxs }}>
          {kicker ? <Text variant="kicker">{kicker}</Text> : null}
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
        </View>
        {action}
      </View>
      <Divider />
    </View>
  );
}
