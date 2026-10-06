// Ways to fill the cupboard in bulk, under the search box (D-030, v1's
// Cupboard buttons). "Add a list" always works. Scanning a receipt or a photo
// of your food only shows once the reader is connected (SCAN_CONNECTED, K-14):
// until then a button that can't read anything would be a dead one
// (Lachlan, 6 October: hide what isn't real yet).
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { SCAN_CONNECTED } from '@/lib/scan';
import { Icon, type IconName } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { PRESSED, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type Way = {
  label: string;
  icon: IconName;
  href: '/cupboard/add-list' | '/cupboard/scan?kind=receipt' | '/cupboard/scan?kind=food';
  testID: string;
};

const ADD_LIST: Way = { label: 'Add a list', icon: 'list', href: '/cupboard/add-list', testID: 'cupboard-add-list' };
const SCANS: Way[] = [
  { label: 'Scan receipt', icon: 'receipt', href: '/cupboard/scan?kind=receipt', testID: 'cupboard-scan-receipt' },
  { label: 'Photo of food', icon: 'camera', href: '/cupboard/scan?kind=food', testID: 'cupboard-scan-food' },
];

function waysIn(scanConnected: boolean): Way[] {
  return scanConnected ? [ADD_LIST, ...SCANS] : [ADD_LIST];
}

export function WaysIn() {
  const router = useRouter();
  const styles = useStyles();
  const ways = waysIn(SCAN_CONNECTED);
  // One way on its own reads as a wide button (icon beside the label), not a lone tall tile.
  const single = ways.length === 1;
  return (
    <View style={styles.row}>
      {ways.map((w) => (
        <Pressable
          key={w.testID}
          onPress={() => router.push(w.href)}
          accessibilityRole="button"
          accessibilityLabel={w.label}
          testID={w.testID}
          style={({ pressed }) => [styles.way, single && styles.single, pressed && { opacity: PRESSED.row }]}
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
  single: { flexDirection: 'row', minHeight: TAP_TARGET, gap: SPACE.xs },
}));
