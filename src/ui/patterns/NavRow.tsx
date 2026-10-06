// One place in the side menu: icon, name and an optional count (spec §4.3).
import { Pressable, View } from 'react-native';

import { Badge } from '@/ui/primitives/Badge';
import { Icon, type IconName } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE } from '@/ui/tokens/type';

type Props = { icon: IconName; label: string; count?: number; onPress: () => void; testID: string };

export function DrawerRow({ icon, label, count = 0, onPress, testID }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${label}, ${count}` : label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon name={icon} size={22} />
      </View>
      <Text variant="row" style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Badge count={count} kind="ink" size="medium" />
    </Pressable>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md - 2,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.card,
  },
  icon: { width: 22, alignItems: 'center' },
  label: { flex: 1 },
  pressed: { backgroundColor: colours.bgSoft },
}));
