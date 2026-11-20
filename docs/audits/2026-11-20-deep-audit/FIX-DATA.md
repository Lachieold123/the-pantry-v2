# Data and sync fixes (deep audit, 20 Nov 2026)

Branch `audit/deep-1120`. Every fix is proven by a unit test with mocks. Nothing was run against the live app or Supabase. The one-line status per finding is in `FIX-DATA-STATUS.csv`.

**Totals:** 20 fixed and 2 part-fixed (DATA-10 and S2-4, where the other half is server work). None were found to be not real, and none were left.

## Findings

| Finding | Status | Commit | What changed | Proving test |
|---|---|---|---|---|
| DATA-4 | fixed | b4b1f62 | When the sharing sign-in dies (no session, no error), `signedInUser` answers `signed-out`. The household moves to the rejoin state and keeps its pending rows in `unsent`. Rejoining the same household sends them. | `src/store/dataSafety.test.tsx`; `src/lib/backend.test.tsx` |
| DATA-5 | fixed | b4b1f62 | Sign-out is refused (`not-backed-up`) while any account or household row is set aside. Recording a newer version of a record clears its set-aside entry. | dataSafety.test.tsx |
| DATA-6 | fixed | e7b078d | A collection's own row keeps as much of its order as fits (`MAX_ORDER_CHARS`). The member rows carry every recipe, so a huge collection is never set aside. | `src/domain/sync/rows.test.ts` "huge collection" |
| DATA-7 | fixed | b4b1f62 | `leave()` and `deleteHouseholdData()` flush first, and refuse with `unsent` if rows are still waiting. | dataSafety.test.tsx |
| DATA-8 | fixed | 41aff5b | `persistentStorage(version)`: a blob saved by a newer build marks the store unreadable, so it is never loaded as empty or saved over. | `src/store/reset.test.tsx` |
| DATA-9 | fixed | 41aff5b | When the plan is loaded, null or odd `entries` and `listEdits` become empty, so loading finishes and sync starts. | reset.test.tsx |
| DATA-10 | part-fixed | b4b1f62 | When sharing stops, the plan keeps the other members' recipes it uses (`stoppedSharing`). Plan rows that point at a deleted recipe are left for the server fixer. | dataSafety.test.tsx |
| DATA-11 | fixed | 41aff5b | `reset.ts` sorts every store into cleared on sign-out, cleared on delete, or kept. Deleting the account now clears the Home log, checklist, plates and welcome-back. | reset.test.tsx |
| DATA-12 | fixed | b4b1f62 | When an account sign-in lapses, its pending rows are kept in `lapsed` and sent when that account signs back in. The person sees one toast and a line in Settings. | dataSafety.test.tsx |
| DATA-13 | fixed | b4b1f62 | The invite-code error no longer promises codes that work once or last two days. | words change only |
| DATA-14 | fixed | e7b078d | `skill` and `intents` are added to `SYNCED_PREFS`, `localPersonal` and `applyPrefs`, and are checked against the allowed values when read. | rows.test.ts "cooking skill" |
| DATA-15 | fixed | b4b1f62 | `keptRows` (the 8-week prune) is applied to pulled rows when adopting a household and when merging into an account. | dataSafety.test.tsx |
| DATA-16 | fixed | b4b1f62 | `adoptHousehold` runs one at a time: two calls together share one pull. | dataSafety.test.tsx |
| DATA-17 | fixed | 41aff5b | The old-app import writes its marker as pending, applies, then marks it done. A pending marker runs again with the same time and the same ids, so nothing doubles. Markers from older builds still count as done. | `src/store/oldAppImport.test.tsx` |
| DATA-18 | fixed | b4b1f62 | Invite previews no longer create an anonymous user. Only joining may start one. | backend.test.tsx |
| REPO-11 | fixed | 41aff5b | `PERSISTED_STORES` lists all 15 stores, and startup waits for all of them. A test checks the list against the store names in the source code. | reset.test.tsx |
| S2-11 | fixed | b4b1f62 | PGRST202 (the function is missing on the server) from a household RPC now gives `not-available`, with its own wording. | backend.test.tsx |
| S2-12 / F-14 | fixed | 4b61735 | `fetchPage` reads the page as a stream and stops at 5 MB. If there is no stream, it reads the page as text, as before. | `src/lib/fetchPage.test.tsx` |
| S2-13 | fixed | 4b61735 | `capDraft` cuts imported ingredients and method at 8,000 characters each, so the recipe still fits a backed-up row, and adds a note saying it was cut. | `src/lib/useLinkImport.test.tsx` |
| PERF-2 | fixed | 914e74b | `useCookableNow` keeps the last result and reuses it while the inputs are unchanged. `suggestions.ts` memos now reuse it too, because `ready` and `nearly` keep the same identity. | `src/store/cookable.test.tsx` |
| PERF-3 | fixed | b4b1f62 | The account merge retry uses one timer, cleared before it is set again and on reset (accountActions.ts only). | dataSafety.test.tsx |
| S2-4 (client half) | part-fixed | 0669db8 | Signing in with Apple sends `authorizationCode` to `apple-token`; a failure there is ignored. Deleting the account calls `delete-account` first and falls back to the `delete_account` RPC only when the function returns 404. Any other failure stops with nothing deleted. | `src/lib/appleRevoke.test.tsx` |

## Decisions taken

All of these are the options that lose no data and change the least.

- **DATA-4:** a phone whose sharing sign-in dies moves to the existing rejoin state. It never becomes a new anonymous user.
- **DATA-18:** invite previews only show on a phone that is already signed in. A fresh phone sees no preview before it joins.
- **DATA-5:** sign-out is refused while anything is set aside, and the words ask the person to shorten the item.
- **DATA-12:** a lapsed sign-in shows one toast and a line in Settings. Rows are sent only to the same account.
- **DATA-11:** signing out keeps the Home log, checklist, welcome-back and plates, because the account doesn't hold them. Deleting the account clears them. Pro, scans and the tour are always kept.
- **DATA-6:** a collection larger than the cap keeps its order only up to the cap. The recipes past the cap come back sorted on other phones.
- **DATA-14:** intents travel along with skill.
- **S2-13:** the cut is said in the recipe's notes, so it needs no new screen.

## Needed from other fixers

- **Server:**
  - DATA-10 server half: mark or clean up plan rows that point at a deleted recipe.
  - S2-4 server half: deploy `apple-token` and `delete-account`.
- **Screens:**
  - Show which item is set aside (in Settings), so the person can fix it before signing out.
  - Add a length cap in the recipe editor that matches the row limit.
- **Lines I changed outside my area:**
  - `src/features/settings/accountWords.ts`: one wording line for `not-backed-up`.
  - `src/features/settings/AccountSection.tsx`: a `lapsed` selector and the signed-out detail text.
- **Probe:** the L3 probe `account-household.probe.test.tsx` now fails its tests 1 and 2, because those bugs are fixed.

## K-items

None changed status from this work.

## Final checks (worktree, 20 Nov)

- **Typecheck:** 0 errors.
- **Lint:** `npm run lint` crashes in ESLint's formatter (`RangeError: Invalid string length`) on the generated `e2e-report/` folder, which is not mine. `npx eslint src` is clean.
- **Tests:** `npm test` passes: domain and token tests 607 pass, 0 fail; Jest 57 suites, 287 tests, all pass.
