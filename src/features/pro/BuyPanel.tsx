// The paywall's buying part, shown only when the store has plans on sale
// (D-045). Yearly (with the store's trial, if it reports one) or monthly,
// the auto-renew terms Apple requires beside the button, Restore, and the
// legal links. Every outcome has its own state:
// - buying or restoring: the button is busy and nothing else can be pressed;
// - success: the caller says "Welcome to Pro" and closes;
// - cancelled: nothing happens, and nothing is said;
// - pending (Ask to Buy): says it's waiting, and the sheet can be closed;
// - error, or a restore that found nothing: says so here, in place.
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { LEGAL_URLS } from '@/lib/legal';
import type { Plan, PlanId } from '@/lib/purchases';
import { purchasePro, restorePro, type Outcome } from '@/store/proSync';
import { useAnnounce } from '@/ui/primitives/accessibility';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';
import { PlanChoice } from './PlanChoice';

/** Apple's required disclosure for auto-renewing subscriptions, in plain words. */
export function renewalTerms(plan: Plan | undefined): string {
  const trial = plan?.trialDays
    ? ` The free trial turns into a paid subscription when it ends unless you cancel at least 24 hours before then.`
    : '';
  return (
    'Payment is charged to your Apple ID when you confirm the purchase. The subscription renews automatically ' +
    'unless you cancel at least 24 hours before the end of the current period, and your Apple ID is charged for ' +
    'the renewal in the 24 hours before it ends.' +
    trial +
    ' Manage or cancel it any time in your iPhone’s Settings → your name → Subscriptions.'
  );
}

type Notice = { tone: 'pending' | 'error'; message: string } | undefined;

export function BuyPanel({ plans, onPro }: { plans: readonly Plan[]; onPro: (message: string) => void }) {
  const [chosen, setChosen] = useState<PlanId>(plans.some((p) => p.id === 'yearly') ? 'yearly' : (plans[0]?.id ?? 'yearly'));
  const [busy, setBusy] = useState<'buying' | 'restoring' | undefined>();
  const [notice, setNotice] = useState<Notice>();
  useAnnounce(notice?.message);
  const plan = plans.find((p) => p.id === chosen);

  const settle = (o: Outcome, success: string) => {
    setBusy(undefined);
    if (o.kind === 'pro') onPro(success);
    else if (o.kind === 'cancelled') setNotice(undefined);
    else if (o.kind === 'nothing-found') setNotice({ tone: 'error', message: 'No Pro purchase found for this Apple ID.' });
    else setNotice({ tone: o.kind === 'pending' ? 'pending' : 'error', message: o.message });
  };
  const purchase = () => {
    setBusy('buying');
    setNotice(undefined);
    void purchasePro(chosen).then((o) => settle(o, 'Welcome to Pro'));
  };
  const restoreAll = () => {
    setBusy('restoring');
    setNotice(undefined);
    void restorePro().then((o) => settle(o, 'Pro restored'));
  };

  return (
    <>
      <PlanChoice plans={plans} chosen={chosen} onChoose={(id) => (busy ? undefined : setChosen(id))} />
      {notice ? (
        <Text variant="bodySmall" colour={notice.tone === 'error' ? 'danger' : 'inkSoft'} testID={`pro-${notice.tone}`}>
          {notice.message}
        </Text>
      ) : null}
      <Button
        label={plan?.trialDays ? 'Start free trial' : 'Continue'}
        kind="primary"
        block
        busy={busy === 'buying'}
        disabled={busy !== undefined}
        onPress={purchase}
        testID="pro-buy"
      />
      <Text variant="caption" testID="pro-terms">
        {renewalTerms(plan)}
      </Text>
      <Button
        label="Restore purchases"
        kind="quiet"
        busy={busy === 'restoring'}
        disabled={busy !== undefined}
        onPress={restoreAll}
        testID="pro-restore"
      />
      <LegalLinks />
    </>
  );
}

function LegalLinks() {
  const links = [
    { label: 'Terms of use', url: LEGAL_URLS.terms },
    { label: 'Privacy policy', url: LEGAL_URLS.privacy },
  ].filter((l): l is { label: string; url: string } => l.url !== undefined);
  if (!links.length) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: SPACE.md }}>
      {links.map((l) => (
        <Button key={l.label} label={l.label} kind="quiet" onPress={() => void Linking.openURL(l.url)} />
      ))}
    </View>
  );
}
