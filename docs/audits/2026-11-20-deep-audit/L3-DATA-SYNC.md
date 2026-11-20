# Lane 3: data integrity, sync, accounts and household (20 Nov 2026)

Branch `audit/deep-1120` at `8bbbacd`. Read-only on source and live. Probes in `tools/L3/`, output in `evidence/L3/`.

## Summary

| Severity | Count |
|---|---|
| S1 Blocker | 1 |
| S2 Loses people | 5 |
| S3 Annoying | 7 |
| S4 Polish | 5 |
| **Total** | **18** |

The five worst, in plain words:

1. **DATA-1.** The live server has none of the 8 Oct server fixes and none of `cloud/09`. Invite codes there can be guessed, can be reused for 14 days and have no try limit. Remove member and Cancel invites answer "Something went wrong". The join screen never shows which household a code is for.
2. **DATA-2.** The repo's migration file names don't match the version numbers live has applied. All the pending migrations are dated before the newest live one. So `supabase db push` will either re-run the first migrations (and fail) or refuse the pending ones.
3. **DATA-4.** If a household-only phone's saved sign-in dies (its refresh token is refused), the phone quietly becomes a new anonymous user. It drops out of its household, loses changes it hasn't sent, and leaves a ghost member behind. Nothing appears on screen.
4. **DATA-5.** Signing out wipes things the server refused to back up (for example a recipe over 60 KB). The person is never told those things were never backed up.
5. **DATA-7.** Leaving a household throws away changes that haven't been sent yet, so the other members never see them.

Coverage: 52 of 64 inventory items traced end to end (81%). See Coverage.

## Index

| ID | Sev | Fix | Conf | Title | Where |
|---|---|---|---|---|---|
| DATA-1 | S1 | live | CONFIRMED | Live server lacks K-18/K-32/K-36 migrations; what the app does about each gap | supabase/migrations 20261006000200…20261009000100; evidence/L3/live-schema-20261120.md |
| DATA-2 | S2 | live+auto | CONFIRMED | Repo migration versions ≠ live history; pending ones dated before live head | supabase/migrations/*, list_migrations |
| DATA-3 | S2 | live | LIKELY | Applying `cloud/09` cuts build 25 off live updates; the private-channel fallback is unproven on a device | supabase/migrations/20261009000100; src/lib/liveRows.ts:25,64 |
| DATA-4 | S2 | auto | CONFIRMED | Dead session: phone signs in anonymously again, silently leaves the household, drops pending rows | src/lib/household.ts:33-47; src/store/household.ts:127-137 |
| DATA-5 | S2 | auto | CONFIRMED | Sign-out wipes set-aside rows; set-aside is never shown | src/store/accountActions.ts:158-169; src/store/sync.ts:115-127 |
| DATA-6 | S4 | auto | CONFIRMED | Oversized collection head row set aside: the collection vanishes on other phones | src/domain/sync/personal.ts:47-50 |
| DATA-7 | S2 | auto | CONFIRMED | `leave()` discards unsent household rows | src/store/householdActions.ts:133-139 |
| DATA-8 | S3 | auto | CONFIRMED | A newer build's blob loads as empty and is overwritten (TestFlight rollback) | src/store/storage.ts; every `version: 1` store |
| DATA-9 | S3 | auto | CONFIRMED (mechanism) | A throw during hydration means sync, account and household recovery never start, with no message | src/store/plan.ts:59-67; src/features/app/useAppReady.ts:56-62 |
| DATA-10 | S3 | auto | LIKELY | Leaving, removal and deletion leave planned meals pointing at recipes that are gone | src/store/household.ts:133; householdActions.ts:128,137; account_cleanup.sql:24-27 |
| DATA-11 | S3 | auto | LIKELY | Deleting the account keeps the Home event log (follows, reading) and other per-person stores | src/store/reset.ts:45-54 |
| DATA-12 | S3 | auto | LIKELY | A signed-in user whose session dies is silently signed out and backup stops | src/store/accountActions.ts:45-53 |
| DATA-13 | S3 | auto/live | CONFIRMED | Join error says codes are single-use and last two days; live codes are reusable for 14 days | src/features/household/words.ts:7 |
| DATA-14 | S4 | auto | CONFIRMED | Cooking skill and intents don't sync and are reset by sign-out | src/domain/sync/personal.ts:23; src/store/reset.ts:27-35 |
| DATA-15 | S4 | auto | CONFIRMED | Joining or signing in skips the 8-week prune; old weeks show and the mirror grows | src/store/householdActions.ts:55-60; accountActions.ts:89-94 |
| DATA-16 | S4 | auto | LEAD | Two `adoptHousehold` runs can race at launch | useAppReady.ts:58-60; accountActions.ts:40,56-61 |
| DATA-17 | S3 | auto | LIKELY | Old-app import is lost if the app dies between the marker and the stores saving; it can't be re-run safely | src/store/oldAppImport.ts:55-86 |
| DATA-18 | S4 | auto | LIKELY | Opening an invite link creates an anonymous server user before the person agrees to anything | src/features/household/JoinScreen.tsx:31-43 |

## Findings

### DATA-1 · S1 · live · CONFIRMED · The live server is missing every server-side fix, and here is what the app does about each gap
**Who notices what (today, live project `eozyhllkvajvrecojdxu`):** evidence in `evidence/L3/live-schema-20261120.md`, from `list_migrations` and one SELECT over `information_schema`.
| Client expects | Live has | What the person sees |
|---|---|---|
| `preview_invite` (JoinScreen.tsx:34) | missing | No household name above the join form. The error isn't `too-many-attempts`, so it is swallowed (JoinScreen.tsx:37-38). A stranger's link can pull your kitchen into theirs (SEC-16 doesn't work live). |
| `remove_member`, `revoke_invites` | missing | "Something went wrong. Try again in a moment." every time (lib/household.ts:29, PGRST202 → `failed`). |
| `too_many_join_attempts`, single-use 2-day codes | old `create_invite`/`join_household` (households.sql:96-130): `random()`, reusable, 14 days, no rate limit | Codes can be guessed and reused (SEC-08 open live). See DATA-13 for the wording. |
| `household_rows_since` / `account_rows_since`, `received_at` | missing | Works: `pullSince` falls back to a full read on PGRST202 (pullRows.ts:63). Each return to the app still pulls everything (K-36 open live). |
| private topics + `realtime.messages` policies | missing; `household_rows`, `account_rows` and **`household_members`** still in the `supabase_realtime` publication | Live updates work through the Postgres Changes fallback (unproven on a device, DATA-3). Member ids are still published (SEC-06 open live). |
| future-stamp clamp, shape checks, row quota, anonymous users blocked from account rows (`20261008000100`) | missing | One member with a fast clock can freeze rows. Malformed shared rows are filtered only on the phone. No ceiling on rows. |
| new `delete_account` (`20261008000300`) | old version (accounts.sql:74-84) | Deleting works, but the leaver's recipes and user id stay in the household (SEC-13 open live). |
| `delete_stale_anonymous_users` | missing | Anonymous users are kept for ever (SEC-14). |

**Root cause:** K-18, K-32 and K-36 are "written, not applied". **Fix (live, Lachlan approves):** apply `20261008000000` to `…0300`, then `20261009000000` and `…0100`, after fixing DATA-2. The DB tests have to pass first (`supabase/tests`, 23/23 on PGlite). Undoable only by hand-written down-migrations. What it does to build 25: see DATA-3. The `08` set is safe for build 25 (same RPC names; new ones are only additions). **Test:** a post-apply SELECT that lists the 13 functions in the evidence file. Lane 4 owns the security side; this row is the client view. Carry-over: K-18, SEC-04/05/06/07/08/13/14/15/16.

### DATA-2 · S2 · live+auto · CONFIRMED · The migration history won't push cleanly
Live versions: `20261006000618 households`, `20261006000720 household_rows_newest_wins`, `20261007011855`, `20261007014646`, `20261012094607 home_events`, `20261012094611 home_ranking`, `20261016204729 seed_kitchen_retired`. The repo names: `20261006000000_households`, `20261006000100_…`, `20261006000200_accounts` (applied live under no matching version: its table and functions exist), `20261012000000`, `20261012000100`, `20261017000000`. `supabase db push` matches by version, so it will see `20261006000000`, `…0100`, `…0200`, `20261012…`, `20261017…` as unapplied and try to re-create `households` (error "relation already exists"). The pending `20261008*` and `20261009*` are also older than live's head (`20261016204729`), so push refuses them without `--include-all`. INTEGRATION.md Findings 2 saw only the `cloud/09` half. **Fix:** `supabase migration repair` (or rename the repo files) so the applied ones carry the live versions. Then rename the six pending files to timestamps after `20261016204729`, keeping their order, and fix `_pending/`. Also update K-18's "apply in order" text and `supabase/tests/harness.mjs` if it sorts by name. **Test:** a script that compares `list_migrations` with the filenames before any push.

### DATA-3 · S2 · live · LIKELY · `cloud/09` and build 25
`20261009000100_realtime_private_broadcast.sql` takes `household_rows` and `account_rows` out of Postgres Changes. Build 25 (the only build on phones) only knows Postgres Changes. Once this is applied, build 25 phones stop getting live changes and only catch up when the app comes back to the front. Before it is applied, this branch tries the private topic first and falls back only when a `CHANNEL_ERROR` message matches `/unauthori[sz]ed|permission/` (liveRows.ts:25,64). If Realtime's refusal text differs, or arrives as `TIMED_OUT`, a phone gets no live updates at all and nothing says so. **Fix:** apply `09…0100` only after a build with this client is on every tester's phone. Before that, check the refusal message once on a device. Make the fallback also fire on `TIMED_OUT` before the first join. **Test:** liveRows.test.tsx case for `TIMED_OUT`. Carry-over: K-32.

### DATA-4 · S2 · auto · CONFIRMED · A dead session silently takes the phone out of its household
auth-js removes the saved session when the refresh token is refused and the access token has expired (`node_modules/@supabase/auth-js/dist/main/GoTrueClient.js` ~4310-4316). Ways that happens: a revoked token, the refresh-token reuse detector after two phones restored from one iCloud backup, or a long time offline with a token the server has rotated. On the next launch `getSession()` returns no session and no error, so `signedInUser` (lib/household.ts:41) calls `signInAnonymously()`. `signIn()` stores the new id (household.ts:151). `refreshMembers` then reads "not a member" and runs `stopSync(); setState(EMPTY_HOUSEHOLD)` (household.ts:130-134). That clears `pending`. The person finds their kitchen no longer shared, with no message. Their unsent edits never reach the household, and the old anonymous user stays as a ghost member for ever (delete_stale skips members). **Proof:** `tools/L3/account-household.probe.test.tsx` test 3 passes (`evidence/L3/account-household.txt`). BUG-16 only covered the "error present" case. **Fix:** in `signedInUser`, sign in anonymously only when `useHousehold.userId` is undefined. Otherwise answer a new problem `signed-out`. In `refreshMembers`, when the current user id ≠ the stored `userId`, keep the household and pending rows and show "Your sharing sign-in expired: rejoin with a code". **Test:** that probe, with the expectations flipped. Carry-over: BUG-16 (partly regressed by path), SEC-14.

### DATA-5 · S2 · auto · CONFIRMED · Sign-out loses rows the server refused
`setAside` rows are kept "on this phone but never sent" (syncTypes.ts:13). Nothing in `src/features` or `src/ui` reads `setAside` (grep), and `signOut` checks only `waiting()` (pending). Signing out runs `resetThisPhone`, so a recipe of your own over 60 KB (`rowFits`, limits.ts:22; the editor doesn't cap ingredients or method text, and link imports can be up to 5 MB) is gone for good. The same goes for anything over the 50,000-row quota once it's applied. **Proof:** `persist-and-rows.probe.test.ts` "60 KB … set aside" and `account-household.probe.test.tsx` test 1. **Fix:** `signOut` refuses with `unsaved` (or asks) while `setAside` is non-empty in either scope. Settings shows "N things couldn't be backed up". The editor caps `ingredientsText` + `methodText` + `notesText` so the stored row stays under `MAX_ROW_DATA`. **Test:** account.test.tsx "refuses to sign out with set-aside rows". Carry-over: BUG-03 (fix is correct, but its consequence is unguarded).

### DATA-6 · S4 · auto · CONFIRMED · An oversized collection disappears elsewhere
The head row carries the whole `recipeIds` list. Past about 2,400 recipes it no longer fits and is set aside, while the member rows go through. `personalFromRows` builds a collection only from a head row, so the other phone has no collection at all (probe "a collection whose own row is set aside"). **Fix:** leave `recipeIds` out of the head row (the member rows already carry membership), or cap a collection's size. **Test:** that probe, flipped.

### DATA-7 · S2 · auto · CONFIRMED · Leaving a household throws away unsent changes
`leave()` calls the RPC, then `stopSync()` and `EMPTY_HOUSEHOLD`, which empties `pending` without a flush (householdActions.ts:133-139). Say someone edits the list offline, gets signal, and taps Leave within the 400 ms debounce or the 30 s retry window. The others never get that change. Probe test 2. **Fix:** `await householdFlush()` first and refuse while `householdWaiting() > 0`, as `signOut` does (accountActions.ts:161-164). Use the same guard for `deleteHouseholdData`. **Test:** probe test 2, flipped.

### DATA-8 · S3 · auto · CONFIRMED · Going back to an older build wipes a store
zustand 5 (`middleware.mjs` ~391-404): a saved `version` different from the store's, with no `migrate`, loads as empty (`console.error` only). The next change then writes over the newer blob. Twelve of the fifteen stores have no `migrate`. So the first TestFlight rollback after any store's version is bumped empties that store, for example Cookmarks. Probe "a blob from a NEWER build". **Fix:** in `storage.getItem`, give `persistentStorage(version)` the store's version. When `saved.version > version`, treat the store as unreadable (add it to `unreadable`, as for a storage failure) so it is never saved over. **Test:** a savedState test for a future version.

### DATA-9 · S3 · auto · CONFIRMED (mechanism) · One bad field can switch sync off silently on every launch
If anything throws inside hydration, zustand never sets `hasHydrated` and never calls `onFinishHydration` (middleware.mjs:433-438). That includes `plan.ts`'s `onRehydrateStorage` reading `state.entries`/`state.listEdits` without a guard, a `merge`, or a `migrate`. `useAppReady` then opens after the 4 s timeout on every launch. `Promise.all(STORES.map(hydrated))` (useAppReady.ts:56) never resolves, so `startSync`, `startAccount` and `recoverHousehold` never run: no backup, no household, no sign-in offers. No error is shown. `readSaved` only checks the top level, so `{"state":{"entries":null}}` gets through. Probe "a throw inside onRehydrateStorage". This is the device-unverified launch-order change (INTEGRATION judgement call 3). Its normal order is right: see the appendix. **Fix:** guard the plan prune with `Array.isArray`/object checks. Pass `onRehydrateStorage`'s error to a shared handler that backs up the blob and finishes hydration empty, like `readSaved`. In useAppReady, start sync after `allHydrated` settles, using only the stores that loaded, and log which store didn't. **Test:** a useAppReady test with a store that fails to hydrate.

### DATA-10 · S3 · auto · LIKELY · Planned meals left without their recipe
- On the phone that leaves, is removed or deletes household data: `EMPTY_HOUSEHOLD` sets `sharedRecipes: {}`, but the plan keeps entries that point at other members' recipes (household.ts:133, householdActions.ts:128,137). The kitchen "stays on this phone" minus those recipes.
- On everyone else's phones after the pending `delete_account`: recipe rows are marked deleted, but plan rows stay (account_cleanup.sql:24-27). Probe "delete_account … keeps the plan rows".

What the plan, list and Cook screens show for an unknown recipe id was not traced (lane 2). **Fix:** when sharing stops, keep the `sharedRecipes` that the plan uses (or copy them into My recipes, as theirs, read-only). On the server, also mark the plan rows that point at a deleted recipe as deleted. **Test:** householdActions test: after `leave`, every plan entry resolves to a recipe.

### DATA-11 · S3 · auto · LIKELY · Deletion leaves personal data on the phone
`wipeAfterDeletion` clears plates and `.corrupt.` backups. `resetThisPhone` leaves `home-events` (every open, read time, hide, and follow/unfollow of cooks), `checklist`, `welcome-back`, `scans` and `tour`. The panel says "this phone goes back to a fresh start" (DeleteAccount.tsx:58). Home events are behaviour data that's new since K-21. **Fix:** add `useHomeEvents.setState(useHomeEvents.getInitialState())` (and `welcome-back`) to `wipeAfterDeletion`, and probably to sign-out too. **Test:** account.test.tsx "delete clears the home log". Carry-over: K-21/SEC-12 (still open for the old-app keys and photo files; that half needs Lachlan's call plus expo-file-system).

### DATA-12 · S3 · auto · LIKELY · Silent sign-out when the session dies
`refreshWho` (accountActions.ts:45-53): when `currentAccount()` answers no account, for example after the dead token in DATA-4, it stops the backup and sets `signedOutState()` with no message. Everything stays on the phone, but backup has stopped and the person doesn't know. **Fix:** set a flag that Settings › Account and a one-time toast show: "You've been signed out. Sign in again to keep your backup." **Test:** account.test.tsx.

### DATA-13 · S3 · auto/live · CONFIRMED · The join error describes rules the live server doesn't have
`PROBLEM_WORDS['invite-not-found']` says "Each code lets one person join and lasts two days". Live codes are reusable for 14 days (households.sql:22,96-130). **Fix:** apply `20261008000200` (DATA-1), or say "That code didn't work. Ask for a new one." until it's applied.

### DATA-14 · S4 · auto · CONFIRMED · Cooking skill doesn't follow you
`SYNCED_PREFS` (personal.ts:23) has no `skill` or `intents`. `resetThisPhone` resets them on sign-out and keeps `onboarded: true`, so onboarding is never asked again and Home ranking (skill weight 0.75, D-050) changes after signing back in. **Fix:** add `skill` (and `intents` if it should travel) to `SYNCED_PREFS` and `applyPrefs`. **Test:** rows.test round-trip.

### DATA-15 · S4 · auto · CONFIRMED · Joining or signing in brings back pruned weeks
`adoptHousehold` and `merge()` put every pulled row in the mirror and apply it. Only `receive()` filters `isPastKeeping` (sync.ts:95-96). A household with a year of history shows weeks older than 8 back until the next launch prunes them, and the persisted mirror keeps them until the next live row. Probe "rowsToBringAlong / adoptHousehold keep weeks". **Fix:** filter the pulled rows with `isPastKeeping` in both places (reuse the code in `receive`).

### DATA-16 · S4 · auto · LEAD · A launch-time race between two adoptions
`recoverHousehold()` (useAppReady.ts:60) and `startAccount → checkHousehold` (accountActions.ts:40) can both see "no household" and both call `adoptHousehold`. Both pull, and the second one's `EMPTY_HOUSEHOLD` clears the first one's pending bring-along rows. The second recomputes them, so nothing is lost as far as traced, but it doubles the pulls and writes. **Fix:** a single-flight promise in `adoptHousehold`.

### DATA-17 · S3 · auto · LIKELY · A half-run old-app import can't be redone
The marker is written before the stores save (oldAppImport.ts:55-56), and zustand writes them asynchronously. If the app dies in between, the import is marked done and nothing was kept. The old data is still there, but a re-run would duplicate recipes and cook-log entries because they get fresh `newId()` and random ids. **Fix:** derive ids from the old ids (deterministic), then write the marker as `pending` → apply → await each store's save → `done`, and re-run on `pending`. **Test:** run the import twice and check the counts are unchanged. The import's reading of real data is fine: see the appendix. K-12 is still open (needs Lachlan's phone).

### DATA-18 · S4 · auto · LIKELY · An invite link makes a server user before consent
`JoinScreen` previews on mount (`inviteFor` → `rpc` → `signedInUser` → `signInAnonymously`). Opening a link, even by mistake, creates an anonymous user and keeps it for 30 days, or for ever while the clean-up job doesn't exist live. **Fix:** preview only after the person taps a "Show which kitchen" button, or say on the sheet what tapping Join does.

## Carry-over (8 Oct audit and K-items in this lane)

| ID | Status |
|---|---|
| BUG-03 | still fixed (rowFits, setAside; read sync.ts:144-169). Consequence unguarded: DATA-5 |
| BUG-04 | still fixed (watch before ready, sync.ts:205-215; sync.test.tsx). Device check K-39 still owed |
| BUG-05 | still fixed for an offline expired session (account.ts:85-108). A dead refresh token is a different path: DATA-4/12 |
| BUG-10 | still fixed (recover, householdActions.ts:81-93) |
| BUG-16 | partly regressed by path: DATA-4 |
| BUG-17 / SEC-04 | client half still fixed (stampAfter); server clamp not live (DATA-1) |
| BUG-28 | fixed in repo, not live (DATA-1) |
| BUG-29 | still fixed (member rows); edge case DATA-6 |
| ARCH-6 / PERF-6 | still fixed for unreadable or wrong-shape blobs (savedState.ts); field-level and future-version gaps: DATA-8, DATA-9 |
| SEC-05 | client half still fixed (kitchenFromRows/storedRecipes); server check not live |
| SEC-06 / K-32 | still open live: `household_members` still published (evidence) |
| SEC-07 | still open live |
| SEC-08 | still open live (DATA-1, DATA-13) |
| SEC-12 / K-21 | still open, now wider (DATA-11). Missing: Lachlan's yes to delete old-app keys, plus expo-file-system (native) for photo files |
| SEC-13 | fixed in repo, not live; the new version creates DATA-10 |
| SEC-14 / K-33 | still open: ghost member on switching (accountActions.ts:68-74), plus a new ghost path (DATA-4). Needs a "leave as the old anonymous user" step before `begin()`: auto, but changes sign-in flow order |
| SEC-15 | app half done; server function not live, so buttons fail (DATA-1) |
| SEC-16 | preview built; not live, so no preview (DATA-1). Universal links: K-26, owner (domain) |
| K-18 | still open: live apply (DATA-1), blocked first by DATA-2 |
| K-20 / SEC-10, K-22 / SEC-09 | still open: need expo-secure-store / expo-crypto (native, a dev build). Approved in principle; missing a dev build plus a phone test |
| K-36 | client still correct; falls back to a full pull while not live |
| K-39 | still open (device) |
| K-12 | still open (needs Lachlan's phone with the old build) |

## Coverage

Inventory built from source (lane 1's wasn't available): 15 persisted stores (`plan`, `saved`, `cook-log`, `cupboard` v2, `my-recipes`, `preferences` v4, `welcome-back`, `pro`, `household`, `account`, `checklist`, `tour`, `scans`, `plates`, `home-events`), plus the `old-app-import` marker, the Supabase auth session and the `.corrupt.` backups (18 keys). 2 sync scopes × 8 engine behaviours (record, receive/prune, flush/retry, set-aside, pull/cursor, start/ready, stop/generation, reshape). 13 row kinds. 9 account flows (Apple link, Apple switch, email change, email sign-in, merge, needsMerge retry, sign-out, delete, refreshWho). 10 household flows (start, join, recover, adopt, invite, preview, cancel, remove, leave, delete household data). 9 live server objects the client calls. Total 64.

Traced end to end: all 18 keys for version, migrate, hydration and reset; all 16 engine behaviours; 13/13 kinds against the server shape check; 8/9 account flows (not Apple linking on a device); 8/10 household flows (the remove and cancel screens not opened); 9/9 server gaps. With the device-only items excluded: 52/64 = 81%.

Probes: `tools/L3/persist-and-rows.probe.test.ts` (7 pass, `evidence/L3/persist-and-rows.txt`) and `tools/L3/account-household.probe.test.tsx` (3 pass, `evidence/L3/account-household.txt`). A pass means the faulty behaviour reproduces.

## Not tested, and why

- Anything on a device: Realtime refusal text (DATA-3), Apple linking, the 4 s launch wait, storage full, iCloud restore onto a second phone, the old-app import on Lachlan's phone (K-12).
- Two real phones in one household against live: rule 2 forbids writes. The engine's conflict rules were checked by reading the code and the existing `sync.test.tsx` and rows tests, not with live writes.
- DST and midnight for pruning: `pruneCutoff` is lane 2's. The prune rules only compare ISO dates.
- What screens show for an orphan plan entry (DATA-10): lane 2.
- Live Auth settings (anonymous sign-ins on, OTP lifetime, refresh-token reuse window): lane 4 / K-24.

## Appendix: refuted or checked fine (don't re-raise)

- **Old-app import reads the real old format.** The old app saved a flat `JSON.stringify(state)` under `the-pantry/v1` (HQ "The Pantry - Transfer"/src/store/useStore.ts:104,319). Field names and types (`favorites`, `customMeals`, `customRecipes` with `ingredients[{section,items}]`/`steps[]`/`notes[]`, `cookLog[{id,at}]`, `pantryItems`) match `importOldApp`. Junk is covered by oldApp.test.ts.
- **Launch order (judgement call 3) is right in the normal case.** The plan prunes inside `onRehydrateStorage` before `startSync` snapshots, so pruned weeks aren't sent as deletions.
- **Server-side shape check vs the client:** every kind's data is an object (kitchen.ts:32-40, personal.ts:45-57), so normal rows won't be refused once `…0100` is applied.
- **Trigger order** keep_newest < quota < stamp_received (name order) is right. `_since` keyset paging on (received_at, kind, key) is right. A cursor from another scope is ignored and never moves back (probe).
- **`pullSince` falls back on PGRST202/42883**, so a server without `_since` still syncs (with a full read).
- **`suggestions.ts` merge:** reads stores only; no data path. **`DeleteAccount.tsx` merge:** both branches call the right action; the household-only panel shows only when `userId` is set and nobody is signed in.
- **Account rows stamped with a random device id** (text column live) and household rows with the user uuid: consistent with each table's `updated_by` type and the tie-break.
