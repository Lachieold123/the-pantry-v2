// Shown if a screen crashes. Offers a real "Try again" that re-renders the
// screen, and keeps the technical detail out of the cook's way.
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/ui/patterns/ErrorState';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { SPACE } from '@/ui/tokens/type';

export function RootErrorScreen({ retry }: { retry: () => Promise<void> }) {
  const { colours } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colours.bg, paddingTop: insets.top + SPACE.xl, paddingHorizontal: SPACE.screen }}>
      <ErrorState
        title="Something went wrong"
        body="This screen hit a problem it couldn't recover from. Your saved recipes and plans are safe."
        onRetry={() => void retry()}
      />
    </View>
  );
}
