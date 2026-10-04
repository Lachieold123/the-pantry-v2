// The header of a screen opened on top of a tab (Settings, Recently viewed,
// Kitchen stats): a square back button, an amber kicker and a serif title,
// with an optional action on the right (spec §4.4).
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';
import { goBack } from '@/lib/navigation';

type Props = {
  kicker?: string | undefined;
  title: string;
  action?: ReactNode;
  onBack?: (() => void) | undefined;
  /** Pad the sides itself, when the page around it doesn't. */
  inset?: boolean;
  /** The page colour behind it, so the back button stays visible on grey pages. */
  surface?: 'bg' | 'bgSoft';
};

export function PushedHeader({ kicker, title, action, onBack, inset = false, surface = 'bg' }: Props) {
  const router = useRouter();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACE.sm,
        paddingHorizontal: inset ? SPACE.gutter : 0,
      }}
    >
      <View style={{ marginTop: SPACE.xxs }}>
        <IconButton
          icon="back"
          label="Back"
          shape={surface === 'bgSoft' ? 'squareOnSoft' : 'square'}
          size={24}
          onPress={onBack ?? (() => goBack(router))}
          testID="back"
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {kicker ? (
          <Text variant="kicker" colour="accentText">
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
