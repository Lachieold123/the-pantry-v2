// Settings, opened from the side menu and the avatar, in v1's layout: a grey
// page of white cards under small labels (spec §7 Settings). Only settings
// that do something in v2 today appear: v1's Privacy, Pantry Pro and account
// rows wait until those features exist (no fake rows).
// The Sunday reminder only reads as on when the phone will actually deliver it.
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { usePreferences, type Appearance } from '@/store/preferences';
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { ListRow } from '@/ui/primitives/ListRow';
import { Screen } from '@/ui/primitives/Screen';
import { Segmented } from '@/ui/primitives/Segmented';
import { Text } from '@/ui/primitives/Text';
import { SETTINGS } from '@/ui/tokens/screens';
import { CookingSection } from './CookingSection';
import { ReminderSetting } from './ReminderSetting';
import { CardButton, ChoiceRow, InfoRow, SettingsSection, SwitchRow } from './SettingsParts';

const APPEARANCE = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;
const UNITS = [
  { value: 'metric', label: 'Metric' },
  { value: 'imperial', label: 'Imperial' },
] as const;
const VERSION = Constants.expoConfig?.version ?? '';

export function SettingsScreen() {
  const router = useRouter();
  // One selector per value (audit PERF-1: whole-store reads re-render on every change).
  const appearance = usePreferences((s) => s.appearance);
  const highContrast = usePreferences((s) => s.highContrast);
  const units = usePreferences((s) => s.units);
  const setAppearance = usePreferences((s) => s.setAppearance);
  const setHighContrast = usePreferences((s) => s.setHighContrast);
  const setUnits = usePreferences((s) => s.setUnits);
  return (
    <Screen surface="bgSoft" testID="settings-screen">
      <PushedHeader kicker="Settings" title="Preferences" surface="bgSoft" />

      <SettingsSection label="Appearance">
        <ChoiceRow icon="palette" label="Theme" helper="System follows your phone’s dark mode automatically.">
          <Segmented<Appearance> label="Theme" size="sm" options={APPEARANCE} value={appearance} onChange={setAppearance} />
        </ChoiceRow>
        <SwitchRow
          icon="contrast"
          label="High contrast"
          detail="Stronger text and borders for easier reading"
          value={highContrast}
          onChange={setHighContrast}
          testID="settings-high-contrast"
        />
      </SettingsSection>

      <SettingsSection label="Measurements">
        <ChoiceRow icon="speed" label="Units" helper="Australian measures: 1 cup is 250 ml, 1 tablespoon is 20 ml.">
          <Segmented label="Units" size="sm" options={UNITS} value={units} onChange={setUnits} />
        </ChoiceRow>
      </SettingsSection>

      <CookingSection />

      <ReminderSetting />

      <SettingsSection label="About">
        <InfoRow icon="info" label="Version" value={VERSION} />
        {__DEV__ ? (
          <ListRow
            icon="sparkles"
            title="Design gallery"
            detail="Every component in every state"
            onPress={() => router.push('/dev/gallery')}
            testID="settings-gallery"
          />
        ) : null}
      </SettingsSection>

      {/* Answers are kept, so this revisits the quiz rather than wiping it (v1 reset everything). */}
      <CardButton icon="refreshOutline" label="Redo welcome flow" onPress={() => router.push('/welcome')} testID="settings-retake-quiz" />

      <Text variant="caption" align="center" style={{ marginTop: -SETTINGS.footerTop }}>
        The Pantry · v{VERSION}
      </Text>
    </Screen>
  );
}
