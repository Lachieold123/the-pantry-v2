// Settings' Pro section (D-038, D-045): where you stand (Free, Trial ends
// <date>, Pro renews or ends <date>), the way to Pro, and, for a real
// subscription, Apple's page to manage or cancel it (only Apple can).
// Development and preview (TestFlight) builds also get two switches to try
// the free limits and Pro before buying works; a store build never shows them.
import { Linking } from 'react-native';

import { INTERNAL_BUILD } from '@/lib/build';
import { useOpenPaywall, usePro, useProStanding } from '@/store/pro';
import { ListRow } from '@/ui/primitives/ListRow';
import { SettingsSection, SwitchRow } from './SettingsParts';

/** Apple's own subscriptions page: the only place a subscription can be changed or cancelled. */
export const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export function ProSection() {
  const { label: status, subscribed } = useProStanding();
  const previewLimits = usePro((s) => s.previewLimits);
  const pretendPro = usePro((s) => s.pretendPro);
  const setPreviewLimits = usePro((s) => s.setPreviewLimits);
  const setPretendPro = usePro((s) => s.setPretendPro);
  const openPaywall = useOpenPaywall();
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
      {subscribed ? (
        <ListRow
          icon="settings"
          title="Manage subscription"
          detail="Change or cancel it in your Apple account"
          onPress={() => void Linking.openURL(MANAGE_SUBSCRIPTIONS_URL)}
          testID="settings-manage-subscription"
        />
      ) : null}
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
