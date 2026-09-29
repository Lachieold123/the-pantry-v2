// A tappable row with a title, optional detail and a chevron: settings, collections.
import { Pressable, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Icon } from './Icon';
import { Text } from './Text';

type Props = { title: string; detail?: string; value?: string; onPress: () => void };

export function ListRow({ title, detail, value, onPress }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text variant="ui">{title}</Text>
        {detail ? <Text variant="meta">{detail}</Text> : null}
      </View>
      {value ? (
        <Text variant="meta" colour="inkSecondary">
          {value}
        </Text>
      ) : null}
      <Icon name="forward" size={16} colour="inkMuted" />
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  row: { minHeight: TAP_TARGET + SPACE.xs, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.sm },
  text: { flex: 1, gap: 2 },
  pressed: { opacity: 0.6 },
}));
