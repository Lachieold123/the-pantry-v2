// A quiet card where a Pro feature begins (D-038): says what's Pro and why,
// with one way to find out more. Never a modal in the way, never a dead end:
// what's already there stays usable.
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { PRO } from '@/ui/tokens/screens';
import { PRESSED, RADIUS, SPACE } from '@/ui/tokens/type';

type Props = { title: string; body: string; onPress: () => void; testID?: string };

export function ProNudge({ title, body, onPress, testID }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body} See Pro`}
      testID={testID}
      style={({ pressed }) => [styles.card, pressed && { opacity: PRESSED.row }]}
    >
      <Icon name="sparkles" size={PRO.benefitIcon} colour="accentText" />
      <View style={{ flex: 1, gap: SPACE.xxs }}>
        <Text variant="row">{title}</Text>
        <Text variant="bodySmall" colour="inkSoft">
          {body}
        </Text>
        <Text variant="label" colour="accentText">
          See Pro
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  card: {
    flexDirection: 'row',
    gap: SPACE.sm,
    padding: SPACE.md,
    borderRadius: RADIUS.card,
    backgroundColor: colours.accentSoft,
  },
}));
