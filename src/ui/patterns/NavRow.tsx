// One place to go: icon, name, then an optional count or a short value
// ("Not sharing"), and a chevron. It began as the side menu's row (spec §4.3);
// the You page lists every place with it now the menu is gone. It lives here,
// not in a feature, because features can't import each other.
import { Pressable, View } from 'react-native';

import { Badge } from '@/ui/primitives/Badge';
import { Icon, type IconName } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE } from '@/ui/tokens/type';

type Props = {
  icon: IconName;
  label: string;
  /** How many are there; nothing shows at 0. */
  count?: number;
  /** Where you stand, in a few words ("Not sharing", "Free"). */
  value?: string | undefined;
  onPress: () => void;
  testID: string;
};

export function NavRow({ icon, label, count = 0, value, onPress, testID }: Props) {
  const styles = useStyles();
  // Read as one button: "Cookmarks, 4" or "Household, Not sharing".
  const said = value ? `${label}, ${value}` : count > 0 ? `${label}, ${count}` : label;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={said}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon name={icon} size={22} />
      </View>
      <Text variant="row" style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text variant="value" colour="inkMuted" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : (
        <Badge count={count} kind="ink" size="medium" />
      )}
      <Icon name="forward" size={16} colour="inkMuted" />
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
  // A long value ("With Sam, Alex and Jo") gives way to the name, never the other way round.
  value: { flexShrink: 1, maxWidth: '50%' },
  pressed: { backgroundColor: colours.bgSoft },
}));
