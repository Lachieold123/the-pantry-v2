// Asked before leaving Cook Mode while a timer is still counting down: leaving
// cancels its alert, and a 2-hour braise shouldn't be silenced by a stray tap
// on × (audit F45). Inline rather than a native alert, as the editor does, so it
// reads the same on every platform.
import { View } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE } from '@/ui/tokens/type';

export function LeaveConfirm({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.box} accessibilityLiveRegion="polite" testID="cook-leave-confirm">
      <Text variant="body">Leave Cook Mode? Your timer will stop and won’t alert you.</Text>
      <View style={styles.row}>
        <Button label="Keep cooking" onPress={onStay} testID="cook-leave-stay" />
        <Button label="Leave" kind="destructive" onPress={onLeave} testID="cook-leave-go" />
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  box: { gap: SPACE.sm, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: colours.bgSoft },
  row: { flexDirection: 'row', gap: SPACE.sm },
}));
