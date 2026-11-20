# Launch docs fix (20 November 2026)

Branch `audit/deep-1120`. Scope: `docs/launch/**` only. Source code was read, not changed. Findings: S2-6, S2-7 (the docs half), S2-10, S2-16, REPO-9, REL2-9, REL2-4, REL2-13.

Every claim was checked for a **store build**: `INTERNAL_BUILD` false (`src/lib/build.ts:8`), so `COMMUNITY_SHOWN` and `SCAN_WAYS_SHOWN` are false (`build.ts:19-20`, `SCAN_CONNECTED = false` at `src/lib/scan.ts:13`).

**Result: 34 claims checked. 17 were false (13) or made false by today's code fixes (4), and are rewritten. 9 are true only once an owner step is done; each now says so and sits in an OWNER TO DO list at the top of its file. 8 were true and kept.**

## Claim table

Verdicts: **true** (kept), **false** (rewritten), **changed** (was true, made false by today's fixes, rewritten), **pending** (true once an owner step is done; flagged).

| # | Claim (file) | Proof | Verdict | What changed |
| --- | --- | --- | --- | --- |
| 1 | Purchases "No… RevenueCat isn't installed, `PURCHASES_CONNECTED = false`" (privacy-and-review §1; PRIVACY.md §3) | `startPurchases()` at every launch, `src/features/app/useAppReady.ts:30`; `configurePurchases`, `src/lib/purchases.ts:81-93`; `PURCHASES_CONNECTED` gone (D-052) | false | Purchase History ticked; User ID covers RevenueCat's customer ID; PRIVACY.md §3 replaced by a pointer so there's one answer set |
| 2 | "On your phone only: Nothing" held, and the phone talks to servers "only in a household or signed in" (privacy-policy §2, §3D) | Supabase: client lazy (`src/lib/supabase.ts:11`); household sync only with a household (`src/store/household.ts:96`); account only when signed in (`src/store/accountActions.ts:50`); feed reads gated (`FeedScreen.tsx:196`, `app/feed/index.tsx:7`, `app/feed/[id].tsx:10`, `app/cooks/[id].tsx:10`, `app/dev/home-viewer.tsx:8`). RevenueCat: every launch | changed | True again for Supabase since today's screens fix, false for RevenueCat. Policy now has a RevenueCat column in §2 and a new §3E |
| 3 | "Nothing leaves the phone until the cook uses a backend feature" (PRIVACY.md §1) | as 2 | false | Rewritten: RevenueCat at every launch; Supabase only on use |
| 4 | Pro "isn't on sale yet. No purchase information is collected" (privacy-policy §10, terms §3) | Sale opens once `canSellPro()` (`src/lib/legal.ts:24`) and Apple returns products (`src/store/pro.ts:95`, `PaywallScreen.tsx:70`). Filling the legal links, which publishing these docs requires, opens it | false | Written for Pro on sale: policy §3E, §5; terms §10 filled in from the code |
| 5 | Listing Pro block "with a 7-day free trial on yearly" | Trial wording only when the product has a free intro offer and Apple says eligible (`src/domain/pro/purchase.ts:76-89`, F-4); RevenueCat shows no trial (REL2-7) | false | Removed; conditional sentence offered if an intro offer is added |
| 6 | Pro limits: 3 collections, 10 own recipes, 5 imports a month; Pro plans next week (listing, terms §10, review notes) | `src/domain/pro/pro.ts:15-19`, `:81-117` | true | Used in terms §10 and the review notes |
| 7 | "No public profiles, feeds, comments" (privacy-and-review §2, §3) | Store builds hide feed, cook and published-recipe routes and Home's rail (claim 2 lines); DrawerScreen row gated (`DrawerScreen.tsx:87`) | changed | Was false (S2-6); true since today's screens fix. Text now names the hidden screens and what changes if they're turned on |
| 8 | Age rating basis "no public posts, no strangers" (listing, line 173 of old file) | as 7 | changed | Same; added the "if community screens are turned on" paragraph |
| 9 | Recipes "reviewed and edited by us before they're published" (terms §5) | 271 shipped recipes are `reviewed` (`src/domain/recipes/provenance.ts:7`); the October review was done by AI agents to a written brief (`docs/reports/recipe-review-brief.md`, `recipe-review-2026-10.md`); feed's 719 are only `auto-checked` (S2-7, hidden in store builds) | false | Limited to the bundled recipes, says the review used AI tools, says none is cook-tested; DECIDE (lawyer) added |
| 10 | Sign in "with Apple or with a 6-digit code sent to your email" (privacy-policy short version, 2, 3C; terms §4; review notes) | `EMAIL_CODES_CONNECTED = false`, `src/lib/emailCodes.ts:9`; `useSignInWays` returns it, `src/store/signInWays.ts:40` | false | Apple only; email wording kept in notes for when it's switched on; email provider row removed from §5 |
| 11 | Review notes path "Settings > Account > Continue with Apple" | Settings opens from the side menu as "Settings & preferences" (`DrawerScreen.tsx:114`); Account row is "Back up your kitchen" (`AccountSection.tsx:42`) | false | Paths rewritten |
| 12 | Review notes "The List tab also links to Household" / "List tab builds the list" | Tab label `List` (`TabBar.tsx:31`); link `ShoppingScreen.tsx:110` | true | Kept |
| 13 | Review notes "Scan receipt / Photo of food shows Coming soon" | Hidden: `WaysIn.tsx:29`, `app/cupboard/scan.tsx:10` | changed | Removed; policy §10 says scanning isn't shown |
| 14 | Review notes "Share a dish (the centre + button)" | Centre button opens `/post`, label "Add a plate you cooked" (`TabBar.tsx:101-104`); side menu "Add a plate" (`DrawerScreen.tsx:108`) | false | Renamed "Add a plate" |
| 15 | Review notes Home "What I have" and "Nearly there" | `FeedScreen.tsx:66`, `:183` | true | Kept, reworded |
| 16 | Account deletion deletes the account and revokes Apple's token (policy §8, review notes) | `deleteAccount` tries the `delete-account` function, falls back to the RPC on 404 (`src/lib/account.ts:214-222`); function not deployed (S2-4); live RPC is the old one (S2-5) | pending | Kept as the launch-day sentence; OWNER TO DO 1 and 2; DECIDE explains today's gap |
| 17 | "We keep a token from Apple" (policy 3C) | Client sends Apple's code to `apple-token` at sign-in (`src/lib/account.ts:159-162`); server table in `20261120001100_apple_tokens.sql`; not deployed | pending | Sentence written in, DECIDE says keep only after deploy |
| 18 | Deletion leaves nothing at RevenueCat (implied by policy §8 "deletes everything backed up") | No RevenueCat delete call in `src` or `supabase/functions/delete-account` (S2-5) | false | Policy §8 now says RevenueCat's record stays and can be deleted on request; DECIDE offers the function step |
| 19 | Deleting removes your recipes from the household and your user ID from entries (policy §8) | Only in `20261120000300_account_cleanup.sql`, not applied live (S2-5) | pending | Kept, flagged to-do 1 |
| 20 | Invite codes: one person, 48 hours; members can cancel; any member can remove another (policy §6, terms §4, §7) | `20261120000200_invites.sql:7,21`; `remove_member` / `revoke_invites` missing live (S2-11) | pending | Kept, flagged to-do; terms DECIDE updated to the new file names |
| 21 | 30-day clean-up of unused anonymous users (policy §6) | Function in `20261120000300_account_cleanup.sql:48-58`, not scheduled (K-24) | pending | Kept, flagged |
| 22 | "Database is locked down so each person can read only their own data" (policy §7) | Household lockdown not live (S2-1) | pending | DECIDE added: true only after the migrations |
| 23 | Taste settings synced: diet, avoid, cuisines, weeknight, units, shelf (policy 3C) | `SYNCED_PREFS` also has `moveTicked`, `skill`, `intents` (`src/domain/sync/personal.ts:24`; labels `src/domain/welcome/onboarding.ts:12-25`) | false | Added cooking confidence, "what you came for", list settings |
| 24 | Home's interaction log is kept on the phone (new line, policy 3A; PRIVACY.md) | `src/store/homeEvents.ts:1-4`; no code writes `home_events` | true | Added so the policy is complete |
| 25 | Plates and photos stay on the phone; camera/photos only for plates (policy §4, App Privacy) | No upload call in `src` (`grep upload|storage.from`); `src/lib/photos.ts` | true | Kept |
| 26 | Notifications are local only (policy §4) | `src/lib/notifications.ts:1-2`; no push-token call | true | Kept |
| 27 | Link import: the phone fetches the page directly (policy §5, review notes) | `src/lib/fetchPage.ts:45` | true | Kept |
| 28 | Household: up to 8, anonymous user, name visible to members, invites via share sheet (policy 3B, review notes) | `src/features/household/words.ts:25` (link + code); join flow `JoinScreen.tsx`; cap per L4 S2-1 | true | Kept; review notes now say joining needs a second device |
| 29 | "16+ to create an account or household" (policy §9, terms §4) | Nothing asks age (`grep` for age or birth in `src` finds only recipe text) | pending | Added "The app doesn't ask your age"; DECIDE (lawyer) kept and widened (S2-16) |
| 30 | App Privacy "Data Linked to You": no Purchases (both App Privacy copies) | as 1; manifest already declares Purchase History (`app.json`, `docs/launch/privacy-manifest.json`) | false | Adds Purchases; answers now match the manifest one for one |
| 31 | PRIVACY.md "Purchase History deliberately not declared" | manifest has `NSPrivacyCollectedDataTypePurchaseHistory` | false | Moved to the declared table |
| 32 | Listing "273 reviewed" recipes; README "273 of 285" | 271 `reviewed`, 4,664 `ai-draft`, 561 `ai-assisted` in `src/data/catalogue/recipes.json`; only `reviewed`/`vetted` ship (`provenance.ts:7`) | false | 271, with a recount command; "270+" in the description is true |
| 33 | Listing "Sign in with Apple only if you want your kitchen backed up" | `signInWays.ts:40`, `account.ts:151` | pending | Kept, to-do 2 (provider + functions) |
| 34 | Listing "Invite… with a link or code", "updated live" | `words.ts:25`; `src/lib/liveRows.ts`; preview, remove, cancel need migrations (S2-11) | pending | Kept under the existing "use once Household is live" rule; to-do 1 |

Counts: false 13 (1, 3, 4, 5, 9, 10, 11, 14, 18, 23, 30, 31, 32), changed 4 (2, 7, 8, 13), pending 9 (16, 17, 19, 20, 21, 22, 29, 33, 34), true 8 (6, 12, 15, 24 to 28).

## Files changed

- `docs/launch/privacy-policy.md`: OWNER TO DO list; RevenueCat in the short version, §2, new §3E and §5; Apple-only sign-in; store-build note on other cooks (§3D); deletion's RevenueCat gap (§8); age line; §10 rewritten.
- `docs/launch/terms-of-use.md`: OWNER TO DO list; Pro section 10 filled; recipes sentence limited; Apple-only; migration file names.
- `docs/launch/app-store-privacy-and-review.md`: OWNER TO DO list; App Privacy answers matching the manifest (Purchases, RevenueCat ID); age rating from the store build plus what changes if community screens go on; review notes rewritten (paths, Apple only, Household needs two devices, Pro block, no scan line).
- `docs/launch/PRIVACY.md`: what leaves the phone (RevenueCat, Supabase), manifest table, App Privacy answers moved to one place.
- `docs/launch/APP-STORE-LISTING.md`: the one listing file (REPO-9); counts, trial, left-out list, age rating, screenshot rules.
- `docs/launch/app-store-listing.md`: removed from git (`git rm --cached`); its useful parts merged.
- `docs/launch/RELEASE-NOTES.md`: new; build 25 and Household (S2-10).
- `docs/launch/README.md`: file table, blockers, "when a feature goes live" rows.

## Owner's to-do list, in order

1. **Host three pages and fill the links (REL2-4).** Shortest path: a public GitHub repo with GitHub Pages on, three Markdown files (`privacy.md`, `terms.md`, `support.md`) made from `privacy-policy.md` and `terms-of-use.md` once the lawyer has seen them, and a support page with one email address and three FAQ lines. Then paste the two URLs (plus the support URL) into `src/lib/legal.ts`:
   `LEGAL_URLS = { privacy: 'https://<you>.github.io/<repo>/privacy', terms: 'https://<you>.github.io/<repo>/terms', support: 'https://<you>.github.io/<repo>/support' }`.
   The same privacy and support URLs go into App Store Connect. Filling privacy and terms is what puts Pro on sale.
2. **Support email.** A dedicated address (for example a free Proton or iCloud+ custom address, or `hello@` a domain later). It fills [contact email] in all three documents, the support page and the review notes. The app itself has no contact line until `support` is in `LEGAL_URLS` (Settings › About shows "Help and contact" then).
3. **Lawyer review** of the policy and terms, with the DECIDE (lawyer) points: Privacy Act coverage, sensitive information (diet and avoid list), APP 8 for Supabase and RevenueCat, the recipe-review sentence, ACL liability, Pro terms, minimum age.
4. **Apply the live migrations** (`supabase/APPLY-LIVE.md`, all steps), then schedule the anonymous clean-up (pg_cron).
5. **Apple key and function deploy** (S2-4): the .p8 key, four secrets, `supabase functions deploy apple-token delete-account`.
6. **Decide the RevenueCat record on deletion:** keep the policy line (it stays, deleted on request) or add a delete-customer step to the function.
7. **Settle the minimum age** and whether the app must ask (S2-16).
8. **RevenueCat's App Privacy guide** for SDK 10.11: tick Device ID or Diagnostics if it lists them, and match the manifest.
9. **App Store Connect:** products filled in, check for an introductory offer, reserve the name, then answer App Privacy and the age rating from `app-store-privacy-and-review.md`.
10. **Supabase plan** that doesn't pause; note log retention and backup period for the policy.
11. **New build** after the migrations; Household tested only on it (RELEASE-NOTES.md).
12. **AI cooks decision** (S2-7) only if the community screens are to be turned on.

## Found in the code while proving claims (not fixed; for the code fixers)

1. `src/domain/recipes/labels.ts:144` and `:151`: the in-app wording "drafted with AI help, then checked and edited by us before they're published" overstates the review the same way the terms did (the review was done by AI agents to a brief). It should match whatever sentence the owner keeps in terms §5.
2. `src/features/app/useAppReady.ts:30` / `src/store/proSync.ts:58`: RevenueCat starts and creates a customer record at every iPhone launch even while Pro can't be sold (`canSellPro()` false). Collecting an identifier for a feature that isn't on offer is a data-minimisation point the lawyer may raise. Starting it only once `canSellPro()` is true (and on Restore) would make "nothing leaves the phone" true for the default user.
3. `src/lib/account.ts:218`: once `delete-account` is deployed, any non-404 error from it (for example the Apple secrets missing, a 500) makes deletion fail outright, with no RPC fallback. Deploying the function before its secrets are set would break account deletion for everyone. Deploy order matters, or fall back on 5xx too.
4. `src/lib/account.ts:159-162`: until `apple-token` is deployed, every Apple sign-in makes a call that returns 404, silently. Harmless, but the token store stays empty, so accounts made before the deploy can never be revoked on deletion. Worth a one-off prompt to sign in again after the deploy, or a note in K-19.
5. Terms §10 "If Pro ends, nothing you made is taken away": the code limits adding past the free limits, but I didn't prove what the screens do with existing items over the limit after a lapse. Needs one check before the sentence ships.

## Not checked

- RevenueCat's own SDK data collection (device identifiers, diagnostics): needs its docs, flagged as an owner check.
- The household 8-person cap and 40-character name limit were taken from lane 4 and the migrations, not re-read.
- Whether Shakshuka, Omelette and Carbonara are among the 271 store recipes (the listing says to check).
- Nothing was entered in App Store Connect; no screenshots (docs only).
