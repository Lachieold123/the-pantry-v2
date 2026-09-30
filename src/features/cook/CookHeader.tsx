// Cook Mode's header and progress strip, in v1's shape (spec §4.20): a close
// square, "COOK MODE" over the dish's name, an ingredients square and "3 / 9".
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { COOK } from '@/ui/tokens/cook';
import { PRESSED, RADIUS } from '@/ui/tokens/type';

type Props = { title: string; step: number; total: number; onClose: () => void; onIngredients: () => void };

export function CookHeader({ title, step, total, onClose, onIngredients }: Props) {
  const styles = useStyles();
  return (
    <View>
      <View style={styles.row}>
        <Pressable
          onPress={onClose}
          hitSlop={COOK.closeButton / 4}
          accessibilityRole="button"
          accessibilityLabel="Leave Cook Mode"
          style={({ pressed }) => [styles.square, styles.close, pressed && styles.pressed]}
          testID="cook-close"
        >
          <Icon name="close" size={COOK.closeIcon} />
        </Pressable>
        <View style={styles.centre}>
          <Text variant="cookKicker" colour="inkMuted">
            Cook Mode
          </Text>
          <Text variant="cardTitleMedium" numberOfLines={1} style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>
        <Pressable
          onPress={onIngredients}
          hitSlop={COOK.listButton / 4}
          accessibilityRole="button"
          accessibilityLabel="Show ingredients with quantities"
          style={({ pressed }) => [styles.square, styles.list, pressed && styles.pressed]}
          testID="cook-ingredients"
        >
          <Icon name="list" size={COOK.listIcon} />
        </Pressable>
        {/* The label says it in words; the "3 / 9" is for the eye. */}
        <Text
          variant="meta"
          colour="inkMuted"
          align="right"
          style={styles.counter}
          accessibilityLabel={`Step ${step + 1} of ${total}`}
          accessibilityLiveRegion="polite"
          testID="cook-counter"
        >
          {step + 1} / {total}
        </Text>
      </View>
      <Progress step={step} total={total} />
    </View>
  );
}

function Progress({ step, total }: { step: number; total: number }) {
  const styles = useStyles();
  const segments = Math.min(total, COOK.progressMaxSegments);
  const filled = total ? Math.ceil(((step + 1) / total) * segments) : 0;
  return (
    <View style={styles.progress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: segments }, (_, i) => (
        <View key={i} style={[styles.segment, i < filled && styles.segmentDone]} />
      ))}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: COOK.headerGap,
    paddingHorizontal: COOK.headerX,
    paddingTop: COOK.headerTop,
    paddingBottom: COOK.headerBottom,
  },
  square: { alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, backgroundColor: colours.bgSoft },
  close: { width: COOK.closeButton, height: COOK.closeButton },
  list: { width: COOK.listButton, height: COOK.listButton },
  pressed: { opacity: PRESSED.row },
  centre: { flex: 1, alignItems: 'center' },
  title: { marginTop: COOK.titleTop, maxWidth: COOK.titleMaxWidth },
  counter: { minWidth: COOK.counterMinWidth, fontVariant: ['tabular-nums'] },
  progress: {
    flexDirection: 'row',
    gap: COOK.progressGap,
    paddingHorizontal: COOK.progressX,
    paddingTop: COOK.progressTop,
    paddingBottom: COOK.progressBottom,
  },
  segment: { flex: 1, height: COOK.progressHeight, borderRadius: RADIUS.pill, backgroundColor: colours.border },
  segmentDone: { backgroundColor: colours.ink },
}));
