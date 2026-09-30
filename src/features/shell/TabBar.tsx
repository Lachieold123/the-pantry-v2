// The floating tab bar: Feed · Browse · + · Cupboard · Plan, over a fade into
// the page (spec §4.2). The "+" adds a recipe until posts arrive with social.
// It slides away while the keyboard is up so it never covers a text field.
import type { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/ui/primitives/Badge';
import { Icon, type IconName } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { FIXED } from '@/ui/tokens/colour';
import { CHROME, MOTION, SHADOW, SPACE } from '@/ui/tokens/type';
import { useKeyboardShown } from './useKeyboardShown';
import { usePlanBadge } from './useCounts';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Feed', icon: 'feed' },
  browse: { label: 'Browse', icon: 'browse' },
  cupboard: { label: 'Cupboard', icon: 'cupboard' },
  plan: { label: 'Plan', icon: 'plan' },
};

export function TabBar({ state, navigation }: TabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colours, highContrast } = useTheme();
  const styles = useStyles();
  const planned = usePlanBadge();
  const keyboard = useKeyboardShown();
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(keyboard ? CHROME.tabHide : 0, { duration: MOTION.quick }) }],
  }));

  const button = (index: number) => {
    const route = state.routes[index];
    const tab = route ? TABS[route.name] : undefined;
    if (!route || !tab) return null;
    const focused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };
    const badge = route.name === 'plan' ? planned : 0;
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        testID={`tab-${route.name}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={badge > 0 ? `${tab.label}, ${badge} planned` : tab.label}
        style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
      >
        <View>
          <Icon name={tab.icon} size={CHROME.tabIcon} colour={focused ? 'ink' : 'inkMuted'} />
          <View style={styles.badge}>
            <Badge count={badge} />
          </View>
        </View>
        <Text variant="tabBar" colour={focused ? 'ink' : 'inkMuted'} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {tab.label}
        </Text>
        {/* High contrast: the chosen tab also gets a bar, so it isn't shown by colour alone. */}
        {highContrast ? <View style={[styles.mark, focused && styles.markOn]} /> : null}
      </Pressable>
    );
  };

  return (
    <Animated.View style={[styles.wrap, slide]} pointerEvents={keyboard ? 'none' : 'box-none'}>
      <LinearGradient colors={[colours.bgFade, colours.bg]} locations={[0, 0.45]} style={styles.fade} pointerEvents="none" />
      <View style={[styles.row, { paddingBottom: SPACE.xxs + Math.max(insets.bottom - SPACE.md, SPACE.xs) }]} accessibilityRole="tablist">
        {button(0)}
        {button(1)}
        <Pressable
          onPress={() => router.push('/my-recipe/edit')}
          testID="tab-add"
          accessibilityRole="button"
          accessibilityLabel="Add a recipe"
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          <Icon name="add" size={26} colour="bg" />
        </Pressable>
        {button(2)}
        {button(3)}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, top: -(CHROME.tabFade - CHROME.tabBar) },
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACE.sm, paddingTop: SPACE.sm - 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: CHROME.tabPadY, paddingHorizontal: SPACE.xxs, gap: CHROME.tabGap },
  pressed: { transform: [{ scale: 0.96 }] },
  badge: { position: 'absolute', top: -SPACE.xxs, right: -SPACE.sm },
  mark: { width: SPACE.md, height: CHROME.tabMark, borderRadius: CHROME.tabMark / 2 },
  markOn: { backgroundColor: colours.ink },
  fab: {
    width: CHROME.fab + CHROME.fabRing * 2,
    height: CHROME.fab + CHROME.fabRing * 2,
    borderRadius: CHROME.fab,
    borderWidth: CHROME.fabRing,
    borderColor: colours.bg,
    backgroundColor: colours.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACE.xxs,
    marginBottom: CHROME.fabBottom,
    shadowColor: FIXED.shadow,
    ...SHADOW.fab,
  },
}));
