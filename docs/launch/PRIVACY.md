# Privacy manifest and App Privacy answers

Written 7 October 2026 by Claude from the code, for P11 (launch readiness). **Re-checked against the code on 20 November 2026** (branch `audit/deep-1120`, deep audit S2-6): every line describes a store build (`INTERNAL_BUILD` false). Proof: `docs/audits/2026-11-20-deep-audit/FIX-DOCS.md`.

**What this is now:** the notes behind the iOS privacy manifest. `app.json` › `ios.privacyManifests` already holds the same entries as `docs/launch/privacy-manifest.json` (Name, Email Address, User ID, Other User Content, Product Interaction, Purchase History). The App Store Connect › App Privacy answers live in one place only: `app-store-privacy-and-review.md` §1.

> **OWNER TO DO BEFORE SUBMITTING:** read RevenueCat's App Privacy guide for `react-native-purchases` 10.11 and check whether it lists a device identifier or diagnostics. If it does, add them to the manifest and the App Privacy answers together (`app-store-privacy-and-review.md` §1, DECIDE 1 and 2). Check the generated `PrivacyInfo.xcprivacy` after the next `expo prebuild` (K-35).

## 1. What leaves the phone, and when

Two things leave the phone:

- **RevenueCat, at every launch on an iPhone.** `startPurchases()` runs during start-up (`src/features/app/useAppReady.ts:30`) and configures RevenueCat (`src/store/proSync.ts:58-78`, `src/lib/purchases.ts:81-93`). That creates a RevenueCat customer: a random anonymous ID, or the Supabase user ID while signed in (`Purchases.logIn` / `logOut`). It happens whether or not Pro is on sale. No name, email or other attribute is sent to RevenueCat.
- **Supabase, only when the cook uses a backend feature.** The client is created on first use (`src/lib/supabase.ts:11`). The household sync runs only inside a household (`src/store/household.ts:96`), and the account only when signed in (`src/store/accountActions.ts:50`). A store build doesn't read the public feed: Home's "From other cooks", `/feed`, cook pages and the Home viewer are all behind `COMMUNITY_SHOWN` / `INTERNAL_BUILD` (`src/lib/build.ts:19`, `FeedScreen.tsx:196`). So someone who never starts a household and never signs in sends Supabase nothing.

| What | When it's sent | Where it goes | Code |
| --- | --- | --- | --- |
| **RevenueCat customer ID and purchase history** | Every launch on an iPhone; purchases when bought or restored | RevenueCat (US company) | `src/store/proSync.ts`, `src/lib/purchases.ts` |
| **User ID** (Supabase's random id, anonymous until sign-in) | First time a household is started or joined, or on sign-in | Supabase Auth, Sydney | `src/lib/household.ts` `signedInUser`, `src/lib/account.ts` |
| **Email address** | Signing in with Apple (Apple may give its private-relay address). Email codes are built but off (`EMAIL_CODES_CONNECTED = false`, `src/lib/emailCodes.ts:9`) | Supabase Auth | `continueWithApple` |
| **Name** | Apple's name (first Apple sign-in only) is saved to `profiles.display_name`. Household members type the name others see when they start or join | `profiles`, `household_members` | `saveDisplayName`, `createHousehold`, `joinHousehold` |
| **Kitchen and personal data** (plan, list ticks/removals/extras, cupboard, own recipes, Cookmarks, collections, hidden dishes, cooking log, taste settings: diet, leave-outs, cuisines, weeknight time, units) | Signed in, or in a household | `account_rows` (owner only) or `household_rows` (household members) | `src/domain/sync/types.ts` lists every kind |
| **Recently viewed recipes** | Signed in | `account_rows` (`recent`) | `src/domain/sync/personal.ts` |

**Stays on the phone, never sent:**

- **Plates (Share a dish photos).** `src/store/plates.ts` keeps the photo URI, name and notes in AsyncStorage. The plates store isn't a sync kind, and no code uploads it. The post screen says so.
- **Camera and photo library access** (`src/lib/photos.ts`) only feeds plates. Scanning would also use it, but `SCAN_CONNECTED = false` (`src/lib/scan.ts:13`), and a store build hides the scan ways in and the scan route (`SCAN_WAYS_SHOWN`, `src/lib/build.ts:20`).
- **Home's interaction log** (what was shown, opened, hidden) stays in AsyncStorage (`src/store/homeEvents.ts`). The server's `home_events` table exists, but no code uploads to it.
- **Notifications** are local only: Cook Mode timers and the Sunday 4pm reminder (`src/lib/notifications.ts`). No push token is ever requested.
- **Theme, high contrast and the reminder switch** are per phone and don't sync (`SYNCED_PREFS`).

**Leaves the phone, but not to us:**

- **Import from a link** fetches the pasted page straight from the phone (`src/features/editor/ImportLinkScreen.tsx`). The site sees a normal visit. Nothing reaches our server.
- **Sharing** the list, plan or a recipe goes through the iOS share sheet to an app the cook picks.

**Not in the app at all** (checked `package.json` and `node_modules`): no analytics, crash reporting, ads or attribution SDKs (no Sentry, Firebase, Amplitude, PostHog, Mixpanel, Bugsnag), no `expo-updates`, no IDFA, no App Tracking Transparency prompt.

## 2. The manifest, entry by entry

### Tracking

- `NSPrivacyTracking: false` and no tracking domains. Nothing is linked with other companies' data for advertising, and no data broker sees anything.

### Collected data types

Every one is **linked to the user** (it sits against their Supabase user id), **not used for tracking**, and used only for **App Functionality**: syncing a kitchen between a household's phones and keeping an account's things on a new phone.

| Manifest key | Apple's name | What it is here |
| --- | --- | --- |
| `NSPrivacyCollectedDataTypeUserID` | User ID | The Supabase user id. Anonymous until sign-in, but still an id tied to the data, so it counts |
| `NSPrivacyCollectedDataTypeEmailAddress` | Email Address | Email-code or Apple sign-in |
| `NSPrivacyCollectedDataTypeName` | Name | Apple's name, and the display name household members see |
| `NSPrivacyCollectedDataTypeOtherUserContent` | Other User Content | Plan, list edits, cupboard, own recipes, Cookmarks, collections, cooking log, taste settings |
| `NSPrivacyCollectedDataTypeProductInteraction` | Product Interaction | Recently viewed recipes and the cooking log. They're kept to show them back, not for analytics, but Apple's definition ("how the user interacts with the app") fits best. Declaring it is the safe side |
| `NSPrivacyCollectedDataTypePurchaseHistory` | Purchase History | RevenueCat's record of Pro (D-052), made at every iPhone launch. Linked: the customer ID is RevenueCat's app user ID, which is the Supabase user ID while signed in |

The User ID entry also covers RevenueCat's customer ID.

**Deliberately not declared:**

- **Photos or Videos:** plates stay on the phone. *Add this the day plates sync or social posting ships (P9).*
- **Health:** "Ingredients to avoid" and the diet (everything, vegetarian, pescatarian, vegan) are food preferences, not medical records, and the app never asks why. If an "allergies" field is ever added, revisit this.
- **Device ID:** the app's sync tag is a random ID it makes. Whether the RevenueCat SDK sends a device identifier of its own is the open check in the to-do above.
- **Crash Data / Performance Data:** no Sentry yet. *Add when K-8 lands*, not linked if no user id is attached.
- **Coarse Location / IP address:** Supabase and RevenueCat see the connecting IP, as any server does, and keep it briefly in their own logs. The app doesn't read, store or use it, so it isn't declared. The privacy policy mentions both (3E, 3F).

### Required reason APIs

Apple asks every app to say why its native code calls certain APIs. The libraries below each ship their own `PrivacyInfo.xcprivacy`, but Expo's docs warn that Apple doesn't reliably read the manifests of static CocoaPods (which is how Expo builds every library). So Expo's advice is to copy each library's reasons into the app's own manifest. That's what this does: it's a deliberate repeat, not a duplicate by mistake.

| API | Reason | Plain English | Declared by |
| --- | --- | --- | --- |
| UserDefaults | `CA92.1` | Reads and writes settings only this app uses | React Native core, expo-constants, expo-notifications, expo-system-ui |
| File timestamp | `C617.1` | Checks dates on files inside the app's own folder (caches, storage) | React Native core, AsyncStorage, expo-application, Folly, boost, glog |
| File timestamp | `0A2A.1` | A library wrapping the API for the app (expo-file-system) | expo-file-system |
| File timestamp | `3B52.1` | Dates of files the user picked themselves (a chosen photo) | expo-file-system |
| System boot time | `35F9.1` | Measures time between events in the app (React Native's timers and performance marks) | React Native timing, boost |
| Disk space | `E174.1` | Checks there's room before writing a file | expo-file-system |
| Disk space | `85F4.1` | Shows disk space to the user | expo-file-system |

`3B52.1` and `85F4.1` describe things expo-file-system can do rather than things The Pantry does with it. They're kept because the library's own manifest declares them and Apple's check works per binary. If you'd rather list only what the app itself does, drop those two; Apple will email within minutes of a TestFlight upload if anything is missing.

Libraries checked with no manifest of their own and no required-reason calls in their code: expo-image-picker, expo-apple-authentication, expo-haptics, expo-keep-awake, expo-font, expo-asset, expo-linking, expo-linear-gradient, expo-symbols, gesture-handler, reanimated, screens, safe-area-context. expo-image pulls in SDWebImage (and its AVIF, SVG and WebP coders) from CocoaPods rather than `node_modules`, so its manifest couldn't be read here. SDWebImage ships its own manifest; its disk cache uses file dates inside the app's folder, which `C617.1` already covers. expo-dev-client uses UserDefaults, but it's left out of store builds, and `CA92.1` covers it anyway. The TestFlight upload is the real check: Apple emails within minutes if a reason is missing.

## 3. App Store Connect › App Privacy answers

Moved on 20 November 2026 to `app-store-privacy-and-review.md` §1, so there's one set of answers. The table that was here said Purchases "No" while the manifest already declared Purchase History; the answers there now match the manifest.

## 4. Re-answer when

| Change | Manifest | App Privacy |
| --- | --- | --- |
| Community screens on in store builds | No change, unless follows or Home events start uploading (then Other User Content and Product Interaction already cover them) | Recheck `app-store-privacy-and-review.md` §1 "Re-answer when" |
| Sentry (K-8) | Add `CrashData` and `PerformanceData` (not linked if no user id; Analytics or App Functionality) and Sentry's required reasons | Diagnostics |
| Plates sync, or social posting (P9) | Add `PhotosorVideos` (linked, App Functionality) | User Content › Photos or Videos; Emails or Text Messages if messages are stored |
| Scanning connected | Add `PhotosorVideos` if the scan photo is kept; name the AI provider in the policy | Same |
| `expo-updates` | Nothing collected; add its required reasons if Apple emails | No change |
| Push notifications (P9) | Add `DeviceID` if the push token is stored against the user | Identifiers › Device ID |

## 5. Still open

- `LEGAL_URLS` in `src/lib/legal.ts` is empty until the pages are hosted. Until then Settings › About, the paywall and the welcome show no legal links, and Pro can't be sold (`canSellPro`).
