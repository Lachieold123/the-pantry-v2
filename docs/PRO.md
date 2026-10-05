# The Pantry Pro: the freemium plan

Decided by Lachlan on 6 October 2026 (D-038). The code is in `src/domain/pro`, `src/store/pro.ts`, `src/lib/purchases.ts` and `src/features/pro`.

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
- Trial: 7 days free on the yearly plan, set up in App Store Connect as an introductory offer. The paywall states it plainly: "7 days free, then A$… a year". Settings and the paywall show the date the trial ends.
- The paywall leads with the yearly plan.

## How it behaves

- **Limits only apply once buying works** (`PURCHASES_CONNECTED`). Until then the paywall says "Pro isn't on sale yet. Until it is, nothing in the app is limited." No button is ever dead, and nothing is locked with no way to pay.
- **The paywall opens on what you tried.** A fourth collection opens "More collections". A day next week opens "Plan further ahead". It lists only what Pro really does: scanning joins the list only once scanning works.
- **Where you meet it:**
  - creating a fourth collection (on the Collections page or from a recipe);
  - writing an eleventh recipe, or importing past five this month;
  - planning past the week you're shopping for (the Plan tab shows a quiet card, and the recipe's Plan sheet says so on the button);
  - Settings, under "The Pantry Pro".
- **Development and preview builds** have two Settings switches, "Preview the free limits" and "Pretend to be Pro", to try both sides before buying works. They never appear in a store build.
- **Who is Pro** is a saved mirror of RevenueCat's answer, refreshed at launch. RevenueCat is always the truth. A lapsed subscription stops counting at its expiry time even offline.

## To switch Pro on (needs Lachlan)

1. **Approve the native dependency** `react-native-purchases` (CLAUDE.md: ask first). It needs a development build, because Expo Go can't make real purchases.
2. **In App Store Connect:**
   - Check that both products are in one subscription group.
   - Add the 7-day introductory offer to the yearly product.
   - Set the prices.
   - Add a paywall screenshot for review.
3. **In RevenueCat:**
   - Confirm the "pro" entitlement and the offering with both products.
   - Copy the public iOS SDK key. You enter it yourself; Claude never handles keys.
4. **Host the privacy policy and terms**, and put their addresses in `src/lib/legal.ts`. Apple requires both links beside a subscription, and the paywall shows them once they're set.
5. **Claude then fills in `src/lib/purchases.ts`** (configure, load plans, buy, restore, current entitlement) and sets `PURCHASES_CONNECTED` to true.
6. **Test on a phone with a sandbox account:** buying, the trial, restoring, expiry and a lapsed subscription. Then update the App Privacy answers: RevenueCat records purchase history against an anonymous ID (see `docs/launch/README.md`).

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
