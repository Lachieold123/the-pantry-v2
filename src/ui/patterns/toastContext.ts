// The toast's context on its own, apart from the animated view in Toast.tsx,
// so hooks that only show toasts (useBookmarks) don't pull in the animation library.
import { createContext, useContext } from 'react';

// `actionLabel` renames the one action when it isn't an undo ("Open Settings").
// `tone: 'problem'` swaps the tick for a warning sign, for things that went wrong (audit F170).
export type ToastInput = { message: string; undo?: () => void; actionLabel?: string; tone?: 'done' | 'problem' };

export const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}
