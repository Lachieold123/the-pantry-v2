> **Draft for Lachlan (and a lawyer, for the privacy parts) to review.** Drafted by an AI (Claude) on 12 October 2026 from the code on `preview-2026-10-08` (K-23: SEC-02, REL-02, REL-24). These are the answers for App Store Connect. They replace the "Data Not Collected" appendix of the 5 October privacy policy and the old App Review notes, which said the app had no accounts and no server. Points needing your decision are marked **DECIDE:**. Nothing here has been entered in App Store Connect.

# App Store Connect: App Privacy, age rating and App Review notes

## 1. App Privacy ("nutrition label")

App Store Connect › your app › **App Privacy** › Get Started (or Edit).

Apple counts data as "collected" when it leaves the phone and you (or a partner) can get at it for longer than it takes to handle the request. Households and accounts send data to our Supabase project, so the answer is now **Yes, we collect data**.

### Step 1: Do you or your third-party partners collect data from this app?

**Yes.**

### Step 2: Data types to tick

| Apple category › type | Tick? | What it is in The Pantry | Code |
| --- | --- | --- | --- |
| **Contact Info › Name** | **Yes** | The name Apple gives at Sign in with Apple (`profiles.display_name`), and the name you give a household (`household_members.display_name`) | `src/lib/account.ts`, `supabase/migrations/20261006000000_households.sql` |
| **Contact Info › Email Address** | **Yes** | The email for codes, or the one (or relay address) Apple gives | Supabase Auth (`auth.users`) |
| Contact Info › Phone, Physical Address, Other | No | Not asked for | |
| Health & Fitness | No (see DECIDE) | The avoid list is a cooking preference, not health or medical data | `src/domain/sync/personal.ts` |
| Financial Info, Purchases | No | Pro isn't on sale (`PURCHASES_CONNECTED = false`); RevenueCat isn't installed | `src/lib/purchases.ts` |
| Location | No | Not used | |
| Sensitive Info | No (see DECIDE) | | |
| Contacts | No | Invites go out through the share sheet; the app never reads contacts | `src/lib/share.ts` |
| **User Content › Other User Content** | **Yes** | Plan, list ticks, extras and removals, cupboard, Cookmarks, collections, hidden dishes, own recipes, cooking log, taste settings, household name | `account_rows`, `household_rows`, `households` |
| User Content › Photos or Videos | No | Plates stay on the phone; nothing uploads photos | `src/features/plates/PostScreen.tsx` |
| User Content › Emails or Text Messages, Audio, Gameplay, Customer Support | No | | |
| Browsing History | No | An imported recipe's source address is stored as part of that recipe (user content), not as a record of browsing | |
| Search History | No | Searches stay on the phone | |
| **Identifiers › User ID** | **Yes** | The Supabase user ID, permanent or anonymous | Supabase Auth |
| Identifiers › Device ID | **DECIDE** (recommend Yes) | A random ID made for each install, stored with account rows (`account_rows.updated_by`) | `docs/ACCOUNTS.md` "What building it settled" |
| Usage Data › Product Interaction | **DECIDE** (recommend Yes) | The 20 most recently viewed recipes and the cooking log sync with an account | `src/domain/sync/personal.ts` |
| Usage Data › Advertising Data, Other | No | | |
| Diagnostics | No | No Sentry or crash SDK (K-8). Apple's own opt-in crash reports don't count | `package.json` |
| Other Data | No | | |

### Step 3: For each ticked type

Answer every ticked type the same way:

| Question | Answer |
| --- | --- |
| How is this data used? | **App Functionality** only. (Not Analytics, Product Personalisation, Advertising, Developer's Advertising or Other.) |
| Is it linked to the user's identity? | **Yes**, it's stored against a user ID. |
| Is it used for tracking? | **No.** |

> Note for Lachlan: "Product Personalisation" means personalising using data about the person, such as suggestions. The avoid list and diet do steer suggestions, but that happens on the phone from the phone's own copy, not from what we collect, so App Functionality is accurate. If the lawyer prefers caution, adding Product Personalisation to Other User Content is harmless.

### What the App Store will then show

- **Data Used to Track You:** none.
- **Data Linked to You:** Contact Info, User Content, Identifiers (and Usage Data if you tick Product Interaction).
- **Data Not Linked to You:** none.

### DECIDE: points for this section

1. **Device ID.** The per-install random ID isn't a hardware or advertising ID, but Apple's definition ("device-level ID") arguably covers it. **Recommend: tick it.** Over-declaring costs one line on the label; under-declaring risks a rejection.
2. **Product Interaction.** Recently viewed recipes and the cooking log are records of how you use the app. **Recommend: tick it.** The alternative is counting them only as Other User Content.
3. **Health and Sensitive Info.** The avoid list (nuts, gluten, shellfish, pork, alcohol, ...) and diet (vegetarian, vegan, pescatarian) sync with an account. Apple's Health category means health or medical data; Sensitive Info includes religious beliefs. **Recommend: No to both**, because they're cooking preferences. Ask the lawyer, together with the privacy policy's sensitive-information point (privacy policy, 3C). If you stop syncing `diet` and `avoid`, this question goes away.
4. **Email provider.** When custom SMTP is set up (K-24), the provider is a service provider, not a "third-party partner" that uses the data for itself, so it doesn't add a data type. Nothing to change here; name it in the privacy policy.

### Keep in step with the privacy manifest

`app.json` › `ios.privacyManifests` already declares Email Address, Name, User ID and Other User Content (linked, not tracking, App Functionality). If you tick **Device ID** or **Product Interaction**, add matching entries there too (`NSPrivacyCollectedDataTypeDeviceID`, `NSPrivacyCollectedDataTypeProductInteraction`) so the label and the manifest agree. That's a one-line config change each, for a later commit (this branch is docs only). K-35 still applies: check the generated `PrivacyInfo.xcprivacy` after the next `expo prebuild`.

### Re-answer when

- **Pro goes on sale** (RevenueCat): Purchases › Purchase History; RevenueCat also receives the User ID.
- **Scanning goes live:** User Content › Photos or Videos (the scan photo), and name the AI provider.
- **Sentry is added (K-8):** Diagnostics › Crash Data and Performance Data (not linked, if no user ID is attached).
- **Social (P9):** User Content › Photos or Videos, Other User Content, and messages if they're stored.

## 2. Age rating: shared content (REL-24)

App Store Connect › App Information › **Age Rating** › Edit. Apple's questionnaire changed in 2025; the exact wording in App Store Connect is what counts, so read each question as you answer it.

Everything except shared content is as in `app-store-listing.md` (expected result **4+**). The changed question is:

**User-generated content (content created by users and shared with others):**

What the app does today: in a household, members see each other's display names (free text, up to 40 characters), the household name, the shared plan, list and cupboard, and the recipes a member wrote that the shared plan uses. A household is private, invite-only and capped at 8 people. There's no public profile, feed, comments, chat, or way to message or find strangers. Plates (dish photos) stay on the phone.

| Option | Answer | Effect | For | Against |
| --- | --- | --- | --- | --- |
| **A (recommended)** | **No**, with the explanation below in the App Review notes | Rating stays 4+ | Nothing is shown to anyone you didn't invite; comparable shared-list apps (shared shopping lists, family planners) are rated 4+ | If App Review reads "shared with others" literally, they may ask you to change it. That's a metadata fix, not a rejection of the build |
| B | **Yes** | App Store Connect shows the resulting rating before you save; it may rise above 4+. Apple then expects guideline 1.2 tools (report, block, filtering) | Most literal reading | Over-states the risk; 1.2's tools make little sense for a family of 4 sharing a list |

**Messaging or chat:** **No.** The invite goes through the iOS share sheet, which is the user's own messaging app.

**Unrestricted web access:** **No.** "Import from a link" reads a recipe from one page; it doesn't show web pages.

> DECIDE: Option A or B. If A, keep the household paragraph in the App Review notes below so the reviewer sees why. Switch to Yes the moment social (posts, comments, messages) ships.

## 3. App Review notes

App Store Connect › App Review Information. **Sign-in required: No** (everything works without an account; accounts and households are optional).

Notes (paste between the lines):

```
The Pantry is a cooking app: it shows what you can cook with what's in your cupboard, plans the week, builds a shopping list from the plan, and walks you through cooking.

ACCOUNTS ARE OPTIONAL
- Everything works without signing in. Data stays on the device unless the user signs in or joins a household.
- To sign in: Settings > Account > "Continue with Apple" (works with any Apple ID, including yours) or "Continue with email" (a 6-digit code is emailed). There are no passwords.
- Signed-in data (plan, list, cupboard, saved recipes, own recipes, settings) is stored on our Supabase backend in Sydney, Australia, to back it up and sync it between the user's devices.
- To delete an account: Settings, at the very bottom > "Delete account", type DELETE, confirm. This deletes the account and its data on the server and [revokes the Sign in with Apple token].

HOUSEHOLD (SHARING A KITCHEN)
- Settings > Sharing > Household > "Start sharing", then "Invite someone" makes an invite code and opens the share sheet. A second device joins by tapping the invite link, or with the code (Settings > Sharing > Household > enter the code > Join), and gives a display name. The List tab also links to Household.
- Members share one plan, shopping list and cupboard. A household is private and invite-only (up to 8 people): there are no public profiles, feeds, comments, chat or ways to contact strangers. This is why we answered No to user-generated content in the age rating.
- A household works without an account (an anonymous sign-in is created). Settings > "Delete my household data" removes that from the server.

MAIN FEATURES
- Open the Cupboard tab, add a few things (e.g. eggs, tomato, onion, feta, bread), then go back to Home. "What I have" shows dishes you can cook now; "Nearly there" shows dishes one or two things short.
- Plan: tap Plan, add a dinner to any day. The List tab builds the shopping list from the plan. The share button opens the standard iOS share sheet.
- Cook Mode: open any recipe and tap Cook. Step timers schedule a local notification, which is why notification permission is requested (only when a timer or the Sunday reminder is first used).
- Camera and Photos are used only by "Share a dish" (the centre + button) to attach photos of a dish you cooked. These photos stay on the device; they are never uploaded.
- "Import from a link" (side menu > My recipes > Import from a link) fetches the public web page the user pastes, directly from the device, and reads its schema.org Recipe data.

NOT SWITCHED ON IN THIS VERSION
- Cupboard > Scan receipt / Photo of food shows "Coming soon" and sends nothing.
- [The Pantry Pro screen says "Pro isn't on sale yet"; there are no in-app purchases in this version and nothing is locked.]

Recipe photos are credited (Pexels, Wikimedia Commons) or labelled "AI-generated photo". No ads, no analytics, no tracking.

Contact: [your name], [contact email], [phone number]
```

> DECIDE: **Email sign-in for the reviewer.** The reviewer can't read our inbox, so the email path needs either (a) nothing (Apple sign-in alone is enough to test accounts and deletion; recommended), or (b) a demo mailbox the reviewer can open, with its login in the "Sign-in information" fields. Don't put a real personal email there.

> DECIDE: **Sign in with Apple revocation (K-19).** Keep "[revokes the Sign in with Apple token]" only once the `delete-account` and `apple-token` Edge Functions are deployed and the app calls them. Apple rejects apps whose account deletion doesn't revoke the Apple token. This blocks submission.

> DECIDE: **The Pro "not on sale yet" screen (K-25).** Apple can reject a build that shows a feature that can't be used (guideline 2.1). Options: (a) hide the Pro row and paywall in store builds until RevenueCat is connected (recommended); (b) keep it and keep the bracketed line in the notes. If you choose (a), delete that line.

> DECIDE: **Household on one device.** A reviewer with one device can start a household and see the invite, but not join. Optionally make a demo household on a test phone, generate an invite just before submitting (codes expire), and add: "Demo invite code: XXXXXXXX (valid until [date])."

> DECIDE: **Before submitting**, the server must match these notes: the K-18 migrations applied, anonymous sign-ins, manual linking and the Apple provider switched on, custom SMTP set up (K-24), and the Supabase project on a plan that doesn't pause.
