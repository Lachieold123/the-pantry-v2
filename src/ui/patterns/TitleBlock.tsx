// The title at the top of a tab (Browse, Cupboard, Plan): a kicker, a big
// serif title and an optional subtitle, with an optional action beside the
// title (spec §4.4).
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { CHROME, SPACE } from '@/ui/tokens/type';

type Props = {
  kicker?: string | undefined;
  title: string;
  subtitle?: string | undefined;
  tone?: 'accent' | 'muted';
  action?: ReactNode;
  children?: ReactNode;
  /** Pad the sides itself, for full-bleed screens whose rows run edge to edge. */
  inset?: boolean;
};

export function TitleBlock({ kicker, title, subtitle, tone = 'muted', action, children, inset = false }: Props) {
  return (
    <View style={{ paddingHorizontal: inset ? SPACE.gutter : 0, paddingTop: SPACE.xs, paddingBottom: CHROME.titleBottom, gap: SPACE.xxs }}>
      {kicker ? (
        <Text variant="kicker" colour={tone === 'accent' ? 'accent' : 'inkMuted'}>
          {kicker}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
        <Text variant="display" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </Text>
        {action}
      </View>
      {subtitle ? (
        <Text variant="bodyMedium" colour="inkMuted" style={{ maxWidth: 320 }}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
