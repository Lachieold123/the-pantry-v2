// A bottom sheet in the original's shape (spec §4.15): rounded top, a grab
// handle, a centred title with a hairline under it. Sheets are routes shown as
// form sheets, so swipe-down and the system back gesture close them.
//
// The handle and title live inside the scroll view as a sticky header, not as
// siblings above it. On iOS the native sheet can place its scroll view at the
// top of the sheet, which drew the body over the title (Lachlan's screenshot,
// 1 October). With one scroll view holding everything, nothing can overlap.
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = { title: string; kicker?: string | undefined; onClose: () => void; children: ReactNode };

export function Sheet({ title, kicker, onClose, children }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.sheet}>
      <ScrollView
        stickyHeaderIndices={[0]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.top}>
          <View style={styles.handle} />
          <View style={styles.head}>
            {/* Balances the close button so the title sits in the middle, as in v1. */}
            <View style={styles.balance} />
            <View style={styles.titles}>
              {kicker ? <Text variant="kickerSmall">{kicker}</Text> : null}
              <Text variant="cardTitle" align="center" numberOfLines={2} accessibilityRole="header">
                {title}
              </Text>
            </View>
            <IconButton icon="close" label="Close" onPress={onClose} shape="chip" testID="sheet-close" />
          </View>
        </View>
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  sheet: { flex: 1, backgroundColor: colours.bg, borderTopLeftRadius: RADIUS.big, borderTopRightRadius: RADIUS.big, overflow: 'hidden' },
  scroll: { flexGrow: 1 },
  // The sticky header needs its own background, or the body shows through it as it scrolls.
  top: { backgroundColor: colours.bg },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.inkSubtle,
    marginTop: SPACE.xs,
    marginBottom: SPACE.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.gutter,
    paddingBottom: SPACE.sm,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  titles: { flex: 1, minWidth: 0, alignItems: 'center', gap: SPACE.xxs },
  balance: { width: TAP_TARGET - SPACE.xxs },
  body: { padding: SPACE.gutter, paddingBottom: SPACE.xxl, gap: SPACE.lg },
}));
