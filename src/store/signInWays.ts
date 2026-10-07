// Which ways in this device has (D-043): Sign in with Apple works only on an
// iPhone; email codes work everywhere, once they're connected
// (lib/emailCodes). The account sheet, Settings and the moment offers all
// read this, so none of them offers a sheet with no way in.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { appleAvailable } from '@/lib/account';
import { EMAIL_CODES_CONNECTED } from '@/lib/emailCodes';

export type SignInWays = {
  /** Undefined while an iPhone is still being asked; false straight away anywhere else. */
  apple: boolean | undefined;
  email: boolean;
};

// Only an iPhone needs asking (and nearly always says yes), so the web and
// Android know straight away and never show a way in that then disappears.
const askNeeded = Platform.OS === 'ios';

async function askApple(): Promise<boolean> {
  return askNeeded ? appleAvailable() : false;
}

/** True if this device can sign in some way right now. */
export async function canSignInHere(): Promise<boolean> {
  return EMAIL_CODES_CONNECTED || (await askApple());
}

export function useSignInWays(): SignInWays {
  const [apple, setApple] = useState<boolean | undefined>(askNeeded ? undefined : false);
  useEffect(() => {
    if (apple !== undefined) return;
    let live = true;
    void askApple().then((ok) => live && setApple(ok));
    return () => {
      live = false;
    };
  }, [apple]);
  return { apple, email: EMAIL_CODES_CONNECTED };
}
