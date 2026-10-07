# The Pantry Pro: the freemium plan

Decided by Lachlan on 6 October 2026 (D-038). Purchases wired to RevenueCat on 7 October 2026 (D-045). The code is in `src/domain/pro`, `src/store/pro.ts`, `src/store/proSync.ts`, `src/lib/purchases.ts` and `src/features/pro`.

## The rule

A free user can always do the whole North Star for the week they're shopping for. They can plan it, get one tidy list and send it, cook from what they have, and cook step by step with timers. The old app put the planner and Cook Mode behind Pro, so new people never found out why it was good (PRODUCT.md, decision A). Pro is "more", never "unlocked".

## Free and Pro

| | Free | Pro |
|---|---|---|
| Plan | Up to the end of the week you're shopping for. On Sunday that's the whole week ahead, so "Sunday: plan the week" is always free. | Next week too. |
| Shopping list, sending it, the cupboard, What I have, Surprise me, Cook Mode | Everything | Everything |
| Collections | 3 | Unlimited |
| Your own recipes | 10 | Unlimited |
| Importing a recipe from a link | 5 a month | Unlimited |
| Receipt and shelf scanning (once it's live) | 3 a month | About 15 a day |

When Pro lapses, nothing is taken away. Extra collections, recipes and next week's meals all stay and stay usable. Only making *more* past a free limit asks for Pro.

## Price and trial

- Price: the existing RevenueCat products, `thepantry_pro_monthly` ($4.99) and `thepantry_pro_yearly` ($44.99). Each country's actual price is set in App Store Connect. The app only ever shows the store's own price string, in the buyer's currency.
- Trial: 7 days free on the yearly plan, set up in App Store Connect as an introductory offer. The app reads the trial's length from the store (the product's free introductory price) and never assumes it, so the paywall only says "7 days free, then A$… a year" when Apple actually offers it to this buyer. Settings and the paywall show the date the trial ends.
- The paywall leads with the yearly plan.

## How it behaves

- **Limits only apply when Pro can actually be bought on this phone** (`usePurchasesReady()`): RevenueCat is running (an iPhone build) *and* the store returned at least one plan. Otherwise the paywall says "Pro isn't on sale yet. Until it is, nothing in the app is limited." No button is ever dead, and nothing is locked with no way to pay.
- **The paywall opens on what you tried.** A fourth collection opens "More collections". A day next week opens "Plan further ahead". It lists only what Pro really does: scanning joins the list only once scanning works.
- **Where you meet it:**
  - creating a fourth collection (on the Collections page or from a recipe);
  - writing an eleventh recipe, or importing past five this month;
  - planning past the week you're shopping for (the Plan tab shows a quiet card, and the recipe's Plan sheet says so on the button);
  - Settings, under "The Pantry Pro".
- **Development and preview builds** have two Settings switches, "Preview the free limits" and "Pretend to be Pro", to try both sides before buying works. They never appear in a store build.
- **Who is Pro** is a saved mirror of RevenueCat's answer, refreshed at launch. RevenueCat is always the truth. A lapsed subscription stops counting at its expiry time even offline.

## How buying is wired (D-045)

- **Library:** `react-native-purchases` (RevenueCat). It's native, so it needs a development or store build; Expo Go, the web and Android never start it and say "Pro isn't on sale here yet".
- **Key:** the public iOS SDK key is the constant `REVENUECAT_IOS_KEY` in `src/lib/purchases.ts`. Public keys are made to ship in the app. The secret key never goes in the code.
- **RevenueCat setup it expects:** entitlement `pro`; current offering `default` with the standard packages `$rc_monthly` (`thepantry_pro_monthly`) and `$rc_annual` (`thepantry_pro_yearly`).
- **At launch** (`startPurchases` in `src/store/proSync.ts`): configure RevenueCat once (quiet logs in a store build), ask who is Pro, and ask what's on sale. Nothing waits on the store; the saved entitlement covers an offline start.
- **What's on sale** is the Pro store's `sale`, asked afresh each launch and never saved:

  | `sale` | When | Paywall | Free limits |
  |---|---|---|---|
  | `unavailable` | the web, Android, Expo Go | "Pro isn't on sale here yet" | off |
  | `checking` | asking the store | busy "Loading prices" | off |
  | `not-on-sale` | the offering is empty, or RevenueCat says no products could be fetched from Apple | "Pro isn't on sale yet", plus Check again | off |
  | `failed` | the store couldn't be reached | the message, plus Try again | off |
  | `on-sale` | at least one plan came back | the plans, buying, Restore | on |

- **Buying:** the paywall shows the store's own prices, the trial line only if the store reports a free trial, Apple's auto-renew terms beside the button, Restore purchases, and the Terms and Privacy links once `src/lib/legal.ts` has them. Every outcome is designed: buying (busy), success (toast, closes), cancelled (nothing happens, nothing said), pending Ask to Buy ("Waiting for approval"; Pro switches on through the listener when approved), and errors ("Nothing has been charged").
- **Who is Pro** is a saved mirror of RevenueCat's `pro` entitlement: expiry, trial, product and whether it will renew. A listener keeps it current (renewals, refunds, an approved Ask to Buy).
- **Accounts (D-043):** signing in permanently calls `Purchases.logIn(<Supabase user id>)`, so Pro follows the account to another phone. Signing out calls `Purchases.logOut()` (skipped when RevenueCat's id is already anonymous, which would throw). The household's quiet anonymous user is never used.
- **Settings → The Pantry Pro:** Free, Trial ends <date>, Pro, renews <date>, or Pro, ends <date>. A real subscription also gets "Manage subscription", which opens Apple's page (`https://apps.apple.com/account/subscriptions`).

## Still needs Lachlan before Pro goes on sale

1. **App Store Connect:** finish both products' metadata (they show `MISSING_METADATA` today), add the 7-day free introductory offer to the yearly product, set prices, add the review screenshot, and accept the **Paid Apps agreement** (with banking and tax). Until all of that is done, Apple returns no products and the app correctly says Pro isn't on sale.
2. **Host the privacy policy and terms** and put their addresses in `src/lib/legal.ts`. Apple rejects a subscription paywall without both links, and the paywall shows them only once they exist.
3. **A new EAS development build**, because the library is native. Expo Go can't buy.
4. **Update the App Privacy answers** (RevenueCat records purchase history against an app user id: see `docs/launch/README.md`).

## Testing with a sandbox account

1. **Make a tester:** App Store Connect → Users and Access → Sandbox → Testers (+). Use an email that isn't a real Apple ID; it doesn't need to receive mail.
2. **Sign in on the iPhone:** Settings → App Store → scroll to the bottom → Sandbox Account. (Don't sign out of your real Apple ID.)
3. **Install a development or TestFlight build** and open Settings → The Pantry Pro. With the products ready, the paywall shows the real prices.
4. **Try each path:** buy yearly (the trial), cancel Apple's sheet, Restore on a second install, and Ask to Buy (turn on "Interrupted purchases"/Ask to Buy for the tester in App Store Connect).
5. **Time runs fast in sandbox:** a year renews every hour and a month every 5 minutes, so expiry and lapsing can be watched in one sitting. Turn off renewal from the tester's settings on the phone (Settings → App Store → Sandbox Account → Manage) to see "Pro, ends <date>" and then the lapse.
6. **Check RevenueCat:** the customer appears under the Supabase user id when signed in, or an anonymous id when not, with the `pro` entitlement.

## Pro features to come

Each one joins the paywall's list only when it ships:

- **Use it up:** mark jars "use soon"; Home leads with dishes that use them.
- **Leftover chaining:** Sunday's roast chicken becomes Tuesday's dinner, bought once.
- **Household tastes:** a "won't eat" list for each person at the table.
- **Sunday batch cook:** one combined prep session for several dinners.
- **Unlimited scanning,** once scanning is live (D-030).

## What to watch after launch

- How many free users reach a limit, and which limit.
- Paywall views by trigger, and conversions by trigger.
- Trial starts, then trial conversion at day 7.
- Refunds and cancellations in the first week.

If one limit drives most upgrades and another drives most complaints, move the second.
