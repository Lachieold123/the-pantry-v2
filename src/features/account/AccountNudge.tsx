// Opens the sign-in sheet when a moment has earned it (D-043): starting or
// joining a household, the 10th Cookmark, your first recipe. The store
// decides (once ever, only while signed out); this only opens the sheet,
// after a beat, so it rises over the screen the moment led to rather than
// racing its toast or page change. Mounted once, beside the root stack.
// Where there's no way in yet (the web or Android before email codes), the
// offer is let go quietly: a sheet that can only say "not here" interrupts
// for nothing. Settings still explains where backing up works.
//
// It also says, once, when a sign-in has lapsed by itself (DATA-12), so the
// backup never stops without the person knowing.
import { router } from 'expo-router';
import { useEffect } from 'react';

import { takeOffer, useAccount } from '@/store/account';
import { canSignInHere } from '@/store/signInWays';
import { useToast } from '@/ui/patterns/Toast';
import { ACCOUNT } from '@/ui/tokens/screens';
import { LAPSED_TOAST } from './words';

export function AccountNudge() {
  const toast = useToast();
  const offer = useAccount((s) => s.offer);
  const lapsedNotice = useAccount((s) => s.lapsedNotice === true);
  useEffect(() => {
    if (!offer) return;
    const timer = setTimeout(() => {
      const moment = takeOffer();
      if (!moment) return;
      void canSignInHere().then((can) => can && router.push({ pathname: '/account', params: { moment } }));
    }, ACCOUNT.nudgeDelay);
    return () => clearTimeout(timer);
  }, [offer]);
  useEffect(() => {
    if (!lapsedNotice) return;
    useAccount.setState({ lapsedNotice: false });
    toast({ message: LAPSED_TOAST });
  }, [lapsedNotice, toast]);
  return null;
}
