# Privacy manifest and App Privacy answers

Written 7 October 2026 by Claude from the code, for P11 (launch readiness). It replaces the "Data Not Collected" appendix in `privacy-policy.md`, which was written on 5 October before Household (D-039) and Accounts (D-043) existed. That appendix is now wrong and must not be used.

**What to do with this:** paste `docs/launch/privacy-manifest.json` under `expo.ios.privacyManifests` in `app.json` (replacing the empty one there now), and answer App Store Connect › App Privacy as in §3. Both need your OK first: the manifest is native config, and it ships in the next EAS build.

## 1. What leaves the phone, and when

Nothing leaves the phone until the cook uses a backend feature. The Supabase client is only created on first use (`src/lib/supabase.ts`), so someone who never starts a household and never signs in sends us nothing.

| What | When it's sent | Where it goes | Code |
| --- | --- | --- | --- |
| **User ID** (Supabase's random id, anonymous until sign-in) | First time a household is started or joined, or on sign-in | Supabase Auth, Sydney | `src/lib/household.ts` `signedInUser`, `src/lib/account.ts` |
| **Email address** | Signing in with an email code, or with Apple (Apple may give its private-relay address) | Supabase Auth | `sendEmailCode`, `continueWithApple` |
| **Name** | Apple's name (first Apple sign-in only) is saved to `profiles.display_name`. Household members type the name others see when they start or join | `profiles`, `household_members` | `saveDisplayName`, `createHousehold`, `joinHousehold` |
| **Kitchen and personal data** (plan, list ticks/removals/extras, cupboard, own recipes, Cookmarks, collections, hidden dishes, cooking log, taste settings: diet, leave-outs, cuisines, weeknight time, units) | Signed in, or in a household | `account_rows` (owner only) or `household_rows` (household members) | `src/domain/sync/types.ts` lists every kind |
| **Recently viewed recipes** | Signed in | `account_rows` (`recent`) | `src/domain/sync/personal.ts` |

**Stays on the phone, never sent:**

- **Plates (Share a dish photos).** `src/store/plates.ts` keeps the photo URI, name and notes in AsyncStorage. The plates store isn't a sync kind, and no code uploads it. The post screen says so.
- **Camera and photo library access** (`src/lib/photos.ts`) only feeds plates. Scanning would also use it, but `SCAN_CONNECTED = false` and `readPhoto` sends nothing (`src/lib/scan.ts`).
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
| `NSPrivacyCollectedDataTypeProductInteraction` | Product Interaction | Recently viewed recipes. It's kept to show them back, not for analytics, but Apple's definition ("how the user interacts with the app") fits it best. Declaring it is the safe side |

**Deliberately not declared:**

- **Photos or Videos:** plates stay on the phone. *Add this the day plates sync or social posting ships (P9).*
- **Health:** "Ingredients to avoid" and the diet (everything, vegetarian, pescatarian, vegan) are food preferences, not medical records, and the app never asks why. If an "allergies" field is ever added, revisit this.
- **Purchase History:** RevenueCat is in the app (D-045) and starts on iPhone builds, creating a customer record (an anonymous id, or the account id when signed in) even before anything is bought. *Add before the next App Store submission* (PRO.md, "Still needs Lachlan" step 4): linked to the user when signed in, because the account id is RevenueCat's app user id.
- **Crash Data / Performance Data:** no Sentry yet. *Add when K-8 lands*, not linked if no user id is attached.
- **Coarse Location / IP address:** Supabase sees the connecting IP, as any server does, and keeps it briefly in its own logs. The app doesn't read, store or use it, so it isn't declared. Mention Supabase's logs in the privacy policy.

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

**Do you or your third-party partners collect data from this app?** **Yes.**

Apple's "collect" means sent off the phone and kept longer than needed to handle the request in real time. A household's and an account's rows are kept, so it's yes.

For each type below, App Store Connect asks the same three questions. The answers are the same for all five:

- **Purposes:** App Functionality only. (Not Analytics, not Product Personalisation, not Advertising, not Developer's Advertising or Marketing, not Other.)
- **Is it linked to the user's identity?** Yes.
- **Is it used for tracking?** No.

| Category › type | Tick it? | Why |
| --- | --- | --- |
| Contact Info › **Name** | Yes | Apple sign-in name; household display name |
| Contact Info › **Email Address** | Yes | Sign-in |
| Contact Info › Phone, Physical Address, Other | No | |
| Health & Fitness | No | See "Health" above |
| Financial Info | No | Until Pro: then Purchases › Purchase History |
| Location | No | |
| Sensitive Info | No | |
| Contacts | No | |
| User Content › Emails or Text Messages | No | No messaging yet (P9) |
| User Content › Photos or Videos | **No** | Plates stay on the phone. Yes once they sync or post |
| User Content › Audio, Gameplay, Customer Support | No | |
| User Content › **Other User Content** | Yes | Plan, list, cupboard, recipes, collections, cooking log, taste settings |
| Browsing History | No | Recipe history inside the app isn't web browsing |
| Search History | No | Searches aren't synced |
| Identifiers › **User ID** | Yes | Supabase user id |
| Identifiers › Device ID | No | The sync "device" tag is a random id the app makes (`useAccount.device`), not a hardware or advertising id. It's stored with rows as `updated_by`. If you want to be extra careful, tick Device ID too (App Functionality, linked, not tracking) |
| Purchases | No | Until Pro |
| Usage Data › **Product Interaction** | Yes | Recently viewed |
| Usage Data › Advertising Data, Other Usage Data | No | |
| Diagnostics | No | Until Sentry |
| Other Data | No | |

The App Store will show **"Data Linked to You": Contact Info, User Content, Identifiers, Usage Data**, and nothing under "Data Used to Track You".

## 4. Re-answer when

| Change | Manifest | App Privacy |
| --- | --- | --- |
| Pro goes on sale (RevenueCat) | Add `NSPrivacyCollectedDataTypePurchaseHistory` (linked, App Functionality) and RevenueCat's own required reasons from its pod | Purchases › Purchase History |
| Sentry (K-8) | Add `CrashData` and `PerformanceData` (not linked if no user id; Analytics or App Functionality) and Sentry's required reasons | Diagnostics |
| Plates sync, or social posting (P9) | Add `PhotosorVideos` (linked, App Functionality) | User Content › Photos or Videos; Emails or Text Messages if messages are stored |
| Scanning connected | Add `PhotosorVideos` if the scan photo is kept; name the AI provider in the policy | Same |
| `expo-updates` | Nothing collected; add its required reasons if Apple emails | No change |
| Push notifications (P9) | Add `DeviceID` if the push token is stored against the user | Identifiers › Device ID |

## 5. Also out of date

- `privacy-policy.md` still says "no accounts and no server". Sections 5A (accounts) and the Household row in `README.md` need folding in, with Supabase in Sydney named for APP 8 and in-app account deletion (Settings › Account › Delete account) described in §7.
- `README.md` blocker 3 (Privacy and Terms rows in Settings) still applies: `LEGAL_URLS` in `src/lib/legal.ts` is empty until the pages are hosted.
