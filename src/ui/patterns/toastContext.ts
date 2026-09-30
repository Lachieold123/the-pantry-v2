// The toast's context on its own, apart from the animated view in Toast.tsx,
// so hooks that only show toasts (useBookmarks) don't pull in the animation library.
import { createContext, useContext } from 'react';

// `actionLabel` renames the one action when it isn't an undo ("Open Settings").
export type ToastInput = { message: string; undo?: () => void; actionLabel?: string };

export const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}
