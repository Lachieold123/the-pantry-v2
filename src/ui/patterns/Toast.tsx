// Short confirmations ("Added to Tuesday dinner"), with an optional Undo.
// Two slots: one toast with an action (Undo) and one plain message. A plain
// message never wipes an Undo that's still showing (audit F140); a new Undo
// replaces the old one. Announced to VoiceOver, with the action named.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { announce, useScreenReaderEnabled } from '@/ui/a11y/announce';
import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { MOTION, RADIUS, SHADOW, SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { ToastContext, type ToastInput } from './toastContext';

type ToastState = ToastInput & { id: number };

// The original shows a toast for 2.5 s; one with Undo stays longer so there's time to reach it.
const VISIBLE_MS = MOTION.toast;
const VISIBLE_WITH_UNDO_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [withAction, setWithAction] = useState<ToastState | null>(null);
  const [plain, setPlain] = useState<ToastState | null>(null);
  const counter = useRef(0);
  const screenReader = useScreenReaderEnabled();
  const show = useCallback((t: ToastInput) => {
    counter.current += 1;
    const next = { ...t, id: counter.current };
    if (t.undo) {
      setWithAction(next);
      // Say the action exists: a VoiceOver or Switch Control user can't see the button appear (audit F100).
      announce(`${t.message}. ${t.actionLabel ?? 'Undo'} available.`);
    } else {
      setPlain(next);
      announce(t.message);
    }
  }, []);
  // A screen reader user needs longer than a few seconds to find Undo, so it waits to be dismissed.
  useAutoDismiss(withAction, setWithAction, screenReader ? null : VISIBLE_WITH_UNDO_MS);
  useAutoDismiss(plain, setPlain, VISIBLE_MS);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <ToastStack>
        {plain ? <ToastView key={plain.id} toast={plain} onDone={() => setPlain(null)} /> : null}
        {withAction ? (
          <ToastView key={withAction.id} toast={withAction} onDone={() => setWithAction(null)} dismissable={screenReader} />
        ) : null}
      </ToastStack>
    </ToastContext.Provider>
  );
}

/** Stacks the plain message above the Undo toast, so both can show at once. */
function ToastStack({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.stack, { bottom: insets.bottom + TOAST_ABOVE_TABS }]} pointerEvents="box-none">
      {children}
    </View>
  );
}

function useAutoDismiss(toast: ToastState | null, set: (update: (cur: ToastState | null) => ToastState | null) => void, ms: number | null) {
  useEffect(() => {
    if (!toast || ms === null) return;
    const timer = setTimeout(() => set((cur) => (cur?.id === toast.id ? null : cur)), ms);
    return () => clearTimeout(timer);
  }, [toast, set, ms]);
}

// Screens import useToast from here, next to the provider.
export { useToast } from './toastContext';

type ViewProps = { toast: ToastState; onDone: () => void; dismissable?: boolean };

function ToastView({ toast, onDone, dismissable = false }: ViewProps) {
  const styles = useStyles();
  return (
    <Animated.View
      entering={FadeInDown.duration(MOTION.standard)}
      exiting={FadeOutDown.duration(MOTION.quick)}
      style={styles.wrap}
      pointerEvents="box-none"
    >
      <View style={styles.toast} testID="toast">
        <Icon name={toast.tone === 'problem' ? 'warning' : 'checkCircle'} size={18} tone={FIXED.toastInk} />
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
            accessibilityLabel={toast.actionLabel ?? 'Undo'}
            testID={toast.actionLabel ? 'toast-action' : 'toast-undo'}
            style={styles.undo}
          >
            <Text variant="toast" tone={FIXED.toastInk} style={{ textDecorationLine: 'underline' }}>
              {toast.actionLabel ?? 'Undo'}
            </Text>
          </Pressable>
        ) : null}
        {dismissable ? (
          <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="Dismiss" testID="toast-dismiss" style={styles.undo}>
            <Icon name="close" size={16} tone={FIXED.toastInk} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

// Clear of the floating tab bar.
const TOAST_ABOVE_TABS = 90;

// Cream in both light and dark, as in the original (spec §4.16).
const useStyles = makeStyles(() => ({
  stack: { position: 'absolute', left: SPACE.gutter, right: SPACE.gutter, gap: SPACE.xs },
  wrap: { alignItems: 'center' },
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
