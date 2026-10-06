// The header on the four tabs: the wordmark, and the avatar that opens the
// You page (spec §4.1). There's no side menu: the tabs and You hold every
// place, so one way in is enough (Lachlan, 6 October). The left side stays
// empty to keep the wordmark centred; the inbox button joins it with social
// (P9), and until then there is nothing to open, so it isn't shown.
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/ui/primitives/Avatar';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { CHROME, SPACE, TAP_TARGET } from '@/ui/tokens/type';

export function AppHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + SPACE.xs }]}>
      <View style={styles.side} />
      <Text variant="wordmark" numberOfLines={1} accessibilityRole="header" style={styles.wordmark} maxFontSizeMultiplier={1.2}>
        The Pantry
      </Text>
      <View style={[styles.side, styles.right]}>
        <Pressable
          onPress={() => router.push('/you')}
          accessibilityRole="button"
          accessibilityLabel="You: your library, kitchen and settings"
          testID="header-avatar"
          style={styles.avatar}
        >
          <Avatar size={CHROME.avatar} />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.gutter - SPACE.xxs,
    paddingBottom: CHROME.headerBottom,
    backgroundColor: colours.bg,
  },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end' },
  wordmark: { paddingHorizontal: SPACE.xs },
  avatar: { width: TAP_TARGET, height: TAP_TARGET, alignItems: 'center', justifyContent: 'center' },
}));
