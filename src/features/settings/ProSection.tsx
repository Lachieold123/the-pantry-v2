// Two switches for trying Pro before buying works (D-038): preview the free
// limits, or pretend to be Pro. Development and preview (TestFlight) builds
// only, so testers can try both sides; a store build shows nothing here.
// Where you stand with Pro, and the way to it, is on the You page now.
import { INTERNAL_BUILD } from '@/lib/build';
import { usePro } from '@/store/pro';
import { SettingsSection, SwitchRow } from './SettingsParts';

export function ProSection() {
  const previewLimits = usePro((s) => s.previewLimits);
  const pretendPro = usePro((s) => s.pretendPro);
  const setPreviewLimits = usePro((s) => s.setPreviewLimits);
  const setPretendPro = usePro((s) => s.setPretendPro);
  if (!INTERNAL_BUILD) return null;
  return (
    <SettingsSection label="Testing Pro">
      <SwitchRow
        icon="eye"
        label="Preview the free limits"
        detail="Testing builds only: limits apply as if Pro were on sale"
        value={previewLimits}
        onChange={setPreviewLimits}
        testID="settings-preview-limits"
      />
      <SwitchRow
        icon="sparkles"
        label="Pretend to be Pro"
        detail="Testing builds only"
        value={pretendPro}
        onChange={setPretendPro}
        testID="settings-pretend-pro"
      />
    </SettingsSection>
  );
}
