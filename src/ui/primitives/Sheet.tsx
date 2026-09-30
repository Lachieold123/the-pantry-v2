// A bottom sheet in the original's shape (spec §4.15): rounded top, a grab
// handle, a centred title with a hairline under it. Sheets are routes shown as
// form sheets, so swipe-down and the system back gesture close them.
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
      <View style={styles.handle} />
      <View style={styles.head}>
        {/* Balances the close button so the title sits in the middle, as in v1. */}
        <View style={styles.balance} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          {kicker ? <Text variant="kickerSmall">{kicker}</Text> : null}
          <Text variant="cardTitle" align="center" numberOfLines={2} accessibilityRole="header">
            {title}
          </Text>
        </View>
        <IconButton icon="close" label="Close" onPress={onClose} shape="chip" testID="sheet-close" />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  sheet: { flex: 1, backgroundColor: colours.bg, borderTopLeftRadius: RADIUS.big, borderTopRightRadius: RADIUS.big },
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
  balance: { width: TAP_TARGET - SPACE.xxs },
  body: { padding: SPACE.gutter, gap: SPACE.lg },
}));
