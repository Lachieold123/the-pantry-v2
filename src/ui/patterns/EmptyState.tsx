// Every empty screen says what's missing and offers one next step. Two looks
// from the original (spec §2.2): the standard centred sans title, and the
// library's serif title for Saved and Collections.
import { View } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

type Props = {
  title: string;
  body: string;
  action?: { label: string; onPress: () => void } | undefined;
  look?: 'standard' | 'library';
  /** The block's id; its button gets `-action` after it. */
  testID?: string | undefined;
};

export function EmptyState({ title, body, action, look = 'standard', testID }: Props) {
  return (
    <View
      style={{ alignItems: 'center', gap: SPACE.xs, paddingHorizontal: SPACE.xl, paddingVertical: SPACE.xxl }}
      accessible={!action}
      accessibilityLabel={`${title}. ${body}`}
      {...(testID ? { testID } : {})}
    >
      <Text variant={look === 'library' ? 'dayName' : 'headingSans'} align="center">
        {title}
      </Text>
      <Text variant="bodyMedium" colour={look === 'library' ? 'inkSoft' : 'inkMuted'} align="center" style={{ maxWidth: 300 }}>
        {body}
      </Text>
      {action ? (
        <View style={{ paddingTop: SPACE.sm }}>
          <Button label={action.label} onPress={action.onPress} kind="primary" testID={testID ? `${testID}-action` : undefined} />
        </View>
      ) : null}
    </View>
  );
}
