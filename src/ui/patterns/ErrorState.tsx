// When something fails, say what happened and offer a real way to try again.
import { View } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

type Props = {
  title?: string;
  body: string;
  onRetry: () => void;
  /** A way out when trying again keeps failing, such as going home. */
  secondary?: { label: string; onPress: () => void; testID: string };
};

export function ErrorState({ title = 'That didn’t work', body, onRetry, secondary }: Props) {
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
      {secondary ? <Button label={secondary.label} onPress={secondary.onPress} testID={secondary.testID} /> : null}
    </View>
  );
}
