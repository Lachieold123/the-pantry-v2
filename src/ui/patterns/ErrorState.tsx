// When something fails, say what happened and offer a real way to try again.
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { announce, focusOn } from '@/ui/a11y/announce';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

type Props = { title?: string; body: string; onRetry: () => void };

export function ErrorState({ title = 'That didn’t work', body, onRetry }: Props) {
  const heading = useRef<View>(null);
  // The screen changed under the reader's finger: say what went wrong and put focus on it (audit F202).
  useEffect(() => {
    announce(`${title}. ${body}`);
    focusOn(heading);
  }, [title, body]);
  return (
    <View style={{ gap: SPACE.sm, paddingVertical: SPACE.xl }} accessibilityRole="alert">
      <Icon name="warning" colour="danger" />
      <View ref={heading} accessible accessibilityRole="header">
        <Text variant="title">{title}</Text>
      </View>
      <Text variant="body" colour="inkSoft">
        {body}
      </Text>
      <View style={{ paddingTop: SPACE.xs }}>
        <Button label="Try again" onPress={onRetry} kind="primary" testID="error-retry" />
      </View>
    </View>
  );
}
