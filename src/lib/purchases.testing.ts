// Jest only: a stand-in for react-native-purchases (RevenueCat's native
// module doesn't exist under Jest), and builders for the store's answers.
// Use it as:
//   jest.mock('react-native-purchases', () => require('@/lib/purchases.testing').revenueCatModule());
// then read `mockPurchases()` to steer and check each call.

type Fn = jest.Mock;
export type MockPurchases = {
  configure: Fn;
  setLogLevel: Fn;
  getOfferings: Fn;
  purchasePackage: Fn;
  restorePurchases: Fn;
  getCustomerInfo: Fn;
  addCustomerInfoUpdateListener: Fn;
  removeCustomerInfoUpdateListener: Fn;
  logIn: Fn;
  logOut: Fn;
  isAnonymous: Fn;
};

let current: MockPurchases | undefined;

export function revenueCatModule(): { __esModule: true; default: MockPurchases; LOG_LEVEL: Record<string, string> } {
  current = {
    configure: jest.fn(),
    setLogLevel: jest.fn(async () => undefined),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    isAnonymous: jest.fn(async () => true),
  };
  return { __esModule: true, default: current, LOG_LEVEL: { DEBUG: 'DEBUG', ERROR: 'ERROR' } };
}

export function mockPurchases(): MockPurchases {
  if (!current) throw new Error('jest.mock react-native-purchases with revenueCatModule() first');
  return current;
}

type Intro = { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number } | null;

export function storePackage(identifier: '$rc_monthly' | '$rc_annual', priceString: string, introPrice: Intro = null) {
  return {
    identifier,
    packageType: identifier === '$rc_annual' ? 'ANNUAL' : 'MONTHLY',
    product: {
      identifier: identifier === '$rc_annual' ? 'thepantry_pro_yearly' : 'thepantry_pro_monthly',
      priceString,
      introPrice,
    },
  };
}

/** The offering as Lachlan set it up: A$4.99 a month, A$44.99 a year with a 7-day free trial. */
export function offerings(packages = [storePackage('$rc_monthly', 'A$4.99'), storePackage('$rc_annual', 'A$44.99', SEVEN_DAY_TRIAL)]) {
  return { all: {}, current: { identifier: 'default', availablePackages: packages } };
}

export const SEVEN_DAY_TRIAL: Intro = { price: 0, periodUnit: 'DAY', periodNumberOfUnits: 7, cycles: 1 };

export function customer(pro?: { expires: number; trial?: boolean; willRenew?: boolean; product?: string }) {
  const active = pro
    ? {
        pro: {
          isActive: true,
          willRenew: pro.willRenew ?? true,
          periodType: pro.trial ? 'TRIAL' : 'NORMAL',
          expirationDateMillis: pro.expires,
          productIdentifier: pro.product ?? 'thepantry_pro_yearly',
        },
      }
    : {};
  return { entitlements: { active, all: active } };
}

/** RevenueCat's error shape: `code` is a PURCHASES_ERROR_CODE string. */
export function storeError(code: string, userCancelled = false) {
  return Object.assign(new Error(`store error ${code}`), { code, userCancelled });
}
