// Short confirmations ("Added to Tuesday dinner"), with an optional Undo.
// One at a time; each replaces the last. Announced to VoiceOver.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { MOTION, RADIUS, SHADOW, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type ToastInput = { message: string; undo?: () => void };
type ToastState = ToastInput & { id: number };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});
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
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), toast.undo ? VISIBLE_WITH_UNDO_MS : VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onDone={() => setToast(null)} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastView({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeInDown.duration(MOTION.standard)}
      exiting={FadeOutDown.duration(MOTION.quick)}
      style={[styles.wrap, { bottom: insets.bottom + 90 }]}
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
