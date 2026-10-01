// Three ways to fill the cupboard in bulk, under the search box: type a list,
// scan a receipt, or take a photo of your food (D-030, v1's Cupboard buttons).
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon, type IconName } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { PRESSED, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';

const WAYS: {
  label: string;
  icon: IconName;
  href: '/cupboard/add-list' | '/cupboard/scan?kind=receipt' | '/cupboard/scan?kind=food';
  testID: string;
}[] = [
  { label: 'Type a list', icon: 'list', href: '/cupboard/add-list', testID: 'cupboard-add-list' },
  { label: 'Scan receipt', icon: 'receipt', href: '/cupboard/scan?kind=receipt', testID: 'cupboard-scan-receipt' },
  { label: 'Photo of food', icon: 'camera', href: '/cupboard/scan?kind=food', testID: 'cupboard-scan-food' },
];

export function WaysIn() {
  const router = useRouter();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      {WAYS.map((w) => (
        <Pressable
          key={w.testID}
          onPress={() => router.push(w.href)}
          accessibilityRole="button"
          accessibilityLabel={w.label}
          testID={w.testID}
          style={({ pressed }) => [styles.way, pressed && { opacity: PRESSED.row }]}
        >
          <Icon name={w.icon} size={20} />
          <Text variant="chip" align="center" numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {w.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  row: { flexDirection: 'row', gap: SPACE.xs },
  way: {
    flex: 1,
    minHeight: TAP_TARGET + SPACE.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xxs,
    paddingHorizontal: SPACE.xxs,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bgSoft,
  },
}));
