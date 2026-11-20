> **Draft for Lachlan (and a lawyer, for the privacy parts) to review.** Drafted by an AI (Claude) on 12 October 2026 (K-23) and **re-checked against the code on 20 November 2026** (branch `audit/deep-1120`, deep audit S2-6). Every answer describes a **store build** (`INTERNAL_BUILD` false, `src/lib/build.ts`): no other cooks' screens, no scan buttons, Apple sign-in only, RevenueCat started at every launch. Proof for each answer: `docs/audits/2026-11-20-deep-audit/FIX-DOCS.md`. Points needing your decision are marked **DECIDE:**. Nothing here has been entered in App Store Connect. This file is the one place for the App Privacy answers; `PRIVACY.md` covers the manifest.

> **OWNER TO DO BEFORE SUBMITTING**
> 1. Apply the live database migrations (`supabase/APPLY-LIVE.md`, all steps). Without them the Household screens' Remove, Cancel codes and the 48-hour codes don't work, and Household is open to the takeover in audit S2-1.
> 2. Make the Sign in with Apple key, set the four Apple secrets and deploy `apple-token` and `delete-account`. Until then, account deletion doesn't revoke Apple's token, and Apple rejects that (guideline 5.1.1(v)).
> 3. In the Supabase dashboard: anonymous sign-ins on, manual linking on, the Apple provider set up, and the project on a plan that doesn't pause (K-24).
> 4. Host the privacy policy, terms and a support page; paste the URLs into `src/lib/legal.ts` and into App Store Connect. This is also what puts Pro on sale, so do it in the build you submit.
> 5. In App Store Connect: the two Pro products filled in, and check whether either has an introductory offer.
> 6. Get a support email and fill the Contact line in the review notes.
> 7. Build a new TestFlight build from this branch (build 25 is too old: `docs/launch/RELEASE-NOTES.md`).
> 8. Answer App Privacy and the age rating as below, after the lawyer has seen section 1's DECIDE points.

# App Store Connect: App Privacy, age rating and App Review notes

## 1. App Privacy ("nutrition label")

App Store Connect › your app › **App Privacy** › Get Started (or Edit).

Apple counts data as "collected" when it leaves the phone and you (or a partner) can get at it for longer than it takes to handle the request. Two things send data off the phone:

- **RevenueCat** (Pro subscriptions) starts at every launch on an iPhone and creates a customer record, even before anyone buys (`src/features/app/useAppReady.ts:30`, `src/store/proSync.ts:58`).
- **Supabase** (our database) gets data only when someone starts or joins a household, or signs in with Apple. A store build reads nothing else from it: the other cooks' screens are hidden (`COMMUNITY_SHOWN`, `src/lib/build.ts:19`).

So the answer is **Yes, we collect data**.

### Step 1: Do you or your third-party partners collect data from this app?

**Yes.**

### Step 2: Data types to tick

| Apple category › type | Tick? | What it is in The Pantry | Code |
| --- | --- | --- | --- |
| **Contact Info › Name** | **Yes** | The name Apple gives at Sign in with Apple (`profiles.display_name`), and the name you give a household (`household_members.display_name`) | `src/lib/account.ts:156`, household migrations |
| **Contact Info › Email Address** | **Yes** | The email (or relay address) Apple gives at sign-in | Supabase Auth (`auth.users`) |
| Contact Info › Phone, Physical Address, Other | No | Not asked for | |
| Health & Fitness | No (see DECIDE 3) | The avoid list is a cooking preference, not health or medical data | `src/domain/sync/personal.ts:24` |
| Financial Info | No | Apple handles payment; neither we nor RevenueCat see card details | |
| **Purchases › Purchase History** | **Yes** | RevenueCat holds whether the phone or account has Pro, which plan, start, renewal and trial | `src/lib/purchases.ts:81-93`, `src/store/proSync.ts:58-78` |
| Location | No | Not used | |
| Sensitive Info | No (see DECIDE 3) | | |
| Contacts | No | Invites go out through the share sheet; the app never reads contacts | `src/features/household/words.ts:25` |
| **User Content › Other User Content** | **Yes** | Plan, list ticks, extras and removals, cupboard, Cookmarks, collections, hidden dishes, own recipes, cooking log, taste settings, household name | `src/domain/sync/types.ts:9-11` |
| User Content › Photos or Videos | No | Plates stay on the phone; nothing uploads photos | no upload call in `src` |
| User Content › Emails or Text Messages, Audio, Gameplay, Customer Support | No | | |
| Browsing History | No | An imported recipe's source address is stored as part of that recipe (user content), not as a record of browsing | |
| Search History | No | Searches stay on the phone | |
| **Identifiers › User ID** | **Yes** | The Supabase user ID (permanent or anonymous), and RevenueCat's customer ID (random, or the Supabase user ID while signed in) | Supabase Auth; `Purchases.logIn`, `src/lib/purchases.ts:182` |
| Identifiers › Device ID | No (see DECIDE 1) | The app's per-install sync tag is a random ID it makes, not a device or advertising ID | `account_rows.updated_by` |
| **Usage Data › Product Interaction** | **Yes** | The 20 most recently viewed recipes and the cooking log sync with an account | `src/domain/sync/personal.ts:55-56` |
| Usage Data › Advertising Data, Other | No | Home's record of what it showed and what was opened stays on the phone | `src/store/homeEvents.ts:1-4` |
| Diagnostics | No | No Sentry or crash SDK (K-8). Apple's own opt-in crash reports don't count | `package.json` |
| Other Data | No | | |

These match the privacy manifest in `app.json` (`ios.privacyManifests`): Name, Email Address, User ID, Other User Content, Product Interaction and Purchase History, all linked, not tracking, App Functionality.

### Step 3: For each ticked type

Answer every ticked type the same way:

| Question | Answer |
| --- | --- |
| How is this data used? | **App Functionality** only. (Not Analytics, Product Personalisation, Advertising, Developer's Advertising or Other.) |
| Is it linked to the user's identity? | **Yes**, it's stored against a user ID or RevenueCat customer ID. |
| Is it used for tracking? | **No.** |

> Note for Lachlan: "Product Personalisation" means personalising using data about the person, such as suggestions. The avoid list and diet do steer suggestions, but that happens on the phone from the phone's own copy, not from what we collect, so App Functionality is accurate. If the lawyer prefers caution, adding Product Personalisation to Other User Content is harmless.

### What the App Store will then show

- **Data Used to Track You:** none.
- **Data Linked to You:** Contact Info, Purchases, User Content, Identifiers, Usage Data.
- **Data Not Linked to You:** none.

### DECIDE: points for this section

1. **Device ID.** Two things could count: the app's random per-install sync tag (not a hardware or advertising ID), and whatever device identifiers the RevenueCat SDK sends on its own. **Recommend:** read RevenueCat's App Privacy guide for SDK 10.11 before answering. If it says the SDK collects a device identifier such as the IDFV, tick Device ID (App Functionality, linked, not tracking) and add `NSPrivacyCollectedDataTypeDeviceID` to the manifest so the two agree. Over-declaring costs one line on the label; under-declaring risks a rejection.
2. **RevenueCat's own diagnostics.** Same guide: if it lists Diagnostics or other types for the SDK, tick those too.
3. **Health and Sensitive Info.** The avoid list (nuts, gluten, shellfish, pork, alcohol, ...) and diet (vegetarian, vegan, pescatarian) sync with an account. Apple's Health category means health or medical data; Sensitive Info includes religious beliefs. **Recommend: No to both**, because they're cooking preferences. Ask the lawyer, together with the privacy policy's sensitive-information point (privacy policy, 3C). If you stop syncing `diet` and `avoid`, this question goes away.

### Re-answer when

- **The community screens go on in store builds** (`COMMUNITY_SHOWN`): every launch reads the public feed. Nothing new is collected from the cook unless follows or events are uploaded; if they are, add Product Interaction details and Other User Content (follows).
- **Email codes go on:** no new type (Email Address is already ticked); name the email provider in the privacy policy.
- **Scanning goes live:** User Content › Photos or Videos (the scan photo), and name the AI provider.
- **Sentry is added (K-8):** Diagnostics › Crash Data and Performance Data (not linked, if no user ID is attached).
- **Social posting (P9):** User Content › Photos or Videos, Other User Content, and messages if they're stored.

## 2. Age rating

App Store Connect › App Information › **Age Rating** › Edit. Apple's questionnaire changed in 2025; the exact wording in App Store Connect is what counts, so read each question as you answer it.

Everything except shared content is as in `APP-STORE-LISTING.md` (expected result **4+**).

**User-generated content (content created by users and shared with others):**

What a store build does today: in a household, members see each other's display names (free text, up to 40 characters), the household name, the shared plan, list and cupboard, and the recipes a member wrote that the shared plan uses. A household is private, invite-only and capped at 8 people. A store build has no public profiles, no feed of other cooks, no comments, no chat and no way to message or find strangers: the "From other cooks" screens are hidden (`src/features/feed/FeedScreen.tsx:196`, `src/app/feed/index.tsx:7`, `src/app/cooks/[id].tsx:10`). Plates (dish photos) stay on the phone.

| Option | Answer | Effect | For | Against |
| --- | --- | --- | --- | --- |
| **A (recommended)** | **No**, with the explanation below in the App Review notes | Rating stays 4+ | Nothing is shown to anyone you didn't invite; comparable shared-list apps are rated 4+ | If App Review reads "shared with others" literally, they may ask you to change it. That's a metadata fix, not a rejection of the build |
| B | **Yes** | App Store Connect shows the resulting rating before you save; it may rise above 4+. Apple then expects guideline 1.2 tools (report, block, filtering) | Most literal reading | Over-states the risk; 1.2's tools make little sense for a family of 4 sharing a list |

**Messaging or chat:** **No.** The invite goes through the iOS share sheet, which is the user's own messaging app.

**Unrestricted web access:** **No.** "Import from a link" reads a recipe from one page; it doesn't show web pages.

**If you turn the community screens on** (`COMMUNITY_SHOWN` true in store builds): the app then shows cook profiles with names, home regions, bios, follower counts and a Follow button. Today all 99 of those cooks are AI personas with no AI label (audit S2-7, REL2-1). Settle how they're presented first (label them, show them as The Pantry's test kitchen, or keep them hidden). If real people can ever publish, the user-generated content answer becomes **Yes**, guideline 1.2 needs report, block and filtering, and the minimum-age question in the privacy policy (section 9) must be asked again.

> DECIDE: Option A or B. If A, keep the household paragraph in the App Review notes below so the reviewer sees why.

## 3. App Review notes

App Store Connect › App Review Information. **Sign-in required: No** (everything works without an account; accounts and households are optional).

Notes (paste between the lines):

```
The Pantry is a cooking app: it shows what you can cook with what's in your cupboard, plans the week, builds a shopping list from the plan, and walks you through cooking.

ACCOUNTS ARE OPTIONAL
- Everything works without signing in. A user's kitchen stays on the device unless they sign in or join a household.
- The app checks for The Pantry Pro with RevenueCat at launch. That is the only connection made without the user doing anything.
- To sign in: open the side menu (top left) > Settings & preferences > Account > "Back up your kitchen" > "Continue with Apple". Any Apple ID works, including yours. Apple is the only sign-in method in this version. There are no passwords.
- Signed-in data (plan, list, cupboard, saved recipes, own recipes, settings) is stored on our Supabase backend in Sydney, Australia, to back it up and sync it between the user's devices.
- To delete an account: Settings & preferences, at the very bottom > "Delete account", type DELETE, confirm. This deletes the account and its data on the server and revokes the Sign in with Apple token.

HOUSEHOLD (SHARING A KITCHEN): NEEDS TWO DEVICES TO JOIN
- Settings & preferences > Sharing > Household > "Start sharing", then "Invite someone" makes an invite code and opens the share sheet. The List tab also links to Household.
- A second device joins by opening the invite link, or with the code (Settings & preferences > Sharing > Household > enter the code > Join), and gives a display name. With one device you can start a household and make an invite, but not join it.
- Members share one plan, shopping list and cupboard. A household is private and invite-only (up to 8 people). This version has no public profiles, feeds, comments, chat or ways to contact strangers. This is why we answered No to user-generated content in the age rating.
- A household works without an account (an anonymous sign-in is created). Settings & preferences > "Delete my household data" removes that from the server.

MAIN FEATURES
- Cupboard tab: add a few things (e.g. eggs, tomato, onion, feta, bread), then go back to Home. "What I have" shows dishes you can cook now, and "Nearly there" below it shows dishes one or two things short.
- Plan: tap Plan, add a dinner to any day. The List tab builds the list from the plan. The share button opens the standard iOS share sheet.
- Cook Mode: open any recipe and tap Cook. Step timers schedule a local notification, which is why notification permission is requested (only when a timer or the Sunday reminder is first used).
- Camera and Photos are used only by "Add a plate" (the centre + button, or the side menu) to attach photos of a dish you cooked. These photos stay on the device; they are never uploaded.
- Import from a link (side menu > My recipes, paste a link) fetches the public web page directly from the device and reads its schema.org Recipe data.

THE PANTRY PRO (IN-APP SUBSCRIPTION)
- Side menu > Settings & preferences > The Pantry Pro > Pro, or any "Pro" prompt. Monthly and yearly auto-renewing subscriptions. The paywall shows each plan's price and length from the App Store, Restore purchases, and links to our Terms of Use and Privacy Policy.
- Without Pro: up to 3 collections, 10 own recipes and 5 link imports a month, and planning up to the end of the current shopping week. Everything else is free.

Recipe photos are credited (Pexels, Wikimedia Commons) or labelled "AI-generated photo". No ads, no analytics, no tracking.

Contact: [your name], [contact email], [phone number]
```

> DECIDE: **the revocation sentence** ("revokes the Sign in with Apple token") is true only once to-do 2 is done. Don't submit before it is.

> DECIDE: **the Pro block** is true only in a build whose `src/lib/legal.ts` has both legal links and whose products Apple returns (`canSellPro`, `src/lib/legal.ts:24`). If you submit without them, the paywall says "Pro isn't on sale yet" and nothing is limited: then replace the block with "The Pantry Pro screen says Pro isn't on sale yet; there are no in-app purchases in this version and nothing is limited", and expect a 2.1 question about it. Check every path in these notes on the phone before pasting.

> DECIDE: **Household demo.** Optionally make a demo household on a test phone, generate an invite just before submitting (codes expire after 48 hours once the migrations are applied), and add: "Demo invite code: XXXXXXXX (valid until [date])."

> DECIDE: **Before submitting**, the server must match these notes: to-dos 1 to 3 at the top of this file.
