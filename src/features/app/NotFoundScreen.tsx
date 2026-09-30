// A link to somewhere that doesn't exist lands here, with a way home.
import { useRouter } from 'expo-router';

import { goToTab } from '@/lib/navigation';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { Screen } from '@/ui/primitives/Screen';

export function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState
        title="This page doesn’t exist"
        body="The link may be old or mistyped."
        // The home tab is called Feed (F84). Back down to the existing tabs, not a second copy on top (F206).
        action={{ label: 'Go to Feed', onPress: () => goToTab(router, '/') }}
        testID="not-found"
      />
    </Screen>
  );
}
