// Apple's own "Continue with Apple" button (Apple's rules ask for it: their
// logo, wording and colours). Black on a light page, white on a dark one, so
// it reads like the app's primary pill. Shown only where Sign in with Apple
// works (an iPhone, never the web or Android: store/signInWays decides).
import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { ACCOUNT } from '@/ui/tokens/screens';

export function AppleButton({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const { name, colours } = useTheme();
  if (busy) {
    // Apple's button can't show progress, so a spinner of the same size stands in while the sign-in finishes.
    return (
      <View
        style={{ height: ACCOUNT.appleHeight, alignItems: 'center', justifyContent: 'center' }}
        accessibilityLabel="Signing in with Apple"
        testID="account-apple-busy"
      >
        <ActivityIndicator color={colours.ink} />
      </View>
    );
  }
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={
        name === 'dark'
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={ACCOUNT.appleCorner}
      style={{ height: ACCOUNT.appleHeight, alignSelf: 'stretch' }}
      onPress={onPress}
      testID="account-apple"
    />
  );
}
