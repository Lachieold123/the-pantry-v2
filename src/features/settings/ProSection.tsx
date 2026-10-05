// Settings' Pro section (D-038): where you stand, and the way to Pro or to
// managing it. Development builds also get two switches to try the free
// limits and Pro before buying works (they never appear in a store build).
// Preview builds (TestFlight) get them too, so testers can try both sides.
import { INTERNAL_BUILD } from '@/lib/build';
import { PURCHASES_CONNECTED } from '@/lib/purchases';
import { useIsPro, useOpenPaywall, usePro } from '@/store/pro';
import { ListRow } from '@/ui/primitives/ListRow';
import { SettingsSection, SwitchRow } from './SettingsParts';

export function ProSection() {
  const pro = useIsPro();
  const entitlement = usePro((s) => s.entitlement);
  const previewLimits = usePro((s) => s.previewLimits);
  const pretendPro = usePro((s) => s.pretendPro);
  const setPreviewLimits = usePro((s) => s.setPreviewLimits);
  const setPretendPro = usePro((s) => s.setPretendPro);
  const openPaywall = useOpenPaywall();
  const status = pro ? (entitlement.inTrial ? 'Free trial' : 'Pro') : PURCHASES_CONNECTED ? 'Free' : 'Free, nothing limited yet';
  return (
    <SettingsSection label="The Pantry Pro">
      <ListRow
        icon="sparkles"
        title="Pro"
        detail="Plan further ahead and keep more"
        value={status}
        onPress={() => openPaywall()}
        testID="settings-pro"
      />
      {INTERNAL_BUILD ? (
        <>
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
        </>
      ) : null}
    </SettingsSection>
  );
}
