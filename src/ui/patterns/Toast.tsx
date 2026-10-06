// Short confirmations ("Added to Tuesday dinner"), with an optional Undo.
// One at a time; each replaces the last. Announced to VoiceOver.
//
// Where it sits, on every screen: just above whatever is fixed to the foot of
// the screen in front of you (the tab bar, an action bar), or just above the
// bottom safe area when nothing is, and above the keyboard when that's up.
// Fixed chrome says how tall it is with useToastFloor while its screen is in
// front. It used to sit a guessed 90pt up from the root view, so it floated
// mid-screen on pages without a tab bar and hid behind sheets and modals,
// which iOS draws in front of the app's root view (Lachlan, 6 October).
import { createContext, Fragment, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { MOTION, RADIUS, SHADOW, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type ToastInput = { message: string; undo?: () => void };
type ToastState = ToastInput & { id: number };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});
/** Claims the foot of the screen for some fixed chrome; returns the release. */
const FloorContext = createContext<(height: number) => () => void>(() => () => {});
// The original shows a toast for 2.5 s; one with Undo stays longer so there's time to reach it.
const VISIBLE_MS = MOTION.toast;
const VISIBLE_WITH_UNDO_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);
  const show = useCallback((t: ToastInput) => {
    counter.current += 1;
    setToast({ ...t, id: counter.current });
    AccessibilityInfo.announceForAccessibility(t.message);
  }, []);
  // The chrome that most recently claimed the foot of the screen is the one in front.
  const [floors, setFloors] = useState<{ id: number; height: number }[]>([]);
  const floorCounter = useRef(0);
  const holdFloor = useCallback((height: number) => {
    floorCounter.current += 1;
    const id = floorCounter.current;
    setFloors((f) => [...f, { id, height }]);
    return () => setFloors((f) => f.filter((x) => x.id !== id));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), toast.undo ? VISIBLE_WITH_UNDO_MS : VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider value={show}>
      <FloorContext.Provider value={holdFloor}>
        {children}
        {toast ? (
          // A fresh layer per toast: iOS adds it to the window on mount, so it lands above any sheet open at the time.
          <ToastLayer key={toast.id}>
            <ToastView toast={toast} floor={floors[floors.length - 1]?.height} onDone={() => setToast(null)} />
          </ToastLayer>
        ) : null}
      </FloorContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/**
 * For chrome fixed to the foot of a screen (the tab bar, an action bar): while
 * `active` (its screen is in front), toasts sit just above its `height`.
 */
export function useToastFloor(height: number, active: boolean) {
  const hold = useContext(FloorContext);
  useEffect(() => (active && height > 0 ? hold(height) : undefined), [hold, height, active]);
}

/** On iOS a window-level overlay, so a toast shows over sheets and modals too. Elsewhere those share the app's view. */
const ToastLayer = Platform.OS === 'ios' ? FullWindowOverlay : Fragment;

/** The keyboard's height on iOS. Android resizes the window for the keyboard, so the foot is already above it there. */
function useKeyboardHeight(): number {
  // A toast can mount with the keyboard already up (adding to the shopping list), so start from where it is.
  const [height, setHeight] = useState(() => (Platform.OS === 'ios' && Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0));
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

function ToastView({ toast, floor, onDone }: { toast: ToastState; floor: number | undefined; onDone: () => void }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const foot = Math.max(floor ?? Math.max(insets.bottom, SPACE.md), keyboard);
  return (
    <Animated.View
      entering={FadeInDown.duration(MOTION.standard)}
      exiting={FadeOutDown.duration(MOTION.quick)}
      // Glides, rather than jumps, when the screen in front changes under it (a sheet closing onto a tab).
      layout={LinearTransition.duration(MOTION.quick)}
      style={[styles.wrap, { bottom: foot + SPACE.sm }]}
      pointerEvents="box-none"
    >
      <View style={styles.toast} testID="toast">
        <Icon name="checkCircle" size={18} tone={FIXED.toastInk} />
        <Text variant="toast" tone={FIXED.toastInk} style={{ flexShrink: 1 }} numberOfLines={4}>
          {toast.message}
        </Text>
        {toast.undo ? (
          <Pressable
            onPress={() => {
              toast.undo?.();
              onDone();
            }}
            accessibilityRole="button"
            accessibilityLabel="Undo"
            testID="toast-undo"
            style={styles.undo}
          >
            <Text variant="toast" tone={FIXED.toastInk} style={{ textDecorationLine: 'underline' }}>
              Undo
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

// Cream in both light and dark, as in the original (spec §4.16).
const useStyles = makeStyles(() => ({
  wrap: { position: 'absolute', left: SPACE.gutter, right: SPACE.gutter, alignItems: 'center' },
  toast: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    minHeight: TAP_TARGET,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: FIXED.toastBg,
    shadowColor: FIXED.shadow,
    ...SHADOW.toast,
  },
  undo: { minHeight: TAP_TARGET, paddingLeft: SPACE.xs, justifyContent: 'center' },
}));
