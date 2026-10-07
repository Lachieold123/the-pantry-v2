// Keeping Pro in step with the store (D-045): starting RevenueCat at launch,
// asking what's on sale, refreshing who is Pro, listening for renewals and
// approvals, and tying purchases to the account. Lives in the store layer so
// no feature has to know about accounts (features never import features).
//
// Identity: a permanent sign-in (D-043) is RevenueCat's app user id, so Pro
// follows the account to a new phone. Signing out goes back to an anonymous
// id. The quiet anonymous user behind a household is never used: it isn't
// an account and can vanish with a reinstall.
import { isActive } from '@/domain/pro/pro';
import {
  buy,
  configurePurchases,
  currentEntitlement,
  forget,
  identify,
  loadPlans,
  onEntitlementChange,
  restore,
  type BuyResult,
  type PlanId,
} from '@/lib/purchases';
import { useAccount } from './account';
import { usePro } from './pro';

let stops: (() => void)[] = [];
let checking: Promise<void> | undefined;

/** Asks the store what's on sale. The paywall's "Try again" calls it too. */
export function checkSale(): Promise<void> {
  if (usePro.getState().sale.state === 'unavailable') return Promise.resolve();
  checking ??= (async () => {
    usePro.setState({ sale: { state: 'checking' } });
    const r = await loadPlans();
    usePro.setState({
      sale:
        r.status === 'ok'
          ? { state: 'on-sale', plans: r.plans }
          : r.status === 'failed'
            ? { state: 'failed', message: r.message }
            : r.status === 'not-on-sale'
              ? { state: 'not-on-sale' }
              : { state: 'unavailable' },
    });
  })().finally(() => {
    checking = undefined;
  });
  return checking;
}

/** Refreshes the saved mirror from the store. Quietly keeps the saved one if the store can't be reached. */
export async function refreshEntitlement(): Promise<void> {
  const fresh = await currentEntitlement();
  if (fresh) usePro.getState().setEntitlement(fresh);
}

/** At launch: start RevenueCat (iPhone only), then ask who is Pro and what's on sale. Never blocks opening. */
export function startPurchases(): void {
  if (stops.length) return;
  const who = useAccount.getState().who;
  if (!configurePurchases(who?.id)) {
    usePro.setState({ sale: { state: 'unavailable' } });
    return;
  }
  usePro.setState({ sale: { state: 'checking' } });
  stops = [
    onEntitlementChange((e) => usePro.getState().setEntitlement(e)),
    useAccount.subscribe((s, prev) => {
      const id = s.who?.id;
      if (id === prev.who?.id) return;
      void (id ? identify(id) : forget()).then((r) => {
        if (r.ok) usePro.getState().setEntitlement(r.value);
      });
    }),
  ];
  void refreshEntitlement();
  void checkSale();
}

export function stopPurchases(): void {
  for (const stop of stops) stop();
  stops = [];
}

/** What the paywall shows after buying or restoring. */
export type Outcome =
  | { kind: 'pro' }
  /** A restore that found nothing for this Apple ID. */
  | { kind: 'nothing-found' }
  | { kind: 'cancelled' }
  | { kind: 'pending'; message: string }
  | { kind: 'failed'; message: string };

function outcome(r: BuyResult): Outcome {
  switch (r.status) {
    case 'ok':
      usePro.getState().setEntitlement(r.entitlement);
      return isActive(r.entitlement, Date.now()) ? { kind: 'pro' } : { kind: 'nothing-found' };
    case 'cancelled':
      return { kind: 'cancelled' };
    case 'pending':
      return { kind: 'pending', message: r.message };
    case 'not-connected':
      return { kind: 'failed', message: 'Pro can’t be bought on this device.' };
    default:
      return { kind: 'failed', message: r.message };
  }
}

/** Buys a plan; a success saves the new entitlement. Cancelling changes nothing. */
export async function purchasePro(plan: PlanId): Promise<Outcome> {
  return outcome(await buy(plan));
}

export async function restorePro(): Promise<Outcome> {
  return outcome(await restore());
}
