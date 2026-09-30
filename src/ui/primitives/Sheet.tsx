// A bottom sheet in the original's shape (spec §4.15): rounded top, a grab
// handle, a centred title with a hairline under it. Sheets are routes shown as
// form sheets, so swipe-down and the system back gesture close them.
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, SPACE } from '@/ui/tokens/type';
import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = { title: string; kicker?: string | undefined; onClose: () => void; children: ReactNode };

export function Sheet({ title, kicker, onClose, children }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          {kicker ? <Text variant="kickerSmall">{kicker}</Text> : null}
          <Text variant="sectionTitle" accessibilityRole="header">
            {title}
          </Text>
        </View>
        <IconButton icon="close" label="Close" onPress={onClose} shape="chip" testID="sheet-close" />
      </View>
      {/* iOS only insets for the keyboard when asked, so a field low in a sheet would sit under it (audit F182). */}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  body: { padding: SPACE.gutter, gap: SPACE.lg },
}));
