// When something fails, say what happened and offer a real way to try again.
import { View } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

type Props = { title?: string; body: string; onRetry: () => void };

export function ErrorState({ title = 'That didn’t work', body, onRetry }: Props) {
  return (
    <View style={{ gap: SPACE.sm, paddingVertical: SPACE.xl }} accessibilityRole="alert">
      <Icon name="warning" colour="danger" />
      <Text variant="title">{title}</Text>
      <Text variant="body" colour="inkSoft">
        {body}
      </Text>
      <View style={{ paddingTop: SPACE.xs }}>
        <Button label="Try again" onPress={onRetry} kind="primary" testID="error-retry" />
      </View>
    </View>
  );
}
