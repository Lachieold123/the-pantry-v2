// Keeps a typed recipe from being lost by the way out nobody meant: Android's
// Back button, the browser's Back (audit F208). Any exit while there are
// unsaved changes asks "Throw away your changes?" first.
// Saving or discarding is a decision to go, so those turn the guard off first
// and only move once that has rendered: a guard still on would stop them too.
import { useNavigation, useRouter } from 'expo-router';
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';

import { goBackOr } from '@/lib/navigation';

export function useLeaveGuard(dirty: boolean) {
  const router = useRouter();
  const navigation = useNavigation();
  const [exit, setExit] = useState<(() => void) | undefined>(undefined);
  const [asking, setAsking] = useState(false);
  // The Back the guard stopped, to carry out if the cook chooses to discard.
  const stopped = useRef<NavigationAction | undefined>(undefined);

  useEffect(() => exit?.(), [exit]);
  usePreventRemove(dirty && !exit, ({ data }) => {
    stopped.current = data.action;
    setAsking(true);
  });

  /** Go, without asking: the changes are saved, or the cook said to throw them away. */
  const leave = (go: () => void) => setExit(() => go);

  return {
    asking,
    leave,
    /** Cancel: asks first only when there's something to lose. */
    cancel: () => (dirty ? setAsking(true) : goBackOr(router)),
    stay: () => {
      stopped.current = undefined;
      setAsking(false);
    },
    discard: () =>
      leave(() => {
        const action = stopped.current;
        if (action) navigation.dispatch(action);
        else goBackOr(router);
      }),
  };
}
