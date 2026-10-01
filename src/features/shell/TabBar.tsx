// The floating tab bar over a fade into the page (spec §4.2): Home · Browse ·
// Plan · List · Cupboard, in the order a week goes (plan it, shop for it,
// put it away). v1's centre "+" is gone (Lachlan, 1 October: simpler);
// adding a recipe lives in Browse and My recipes. It slides away while the
// keyboard is up so it never covers a text field.
import type { Tabs } from 'expo-router';
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
import { CHROME, MOTION, SPACE } from '@/ui/tokens/type';
import { useKeyboardShown } from './useKeyboardShown';
import { usePlanBadge } from './useCounts';
import { useToBuyThisWeek } from '@/store/shoppingList';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: IconName; badge?: (counts: Counts) => { n: number; says: string } }> = {
  index: { label: 'Home', icon: 'feed' },
  browse: { label: 'Browse', icon: 'browse' },
  plan: { label: 'Plan', icon: 'plan', badge: (c) => ({ n: c.planned, says: 'planned' }) },
  list: { label: 'List', icon: 'basket', badge: (c) => ({ n: c.toBuy, says: 'to buy' }) },
  cupboard: { label: 'Cupboard', icon: 'cupboard' },
};
type Counts = { planned: number; toBuy: number };

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { colours } = useTheme();
  const styles = useStyles();
  const counts: Counts = { planned: usePlanBadge(), toBuy: useToBuyThisWeek() };
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
    const { n: badge, says } = tab.badge?.(counts) ?? { n: 0, says: '' };
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        testID={`tab-${route.name}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={badge > 0 ? `${tab.label}, ${badge} ${says}` : tab.label}
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
      </Pressable>
    );
  };

  return (
    <Animated.View style={[styles.wrap, slide]} pointerEvents={keyboard ? 'none' : 'box-none'}>
      <LinearGradient colors={[colours.bgFade, colours.bg]} locations={[0, 0.45]} style={styles.fade} pointerEvents="none" />
      <View style={[styles.row, { paddingBottom: SPACE.xxs + Math.max(insets.bottom - SPACE.md, SPACE.xs) }]} accessibilityRole="tablist">
        {state.routes.map((_, i) => button(i))}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles(() => ({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, top: -(CHROME.tabFade - CHROME.tabBar) },
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACE.sm, paddingTop: SPACE.sm - 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: CHROME.tabPadY, paddingHorizontal: SPACE.xxs, gap: CHROME.tabGap },
  pressed: { transform: [{ scale: 0.96 }] },
  badge: { position: 'absolute', top: -SPACE.xxs, right: -SPACE.sm },
}));
