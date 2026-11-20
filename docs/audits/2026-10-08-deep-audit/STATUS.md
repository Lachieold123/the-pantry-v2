# 8 October 2026 deep audit: where each finding stands

The reports are in `~/Desktop/HQ/11-ThePantryV2/audits/2026-10-08/`. Fixed on branch `phase9-polish-audit-fixes` (not pushed). "Partly" and "Not done" items are in `docs/KNOWN-ISSUES.md` (K-18 to K-39) and, with suggested fixes, in the HQ folder's `FIX-LATER.md`.

**Migrations are written and tested on PGlite, not applied (K-18).** Anything marked "migration" works only once Lachlan applies them.

## Functionality (FUNCTIONALITY.md)

| ID | Finding | Status | Commit |
|---|---|---|---|
| BUG-01 | Ticks lapse when the amount changes, units switch, or across household units | Fixed | 9117528 |
| BUG-02 | Double-press logs or plans twice | Fixed | 98f52cb |
| BUG-03 | One over-long key stops all syncing | Fixed (keys hashed, rows checked, refused rows set aside) | 9117528, 70ab9db |
| BUG-04 | Changes during sync start-up lost | Fixed (device check K-39) | 70ab9db |
| BUG-05 | Offline with an expired session signs you out | Fixed (device check K-39) | 70ab9db |
| BUG-06 | "Nothing to buy" dishes add items when planned | Fixed (D-046) | 9117528 |
| BUG-07 | Browse results and search ignore diet and avoid | Fixed | 0b4de8a |
| BUG-08 | Sunday "Add to list" lands on an unseen week | Fixed | 9117528 |
| BUG-09 | Added then planned recipe doubles amounts | Fixed | 9117528 |
| BUG-10 | Half-failed start or join leaves the phone stuck | Fixed | 70ab9db |
| BUG-11 | Two equal times share one timer chip | Fixed | a89cf54 |
| BUG-12 | "Today" goes stale after midnight | Fixed | 9117528, 255fca0 |
| BUG-13 | Meal filter and Add to plan ideas only see dinners | Fixed | 0b4de8a |
| BUG-14 | Search ignores aliases and AU/US spellings | Fixed | 0941c27 |
| BUG-15 | "1,000 g" becomes 1 g | Fixed (an ambiguous comma isn't flagged) | a89cf54 |
| BUG-16 | Flaky network swaps the session for a new anonymous user | Fixed | 70ab9db |
| BUG-17 | Newest-wins trusts each phone's clock | Fixed (client stamps after what it saw; server clamp: migration) | 70ab9db, 5044739 |
| BUG-18 | Undo restores a whole snapshot | Fixed | bed13b0 |
| BUG-19 | Zest and juice buy two fruit | Fixed | 9117528 |
| BUG-20 | "1 x 400g tin" parses badly | Fixed | a89cf54 |
| BUG-21 | Some time formats give the wrong timer | Fixed | a89cf54 |
| BUG-22 | A timer's alert can outlive the timer | Fixed | a89cf54 |
| BUG-23 | Starting a timer can reject unhandled | Fixed | a89cf54 |
| BUG-24 | Bad character code hangs Import from a link | Fixed | 723a3f6 |
| BUG-25 | Import jumps to the editor after closing | Fixed | 723a3f6 |
| BUG-26 | Editor says "Add at least one ingredient" for amount problems | Fixed | a89cf54 |
| BUG-27 | Surprise me's first card skips the soft rules | Fixed | a73bf73 |
| BUG-28 | Phones and server break ties differently | Fixed (migration) | 5044739 |
| BUG-29 | Offline adds to one collection overwrite each other | Fixed | e3143fc |
| Also: paging by a non-unique time | | Fixed | 70ab9db |
| Also: sync starts after the 4-second load limit | | Fixed | 70ab9db |
| Also: a failed storage read saves over real data | | Fixed | 70ab9db |
| Also: sign out says "unsaved" mid-send | | Fixed | 70ab9db |
| Also: closing "Used anything up?" logs the cook | | Fixed (D-047) | e8469d9 |
| Also: start-up has no catch | | Fixed | 70ab9db |
| Accessibility: timer chips unreachable with VoiceOver | | Fixed (link role; device check K-39) | a89cf54 |
| Performance: typo search heavy, not debounced | | Fixed (about 8x faster, deferred) | 0941c27 |
| Performance: sync cost grows | | Partly (mirror drops pruned weeks; full pulls remain, K-36) | 0a1f3b4 |

## Security (SECURITY.md)

| ID | Finding | Status | Commit |
|---|---|---|---|
| SEC-01 | Member can move into any household | Fixed (migration) | 5044739 |
| SEC-02 | Privacy documents describe an app with no server | Partly: privacy manifest updated; wording and answers are Lachlan's (K-23) | 41c32a0 |
| SEC-03 | Delete doesn't revoke Sign in with Apple | Partly: Edge Functions scaffolded, not deployed (K-19) | 375c70f |
| SEC-04 | One member can freeze any row with a future stamp | Fixed (migration + client) | 5044739, 70ab9db |
| SEC-05 | One malformed shared row crashes every phone | Fixed (client checks; server checks: migration) | e3143fc, 5044739 |
| SEC-06 | Realtime leaks keys of deleted rows | Partly: member list unpublished (migration); row deletes still broadcast (K-32) | 5044739 |
| SEC-07 | No quotas | Partly: account rows permanent-only and a row ceiling (migration); CAPTCHA, limits, disk alert are dashboard (K-24) | 5044739 |
| SEC-08 | Invite codes guessable, reusable, unrevocable | Fixed (migration + app) | 5044739 |
| SEC-09 | No Apple nonce | Not done: needs expo-crypto (native, K-22) | |
| SEC-10 | Session in plain AsyncStorage | Not done: needs expo-secure-store (native, K-20) | |
| SEC-11 | Email code abuse depends on the dashboard | Not done: dashboard (K-24) | |
| SEC-12 | Sign-out and delete leave personal data | Partly: delete clears dishes and backups; old-app data, photo files and sign-out are Lachlan's (K-21) | 4d2f68b |
| SEC-13 | Deleted user's contributions stay in the household | Fixed (migration) | 5044739 |
| SEC-14 | Anonymous users and ghost members kept forever | Partly: clean-up function (needs pg_cron, K-24); ghost member on switching (K-33) | 5044739 |
| SEC-15 | No way to remove a member or cancel invites | Fixed (migration + app) | 5044739 |
| SEC-16 | Custom-scheme invite links; no household preview | Partly: preview done; universal links need a domain (K-26) | 5044739 |
| SEC-17 | decode-uri-component DoS advisory | Not done: no compatible fixed release (K-28) | |
| SEC-18 | Import downloads any size of page | Fixed | 723a3f6 |
| SEC-19 | Secrets (info) | Clean, nothing to do | |
| SEC-20 | Grants not explicit | Fixed (migration) | 5044739 |
| SEC-21 | 8-person cap race | Fixed (migration) | 5044739 |
| SEC-22 | Can `postgres` delete `auth.users` on the live project? | Not done: live check (K-24) | |
| SEC-23 | Required-reason APIs in the privacy manifest | Not done: check after prebuild (K-35) | |
| SEC-24 | Build-time dependency advisories | Not done: lock-file churn during the branch merge (K-28) | |
| SEC-25 | Maestro household flow writes to production | Not done: needs a branch project (K-34); left out of the 8 October run | |

## Release and health (RELEASE-AND-HEALTH.md)

| ID | Finding | Status | Commit |
|---|---|---|---|
| REL-01 | No privacy, terms or support links | Partly: Settings rows appear once URLs exist; URLs are Lachlan's (K-23) | e365512 |
| REL-02 | Privacy documents describe a different app | Not done: Lachlan (K-23) | |
| REL-03 | Supabase dashboard setup unconfirmed | Not done: Lachlan (K-24) | |
| REL-04 | Apple token not revoked | Partly: scaffold (K-19) | 375c70f |
| REL-05 | No crash reporting | Not done: Sentry is Lachlan's call (K-8) | |
| REL-06 | "Coming soon" and unbuyable Pro in store builds | Not done: Lachlan's call (K-25) | |
| REL-07 | Permission prompts over-ask and promise scanning | Fixed (needs a native build) | 41c32a0 |
| REL-08 | Privacy manifest declares no collected data | Fixed | 41c32a0 |
| REL-09 | Paywall could go live without legal links | Partly: test added; plan length beside price waits for Pro (K-38) | e365512 |
| REL-10 | No over-the-air updates | Not done: Lachlan's call (K-27) | |
| REL-11 | Shared links need the app | Not done: needs a domain (K-26) | |
| REL-12 | CI misses journeys, typed routes, database | Fixed (`expo install --check` waits on K-28) | 6196a8e |
| REL-13 | Session in plain storage | Not done: native module (K-20) | |
| REL-14 | Library grids not virtualised | Fixed | 19bbecd |
| REL-15 | Thin tests where data can be lost | Fixed (error words, delete panel, sync engine, paging) | 70ab9db, 5044739 |
| REL-16 | 39 MB of photos, duplicates | Fixed: WebP, drafts' photos left out of store builds, duplicates stored once; six dishes still need their own photo (K-30) | |
| REL-17 | Expo SDK drift, @types/jest | Not done: install and dev build (K-28); K-1 closed | |
| REL-18 | Loose version ranges, unused expo-symbols | Not done: K-28 | |
| REL-19 | eas.json production guard | Not done: EAS is Lachlan's (K-29) | |
| REL-20 | Dead code and tokens | Fixed | e78265e |
| REL-21 | Size and spacing literals | Fixed, with a lint rule | e80a955 |
| REL-22 | Dynamic Type stops at 180% | Fixed (device check K-39) | 0bf60c7 |
| REL-23 | AI disclosure easy to miss | Fixed (D-049) | b98f9ab |
| REL-24 | Age-rating answer on shared content | Not done: listing answer, Lachlan (K-23) | |
| REL-25 | Catalogue loose ends | Not done: content calls (K-31) | |
