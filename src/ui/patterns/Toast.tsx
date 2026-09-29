// Short confirmations ("Added to Tuesday dinner"), with an optional Undo.
// One at a time; each replaces the last. Announced to VoiceOver.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { MOTION, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type ToastInput = { message: string; undo?: () => void };
type ToastState = ToastInput & { id: number };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});
const VISIBLE_MS = 4000;

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
    const timer = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), VISIBLE_MS);
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
      style={[styles.wrap, { bottom: insets.bottom + 72 }]}
      pointerEvents="box-none"
    >
      <View style={styles.toast}>
        <Text variant="ui" colour="onAccent" style={{ flex: 1 }}>
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
            <Text variant="ui" colour="onAccent" style={{ textDecorationLine: 'underline' }}>
              Undo
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  wrap: { position: 'absolute', left: SPACE.screen, right: SPACE.screen },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: TAP_TARGET + SPACE.xs,
    paddingLeft: SPACE.md,
    paddingRight: SPACE.xs,
    borderRadius: RADIUS.md,
    backgroundColor: colours.accent,
  },
  undo: { minHeight: TAP_TARGET, paddingHorizontal: SPACE.sm, justifyContent: 'center' },
}));
