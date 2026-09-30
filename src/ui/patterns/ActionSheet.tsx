// A list of actions in a small sheet (spec §4.15, the recipe "⋯" menu). Each
// row closes the sheet, then acts, so the next screen opens cleanly.
import { Pressable, View } from 'react-native';

import { Icon, type IconName } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { MOTION, RADIUS, SPACE } from '@/ui/tokens/type';
import { ModalSheet } from './ModalSheet';

export type SheetAction = { label: string; icon: IconName; onPress: () => void; destructive?: boolean; testID: string };

type Props = { visible: boolean; onClose: () => void; title: string; actions: SheetAction[] };

export function ActionSheet({ visible, onClose, title, actions }: Props) {
  const styles = useStyles();
  return (
    <ModalSheet visible={visible} onClose={onClose} title={title}>
      {actions.map((a) => (
        <Pressable
          key={a.testID}
          testID={a.testID}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={() => {
            onClose();
            // Act once the sheet has gone: iOS can't present a new screen while a modal is still closing.
            setTimeout(a.onPress, MOTION.slow);
          }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.disc}>
            <Icon name={a.icon} size={18} colour={a.destructive ? 'danger' : 'inkSoft'} />
          </View>
          <Text variant="row" colour={a.destructive ? 'danger' : 'ink'}>
            {a.label}
          </Text>
        </Pressable>
      ))}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        testID="sheet-cancel"
        style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
      >
        <Text variant="labelLarge" align="center">
          Cancel
        </Text>
      </Pressable>
    </ModalSheet>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md - 2,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.md,
  },
  pressed: { backgroundColor: colours.bgSoft },
  disc: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { marginTop: SPACE.xs, paddingVertical: SPACE.md, borderTopWidth: 1, borderTopColor: colours.border },
}));
