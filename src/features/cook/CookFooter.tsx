// "Previous" as quiet text and "Next step" as v1's black pill; on the last step
// the pill says Done and finishes the cook.
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { COOK } from '@/ui/tokens/cook';
import { PRESSED, RADIUS } from '@/ui/tokens/type';

type Props = { first: boolean; last: boolean; onPrevious: () => void; onNext: () => void; onDone: () => void };

export function CookFooter({ first, last, onPrevious, onNext, onDone }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrevious}
        disabled={first}
        accessibilityRole="button"
        accessibilityLabel="Previous step"
        accessibilityState={{ disabled: first }}
        style={({ pressed }) => [styles.previous, pressed && !first && styles.pressed]}
        testID="cook-back"
      >
        <Icon name="back" size={COOK.chevron} colour={first ? 'inkSubtle' : 'ink'} />
        <Text variant="label" colour={first ? 'inkSubtle' : 'ink'}>
          Previous
        </Text>
      </Pressable>
      <Pressable
        onPress={last ? onDone : onNext}
        accessibilityRole="button"
        accessibilityLabel={last ? 'Finish cooking' : 'Next step'}
        style={({ pressed }) => [styles.next, pressed && styles.pressedPill]}
        testID={last ? 'cook-done' : 'cook-next'}
      >
        <Text variant="label" colour="bg">
          {last ? 'Done' : 'Next step'}
        </Text>
        {last ? null : <Icon name="forward" size={COOK.chevron} colour="bg" />}
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: COOK.footerGap,
    paddingHorizontal: COOK.footerX,
    paddingTop: COOK.footerTop,
    paddingBottom: COOK.footerBottom,
  },
  previous: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: COOK.previousGap,
    paddingHorizontal: COOK.previousX,
    paddingVertical: COOK.previousY,
    borderRadius: RADIUS.pill,
  },
  next: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: COOK.nextGap,
    paddingHorizontal: COOK.nextX,
    paddingVertical: COOK.nextY,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.ink,
  },
  pressed: { opacity: PRESSED.row },
  pressedPill: { opacity: PRESSED.card },
}));
