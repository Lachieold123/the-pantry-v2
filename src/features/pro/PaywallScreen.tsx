// The Pantry Pro (D-038). Opens worded for what you just tried (a fourth
// collection, a day next week), lists only what Pro really does, and says
// what stays free. Three honest states:
// - you're Pro: says so, and when it renews or the trial ends;
// - buying isn't connected yet: says Pro isn't on sale, and nothing is limited;
// - buying works: yearly (with the trial) or monthly, Restore, and the legal links.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { isActive, isProFeature, paywallHeading, proBenefits } from '@/domain/pro/pro';
import { LEGAL_URLS } from '@/lib/legal';
import { goBack } from '@/lib/navigation';
import { buy, loadPlans, PURCHASES_CONNECTED, restore, type BuyResult, type Plan } from '@/lib/purchases';
import { SCAN_CONNECTED } from '@/lib/scan';
import { useIsPro, usePro } from '@/store/pro';
import { useToast } from '@/ui/patterns/Toast';
import { useAnnounce } from '@/ui/primitives/accessibility';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { PRO } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { PlanChoice } from './PlanChoice';

const ALWAYS_FREE =
  'Always free: this week’s plan, your shopping list and sending it, the cupboard, What I have, Surprise me, and Cook Mode.';

type Plans = { state: 'loading' } | { state: 'ready'; plans: Plan[] } | { state: 'failed'; message: string };

/** `from` is the route's parameter: the feature that opened the paywall, if it names one. */
export function PaywallScreen({ from }: { from?: string | undefined }) {
  const router = useRouter();
  const toast = useToast();
  const pro = useIsPro();
  const entitlement = usePro((s) => s.entitlement);
  const setEntitlement = usePro((s) => s.setEntitlement);
  const heading = paywallHeading(isProFeature(from) ? from : undefined);
  const [plans, setPlans] = useState<Plans>({ state: 'loading' });
  const [chosen, setChosen] = useState<Plan['id']>('yearly');
  const [busy, setBusy] = useState(false);
  useAnnounce(plans.state === 'failed' ? plans.message : undefined);

  useEffect(() => {
    if (!PURCHASES_CONNECTED || pro) return;
    let live = true;
    void loadPlans().then((r) => {
      if (!live) return;
      setPlans(
        r.status === 'ok'
          ? { state: 'ready', plans: r.plans }
          : { state: 'failed', message: 'Couldn’t reach the App Store. Try again in a moment.' },
      );
    });
    return () => {
      live = false;
    };
  }, [pro]);

  const settle = (r: BuyResult, success: string) => {
    setBusy(false);
    if (r.status === 'ok') {
      setEntitlement(r.entitlement);
      if (isActive(r.entitlement, Date.now())) {
        toast({ message: success });
        goBack(router);
      } else toast({ message: 'No Pro purchase found for this Apple ID.' });
    } else if (r.status === 'failed') toast({ message: r.message });
  };
  const purchase = () => {
    setBusy(true);
    void buy(chosen).then((r) => settle(r, 'Welcome to Pro'));
  };
  const restorePurchases = () => {
    setBusy(true);
    void restore().then((r) => settle(r, 'Pro restored'));
  };

  return (
    <Sheet title={pro ? 'You’re Pro' : heading.title} kicker="The Pantry Pro" onClose={() => goBack(router)}>
      <Text variant="body" colour="inkSoft">
        {pro ? renewalLine(entitlement.expiresAt, entitlement.inTrial) : heading.body}
      </Text>
      <View style={{ gap: SPACE.md }} testID="pro-benefits">
        {proBenefits(SCAN_CONNECTED).map((b) => (
          <View key={b.feature} style={{ flexDirection: 'row', gap: SPACE.sm }}>
            <Icon name="check" size={PRO.benefitIcon} colour="accentText" />
            <View style={{ flex: 1, gap: SPACE.xxs }}>
              <Text variant="row">{b.title}</Text>
              <Text variant="caption">{b.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text variant="caption">{ALWAYS_FREE}</Text>

      {pro ? (
        <Button label="Done" kind="primary" block onPress={() => goBack(router)} testID="pro-done" />
      ) : !PURCHASES_CONNECTED ? (
        <>
          <Text variant="bodySmall" colour="inkSoft" testID="pro-not-on-sale">
            Pro isn’t on sale yet. Until it is, nothing in the app is limited.
          </Text>
          <Button label="Got it" kind="primary" block onPress={() => goBack(router)} testID="pro-done" />
        </>
      ) : plans.state === 'loading' ? (
        <Button label="Loading prices" kind="primary" block busy disabled onPress={() => undefined} testID="pro-loading" />
      ) : plans.state === 'failed' ? (
        <>
          <Text variant="bodySmall" colour="danger">
            {plans.message}
          </Text>
          <Button label="Close" kind="secondary" block onPress={() => goBack(router)} testID="pro-done" />
        </>
      ) : (
        <>
          <PlanChoice plans={plans.plans} chosen={chosen} onChoose={setChosen} />
          <Button label="Continue" kind="primary" block busy={busy} disabled={busy} onPress={purchase} testID="pro-buy" />
          <Text variant="caption">Renews automatically until you cancel in your iPhone’s Settings, at least a day before it renews.</Text>
          <Button label="Restore purchases" kind="quiet" onPress={restorePurchases} disabled={busy} testID="pro-restore" />
          <LegalLinks />
        </>
      )}
    </Sheet>
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

function renewalLine(expiresAt: number | undefined, inTrial: boolean | undefined): string {
  if (expiresAt === undefined) return 'Thanks for supporting The Pantry. Pro is yours for good.';
  const date = new Date(expiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
  return inTrial
    ? `Your free trial ends on ${date}. Cancel before then in your iPhone’s Settings if Pro isn’t for you.`
    : `Pro renews on ${date}.`;
}
