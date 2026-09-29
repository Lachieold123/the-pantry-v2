// Settings: appearance and units change the app immediately (map Phase 1).
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { usePreferences, type Appearance } from '@/store/preferences';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Divider } from '@/ui/primitives/Divider';
import { ListRow } from '@/ui/primitives/ListRow';
import { Segmented } from '@/ui/primitives/Segmented';
import { Sheet } from '@/ui/primitives/Sheet';
import { Switch } from '@/ui/primitives/Switch';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

const APPEARANCE = [
  { value: 'system', label: 'Match phone' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;
const UNITS = [
  { value: 'metric', label: 'Metric' },
  { value: 'imperial', label: 'Imperial' },
] as const;

export function SettingsScreen() {
  const router = useRouter();
  const { appearance, highContrast, units, setAppearance, setHighContrast, setUnits } = usePreferences();
  return (
    <Sheet title="Settings" onClose={() => router.back()}>
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="Appearance" />
        <Segmented<Appearance> label="Appearance" options={APPEARANCE} value={appearance} onChange={setAppearance} />
        <Switch label="High contrast" detail="Stronger text and dividers" value={highContrast} onChange={setHighContrast} />
      </View>
      <Divider />
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="Measurements" />
        <Segmented label="Measurements" options={UNITS} value={units} onChange={setUnits} />
        <Text variant="meta">Australian measures: 1 cup is 250 ml, 1 tablespoon is 20 ml.</Text>
      </View>
      <Divider />
      <View style={{ gap: SPACE.xs }}>
        <SectionHeader title="About" />
        <Text variant="meta">The Pantry {Constants.expoConfig?.version ?? ''}</Text>
        {__DEV__ ? (
          <ListRow title="Design gallery" detail="Every component in every state" onPress={() => router.push('/dev/gallery')} />
        ) : null}
      </View>
    </Sheet>
  );
}
