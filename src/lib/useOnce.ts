// A press that should only ever happen once: Done in Cook Mode, Plan, Add to
// list. Each writes to a store and then closes the sheet, and a second tap
// during the closing animation used to log or plan twice and go back two
// screens (BUG-02). Call the hook at the top of the component (before any
// early return), then wrap the handler: `const add = () => once(() => {...})`.
// The action can return false to say "nothing happened" (a check failed),
// which leaves it free to run again.
import { useCallback, useRef } from 'react';

export function useOnce(): (action: () => boolean | void) => void {
  const done = useRef(false);
  return useCallback((action: () => boolean | void) => {
    if (done.current) return;
    done.current = true;
    if (action() === false) done.current = false;
  }, []);
}
