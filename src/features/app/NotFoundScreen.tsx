// A link to somewhere that doesn't exist lands here, with a way home.
import { useRouter } from 'expo-router';

import { EmptyState } from '@/ui/patterns/EmptyState';
import { Screen } from '@/ui/primitives/Screen';

export function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState
        title="This page doesn’t exist"
        body="The link may be old or mistyped."
        action={{ label: 'Back to Feed', onPress: () => router.replace('/') }}
        testID="not-found"
      />
    </Screen>
  );
}
