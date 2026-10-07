// When something fails, say what happened and offer a real way to try again.
import { View } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { useAnnounce } from '@/ui/primitives/accessibility';
import { SPACE } from '@/ui/tokens/type';

type Props = { title?: string; body: string; onRetry: () => void };

export function ErrorState({ title = 'That didn’t work', body, onRetry }: Props) {
  // `alert` only marks the block; iOS says nothing until VoiceOver lands on it.
  useAnnounce(`${title}. ${body}`);
  return (
    <View style={{ gap: SPACE.sm, paddingVertical: SPACE.xl }} accessibilityRole="alert">
      <Icon name="warning" colour="danger" />
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body" colour="inkSoft">
        {body}
      </Text>
      <View style={{ paddingTop: SPACE.xs }}>
        <Button label="Try again" onPress={onRetry} kind="primary" testID="error-retry" />
      </View>
    </View>
  );
}
