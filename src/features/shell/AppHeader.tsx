// The header on the four tabs: menu, the wordmark, and the avatar (spec §4.1).
// There's no inbox button yet: without accounts there is nothing to open, and
// a button that does nothing is a dead button.
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/ui/primitives/Avatar';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { CHROME, SPACE, TAP_TARGET } from '@/ui/tokens/type';

export function AppHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + SPACE.xs }]}>
      <View style={styles.side}>
        <IconButton icon="menu" label="Open menu" size={28} onPress={() => router.push('/menu')} testID="header-menu" />
      </View>
      <Text variant="wordmark" numberOfLines={1} accessibilityRole="header" style={styles.wordmark} maxFontSizeMultiplier={1.2}>
        The Pantry
      </Text>
      <View style={[styles.side, styles.right]}>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Your profile and settings"
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
