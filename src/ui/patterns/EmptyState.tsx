// Every empty screen says what's missing and offers one next step (map §9 voice):
// "Nothing planned for tonight. Surprise me?" rather than a blank page.
import { View } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

type Props = { title: string; body: string; action?: { label: string; onPress: () => void } };

export function EmptyState({ title, body, action }: Props) {
  return (
    <View style={{ gap: SPACE.sm, paddingVertical: SPACE.xl }} accessible={!action} accessibilityLabel={`${title}. ${body}`}>
      <Text variant="title">{title}</Text>
      <Text variant="body" colour="inkSecondary">
        {body}
      </Text>
      {action ? (
        <View style={{ paddingTop: SPACE.xs }}>
          <Button label={action.label} onPress={action.onPress} kind="primary" />
        </View>
      ) : null}
    </View>
  );
}
