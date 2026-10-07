// The Pantry Pro (D-038, D-045). Opens worded for what you just tried (a
// fourth collection, a day next week), lists only what Pro really does, and
// says what stays free. Then, honestly, whichever is true on this phone:
// - you're Pro: says so, and when it renews, ends or the trial ends;
// - this device can't buy (the web, Android, Expo Go): Pro isn't on sale
//   here, and nothing is limited;
// - asking the store: a busy button;
// - the store has nothing on sale yet: says so, and nothing is limited;
// - the store couldn't be reached: says so, with Try again;
// - on sale: the plans and buying (BuyPanel).
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { isProFeature, paywallHeading, proBenefits, type Entitlement } from '@/domain/pro/pro';
import { goBack } from '@/lib/navigation';
import { SCAN_CONNECTED } from '@/lib/scan';
import { useIsPro, usePro } from '@/store/pro';
import { checkSale } from '@/store/proSync';
import { useToast } from '@/ui/patterns/Toast';
import { useAnnounce } from '@/ui/primitives/accessibility';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '@/ui/primitives/Icon';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { PRO } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';
import { BuyPanel } from './BuyPanel';

const ALWAYS_FREE =
  'Always free: this week’s plan, your shopping list and sending it, the cupboard, What I have, Surprise me, and Cook Mode.';

/** `from` is the route's parameter: the feature that opened the paywall, if it names one. */
export function PaywallScreen({ from }: { from?: string | undefined }) {
  const router = useRouter();
  const toast = useToast();
  const pro = useIsPro();
  const entitlement = usePro((s) => s.entitlement);
  const sale = usePro((s) => s.sale);
  const heading = paywallHeading(isProFeature(from) ? from : undefined);
  const close = () => goBack(router);
  useAnnounce(!pro && sale.state === 'failed' ? sale.message : undefined);

  const onPro = (message: string) => {
    toast({ message });
    close();
  };

  return (
    <Sheet title={pro ? 'You’re Pro' : heading.title} kicker="The Pantry Pro" onClose={close}>
      <Text variant="body" colour="inkSoft">
        {pro ? renewalLine(entitlement) : heading.body}
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
        <Button label="Done" kind="primary" block onPress={close} testID="pro-done" />
      ) : sale.state === 'on-sale' ? (
        <BuyPanel plans={sale.plans} onPro={onPro} />
      ) : sale.state === 'checking' ? (
        <Button label="Loading prices" kind="primary" block busy disabled onPress={() => undefined} testID="pro-loading" />
      ) : sale.state === 'failed' ? (
        <>
          <Text variant="bodySmall" colour="danger" testID="pro-load-failed">
            {sale.message}
          </Text>
          <Button label="Try again" kind="primary" block onPress={() => void checkSale()} testID="pro-retry" />
          <Button label="Close" kind="secondary" block onPress={close} testID="pro-done" />
        </>
      ) : (
        <>
          <Text variant="bodySmall" colour="inkSoft" testID="pro-not-on-sale">
            {sale.state === 'unavailable'
              ? 'Pro isn’t on sale here yet. Until it is, nothing in the app is limited.'
              : 'Pro isn’t on sale yet. Until it is, nothing in the app is limited.'}
          </Text>
          <Button label="Got it" kind="primary" block onPress={close} testID="pro-done" />
          {sale.state === 'not-on-sale' ? (
            <Button label="Check again" kind="quiet" onPress={() => void checkSale()} testID="pro-check-again" />
          ) : null}
        </>
      )}
    </Sheet>
  );
}

function renewalLine({ expiresAt, inTrial, willRenew }: Entitlement): string {
  if (expiresAt === undefined) return 'Thanks for supporting The Pantry. Pro is yours for good.';
  const date = new Date(expiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  if (inTrial) return `Your free trial ends on ${date}. Cancel before then in your iPhone’s Settings if Pro isn’t for you.`;
  return willRenew === false ? `Pro ends on ${date}. It won’t renew, and everything you’ve made stays yours.` : `Pro renews on ${date}.`;
}
