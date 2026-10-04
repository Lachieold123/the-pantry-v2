// A section start: a small uppercase kicker over a serif title (spec §4.5).
// The kicker is amber on Browse and Feed, grey on Cupboard and Plan.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

type Props = { kicker?: string | undefined; title?: string | undefined; tone?: 'accent' | 'muted'; action?: ReactNode; inset?: boolean };

export function SectionHeader({ kicker, title, tone = 'muted', action, inset = false }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: SPACE.sm,
        paddingBottom: 14,
        paddingHorizontal: inset ? SPACE.gutter : 0,
      }}
    >
      <View style={{ flex: 1, gap: SPACE.xxs }}>
        {kicker ? (
          <Text
            variant="kickerSection"
            colour={tone === 'accent' ? 'accentText' : 'inkMuted'}
            accessibilityRole={title ? undefined : 'header'}
          >
            {kicker}
          </Text>
        ) : null}
        {title ? (
          <Text variant="sectionTitle" accessibilityRole="header">
            {title}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
