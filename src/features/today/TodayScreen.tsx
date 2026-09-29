// Today: tonight's dinner first (map §6). Until planning exists (Phase 5),
// it shows the designed "nothing planned" state with a working next step.
import { useRouter } from 'expo-router';

import { longDate } from '@/lib/dates';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { Masthead } from '@/ui/patterns/Masthead';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';

export function TodayScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Masthead
        kicker={longDate(new Date())}
        title="Tonight"
        action={<IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />}
      />
      <EmptyState
        title="Nothing planned for tonight"
        body="Plan a few dinners and tonight's shows up here, ready to cook. Until then, find something you'd like to make."
        action={{ label: 'Browse recipes', onPress: () => router.navigate('/recipes') }}
      />
    </Screen>
  );
}
