// A tappable row: optional icon, a label, optional detail and value, and a
// chevron. The original's settings row (spec §7 Settings); rows sit inside a card
// and the caller draws the hairlines between them.
import { Pressable, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = { title: string; detail?: string; value?: string; icon?: IconName; onPress: () => void; testID?: string };

export function ListRow({ title, detail, value, icon, onPress, testID }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? <Icon name={icon} size={20} /> : null}
      <View style={styles.text}>
        <Text variant="rowSmall">{title}</Text>
        {detail ? <Text variant="caption">{detail}</Text> : null}
      </View>
      {value ? (
        <Text variant="value" colour="inkMuted" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      <Icon name="forward" size={16} colour="inkMuted" />
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  row: { minHeight: TAP_TARGET, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.md - 2 },
  text: { flex: 1, gap: 2 },
  value: { maxWidth: '45%' },
  pressed: { opacity: 0.6 },
}));
