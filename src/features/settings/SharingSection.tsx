// Settings' way into Household (D-039): who you share your kitchen with.
import { useRouter } from 'expo-router';

import { useHousehold } from '@/store/household';
import { ListRow } from '@/ui/primitives/ListRow';
import { SettingsSection } from './SettingsParts';

export function SharingSection() {
  const router = useRouter();
  const household = useHousehold((s) => s.household);
  const me = useHousehold((s) => s.userId);
  const others = household?.members.filter((m) => m.userId !== me).map((m) => m.name) ?? [];
  const value = !household ? 'Not sharing' : others.length ? `With ${others.join(', ')}` : 'Just you so far';
  return (
    <SettingsSection label="Sharing">
      <ListRow
        icon="people"
        title="Household"
        detail="Share the plan, list and cupboard"
        value={value}
        onPress={() => router.push('/household')}
        testID="settings-household"
      />
    </SettingsSection>
  );
}
