// Shown if a screen crashes. Offers a real "Try again" that re-renders the
// screen, a way home for when trying again keeps failing, and keeps the
// technical detail out of the cook's way (it goes to the logger instead).
import { router, type ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logger } from '@/lib/logger';
import { ErrorState } from '@/ui/patterns/ErrorState';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { SPACE } from '@/ui/tokens/type';

export function RootErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const { colours } = useTheme();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    logger.error('screen', error.message, error);
  }, [error]);
  // Navigate first, then clear the error, so the boundary re-renders on Tonight
  // rather than on the screen that just crashed.
  const goHome = () => {
    router.replace('/');
    void retry();
  };
  return (
    <View style={{ flex: 1, backgroundColor: colours.bg, paddingTop: insets.top + SPACE.xl, paddingHorizontal: SPACE.gutter }}>
      <ErrorState
        title="Something went wrong"
        body="This screen hit a problem it couldn't recover from. Your saved recipes and plans are safe."
        onRetry={() => void retry()}
        secondary={{ label: 'Go to Tonight', onPress: goHome, testID: 'error-home' }}
      />
    </View>
  );
}
