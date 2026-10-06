// Opens the sign-in sheet when a moment has earned it (D-043): starting or
// joining a household, the 10th Cookmark, your first recipe. The store
// decides (once ever, only while signed out); this only opens the sheet,
// after a beat, so it rises over the screen the moment led to rather than
// racing its toast or page change. Mounted once, beside the root stack.
import { router } from 'expo-router';
import { useEffect } from 'react';

import { takeOffer, useAccount } from '@/store/account';
import { ACCOUNT } from '@/ui/tokens/screens';

export function AccountNudge() {
  const offer = useAccount((s) => s.offer);
  useEffect(() => {
    if (!offer) return;
    const timer = setTimeout(() => {
      const moment = takeOffer();
      if (moment) router.push({ pathname: '/account', params: { moment } });
    }, ACCOUNT.nudgeDelay);
    return () => clearTimeout(timer);
  }, [offer]);
  return null;
}
