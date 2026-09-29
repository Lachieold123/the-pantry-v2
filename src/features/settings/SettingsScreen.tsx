// Settings: appearance and units change the app immediately (map Phase 1).
// The Sunday reminder only reads as on when the phone will actually deliver it.
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { setSundayReminder } from '@/lib/notifications';
import { usePreferences, type Appearance } from '@/store/preferences';
import { useToast } from '@/ui/patterns/Toast';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Divider } from '@/ui/primitives/Divider';
import { ListRow } from '@/ui/primitives/ListRow';
import { Segmented } from '@/ui/primitives/Segmented';
import { Sheet } from '@/ui/primitives/Sheet';
import { Switch } from '@/ui/primitives/Switch';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';
import { FoodSettings } from './FoodSettings';

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
  const toast = useToast();
  const {
    appearance,
    highContrast,
    units,
    sundayReminder,
    setAppearance,
    setHighContrast,
    setUnits,
    setSundayReminder: saveReminder,
  } = usePreferences();
  const toggleReminder = async (on: boolean) => {
    const scheduled = await setSundayReminder(on);
    saveReminder(scheduled);
    if (on && !scheduled) toast({ message: 'Notifications are off for The Pantry. Turn them on in your phone’s Settings.' });
  };
  return (
    <Sheet title="Settings" onClose={() => router.back()}>
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="Appearance" />
        <Segmented<Appearance> label="Appearance" options={APPEARANCE} value={appearance} onChange={setAppearance} />
        <Switch label="High contrast" detail="Stronger text and dividers" value={highContrast} onChange={setHighContrast} />
      </View>
      <Divider />
      <FoodSettings />
      <ListRow title="Retake the taste quiz" detail="Cuisines you love and weeknight time" onPress={() => router.push('/welcome')} />
      <Divider />
      <View style={{ gap: SPACE.sm }}>
        <SectionHeader title="Reminders" />
        <Switch
          label="Sunday planning reminder"
          detail="4pm on Sundays, and nothing else"
          value={sundayReminder}
          onChange={(on) => void toggleReminder(on)}
        />
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
