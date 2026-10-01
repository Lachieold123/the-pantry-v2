// The side menu (spec §4.3): every place in the app, with live counts. It is a
// route (/menu) rather than an always-mounted overlay, so it has a URL, a back
// gesture and nothing running while it's closed (audit ARCH-1, PERF-1).
// The route is a transparent modal, so the tab you came from stays visible,
// dimmed by the scrim, as in v1. Nothing here may paint a full-screen
// background: only the scrim and the panel.
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBackOr, goToTab } from '@/lib/navigation';
import { Avatar } from '@/ui/primitives/Avatar';
import { Divider } from '@/ui/primitives/Divider';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { CHROME, MOTION, RADIUS, SHADOW, SPACE } from '@/ui/tokens/type';
import { DrawerRow } from './DrawerRow';
import { useDrawerCounts } from './useCounts';

export function DrawerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = useStyles();
  const counts = useDrawerCounts();
  const panelWidth = Math.max(CHROME.drawerMin, Math.min(CHROME.drawerMax, Math.round(width * 0.86)));
  const open = useSharedValue(0);
  const [closing, setClosing] = useState(false);
  const leaving = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    open.set(withTiming(1, { duration: MOTION.standard }));
  }, [open]);
  // Android Back can close the menu while it slides out. The pending move must
  // not then run from whatever screen is underneath (audit F207).
  useEffect(() => () => clearTimeout(leaving.current), []);

  // Slide out, then leave the route; `then` runs once the panel has gone.
  const close = (then?: () => void) => {
    if (closing) return;
    setClosing(true);
    open.set(withTiming(0, { duration: MOTION.quick }));
    leaving.current = setTimeout(() => (then ? then() : goBackOr(router)), MOTION.quick);
  };
  const tab = (href: Href) => close(() => goToTab(router, href));
  const page = (href: Href) => close(() => router.replace(href));

  const backdrop = useAnimatedStyle(() => ({ opacity: open.value }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateX: (open.value - 1) * panelWidth }] }));

  return (
    // The two-finger scrub closes the menu, as it does every iOS overlay (audit F104).
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal onAccessibilityEscape={() => close()}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => close()}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          testID="menu-close"
        />
      </Animated.View>
      <Animated.View style={[styles.panel, { width: panelWidth, paddingTop: insets.top, paddingBottom: insets.bottom }, panel]}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Text variant="brandMark" colour="bg" maxFontSizeMultiplier={1}>
              P
            </Text>
          </View>
          <Text variant="sectionTitle" accessibilityRole="header">
            The Pantry
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Section label="Discover">
            <DrawerRow icon="feed" label="Home" onPress={() => tab('/')} testID="menu-feed" />
            <DrawerRow icon="browse" label="Browse" onPress={() => tab('/browse')} testID="menu-browse" />
            <DrawerRow icon="cupboard" label="Cupboard" onPress={() => tab('/cupboard')} testID="menu-cupboard" />
          </Section>
          <Section label="My kitchen">
            <DrawerRow icon="saved" label="Cookmarks" count={counts.saved} onPress={() => page('/saved')} testID="menu-saved" />
            <DrawerRow
              icon="collections"
              label="Collections"
              count={counts.collections}
              onPress={() => page('/collections')}
              testID="menu-collections"
            />
            <DrawerRow icon="cook" label="My recipes" count={counts.mine} onPress={() => page('/my-recipes')} testID="menu-my-recipes" />
            <DrawerRow icon="time" label="Recently viewed" count={counts.recent} onPress={() => page('/recent')} testID="menu-recent" />
            <DrawerRow icon="flame" label="Kitchen stats" onPress={() => page('/stats')} testID="menu-stats" />
          </Section>
          <Section label="Tools">
            <DrawerRow icon="spinner" label="Spinner" onPress={() => page('/surprise')} testID="menu-spinner" />
            <DrawerRow icon="plan" label="Plan" count={counts.planned} onPress={() => tab('/plan')} testID="menu-plan" />
            <DrawerRow icon="basket" label="Shopping list" onPress={() => tab('/list')} testID="menu-list" />
            <DrawerRow icon="add" label="Add a recipe" onPress={() => page('/my-recipe/edit')} testID="menu-add-recipe" />
          </Section>
          <View style={styles.rule}>
            <Divider />
          </View>
          <DrawerRow icon="settings" label="Settings & preferences" onPress={() => page('/settings')} testID="menu-settings" />
        </ScrollView>
        <Pressable
          onPress={() => page('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Your profile, local to this phone"
          testID="menu-profile"
          style={({ pressed }) => [styles.profile, pressed && styles.pressed]}
        >
          <Avatar size={CHROME.drawerAvatar} />
          <View style={styles.profileText}>
            <Text variant="name" numberOfLines={1}>
              Your kitchen
            </Text>
            <Text variant="drawerProfileSub" colour="inkMuted">
              Local profile
            </Text>
          </View>
          <Icon name="forward" size={18} colour="inkMuted" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text variant="kickerSmall" style={styles.sectionLabel} accessibilityRole="header">
        {label}
      </Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  backdrop: { backgroundColor: FIXED.scrimDrawer },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: colours.card, shadowColor: FIXED.shadow, ...SHADOW.drawer },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.gutter,
    paddingVertical: CHROME.drawerBrandY,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colours.border,
  },
  mark: {
    width: CHROME.drawerMark,
    height: CHROME.drawerMark,
    borderRadius: RADIUS.sm,
    backgroundColor: colours.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: SPACE.sm, paddingTop: SPACE.sm, paddingBottom: SPACE.md },
  section: { marginBottom: CHROME.drawerSection },
  sectionLabel: { paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs },
  rule: { marginHorizontal: SPACE.sm, marginBottom: SPACE.xs },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: CHROME.drawerSection,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colours.border,
  },
  profileText: { flex: 1, gap: 2 },
  pressed: { backgroundColor: colours.bgSoft },
}));
