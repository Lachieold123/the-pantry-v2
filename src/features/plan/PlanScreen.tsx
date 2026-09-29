// Plan: the week ahead. Empty until planning lands in Phase 5.
import { useRouter } from 'expo-router';

import { EmptyState } from '@/ui/patterns/EmptyState';
import { Masthead } from '@/ui/patterns/Masthead';
import { Screen } from '@/ui/primitives/Screen';

export function PlanScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Masthead kicker="This week" title="Plan" />
      <EmptyState
        title="Nothing planned yet"
        body="Pick a few dinners for the week and your shopping list writes itself, sorted by aisle."
        action={{ label: 'Browse recipes', onPress: () => router.navigate('/recipes') }}
      />
    </Screen>
  );
}
