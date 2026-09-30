# The Pantry v2: deep audit

- **Date:** 30 September 2026
- **Audited commit:** `6a200f4` on `main`, as the brief asked.
- **Re-checked against:** `30c7435`. `main` moved on during the audit (8 commits, including a corrupt-save fix, the AI-photo label, D-030 and Maestro flows), so every finding also has a status at `30c7435`. See §4.
- **Brief:** `docs/audits/ULTRACODE-AUDIT-PROMPT-v2.md`
- **Companion:** `ACTION-PLAN.md`, in this folder.
- **Checks at `6a200f4`:**
  - `npm run typecheck`, `npm run lint` and `npm test` all pass: 157 domain tests plus 7 Jest tests in 4 suites.
  - `npm audit` reports 14 moderate issues. All are transitive (through expo, expo-router and expo-splash-screen) and none can be exploited at runtime. See Appendix B.
  - Everything was read-only on `main`. Nothing touched EAS, Supabase, RevenueCat or App Store Connect.

**This repository is public.** Finding F204 is about that. This report describes what's wrong and how to fix it. It deliberately leaves out any detail that would help someone attack the paused v1 backend.

---

## 1. Executive summary

v2's foundations are sound:
- The structure rules are followed to the letter: thin routes, no feature imports another, a pure domain layer, every file under 300 lines, strict TypeScript, and no `any`, `@ts-ignore` or `eslint-disable`.
- Date maths is correct in every time zone and across daylight-saving changes; we tested nine zones from 2019 to 2031.
- There are no secrets in the code or its history.
- The shopping list really is worked out from the plan, not stored as a copy.

The problems are in behaviour, not structure. They are:

1. **The North Star loop has real bugs.**
   - Things you've bought come back as "to buy" the next day (F11).
   - "Tonight" freezes on yesterday when the app is resumed (F16).
   - Planned servings get lost on the way to the recipe page and Cook Mode (F37).
   - Cook timers can be silenced by Focus modes (F188), and leaving Cook Mode kills them (F45).
2. **Parsing of your own recipes and imported ones is fragile.**
   - "1.5 kg" becomes "5 kg" (F39).
   - "1,000 g" becomes 1 g (F38).
   - Lists pasted with ● or – bullets lose every amount (F191).
   - "lamb or eggplant" is tagged vegan (F189).
   - Several avoid-list gaps: F136, F181, F211.
3. **Saved data resilience.**
   - At `6a200f4`, one unreadable saved value kept the splash screen up forever (F01, critical). That's **fixed on `main` in `7ce7396`**.
   - The fix still lets a *failed read* load an empty store, and the next change then silently overwrites the real data (F216, found in the re-check).
   - Save failures are only logged to the console (F05).
4. **Tests pass but don't pin behaviour down.**
   - Line coverage is 98.5%.
   - We made 34 small, realistic bug changes to the domain code; 33 of them still passed every test (F210).
   - The catalogue round-trip test only counts lines, so it would have missed F39.
5. **Release readiness.**
   - The splash is the Expo placeholder (F67).
   - A production build today shows **zero recipes**, and there's no supported way to mark a recipe as vetted (F68, F151).
   - There's one error boundary and no logger (F69).
   - OTA updates aren't wired up safely (F71).
6. **Plan readiness for P4–P11** has high-severity gaps that would cause App Store rejection or data loss if those phases were built as written:
   - account lifecycle and in-app deletion (F114);
   - legal documents, privacy policy and App Privacy answers (F117);
   - RevenueCat identity and subscription terms (F122);
   - Australia's under-16 social media law (F121);
   - the D-003 "next week is Pro" gate colliding with Sunday planning (F212);
   - restoring the v1 Supabase project, where seed accounts need purging and the paused project needs backing up (F116, F161).
7. **The repo is public**, and it contains v1's backend security audit (F204) and a personal Apple ID email (F205). These are decisions for Lachlan.

**Totals:**
- **215 confirmed findings:** 1 critical, 9 high, 62 medium, 143 low. Severities are after verification; see §3.
- **At `30c7435`:** 1 fixed (F01), 11 partly fixed, the rest still open.
- **7 further observations** came from checking the new `main` commits. They are listed separately in §4.3 because they haven't been through three-way verification.

### The ten most important findings

1. **F11 (high).** Bought items come back as "to buy" the next day, and removed items reappear. This breaks step 2 of the North Star every day of the week.
2. **F16 (high).** "Today" is frozen at the last render. After a night in the background, Tonight shows yesterday's dinner, and "Have this tonight" writes to yesterday.
3. **F39 (high).** In your own and imported recipes, "1.5 kg" becomes "5 kg" and "0.5 tsp" becomes "5 tsp". It's silent, and it flows into scaling, the list and Cook Mode.
4. **F212 (high).** D-003's "Pro adds planning next week", combined with D-009's Monday-start weeks, puts the Sunday North Star behind the paywall for every free user.
5. **F116 + F161 + F204 (high).** The paused v1 Supabase project needs a decision now:
   - back it up before it can't be restored;
   - never restore it as-is, because of the seed accounts and grants;
   - its security write-up is in this public repo.
6. **F114 (high).** No phase covers the account lifecycle: sign-out teardown, in-app deletion including server data (App Store guideline 5.1.1(v)), and forgot password.
7. **F68 + F151 (medium, blocks launch).** Store builds show 0 recipes, and the D-014 pipeline has no way to mark a recipe vetted or fix its times.
8. **F09 (medium, urgent).** The old-app import reads field names the old app never wrote, so v1 testers lose their cook history and recents for good. It must be fixed before any tester opens v2.
9. **F216 / F02 (medium).** After the startup fix, a failed storage read still loads an empty store, and the next change overwrites the saved plan or library without a backup.
10. **F210 (medium).** The tests don't constrain behaviour: 33 of 34 realistic bug mutations survive. That includes the nuts avoid option dropping peanuts, and the partner's list including items already bought.

The other highs are F117 (legal and privacy have no phase), F122 (payments identity and subscription terms), and F121 (the under-16 law may apply to a feed with DMs; this needs a legal opinion). F123 (AI rules) should be raised to high now that D-030 makes scanning part of launch.

---

## 2. Method

**Finders, round 1: twelve agents.**
- Four covered correctness: Feed/Browse/Surprise, Recipe/Cook, Plan/List/Cupboard, and Editor/Saved/Import/Shell.
- One each covered data integrity, security, UI fidelity (with Playwright screenshots of a web export at 320 and 375 pt, in light, dark and dark high-contrast), accessibility, performance, architecture and tests, release readiness, and plan readiness.
- Each finder had to cite file:line and prove its claims with tsx or Jest scripts where it could.

**Verification.**
- Three sceptic agents with different lenses independently tried to refute every finding:
  - **L1 reproduce:** re-read the code and re-run the proof.
  - **L2 reachability and intent:** can a real user hit it, and is it a decision, a known issue or a planned phase?
  - **L3 severity and fix.**
- A finding is **CONFIRMED** when no verifier refutes it with code evidence and at least two confirm it, fully or in part. No finding was fully refuted. Refuted *parts* of findings are listed in Appendix A.
- The final severity is the median of the three verifiers' severities, with Lachlan-facing adjustments noted.

**Later rounds.**
- **Round 2:** journeys, decisions and data, and the remaining screens.
- **Round 3:** async and lifecycle, copy, the 141 v1 findings, and a completeness critic.
- **Round 4:** a native prebuild, a fuzz test of user input, and the UI primitives nobody had opened.
- **Round 5:** the navigation graph, mutation testing, and a second security pass.
- **Rounds 6 to 8:** fresh-eyes finders limited to *high or critical* issues.
- New findings came in every round up to 6, so the brief's stopping rule ("two rounds in a row find nothing new") was **not met for medium and low severity**. Rounds 7 and 8 found **no new high or critical** issue, which is where we stopped. Appendix C lists the remaining blind spots.

**Leads from the earlier pass.** The earlier pass in `docs/audits/2026-09-30-v2-check/` was treated as leads. Appendix B gives the verdict on each, including a re-check of all 141 v1 findings at HEAD.

**Severity guide (from the brief).**
- **Critical:** data loss, the app won't open, a security hole, or App Store rejection.
- **High:** a core journey is broken or wrong for many users, or a CLAUDE.md rule is seriously broken.
- **Medium:** a real bug on a secondary path, or a real accessibility or performance issue.
- **Low:** polish.

**Votes are written L1·L2·L3,** where C = confirmed, P = confirmed in part or with a correction, and R = refuted. Line numbers are at `6a200f4` unless marked otherwise.

---

## 3. Confirmed findings by severity

| Severity | Count | IDs |
|---|---|---|
| Critical | 1 | F01 (fixed at `30c7435`) |
| High | 9 | F11, F16, F39, F114, F116, F117, F121, F122, F212 |
| Medium | 62 | listed in §3.3 |
| Low | 143 | listed in §3.4 |

### 3.1 Critical

#### F01 · One unreadable saved value keeps the splash screen up forever
- **Severity:** critical at `6a200f4`. **Votes:** C·P·C. L2 rated it high: iOS writes are atomic, so the realistic triggers are a native read error or a future `migrate` that throws.
- **Status at `30c7435`:** **FIXED** by `7ce7396`. A failed parse is now backed up and the store loads with defaults. Startup waits for every store with a 4 s limit. What's left over is F216 and F02.
- **Where:**
  - `src/store/oldAppImport.ts:34-48`, `src/store/preferences.ts:109-117`, `src/features/app/useAppReady.ts:12-19`, `src/app/_layout.tsx`
  - zustand 5.0.15 `node_modules/zustand/esm/middleware.mjs:433-438`
- **Evidence:**
  - When hydration fails, persist's `.catch` only calls `postRehydrationCallback(undefined, e)`. `hasHydrated` never becomes true and `onFinishHydration` listeners never fire.
  - The startup gate awaits six stores on **every** launch, before it checks the import marker.
  - The try/catch in `prepare()` can't catch a promise that never settles.
  - Proofs: `scratchpad/dat/hydration.test.ts` (12/12), `rel-hydrate.mjs` and `cord/p3-hydrate.ts`.
- **Failure scenario:** a read error, a garbled value or a throwing `migrate` in any of seven stores means the native splash never hides. The only way out is reinstalling, which deletes every saved recipe and plan.
- **Fix, as applied on main:** a storage wrapper that quarantines bad values, plus a startup gate with a timeout. The remaining work is under F216.
- **Effort:** M · **Bucket:** now (done) · **Related:** v1 ARCH-6, PERF-6; plan rule 2

### 3.2 High

#### F11 · Bought items come back as "to buy" the next day, and removed items reappear
- **Votes:** C·C·C
- **Status at `30c7435`:** still open
- **Where:** `src/features/plan/useWeekList.ts:22-24`; `src/domain/shopping/derive.ts:119-120, 139`
- **Evidence:**
  - Past days are dropped from the list on every render (`filter((e) => !isPast(e.day, today))`).
  - A tick counts only while the stored amount *string* equals the current one (`edits.checked[key] === amount`).
  - A removal counts only while the entry-id set is exactly the same.
  - When a past meal drops off, every ingredient it shared with a later meal changes amount, so the tick lapses. The stale key also keeps the item out of the cupboard section.
  - Proof `scratchpad/corc/ticks.ts`: on Monday every item is ticked; on Tuesday "brown onion 1; egg 1; parmesan 40 g" are back to buy.
- **Failure scenario:**
  1. Shop on Sunday or Monday for the week and tick everything.
  2. By Tuesday, items shared with Monday's dinner are back.
  3. "Send list" asks your partner to buy things already in the fridge.
  4. It repeats every day.
  - D-010 says an edit lasts until *the plan* changes. A day passing isn't a plan change.
- **Fix:**
  - In `derive.ts`, work out tick and removal bookkeeping over the *whole* week, and filter out past meals only for display.
  - Store a tick as a unit-free base quantity, and keep it while current need ≤ ticked. That also fixes F12 and F13.
  - Keep a removal while the current entry ids are a subset of the stamp.
  - Migrate `plan.listEdits`.
  - Add node:test cases for rolling over a day and for needing less.
- **Effort:** M · **Bucket:** now · **Related:** D-010, F12, F13, F19

#### F16 · "Today" is frozen at the last render, so Tonight shows yesterday and "Have this tonight" writes to the past
- **Votes:** C·C·C
- **Status at `30c7435`:** still open
- **Where:** `FeedScreen.tsx:38-39, 61, 100-103`; `PlanScreen.tsx:35, 38-40`; `useWeekList.ts:20-27` (`today` inside a `useMemo` that doesn't depend on the date); `useCounts.ts:9`; `suggestions.ts:24`; `BrowseSections.tsx:42-43`; `useSurprise.ts:27`; `RecipesScreen.tsx`/`FiltersScreen.tsx` (season); `SavedLists` (streak)
- **Evidence:** `grep AppState|useFocusEffect|useIsFocused src` returns nothing. Tab screens stay mounted and only re-render when a store changes.
- **Failure scenario:**
  1. The app is backgrounded at 8pm on Monday.
  2. At 6pm on Tuesday it resumes showing "Tonight · Monday" with Monday's dinner.
  3. On an unplanned night, "Have this tonight" writes to Monday and the toast says "on for tonight".
  4. Plan still labels Monday "Today", and the list still includes Monday's meal.
- **Fix:** add a `useToday()` hook in `src/lib` or `src/store` that updates on AppState `active` and at local midnight. Use it at every `toISODate(new Date())` site, and add it to the `useMemo` deps. Add a fake-timer Jest test that crosses midnight.
- **Effort:** S · **Bucket:** now · **Related:** North Star step 3, D-009

#### F39 · The recipe text parser strips the whole number from decimals: "1.5 kg" becomes "5 kg"
- **Votes:** C·C·C
- **Status at `30c7435`:** still open
- **Where:** `src/domain/recipes/draft.ts:47` (`LIST_MARKER = /^\s*(?:[-*•·▢□◦‣]+|\d+[.)]|step\s+\d+[:.)]?)\s*/i`), used by `cleanLines` (:49-54) for ingredients, method and notes
- **Evidence:**
  - `scratchpad/cord/p1-decimal.ts`: "1.5 kg beef chuck" → quantity 5 kg; "0.5 tsp salt" → 5 tsp; "2.25 cups" → 25 cups; the method line "2.5 hours later" → "5 hours later".
  - An imported "1.5 kg lamb shoulder" gives 5 kg.
  - Round-tripping the catalogue through the editor changes 27 of 285 recipes (`scratchpad/r5t/probe.ts`).
- **Failure scenario:** every own, imported or v1 custom recipe with a leading decimal scales, shops and cooks at 10× or 3×, with no warning. Recipes are re-parsed on every read, so the fix repairs existing recipes as well.
- **Fix:** `\d+[.)](?!\d)`, plus draft tests for 1.5 kg, 0.5 tsp and 2.25 cups. Strengthen the round-trip test (F210).
- **Effort:** S · **Bucket:** now · **Related:** D-005, D-021, F191, F210

#### F114 · The account lifecycle is in no phase: session source, sign-out teardown, in-app deletion, forgot password
- **Votes:** C·P·C. L2 notes that plan line 3 ("no v1 audit finding may come across") covers the intent. What's missing is the phase line itself.
- **Status at `30c7435`:** still open. `MISSING-FEATURES.md:64-68` proposes P8. D-030 makes accounts matter sooner, because "every account" gets free scans.
- **Where:** `docs/V1-PARITY-PLAN.md:101` (P8 is only "Sign in with Apple, Google and email. Profiles and handles."); `docs/PRODUCT.md:190-192`; `REBUILD-MAP.md:114`
- **Failure scenario:** if P8 is built as written:
  - there is no in-app account deletion, which Apple rejects under 5.1.1(v);
  - or deletion leaves the Apple token un-revoked and the RevenueCat subscriber in place, which was v1's gap;
  - email users can't reset their password;
  - sign-out leaves the previous user's data and push token behind.
- **Fix:** add an "Account lifecycle" block to P8:
  - one auth store fed by `onAuthStateChange`;
  - one awaited `signOut()` / `deleteAccount()` use case, with a test;
  - a delete edge function that revokes the Apple token, calls RevenueCat DELETE, purges storage, keeps reported content, tombstones DMs, requires a recent sign-in and sets `verify_jwt`;
  - forgot password;
  - an email-confirmation link.
- **Effort:** S (plan) / L (build) · **Bucket:** phase P8 · **Related:** v1 ARCH-4, ARCH-9, SEC-11, SEC-22, SOC-29; F115, F179

#### F116 · P8 says "restore Supabase" but has no purge of the seed accounts and no dev/prod split
- **Votes:** P·P·C (L1 and L2 put it at medium or high; L3 at high)
- **Status at `30c7435`:** still open
- **Where:** `V1-PARITY-PLAN.md:101`; `REBUILD-MAP.md:770`; `PRODUCT.md:281, 310`; D-005 covers device data only
- **Evidence:**
  - The v1 backend has pre-confirmed seed accounts with a guessable password, plus table-wide grants. See the private v1 repo and v1 audit SEC-5 and SEC-12. The details are deliberately not repeated here; see F204.
  - The plan says both "restore Supabase" and "a fresh, audited schema", but never says which project.
- **Failure scenario:** the old project is unpaused as-is, before the new schema lands. The seed accounts and out-of-band grants go live again. P9 then shows fake users in the feed.
- **Fix:** decide on a **new production project** (recommended) plus a separate dev project, with seed scripts that refuse the production ref. If the old project is ever reused, purge the seed users and their content, rotate keys and revoke grants *before* restoring. Record a decision on v1 server data.
- **Effort:** M · **Bucket:** Lachlan decision (before P8) · **Related:** F161, F204, v1 SEC-5, SEC-12, SOC-2

#### F117 · Legal documents, privacy policy, App Privacy labels, data export and Settings content have no phase, and P7 asks users to accept terms that don't exist yet
- **Votes:** P·P·C
- **Status at `30c7435`:** still open. D-030 sends photos to a third-party AI, which makes this more urgent.
- **Where:** `V1-PARITY-PLAN.md:99-104` (P11 has only the privacy *manifest*); `REBUILD-MAP.md:617-620`, whose old Phase 10 had legal pages and App Privacy but has been superseded by plan line 8; `SettingsScreen.tsx:51-81` has no legal or export rows
- **Failure scenario:** P7's consent screen links to missing terms, which repeats v1 SEC-3. At submission, the App Privacy answers and the privacy policy don't match what the app does.
- **Fix:**
  - **P6:** the Settings content (legal links, "Export my data", a crash-report opt-out).
  - **P7:** terms and privacy policy drafted, hosted and versioned before the consent screen.
  - **P9:** UGC terms accepted before a user's first post, stored on the server.
  - **P11:** App Privacy labels checked against the shipped data flows.
- **Effort:** M · **Bucket:** edit the plan now; build in P6, P7, P9 and P11 · **Related:** v1 SEC-3, SEC-13, SEC-24; F215

#### F121 · Australia's under-16 social media law isn't considered for a social app with a feed, likes and DMs
- **Votes:** C·C·P
  - L2 checked the web: the restrictions have been in force since 10 Dec 2025. Amendments in March 2026 reportedly focus on services with recommender feeds or logged-in engagement features.
  - L3 rated it medium, because applicability is uncertain.
- **Confidence:** medium on whether the law applies.
- **Where:** there is no age rule anywhere in `docs/`; D-026 adds a public feed, follows and DMs for an Australian audience; v1 had a self-declared 13+ checkbox
- **Failure scenario:** P8 and P9 ship social features with a 13+ checkbox. If the service is in scope, that isn't enough, and there are large penalties. The App Store age-rating answers also change with UGC and messaging.
- **Fix:** get a short legal opinion before P8's sign-up design. Options:
  - (A) 16+ with age assurance, if in scope;
  - (B) launch social as 16+ or 18+ with a gate and a matching age rating;
  - (C) narrow social at launch, for example no DMs.
  - Add "re-answer the age-rating questionnaire" to P11.
- **Effort:** M · **Bucket:** Lachlan decision (before P8) · **Related:** D-026, F215
- **Sources checked by L2:** Clayton Utz (May 2026) and DLA Piper (Feb 2026) summaries of the Social Media Minimum Age rules; eSafety's "social media age restrictions" page.

#### F122 · P10 payments leave out RevenueCat identity, never persisting the entitlement, subscription terms (3.1.2), Manage subscription and what happens when Pro lapses
- **Votes:** C·P·C
- **Status at `30c7435`:** still open. D-030's scan quota depends on the entitlement.
- **Where:** `V1-PARITY-PLAN.md:103` ("Paywall, RevenueCat, restore purchases"); `REBUILD-MAP.md:325` ("RevenueCat, anonymous app user IDs", in a section the plan says still holds), `:284` and `:598` (Pro state persisted and "survives restarts")
- **Failure scenario:**
  - A purchase made while signed out doesn't follow the account to another phone.
  - A shared device merges two people's purchases.
  - The paywall ships without the 3.1.2 disclosure, which gets it rejected.
  - A lapsed user is locked out of their own 4th and 5th collections (see also F213).
- **Fix:** extend P10:
  - use the Supabase uid as the RevenueCat app user id, with `logIn`/`logOut` in the session use case;
  - read the entitlement from the SDK and never persist it;
  - a webhook fills an `entitlements` table for server checks, including the scan quota;
  - 3.1.2 copy and legal links on the paywall;
  - a "Manage subscription" link;
  - on lapse, keep read access and gate only new creation.
  - Mark map §7 and §8 as superseded.
- **Effort:** S (plan) / M (build) · **Bucket:** phase P10 · **Related:** v1 PERF-7, SEC-17; F213

#### F212 · The Pro gate "planning next week" (D-003) collides with Monday-start weeks (D-009) and the Sunday North Star
- **Votes:** C·C·P (L3: medium, because it's latent until P10)
- **Status at `30c7435`:** still open. D-030 moves P5 ahead of P4, so this must be decided before P4.
- **Where:** `DECISIONS.md:32-33` (D-003) and `:57` (D-009); CLAUDE.md North Star step 1; `PRODUCT.md:27, 47, 124, 238`; `PlanScreen.tsx:1-3, 38-40` (on Sundays it already opens next week); `week.ts:48-61`; `notifications.ts:53-70` (the reminder fires Sunday 4pm)
- **Evidence:**
  - `visibleWeeks('2026-10-04')`, a Sunday, returns thisWeek 28 Sep and nextWeek 5 Oct. The week you plan on Sunday is "next week".
  - `PRODUCT.md:124` asks this exact question and no decision answers it.
- **Failure scenario:** once P10 builds D-003 as written, every free user who taps "Plan the week?" on a Sunday hits the paywall at step 1 of the North Star. D-003's own "why" says that must never happen.
- **Fix:** a Lachlan decision. Recommended: free covers "the week you're planning", meaning this week, or next week from Sunday on. Add `plannableFreeWeek(today)` in `src/domain/plan/week.ts` with tests that cover Sunday, and close `PRODUCT.md:124` in D-009.
- **Effort:** S · **Bucket:** Lachlan decision (before P4) · **Related:** D-003, D-009, F18, F213

### 3.3 Medium

Each medium finding below gives: votes and status at `30c7435`, where it is, the evidence and failure scenario, and the fix, effort and bucket.

#### Correctness: plan, list, cupboard and Feed

**F13 · When you need *less* of an item, it unticks**
- **Votes:** C·C·C. Still open.
- **Where:** `derive.ts:139, 160`
- **Evidence and scenario:** ticks are compared with strict equality, while the comment at :160 says only needing *more* should untick. Drop Wednesday to 1 serving and the ticked onion comes back as "1½ to buy".
- **Fix:** keep the tick while need ≤ the ticked base amount; this is part of the F11 fix.
- **Effort:** S · **Bucket:** now

**F14 · Unticking a mis-tap moves the item into "In your cupboard" and leaves it out of Send list**
- **Votes:** C·C·C. Still open.
- **Where:** `ShoppingListView.tsx:33-36`; `useWeekList.ts:23-24`
- **Evidence and scenario:** a tick adds the item to the cupboard, and an untick never takes it out. `ticks.ts` shows the untick leaves "cupboard has ['brown-onion']". PRODUCT §4.7 says the move is "undoable".
- **Fix:** on untick, remove a cupboard item whose source is 'shop'.
- **Effort:** S · **Bucket:** now

**F15 · Anything ticked once stays in the cupboard for every later week, and Send list leaves it out**
- **Votes:** C·P·P. Still open.
- **Where:** `store/cupboard.ts:20` (`moveTickedToCupboard: true`); `derive.ts:142-145, 179`
- **Evidence and scenario:** in week 2 the onions, eggs and cream sit under "In your cupboard", which is not shared, so the partner doesn't buy them. It's designed behaviour (PRODUCT.md:50, 150), but nothing ever uses items up.
- **Fix:** a Lachlan decision. Options: only long-life items move to the cupboard; shop-sourced items expire; or cupboard items go in the shared text as "check you have".
- **Effort:** M · **Bucket:** Lachlan decision (now P5, under D-030)

**F131 · Add-to-plan "Ideas" is the first 25 recipes alphabetically, and Cupboard's "What can I make?" ignores diet and avoid words**
- **Votes:** P·P·P. Still open.
- **Where:** `AddToPlanSheet.tsx:47-53`; `CupboardScreen.tsx:52-61`
- **Evidence and scenario:**
  - The Ideas pool is `all.filter(slot).slice(0, 25)`. For a vegetarian, all 25 are meat dishes (from Arepas to Beef Tacos), and it's the same every time.
  - What can I make lists meat dishes for a vegetarian.
  - Correction: hidden recipes *are* excluded.
  - Under D-030 the cupboard brief calls this "a v2 bug … ship first", so it should rise to **high** at P5.
- **Fix:** a shared `fitsTaste()` in `domain/recipes/diets.ts`, applied to Ideas and canMake, with Ideas ranked by the For-you scorer.
- **Effort:** S · **Bucket:** now / first step of P5

**F134 · Extras typed onto the list disappear when the week rolls over**
- **Votes:** C·P·P. Still open.
- **Where:** `useWeekList.ts:16`; `ShoppingListView.tsx:44-48`; `plan.ts`
- **Evidence and scenario:** extras are saved in `listEdits[week]`. "Bin bags", added on Thursday, has gone by Monday. It's kept in storage for 8 weeks but can't be reached.
- **Fix:** carry unticked extras forward when the list is worked out. This needs no migration.
- **Effort:** S · **Bucket:** Lachlan decision (D-010 doesn't mention extras)

**F136 · Custom avoid words hide the wrong recipes**
- **Votes:** C·C·C. Still open.
- **Where:** `src/domain/recipes/diets.ts:82-95`
- **Evidence and scenario** (proofs `r2s/avoid2.ts`, `avoid3.ts`, `v2i/avoid.ts`):
  - "olives" hides 124 recipes, because it also matches "olive oil".
  - "peppers" hides 182 (black pepper).
  - "cheese" hides 26 of the 98 dishes that contain cheese.
  - "chillies" hides 35, but "chilli" hides 80.
  - Surprise and Tonight lose about 43% of dinners.
- **Fix:**
  - Map each custom word to its database ids and their family or group.
  - Don't word-match lines whose resolved id is something else.
  - Singularise "-ies" to "-i".
  - Show "hides N recipes" in FoodSettings.
  - Tests.
- **Effort:** M · **Bucket:** now (more important under D-030) · **Related:** D-006, F181, F189, F211

#### Correctness: search and Surprise

**F24 · A typo rule matches unrelated words, and title typos outrank exact ingredient matches**
- **Votes:** C·C·C. Still open.
- **Where:** `search.ts:45-48, 77-83`
- **Evidence and scenario:** "corn" returns 106 results, of which 39–40 contain corn, and the first is Chicken Cordon Bleu. "mint" puts Minestrone first; "pear" gives 37 results, 5 of them real.
- **Fix** (L3 prototyped it in `cora/l3search.ts`): search without typos first, and only fall back to typo matching when that finds nothing. Result: corn 106→38, mint 56→22, with "chiken", "chik" and "lasgna" unchanged. Add tests.
- **Effort:** S · **Bucket:** now

**F25 · The first letter of a search, or of a new word, shows "No recipes match"**
- **Votes:** C·C·C. Still open.
- **Where:** `search.ts:37, 44-45, 85`; `RecipesScreen.tsx:129-137`
- **Evidence and scenario:** "c" gives 0 results and "chicken t" gives 0. The empty state and a "0 recipes" live region flash on the first keystroke of every search. Also, "ch" matches 230 of 285.
- **Fix:** allow the last word to prefix-match from 1 letter. Tested: "chicken t" gives 89.
- **Effort:** S · **Bucket:** now

**F28 · Surprise keeps showing a result that breaks the time limit you just picked**
- **Votes:** C·C·P. Still open.
- **Where:** `SurpriseScreen.tsx:32-34, 73, 91-108`
- **Evidence and scenario:** spin on "Any time" and get a 2-hour braise, then tap "30 min". The braise stays, and "Cook it" starts it.
- **Fix:** when the chip changes, clear the timers, the reel and the result.
- **Effort:** S · **Bucket:** now

#### Correctness: recipe page, ingredients and Cook

**F37 · Planned servings are dropped on the way to the recipe page and Cook Mode**
- **Votes:** P·C·P. Still open.
- **Where:** `RecipeScreen.tsx:41`; `app/recipe/[id]/index.tsx:6-7`; `PlanEntryRow.tsx:49`; `FeedScreen.tsx:43, 67`; `PlanRecipeSheet.tsx:41`
- **Evidence and scenario:**
  - A curry planned "for 8" opens at "Serves 4", and Cook from the page cooks for 4, while the list bought for 8. PRODUCT §4.3 names this as v1's bug.
  - Correction: the Feed's "Start cooking" button does pass servings.
- **Fix:** add a `servings` route param, passed from the plan row and the Tonight card, and pass the page's servings into the plan sheet.
- **Effort:** S · **Bucket:** now

**F38 · Common written amounts are silently misread in imports and own recipes**
- **Votes:** C·C·P. Still open.
- **Where:** `quantity.ts:22, 32-33`; `parse.ts:11, 59-71`
- **Evidence and scenario:** "1,000 g" becomes 1 g; "1 ½ cups" becomes 1; "1-1/2 cups" becomes 1 cup. Second amounts don't scale ("300 g/10 oz" ×2 gives "600 g/10 oz"). None of this is flagged. The catalogue itself is unaffected (0 of 4,966 lines).
- **Fix:** read `\d{1,3}(,\d{3})+` as thousands; allow a space before unicode fractions; read `N-N/N` as a mixed number; raise a "second-amount" parse issue. Tests.
- **Effort:** M · **Bucket:** now

**F40 · Scaled spoons and cups print as decimals or "0"**
- **Votes:** C·C·P. Still open.
- **Where:** `quantity.ts:56-63, 76-88`; `format.ts:55`
- **Evidence and scenario:** saag paneer scaled from 4 to 6 shows "0.4 tsp turmeric"; pumpkin soup scaled from 6 to 1 shows "0 tsp nutmeg". That's 356 of 12,635 scaled renders, in 79 recipes.
- **Fix:** add eighths, step small amounts down a unit, and never print 0 (use "a pinch").
- **Effort:** S · **Bucket:** now · **Related:** F41

**F45 · Leaving Cook Mode silently kills running timers and forgets the step, and the same timer can start twice**
- **Votes:** C·P·C. Still open.
- **Where:** `useCookTimers.ts:11, 31-46`; `CookScreen.tsx:40, 70-80`
- **Evidence and scenario:**
  - Start a 2-hour braise timer, then tap × to check the ingredients. The alert is cancelled without a word, and Cook reopens at step 1.
  - Tapping the same time twice starts two timers (`timers.race.test.tsx`).
- **Fix:** confirm before leaving while a timer runs, and dedupe by step and label. The fuller fix is a non-persisted `cookSession` store.
- **Effort:** M · **Bucket:** now (confirm) / P6 (session)

**F46 · If notifications are denied, timers silently won't alert, and a permission error goes unhandled**
- **Votes:** C·P·C. Still open.
- **Where:** `useCookTimers.ts:26, 43-45`; `notifications.ts:16-23`; `CookScreen.tsx:118`
- **Evidence and scenario:** a cook who once tapped "Don't allow" locks the phone during a 25-minute timer and nothing sounds. There's no message anywhere.
- **Fix:** try/catch around the permission call. On false, show a toast with "Open Settings" (`Linking.openSettings`).
- **Effort:** S · **Bucket:** now · **Related:** F137, F188

**F48 · A cold-start deep link, including the app's own share link, has no way back: Back, × and Done do nothing**
- **Votes:** C·C·C. Still open.
- **Where:** `src/app/_layout.tsx` (no `unstable_settings`); `RecipeScreen.tsx:78, 136`; `CookScreen.tsx:50, 72, 80`
- **Evidence and scenario:**
  - The Jest `renderRouter` proof shows a cold link to `/recipe/x/cook` has `canGoBack` false. With an anchor on `(tabs)` it's true.
  - A partner taps a shared `thepantry://recipe/…` link and is trapped on the page. In Cook, Done logs the cook but stays put.
- **Fix:** `export const unstable_settings = { anchor: '(tabs)' }`, plus a `goBackOr('/')` helper.
- **Effort:** S · **Bucket:** now · **Related:** F66, F206

**F49 · Imperial mode leaves °C and metric amounts in method steps**
- **Votes:** C·P·C. Still open.
- **Where:** `RecipeBody.tsx:93-120`; `CookScreen.tsx:75, 107`
- **Evidence and scenario:** 128–185 steps include °C. An imperial cook sees "Heat the oven to 200°C" and sets 200°F. The spec's settings label promises "Imperial (oz, cups, °F)", although D-013 only covers ingredients.
- **Fix:** a pure `localiseStepText()` in `src/domain` that converts °C to °F rounded to 5.
- **Effort:** S · **Bucket:** now

**F169 · Cook Mode's ingredient view drops the group headings, so repeated ingredients can't be told apart**
- **Votes:** C·C·C. Still open.
- **Where:** `CookScreen.tsx:91-96`; `types.ts:82-84`
- **Evidence and scenario:** 273 of 285 recipes have several groups, and 170–175 repeat an ingredient across them. At the stove you see "50 g butter" and "80 g butter" with no "Mash" or "Gravy" heading, and the lines aren't capitalised.
- **Fix:** render group titles, sharing the list with RecipeBody through `src/ui/patterns`.
- **Effort:** S · **Bucket:** now

**F188 · Cook timer notifications aren't time-sensitive, so Focus modes and Scheduled Summary silence them**
- **Votes:** C·C·C. Still open.
- **Where:** `src/lib/notifications.ts:25-31`; `app.json` has no `ios.entitlements`. Confirmed in a prebuild in the scratchpad.
- **Evidence and scenario:** with a Focus on in the evening, the pasta timer is filed silently and dinner overcooks. `useKeepAwake` helps only while the app stays on screen.
- **Fix:** add `interruptionLevel: 'timeSensitive'` for timers only, plus the entitlement `com.apple.developer.usernotifications.time-sensitive` in app.json. It's self-serve, but tell Lachlan first because it changes the App ID's capabilities.
- **Effort:** S · **Bucket:** now (Lachlan OK)

#### Correctness: editor, import, library and navigation

**F54 · "Save to finish later" on an existing, finished recipe demotes it to a draft**
- **Votes:** C·P·C. Still open.
- **Where:** `RecipeEditorScreen.tsx:74-79`; `useRecipeEditor.ts:57-63`; `recipeBook.ts:21-23`
- **Evidence and scenario:** a planned recipe edited into an incomplete state drops out of the plan, the list, Cookmarks and collections. The plan row then offers "no longer available · Remove", which invites real data loss. The ids are kept.
- **Fix:** for a recipe that was already finished, offer "Discard changes" instead of the draft save.
- **Effort:** S · **Bucket:** now

**F55 · Badges and counts include ids that can't be resolved, so they disagree with the lists**
- **Votes:** C·C·P. Still open.
- **Where:** `useCounts.ts:15-18`; `SavedLists.tsx:101`; `CollectSheet.tsx:46`
- **Evidence and scenario:** the drawer shows "Cookmarks 12" over an empty list. Store builds hide every draft, so every imported v1 bookmark counts but doesn't show.
- **Fix:** work out counts from resolved recipes through `useRecipeLookup`.
- **Effort:** S · **Bucket:** now

**F56 · The editor's "Save to finish later" and Delete push My recipes *on top of* the editor**
- **Votes:** C·C·C. Still open.
- **Where:** `useRecipeEditor.ts:62, 70`; expo-router `StackClient.js:95-105`
- **Evidence and scenario:** after saving, Back reopens the stale editor, and saving again makes a duplicate recipe.
- **Fix:** `router.dismiss()`, then navigate. `dismissTo` alone pushes when there's no match.
- **Effort:** S · **Bucket:** now

**F168 · The editor says "Add at least one ingredient" for any bad ingredient line**
- **Votes:** C·C·P. Still open.
- **Where:** `draft.ts:104-106`; `validate.ts:41-52`; `RecipeEditorScreen.tsx:76, 119`
- **Evidence and scenario:** with 10 ingredients on screen, a line reading "0-1 tsp chilli" or "0 cups flour" gives that message and doesn't name the line.
- **Fix:** treat a quantity ≤ 0 as missing and add it to the "unsure" note, or quote the line in the message.
- **Effort:** S · **Bucket:** now

**F189 · "X or Y" lines take their diet and avoid result from the longest option name, not the first**
- **Votes:** P·C·P. Still open.
- **Where:** `database.ts:97-106` (the longest phrase wins); `parse.ts:103-105`; the editor copy at `RecipeEditorScreen.tsx:41` promises "the first one"
- **Evidence and scenario:** "400 g lamb or eggplant" is tagged vegan and passes a lamb avoid. "300 g chicken or firm tofu" is also tagged vegan. Many catalogue "or" lines are *correct* because of the same longest match ("beef or lamb mince" gives beef-mince).
- **Fix:** carry the shared trailing noun over to the first option. Alternatively, be conservative: tag a diet only if every option fits, and trigger an avoid if any option matches. Update the copy to match.
- **Effort:** S–M · **Bucket:** now

**F191 · Lists pasted with common bullets (– — ● ○ ▪ ✓ ☐ ➤ "a)") lose every amount, with no warning**
- **Votes:** C·C·C. Still open.
- **Where:** `draft.ts:47, 78`
- **Evidence and scenario:** a list from Word or Notes gives "● 2 carrots" unscaled, with no list amounts and the glyph shown in Cook. No quantity also means no "unrecognised" flag, and no diet block for meat lines.
- **Fix:** widen `LIST_MARKER` to cover these glyphs and `[a-z][.)]`, and let "Step n" swallow a following dash.
- **Effort:** S · **Bucket:** now · **Related:** F39

**F206 · "Browse recipes" on pushed pages stacks a second copy of the whole tab bar each time**
- **Votes:** C·C·C. Still open.
- **Where:** `SavedLists.tsx:61, 76, 139`; `CollectionScreen.tsx:102`; `RecipeScreen.tsx:65`; `NotFoundScreen.tsx:14`
- **Evidence and scenario:**
  - `renderRouter` proof: `(tabs), saved, (tabs)` keeps growing with every loop. The drawer's `dismissTo('/')` only reaches the nearest copy.
  - An empty Cookmarks page, the normal first-run state, is enough to trigger it.
- **Fix:** a shared `goToTab(href)`: `dismissTo` when `(tabs)` is in the stack, otherwise `replace`. `dismissTo` alone throws from a cold link.
- **Effort:** S · **Bucket:** now

#### Data integrity

**F02 · If the plan fails to load, the next plan change overwrites the saved plan**
- **Votes:** C·P·P.
- **Status at `30c7435`:** partly fixed. The plan is now gated and a truncated value is backed up. A failed *read* still loads an empty store and gets overwritten (F216), and `entries:null` still throws in `onRehydrateStorage`.
- **Where:** `plan.ts:49-57`
- **Fix:** see F216. Also guard `Array.isArray(entries)` in `onRehydrateStorage`.
- **Effort:** S · **Bucket:** now

**F05 · A failed save (storage full) is silent: memory and disk diverge**
- **Votes:** C·P·C.
- **Status at `30c7435`:** partly fixed. The rejection is now caught, but the only response is `console.warn`, and the user is never told.
- **Where:** `storage.ts:8`, and every store action
- **Evidence and scenario:** on a full phone, everything looks saved and is gone after a kill. The next successful write repairs it.
- **Fix:** an `onSaveFailed` hook, and one toast: "Couldn't save, your phone's storage is full".
- **Effort:** S · **Bucket:** now

**F09 · The old-app import reads field names the old app never wrote, so cook history and recents are never imported**
- **Votes:** C·C·P (L1 high, L2 and L3 medium). Still open.
- **Where:** `src/domain/legacy/oldApp.ts:165-169, 178`; the fixture at `oldApp.test.ts:17-50` uses the same made-up names
- **Evidence and scenario:**
  - The old app persists `recents` and `cookedRecipes: string[]` (v1 `useStore.ts:115, 139`). v2 reads `cookLog[{id,at}]` and `recentlyViewed`. `git log -S` in v1 finds neither name.
  - Every tester loses their cook history. The marker, written first, blocks a fixed importer from ever running again.
- **Fix:** read the real fields and rebuild the fixture from the old type. `cookedRecipes` has no dates, so the date to use is a Lachlan decision. **It must ship before any tester opens v2.**
- **Effort:** S · **Bucket:** now (urgent) · **Related:** D-005, D-024, F07, F145–F149

**F181 · An unrecognised ingredient line with no amount doesn't block vegetarian or vegan tags**
- **Votes:** C·C·C. Severities: L1 medium, L2 low, L3 medium. Still open.
- **Where:** `diets.ts:28`. The guard applies only when `quantity !== undefined`, which contradicts its own comment at :24-25.
- **Evidence and scenario:** "400 g pasta / nduja, to serve" is tagged vegetarian, vegan and no-dairy (`cc/diet.mts`). The recipe then reaches a vegan's Surprise and Tonight. The catalogue is unaffected.
- **Fix:** drop the quantity condition, and add a test.
- **Effort:** S · **Bucket:** now · **Related:** F136, F189, F211

**F211 · Plain "pork", "lamb", "fish" and "tempeh" match no ingredient, so the preset avoid options miss them**
- **Votes:** C·C·P. Still open.
- **Where:** `src/data/ingredients/ingredients.json`; `diets.ts:88-92`
- **Evidence and scenario:** "500 g pork, diced" in your own or an imported recipe isn't hidden from someone who avoids pork. Typing "pork" as a custom word does work. Scans under D-030 will produce generic words like these.
- **Fix:** add generic entries to the database, and add a group-name word fallback for unrecognised lines.
- **Effort:** S · **Bucket:** now

**F150 · The recipe-fix converter breaks D-014's rule that a fix "matches exactly once or the conversion fails"**
- **Votes:** C·C·P. Still open.
- **Where:** `scripts/convert-old-recipes.mts:89, 102-109, 159, 252`
- **Evidence and scenario:**
  - In a copy of the repo: a fix that matches in two groups is applied twice; a fix that matches nothing is dropped silently; an unknown recipe key is ignored. The run still reports "0 problems".
  - When a step fix does fail, `recipes.json` has already been written.
  - A mistyped safety fix made during vetting would never ship.
- **Fix:** count hits across all of a recipe's groups; report unknown keys and zero matches; write outputs only when there are no problems; treat warnings separately from errors.
- **Effort:** S · **Bucket:** now (before vetting)

**F151 · There's no pipeline path to mark a recipe vetted or fix its times, servings or difficulty**
- **Votes:** C·C·C. Still open.
- **Where:** `convert-old-recipes.mts:33, 36, 150` (`provenance: 'ai-draft'` is hard-coded); `recipes.test.ts:131-133` asserts every recipe is a draft
- **Evidence and scenario:** D-008 vetting and K-4's time fixes can't be done without hand-editing `recipes.json`, which D-014 bans. The first vetted recipe would turn CI red. The store build stays empty (F68).
- **Fix:** add `vetted` and numeric overrides to the fix and tag files, validate them, loosen the test, and add the "Tested in The Pantry kitchen" label.
- **Effort:** S–M · **Bucket:** now

**F152 · "Vegetarian" recipes contain rennet cheeses, and optional meat lines are ignored by diet tags**
- **Votes:** P·P·P. Still open.
- **Where:** `diets.ts:9-16, 33`; `ingredients.json`
- **Evidence and scenario:**
  - 17–19 of 45 vegetarian recipes contain parmesan, pecorino or gruyère.
  - Minestrone is tagged vegetarian while listing "pancetta (optional)". Caesar salad is tagged pescatarian with optional bacon.
  - "Pancetta (optional)" lands on a vegetarian's shopping list.
- **Fix:** a Lachlan decision on rennet, since recipe sites commonly tag these dishes vegetarian. Separately, count optional *meat and seafood* lines when tagging diets.
- **Effort:** S–M · **Bucket:** Lachlan decision

**F158 · Vegan users have only 5 eligible dinners**
- **Votes:** C·C·C. Still open.
- **Where:** `recipes.json`. Dinner pools: vegan 5, vegetarian 35, pescatarian 70, everything 254.
- **Evidence and scenario:** Tonight, For you and Surprise cycle through the same 5 dishes. Under D-030, cupboard matches are limited too.
- **Fix:** a content decision. Add or retag vegan dinners through the fix files, or design a "we're short on vegan dinners" state.
- **Effort:** M · **Bucket:** Lachlan decision

#### Security and privacy

**F204 · This public repo publishes the v1 backend's unfixed security holes while that backend still exists and P8 plans to restore it**
- **Votes:** C·P·P. All three verifiers rated it medium, conditional on a restore; it's low while the project stays paused. Still open.
- **Where:** `docs/audits/2026-09-30-original-app/security.md` and `social.md`, added in `cf72e98`, so they're in history too
- **Evidence and scenario:**
  - The v2 repo is **public** and the v1 repo is private (checked through the GitHub API).
  - Secrets are cut to their first 4 characters. But one prefix is part of a dictionary-word password, and its hint makes it guessable.
  - If the paused project is ever unpaused as-is (for a backup, or at P8), every listed hole becomes usable by anyone who holds a v1 TestFlight binary.
- **Fix:** a Lachlan decision:
  - (a) make the repo private (one click), and
  - (b) never restore the old project as-is (F116).
  - Optionally, replace the partial password in `security.md` with `<redacted>`.
- **Effort:** S · **Bucket:** Lachlan decision (time-sensitive with F161)

**F161 · The paused v1 Supabase project still needs backing up**
- **Votes:** C·P·P. Still open.
- **Where:** `REBUILD-MAP.md:770` (map §14 #7, "This week"); `PRODUCT.md:281, 310`
- **Evidence and scenario:** a free-tier project that stays paused for a long time may only be downloadable, not restorable. Testers' server data (accounts, posts, messages) would then be lost before P8 decides whether to migrate it. The v1 schema itself is safe in the private v1 repo.
- **Fix:** Lachlan backs up the project, or checks when it was paused. No agent may touch it.
- **Effort:** S · **Bucket:** Lachlan decision (now)

#### UI fidelity

**F67 · The launch splash is Expo's placeholder (a grey grid with circles) on an off-palette cream**
- **Votes:** C·C·C. L1 rated it high, L2 and L3 medium. Still open.
- **Where:** `assets/brand/splash-icon.png`; `app.json:11, 38-47` (`#F7F3EA`, while the `bg` token is `#FFFFFF`)
- **Evidence and scenario:** every cold start shows graph paper, then jumps to a white app. The map's "done when" says it should show the branded splash.
- **Fix:** a wordmark splash, with backgrounds set to the light and dark `bg` tokens, and a token test that checks app.json.
- **Effort:** S · **Bucket:** now

**F92 · The recipe action row overflows at 320 pt, and at large text on bigger phones**
- **Votes:** P·P·P. Still open.
- **Where:** `RecipeHeader.tsx:61-84, 189-200`
- **Evidence and scenario:**
  - At 320 pt (iPhone SE with Display Zoom) the Cook pill runs about 15 pt into the gutter (`shots/recipe-320-light.png`).
  - At 375 pt it fits at default text size.
  - With larger Dynamic Type, "Cooked" is pushed off screen.
- **Fix:** `flexWrap: 'wrap'` with a row gap.
- **Effort:** S · **Bucket:** now

**F93 · Step numbers 10 to 12 wrap onto two lines**
- **Votes:** C·C·C. Still open.
- **Where:** `RecipeBody.tsx:100-102, 168`; `type.ts:92, 172` (a 22 pt box for 22 pt bold digits)
- **Evidence and scenario:** 28 recipes have 10 or more steps; `shots/crop-wellington-steps.png` shows "1/0" stacked.
- **Fix:** use `minWidth`, or a token of about 30 pt, plus `numberOfLines={1}`.
- **Effort:** S · **Bucket:** now

**F94 · The "+" button is 66 pt against v1's 56, and "Cupboard" truncates at 320 pt**
- **Votes:** P·C·P. Still open.
- **Where:** `TabBar.tsx:104-106` (`CHROME.fab + CHROME.fabRing*2`)
- **Evidence and scenario:** v1's Toolbar draws the 5 pt ring *inside* 56 pt, so v2 misses D-025 on every tab screen. At 320 pt the label shows "Cupbo…".
- **Fix:** make the button `CHROME.fab` wide, with the ring as an inner border.
- **Effort:** S · **Bucket:** now

**F78 · About 60 numeric style values and about 12 "token ± n" tweaks sit outside the tokens, and lint only bans colours**
- **Votes:** C·C·C. Still open.
- **Where:** `CookScreen.tsx:106, 115` (`fontSize: 30, lineHeight: 42`); `RecipeHeader.tsx:182-217`; `RecipeBody.tsx:151-173`; `Toast.tsx:54`; `SearchField.tsx`; `ModalSheet.tsx`; and about 25 more; `eslint.config.js:8-25`
- **Evidence and scenario:** CLAUDE.md's "Design tokens only" rule and plan rule 7 are broken. A redesign that changes the SPACE or TYPE tokens would miss 29 files.
- **Fix:** move the values into tokens, then add a `no-restricted-syntax` rule for numeric literals on style keys (allowing 0, 1 and hairlines) and for `SPACE.x ± n`.
- **Effort:** M · **Bucket:** now · **Related:** v1 QUAL-12, QUAL-34

#### Accessibility

**F95 · High contrast makes things worse: dark high contrast drops text on amber to 1.67:1**
- **Votes:** C·P·C. Still open.
- **Where:** `colour.ts:108-141`; `tokens.test.ts:26-39, 60-65`
- **Evidence and scenario:**
  - `onAccent` on `accent`: dark 2.04, dark high contrast 1.67. That covers the Plan badge, the "Cooked" pill and "Time's up".
  - In light high contrast, `danger` is unchanged.
  - The selected tab is shown by colour alone, at 1.7:1 in high contrast.
  - The high-contrast values are v1's, but high contrast is opt-in, so D-025 doesn't block fixing it.
- **Fix:** `onAccent: '#000000'` in dark high contrast; a darker `danger` in light high contrast; a non-colour cue for the selected tab; test every watched pair at ≥ 4.5 in both high-contrast themes.
- **Effort:** S · **Bucket:** now

**F97 · Every "something changed" announcement only works on Android; VoiceOver on iPhone hears nothing**
- **Votes:** C·C·P. Still open.
- **Where:** `accessibilityLiveRegion` at `CookScreen.tsx:81`, `TimerBar.tsx:18`, `RecipesScreen.tsx:92`, `SurpriseScreen.tsx:92`, `TextField.tsx:29`, `RecipeEditorScreen.tsx:33, 75, 81`, `FeedScreen.tsx:51`. In RN 0.86 this prop is serialised on Android only.
- **Evidence and scenario:** Cook Mode "Next step" reads nothing, and the editor's validation errors are silent.
- **Fix:** an `announce()` helper that wraps `AccessibilityInfo.announceForAccessibility`, used on step change, timer done, results count, Surprise result and field errors.
- **Effort:** M · **Bucket:** now · **Related:** v1 QUAL-24

**F98 · VoiceOver can't reach the bookmark disc on recipe cards**
- **Votes:** C·C·C. Still open.
- **Where:** `RecipeCard.tsx:72-98, 118-128`. The disc Pressable sits inside the accessible card Pressable.
- **Fix:** give the card `accessibilityActions=[{name:'save'}]` and `onAccessibilityAction`, plus a test.
- **Effort:** S · **Bucket:** now

**F99 · Six tap targets are under 44 pt**
- **Votes:** C·C·C. Still open.
- **Where and sizes:** ingredient rows 36 (`RecipeBody.tsx:151`); Cook pill 36 and Edit pill about 34 (`RecipeHeader.tsx:181-197`); Segmented small 36 (`Segmented.tsx:51`); the browse pill about 31 (`RecipesScreen.tsx:158-168`); search clear 42 (`SearchField.tsx:43`)
- **Evidence and scenario:** this breaks plan rule 9, and floury fingers miss.
- **Fix:** add `hitSlop` to reach 44 without changing the look.
- **Effort:** S · **Bucket:** now

**F100 · VoiceOver and Switch Control users can't reach a toast's Undo in time**
- **Votes:** P·P·P. Still open.
- **Where:** `Toast.tsx:19-38`
- **Evidence and scenario:** the message is announced, but Undo isn't mentioned, and the toast disappears after 4.5 s. Deleting a collection has no confirm, so Undo is the only way back.
- **Fix:** when a screen reader is on, say "Undo available" and keep the toast until it's dismissed. Consider the magic tap.
- **Effort:** S · **Bucket:** now

**F182 · There's no keyboard avoidance on iOS, so fields low on the screen end up under the keyboard**
- **Votes:** P·C·C. Still open.
- **Where:** `Screen.tsx:40-49` and `Sheet.tsx:28`, neither using `automaticallyAdjustKeyboardInsets`. In RN 0.86, `RCTScrollViewComponentView.mm:149, 189-191` only insets when that flag is set.
- **Evidence and scenario:** the editor's Notes and Method fields, "Add something else" on the list, and the new-collection field all sit under the keyboard. The map lists "sheets hidden by the keyboard" as a v1 failure that v2 must fix.
- **Fix:** add `automaticallyAdjustKeyboardInsets` to both ScrollViews, then check the formSheets on a device.
- **Effort:** S · **Bucket:** now

#### Performance

**F87 · Search runs a full fuzzy scan on every keystroke on the JS thread, with nothing deferred**
- **Votes:** C·P·C. Still open.
- **Where:** `search.ts:9-89`; `useRecipeResults.ts:18-24`; `AddToPlanSheet.tsx:44-53`
- **Evidence and scenario:** 90–370 ms per key with the JIT turned off (as a stand-in for Hermes), in dev and preview builds with 285 recipes. Store builds with about 80 vetted recipes are about 3.5× cheaper.
- **Fix:** score each distinct word once, use a rolling-row `editDistance`, `useDeferredValue`, and share one index.
- **Effort:** M · **Bucket:** now

**F88 · Release builds bundle 41 MB of photos and 1.5 MB of JSON for recipes they never show**
- **Votes:** C·P·P. Still open.
- **Where:** `src/data/catalogue/images.ts` (285 static `require`s); `catalogue.ts:6-13`
- **Evidence and scenario:** today 0 recipes are vetted. At launch about 70% will still be hidden.
- **Fix:** the converter emits a vetted-only image map and JSON for production (through a resolver alias or build flag), checked with `expo export --dump-assetmap`.
- **Effort:** M · **Bucket:** Lachlan decision (EAS profiles)

#### Architecture and tests

**F76 · Store transitions, hydration, migrations, the old-app merge and feature hooks are untested; business rules live outside `src/domain`**
- **Votes:** C·C·C.
- **Status at `30c7435`:** partly fixed. `savedState` helpers are now tested.
- **Where:** `src/store/*`; `oldAppImport.ts:46-98`; `useWeekList.ts:20-27`; `weekChoices.ts`
- **Fix:** pure reducers in `src/domain` (collections, plan entries, legacy merge, days) with tests; migration fixtures; Jest tests for the import and startup.
- **Effort:** L · **Bucket:** now

**F210 · Tests don't constrain behaviour: 33 of 34 realistic mutations survive `npm run test:domain` at 98.5% line coverage**
- **Votes:** C·C·C. Two verifiers re-ran the mutations in isolated copies. Still open.
- **Where:** all `src/**/*.test.ts`. For example `recipes.test.ts:53-68`, `draft.test.ts:79-86`, `week.test.ts:28-61`, `derive.test.ts:100-127`, `tokens.test.ts:26-58`.
- **Evidence and scenario:** these mutations all survived:
  - "nuts" no longer covers peanuts (M33);
  - the share text includes ticked items (M08);
  - `isPast` includes today (M05);
  - `addDays` uses milliseconds, which breaks at April's daylight-saving change in Sydney (M01);
  - the old-app `cookedAt` equals now (M36);
  - the light accent is almost invisible (M34).
  - The round-trip test only counts lines, so it misses F39.
  - Several tests lock in known bugs (F42, F65, F193 and the F11 mechanism).
  - The full mutation table is in `scratchpad/r5t/mut.out`.
- **Fix:**
  - table-driven avoid and diet tests;
  - share-text tests with ticked and optional items;
  - week boundary and DST tests;
  - small hand-made pools for Surprise and For you;
  - a field-level round-trip test;
  - a contrast floor per known failure;
  - `TZ` in the `test:domain` script;
  - mark tests that encode bugs with their finding ID.
- **Effort:** M · **Bucket:** now

#### Release readiness

**F68 · The screenshot build (`export:web`) and every production build show zero recipes, and nothing checks for it**
- **Votes:** C·C·C. Still open.
- **Where:** `catalogue.ts:11-13`; `package.json` `export:web`; `eas.json` production
- **Evidence and scenario:** all 285 recipes are `ai-draft`. CLAUDE.md's screenshot step renders empty states. A production build, TestFlight included, ships an empty app, which App Review would reject under 2.1. The filtering itself is deliberate (D-008, D-018).
- **Fix:** add `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1` to `export:web`, plus a pre-build check that the vetted count is at least N for production. Lachlan sets N.
- **Effort:** S · **Bucket:** now / Lachlan decision (N)

**F69 · One root error boundary that ignores the error, can loop on "Try again", has no way home and logs nothing**
- **Votes:** C·P·P. Still open.
- **Where:** `_layout.tsx:16-22`; `RootErrorScreen.tsx:10-21`. Plan rule 11 asks for a boundary per route.
- **Fix:** export `ErrorBoundary` from the tabs, recipe, my-recipe, collections and plan groups; add "Go to Tonight"; add `src/lib/logger.ts` with Sentry to follow in P11.
- **Effort:** M · **Bucket:** now · **Related:** v1 ARCH-10, K-8

**F70 · Plan rule 10 isn't met for P1 to P3**
- **Votes:** C·P·P (L3: high, as a process issue).
- **Status at `30c7435`:** **partly fixed.** 16 Maestro flows were added, Checkbox, Stepper and Switch take a testID, and 195 of 209 controls now have one. Still missing: no screen is rendered in any component test; 14 controls lack a testID; the flows target Expo Go and aren't run in CI (§4.3).
- **Where:** `jest.config.js`; `src/**/*.test.tsx`; `.maestro/`
- **Fix:** a render test per screen state; the remaining testIDs; point Maestro at the dev build; add an ESLint selector for controls without a testID.
- **Effort:** L · **Bucket:** now · **Related:** v1 QUAL-30, K-10

#### Plan readiness

**F115 · There's no rule for local-only data once accounts arrive (merge on sign-in, wipe or keep on sign-out, shared devices)**
- **Votes:** C·P·P. Still open.
- **Where:** `V1-PARITY-PLAN.md:39, 101`; every persisted store
- **Evidence and scenario:** P8, built by following v1 SEC-22's fix (wipe on sign-out), permanently deletes the plan, library, cupboard and cook log, none of which exist on the server. Keeping the data instead leaks it between accounts on a shared phone.
- **Fix:** decide before P8. Recommended: the library, plan, cupboard and cook log stay on the device and sign-out never wipes them. Test with two accounts on one phone.
- **Effort:** S (decision) · **Bucket:** Lachlan decision

**F118 · The backend hardening the v1 audit asked for isn't named in rule 5 or P8**
- **Votes:** C·P·P. Still open.
- **Where:** `V1-PARITY-PLAN.md:48-55, 101`
- **Evidence and scenario:** rate limits, default-deny grants, bucket policies, a storage purge on delete, database length checks, an idempotent create, auth hardening and CLI migrations are all missing. Rule 5 claims to cover SEC-7 to SEC-9 but doesn't address SEC-9's throttling. Plan line 3 forbids repeats but names no mechanism.
- **Fix:** a P8 "done when": every v1 SEC and SOC ID closed, with a traceability table (see F179).
- **Effort:** S (plan) · **Bucket:** phase P8

**F119 · Rule 6 (App Store guideline 1.2) is missing image and video screening, suspend and ban tooling, report evidence retention, a DM request policy and a blocked-users list**
- **Votes:** C·P·C. Still open.
- **Where:** `V1-PARITY-PLAN.md:56-63, 102`
- **Fix:** extend rule 6, and ask Lachlan about the DM policy and v1's private-account switch.
- **Effort:** S · **Bucket:** Lachlan decision (P9)

**F120 · Push notifications get one word in P9: no token lifecycle, notification hygiene, preferences or shared permission prompt**
- **Votes:** C·P·C. Still open.
- **Where:** `V1-PARITY-PLAN.md:42, 102`
- **Evidence and scenario:** a push token left in place after sign-out shows user A's DM previews to user B on the same phone.
- **Fix:** a Notifications block in P9.
- **Effort:** S · **Bucket:** phase P9

**F123 · AI (scanning, and D-028's nutrition gap-fill) has no rules for key custody, spend caps, server-built prompts, safety or App Store 5.1.2(i) consent**
- **Votes:** P·P·C.
- **Status at `30c7435`:** partly addressed. D-030 sets the scan quota and the cupboard brief designs a server prompt. There's still no plan rule and no 5.1.2(i) consent, and D-028 is still without rules. **Recommend raising this to high**, because scanning is now part of launch and available to free accounts.
- **Where:** `V1-PARITY-PLAN.md:103`; `DECISIONS.md:188` (D-028), `:201-207` (D-030)
- **Fix:** an AI rule in the plan covering server-only keys, a `task` enum, per-user and global caps, the entitlement cache, EXIF stripping, and consent before any photo goes to a third-party AI (named in the privacy policy).
- **Effort:** S (plan) · **Bucket:** phase P10 (earlier under D-030)

**F124 · P9 promises video posts with no pipeline, which is how v1's video failed**
- **Votes:** C·P·C. Still open.
- **Where:** `V1-PARITY-PLAN.md:102, 111`; rule 12 covers playback only
- **Fix:** a Lachlan decision: photos only at launch (recommended), or a pipeline spelled out in the plan.
- **Effort:** S · **Bucket:** Lachlan decision

**F125 · D-028 (nutrition) and D-029 (AI photo label) are decided, but the plan still says "Ask Lachlan", and P3 was closed without nutrition**
- **Votes:** P·P·C.
- **Status at `30c7435`:** **partly fixed.** The recipe page now shows "AI-generated photo" (D-029). Still open: nutrition isn't in any phase, `V1-PARITY-PLAN.md:126` is stale, the P3 row lists nutrition, and the label doesn't appear on cards.
- **Fix:** replace plan row 126 with D-028's phases, and move K-5.
- **Effort:** S · **Bucket:** now (docs)

**F126 · The social scope collides with the map's brand rules: no public counts on home, no infinite scroll, no algorithmic feed**
- **Votes:** C·C·P. Still open.
- **Where:** `REBUILD-MAP.md:85-89` (still binding per plan line 8); D-027 makes Feed the home screen; rule 5 has counts; rule 12 has paging
- **Fix:** a Lachlan decision on counts and feed order, recorded as a D-0xx.
- **Effort:** S · **Bucket:** Lachlan decision

### 3.4 Low

Every low finding below was confirmed (no refutations). **Status** is the status at `30c7435`; "open" means unchanged. Effort is S unless marked otherwise.

#### Data integrity, import and storage

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F03 | Six of seven stores have no `migrate`, so a saved version newer than the build silently resets to defaults (`saved.ts:81-86`, `plan.ts:43-47`, `cookLog.ts:26`, `cupboard.ts:25-30`, `myRecipes.ts:47`, `oldAppImport.ts:24-29`; `middleware.mjs:392-405`) | A tester reinstalls an older TestFlight build after a version bump, and the first recipe view writes empty bookmarks over the saved ones. It can't happen yet, because every store is at v1. → Add a shared `persistOptions` helper that passes newer versions through read-only, before the first version bump. | now (before first bump) | C·P·P | open |
| F04 | Saved state isn't shape-checked when loaded, and the preferences migration spreads with `as unknown as` (`preferences.ts:94-103`) | `bookmarks:"oops"` loads, then crashes the Feed on every launch. It needs corruption or a bad migration to happen. → Per-store guards in `src/domain/*/persisted.ts`. | now | C·P·P | partly: the top-level shape is now checked (`savedState.ts:20-23`) |
| F06 | A write made before a store hydrates overwrites that store on disk (`middleware.mjs:358-377`) | Hidden today by the gate. → Hold `setItem` until the key's first read has settled. | now | C·C·C | partly: the plan store is now gated |
| F07 | The old-app import writes its marker first and can't re-run if applying fails (`oldAppImport.ts:66-97`; the comment at `oldApp.ts:1-4` says it can) | Unparseable old data is recorded as `imported:false` and never retried. → Put a parser version in the marker, and make re-runs idempotent (deterministic ids, dedupe cooks). | now | C·P·P | open |
| F08 | Launching once with the clock more than 8 weeks ahead prunes and saves away the whole plan (`plan.ts:49-56`, `week.ts:82-89`) | → Prune against a "last seen day" high-water mark that moves at most about 14 days per launch. | Lachlan decision | C·C·C | open |
| F10 | Imported v1 custom recipes arrive as drafts with no cuisine, so bookmarks and collections pointing at them are hidden, while the welcome line counts them (`oldApp.ts:93-112`) | → For "(my version)" copies, take the cuisine from the catalogue; word the welcome line as "N recipes need a cuisine". | now | C·P·P | open |
| F145 | Imported v1 Cookmarks arrive oldest-first, with `savedAt` reversed (`oldAppImport.ts:72-79`; v1 `CookmarksModal.tsx:111`) | → Reverse the list before mapping it. | now | C·C·C | open |
| F146 | On the Welcome reveal, tapping the recipe photo plans it for tonight with no Undo (`WelcomeScreen.tsx:52-57, 93`) | → The card opens the recipe or does nothing; the toast gets an Undo. | now | C·C·C | open |
| F147 | The old-app cupboard import drops 14 of 199 v1 names (Pork, Noodles…) and narrows general names (Chicken becomes chicken pieces) (`oldApp.ts:170-172`) | → Add aliases or family entries, and report names that weren't brought over. | P5 (under D-030) | C·C·C | open |
| F148 | Testers who *skipped* v1's onboarding get v2's welcome skipped too, plus a 45-minute preference they never chose (`oldApp.ts:62-81`; v1 `HomeScreen.tsx:801-803`) | → Treat all-default answers as "not answered". | now, and a Lachlan call | C·C·C | open |
| F149 | The "Welcome back" line doesn't appear when only dropped, hidden or cupboard data came across (`oldApp.ts:188-201`) | → Always say something when `dropped > 0` or anything was imported. | now | C·C·C | open |
| F178 | The cook log has no cap and is rewritten in full on every cook (`cookLog.ts:19-26`) | About 70 bytes per event. A cap would erase "cooked before" and stats. → Record a decision (keep it uncapped, or roll up old events). | Lachlan decision | C·P·P | open |
| F184 | A recipe being typed lives only in React state, so it's lost if iOS evicts the app (`useRecipeEditor.ts:26`) | → A saved "unsent draft" slot with a resume prompt. | M · P6 | C·C·C | open |
| F186 | The v1 Supabase session (`pantry.auth.v1`) stays on testers' phones (D-024 keeps old data) | → At P8, use a new storageKey. Deleting the old key needs Lachlan. | Lachlan decision (P8) | C·P·C | open |
| F213 | D-003's free limits against existing data: imported v1 users can already have more than 3 collections | → Add "no retroactive lock-out: block new creation only" to D-003. | Lachlan decision (P10) | C·P·P | open |
| F214 | The old-app import marker sits under the v2 prefix, so a future wipe of that prefix would re-run the import. Correction: no email or profile is imported. | → Any P8 wipe keeps the marker or also removes the old keys; test it. | P8 | P·P·P | open, now slightly worse, because corrupt backups also live under the prefix |
| F215 | Being onboarded skips the whole welcome, and there's no terms-version field, so earlier users never see P7's terms step | → Check `termsAcceptedVersion` at sign-up or first post, on the server. | P7/P9 | C·P·P | open |

#### Correctness: plan, list, cupboard and Feed

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F12 | Switching metric/imperial unticks most of the list, because the tick stores the display string (`derive.ts:139, 164`) | 16 of 26 items unticked. → Part of the F11 fix. | now | C·C·C | open |
| F17 | Plan entries for a deleted own recipe still count as meals and can hide tonight's real dinner (`useWeekList.ts:26`, `week.ts:77-79`, `FeedScreen.tsx:39-59, 115-131`) | → Leave out unresolved entries in `tonightsDinner`, the counts and `ahead`. | now | C·C·C | open |
| F18 | On Sundays, both Plan views open on next week, hiding tonight (`PlanScreen.tsx:1-3, 38-41`) | → Use the Sunday default for the list view only. | P4 | C·C·P | open |
| F19 | Stale ticks are never cleared, so a re-planned meal comes back already ticked; `checkedExtras` is left over after an extra is deleted (`derive.ts:139-165`) | Kept for up to 8 weeks. → Housekeeping, done with F11. | now | C·P·P | open |
| F20 | Merged amounts print "1 cups", "24 tbsp" and "3.3 lb" (`format.ts:69`; `derive.ts:71-78`; `quantity.ts:87`) | → Choose plural from the printed number; step spoons up to cups; snap lb to quarters (D-013). | now | C·C·C | open |
| F21 | The servings stepper tops out at 24, but a recipe can serve 50, so "−" jumps from 50 to 24 (`Stepper.tsx:18-20`; `EditorDetails.tsx:96`) | → One exported `MAX_SERVINGS`. | now | C·C·C | open |
| F22 | Feed still says "Start cooking" after tonight's dinner is cooked; a second dinner tonight never appears (`FeedScreen.tsx:39, 59-82`) | "First wins" is documented. → A "Cooked tonight" state. | Lachlan decision | C·P·C | open |
| F23 | "What's cooking?" repeats planned dishes for narrow diets. Correction: next week's plan is never down-ranked on Sundays (`suggestions.ts:31`, `useSurprise.ts:27`) | → Pass the next 7 days of plan entries; exclude them when enough others remain. | now | P·P·P | open |
| F130 | The list and the Send-list text never use plurals ("Egg, 4", "Prawn, 600 g"); the database has plurals for 378 of 552 ingredients (`derive.ts:124, 183`) | → Use `def.plural` when the count is more than 1. | P4 | C·C·P | open |
| F132 | The header says "All done" while extras are still unticked, and Send list can send just a title (`ShoppingListView.tsx:58, 72-73`; `derive.ts:177-191`) | → Count extras; disable Send when nothing is left; put dates in the title. | now | C·C·C | open |
| F133 | Tapping the Sunday "Plan the week?" reminder doesn't open Plan (`notifications.ts:53-72`; no response handler) | → `data.url` plus a `useLastNotificationResponse` handler in the root layout. | now | C·C·P | open |
| F135 | Deleting an extra has no Undo; extras can't be edited; duplicates are allowed (`ShoppingListView.tsx:106-111`) | → An Undo toast, and a case-insensitive dedupe. | now | C·C·C | open |
| F137 | The Sunday reminder switch trusts a saved flag and never re-checks the phone's permission; there's no "Open Settings" (`SettingsScreen.tsx:44-48, 63-68`) | → Re-check on focus, and offer `Linking.openSettings()`. | now | C·C·P | open |
| F139 | Cupboard search says "No ingredient by that name" for items you already have and for staples; "What can I make?" has no empty state (`CupboardScreen.tsx:45-51, 80-82, 132-146`) | → Say which case it is, and add an empty line. | P5 | C·C·C | open |
| F141 | Copy slips: "0 dinners planned" for a lunch-only week, "planned for today dinner", lowercase names at the start of a toast (`PlanScreen.tsx:52`; `AddToPlanSheet.tsx:55, 58`; `CupboardScreen.tsx:109-117`; `ShoppingListView.tsx:40, 148, 153`) | → Count meals, say "tonight", and `capitalise()`. | now | C·C·C | open |
| F143 | Feed's "Coming up · This week" is a rolling six days, and the label is wrong on weekends (`FeedScreen.tsx:26, 44-46, 117`) | → Rename it "Next few days". | now | C·P·P | open |
| F144 | A garbage route param writes a phantom id (`/recipe/<bad>/collect`), or plans for 2099 and counts it in the badge (`CollectSheet.tsx:16-48`; `AddToPlanSheet.tsx:33, 56-58`) | Needs a crafted link. → Guard a missing recipe, and clamp the day. | now | C·P·C | open |
| F159 | A plan row for a draft or unvetted recipe says "no longer available" and offers Remove with no Undo (`PlanEntryRow.tsx:26-33`) | → Distinguish "not in this version yet" from "unfinished", and add an Undo. | now | P·P·P | open |
| F176 | An empty Plan week shows the empty state *and* seven "Nothing planned" rows (`PlanScreen.tsx:65-95`) | → Show one or the other. | P4 | C·P·P | open |
| F196 | "Zest of 1 lemon" plus "Juice of 1 lemon" puts 2 lemons on the list (`derive.ts:104-110`) | → Take the larger amount for zest and juice lines of the same fruit within one recipe. | Lachlan decision | C·C·C | open |

#### Correctness: search, Browse and Surprise

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F26 | A search of only punctuation, emoji or non-Latin text returns the whole catalogue; ø and œ get mangled (`search.ts:69-70`; `database.ts:72`) | → Return `[]` when a non-blank query normalises to nothing. | now | C·C·C | open |
| F27 | Search ignores the ingredient database's aliases: "aubergine" finds 0 recipes, "eggplant" finds 8 (`search.ts:54-61`) | → Add each line's database name and aliases to the index. | now | C·C·C | open |
| F29 | "Spin again" flashes the intro panel for one frame. Correction: overlapping reels need a second tap within 60 ms. (`SurpriseScreen.tsx:39-62`) | → Set the reel synchronously, and guard against a second spin. | now | C·P·P | open |
| F30 | After a full cycle, Surprise can land on the dish already on screen (`surprise.ts:47-53`) | A pool of one always repeating is deliberate. → Keep excluding the last pick. | now | C·P·C | open |
| F31 | The empty-state copy blames your diet when the catalogue is simply empty; Surprise's "change them in Settings" has no button (`SurpriseScreen.tsx:76-80`; `WelcomeScreen.tsx:111-115`; `FeedScreen.tsx:108-112`) | → Tell the two causes apart, and add an "Open Settings" action. | now | C·P·P | open |
| F32 | Browse preset pills show the wrong label, and "X, clear" clears everything (`browse.ts:45-52`; `RecipesScreen.tsx:45-56, 80`) | → Match presets exactly, and have the pill toggle only its own preset. | now | C·P·C | open |
| F33 | Browse's Recipe of the day and shelves ignore your diet and avoid list (`BrowseSections.tsx:48-58`) | → Apply them to the editorial picks. | Lachlan decision | C·P·C | open |
| F34 | Browse checks whether CATALOGUE is empty, so your own recipes vanish from Browse in store builds (`RecipesScreen.tsx:101`) | → Check `useAllRecipes()` instead. | now | C·P·C | open |
| F35 | Filters' "Show all recipes" just goes back to the shelves (`FiltersScreen.tsx:44, 122`) | → Call `setShowAll(true)`. | now | C·C·C | open |
| F160 | The Filters sheet reads "1 recipe match" (`FiltersScreen.tsx:43-48`) | → Fix the plural. | now | C·C·C | open |
| F171 | Surprise's intro promises to leave out planned and recent dishes, but counts them in its number, and can say "one of 1 dinners" (`SurpriseScreen.tsx:112-113`) | → Soften the copy, and use a plural. | now | C·C·C | open |

#### Correctness: recipe page, ingredients and Cook

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F36 | Step timers misread "1 1/2 hours" (as 2 h), "1 hour 15 minutes" (as two timers) and "1½ hours" (no timer); "Rest 10 minutes before serving" loses its timer in 5 catalogue recipes (`cook.ts:5, 9, 31`) | → Use `NUMBER_PATTERN` for the number, merge compound durations, and delete "before serving". | now | P·P·P | open |
| F41 | kg and L never step down ("⅛ kg chicken"), and imperial can print "0 oz" (`format.ts:34-50`) | → Show kg below 1 as g and L below 1 as ml. | now | C·C·C | open |
| F42 | Counted amounts round up to the nearest half even at the original servings: "¼ cabbage" shows as "½" (`format.ts:24-27, 53`) | Only 1 catalogue line. → Skip rounding at a ratio of 1. | now | P·P·P | open |
| F43 | Amounts inside notes and prep don't scale (korma's 200 ml of water) (`format.ts:82-83`) | → Hide amount-bearing notes when scaled, or split them into their own lines through the fix files. | Lachlan decision | C·C·C | open |
| F44 | "Drizzle of olive oil" becomes "1 olive oil"; the wrong word gets inflected ("1 portions … noodle") (`parse.ts:13-14, 53-57`; `nouns.ts:74-79`) | → Give drizzle and squeeze lines no quantity, and inflect counter nouns. | now | C·C·C | open |
| F47 | Cancelling or leaving before a notification finishes scheduling leaves an orphan alert (`useCookTimers.ts:33-52`) | The race test fails 2 of 3. → A mounted ref, and cancel an id that resolves late. | now | C·P·P | open |
| F50 | After editing your own recipe, its page keeps the old servings and ticks; ticks are keyed by position (`RecipeScreen.tsx:41`; `RecipeBody.tsx:28, 48`) | → Reset when the recipe changes, and key ticks by the line. | now | C·C·C | open |
| F51 | The "Cooked" pill logs another cook on every tap (the spec says it's a toggle) (`RecipeHeader.tsx:72-83`; `cookLog.ts:19-23`) | Deliberate in the code. → Decide between a log and a toggle. | Lachlan decision | C·P·P | open |
| F52 | The Cook route trusts its servings param: `?servings=Infinity` throws when you open Ingredients (`cook.tsx:7`; `format.ts:14`) | Recoverable through retry. → Parse an integer and clamp it to 1–50. | now | P·P·C | open |
| F53 | Cook Mode re-renders the whole screen twice a second while any timer, even a finished one, exists (`useCookTimers.ts:16-20`) | → Move the tick into TimerBar, and stop it when all timers are done. | now | C·C·C | open |
| F185 | The timer notification says "8–10 minutes is up" (`useCookTimers.ts:44`) | Keep the foreground sound: it's the only audible cue. → Better wording. | now | C·P·P | open |
| F187 | The omelette is tagged vegetarian while its "Optional fillings" line lists ham and smoked salmon in `prep` | → Split the line through the fix files. | now (content) | P·P·P | open |
| F192 | "Juice of half a lemon" prints "1 a lemon" when scaled (`parse.ts:15-19`) | → Swallow the article. | now | C·C·C | open |
| F193 | "Small handful of basil" repeats the measure as a note ("2 handfuls basil (small handful)"); 48 catalogue lines (`parse.ts:56`) | → Keep only the size word. | now | C·C·C | open |
| F194 | An "Optional:" group heading doesn't make its lines optional (`draft.ts:66-72`) | → Mark the items in a heading that matches `/^optional\b/`. | now | C·C·C | open |
| F195 | The optional-line regex misses "(optional, …)" and "Optional fillings:" (12 catalogue lines); the avoid list ignores `prep` (`parse.ts:32-34`; `diets.ts:91`) | → Widen the regex, re-convert, and compare diets before and after. | now | C·P·C | open |

#### Correctness: editor, import, library and navigation

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F57 | "Retake the taste quiz" stacks a second tab navigator over Settings (`SettingsScreen.tsx:59`; `WelcomeScreen.tsx:38-41`) | → `dismissTo('/')` when back is possible. | now | C·P·C | open |
| F58 | An import that finishes after the sheet is closed replaces whatever screen is showing (`ImportLinkScreen.tsx:43-63`) | → Abort on unmount, and check a mounted ref. | now | C·C·C | open |
| F59 | Import misreads some JSON-LD: prep+total with no cook, `schema:Recipe`, a `mainEntity` array, raw newlines; odd durations show raw validator text (`importLink.ts:57-59, 71, 126, 145-146`; `draft.ts:111`; `RecipeEditorScreen.tsx:76`) | → Handle each case, and give the problems friendly messages. | now | C·C·C | open |
| F60 | Double-tapping Save stores two recipes (`useRecipeEditor.ts:38-54`; `WelcomeScreen.tsx:52-57`) | → A ref latch. | now | C·P·C | open |
| F61 | Collection-name uniqueness is only enforced in the UI; Undo delete can create duplicates, and so can a case-only clash in the import (`saved.ts:55-60`; `oldAppImport.ts:74-77`) | → Enforce it in a domain reducer. | now | C·C·C | open |
| F62 | `my-recipe/edit?id=constructor` counts as an existing recipe, and Delete throws (`useRecipeEditor.ts:16, 68`) | Needs a crafted link. → `Object.hasOwn`. | now | C·C·C | open |
| F140 | A new toast replaces the previous toast's Undo, since there's a single slot by design (`Toast.tsx:23-29`) | Two quick cupboard "used up" removals leave only the second one undoable. → Keep an Undo toast when a toast without Undo arrives, or merge the two. | now | C·P·P | open |
| F162 | Undo on "Saved to Cookmarks" and "Not for us" just toggles again, so after another change it redoes instead of undoing (`RecipeScreen.tsx:106, 160`; `saved.ts:35-41, 73-77`) | → Undo sets the previous value explicitly. | now | P·C·C | open |
| F163 | Actions that leave the screen (Cook Done, the plan sheets) have no double-tap guard, so a cook can be logged twice (`CookScreen.tsx:70-74` etc.) | iOS mostly swallows the second tap. → A `leaving` ref. | now | C·P·C | open |
| F164 | The reminder switch snaps back while the permission prompt is showing (`SettingsScreen.tsx:44-48`) | → Optimistic value plus a pending state. | now | C·P·P | open |
| F165 | Deleting a collection flashes "This collection is gone" during the back transition (`CollectionScreen.tsx:31-42, 88-92`) | → Go back first, then delete. | now | C·C·C | open |
| F166 | The Welcome reveal keeps an old offset after your answers change, so the best new match is skipped (`WelcomeScreen.tsx:32, 49`) | → Reset the offset when entering the reveal. | P7 | C·C·C | open |
| F167 | Import can run twice through the keyboard's submit (`ImportLinkScreen.tsx:79`) | → A ref guard, and `editable={!busy}`. | now | C·C·C | open |
| F175 | Unsaving from a card's bookmark disc is silent, with no Undo (`saved.ts:91-96`) | Can be reversed by tapping again. → A shared toast hook. | now | C·P·P | open |
| F203 | Undoing "Removed from Cookmarks" re-adds the recipe at the top with a new date (`saved.ts:38`) | → `restoreBookmark(original)`. | now | C·C·C | open |
| F207 | Android: Back during the drawer's 180 ms close, then `replace()`, leaves a lone page (`DrawerScreen.tsx:35-42`) | D-011 (iOS first). → Clear the timeout on unmount. | now | C·C·C | open |
| F208 | Android and web Back discard a typed recipe without asking (`RecipeEditorScreen.tsx:63, 85`) | → `usePreventRemove`, plus a "leaving" flag for Save and Discard. | now | C·C·C | open |
| F209 | Tapping the Surprise result card pushes the recipe inside the Surprise modal (`SurpriseScreen.tsx:97`) | → Reuse `open()`, which calls `back()` first. | now | C·P·C | open |

#### Security and privacy

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F63 | Import: out-of-range numeric HTML entities throw, which is silent to the user and an unhandled rejection (`importLink.ts:40-42`; `ImportLinkScreen.tsx:55-57`) | → Clamp the code point, use `Object.hasOwn` for entities, and try/catch. | now | C·C·C | open |
| F64 | The import parser has quadratic regexes and no cap on response size, so a hostile page freezes the UI for tens of seconds (`importLink.ts:39, 81, 122`) | → A 2–3 MB cap, an `indexOf` scan for script tags, and `[^<>]`. | now | C·C·C | open |
| F65 | Import accepts `http://` (blocked by ATS, with a misleading error) and stores userinfo and tracking params (`importLink.ts:156-165`) | → Upgrade to https, and strip userinfo and `utm_*`. | now | P·C·C | open |
| F66 | Shared links use only the `thepantry://` scheme, which is dead for anyone without the app (`RecipeScreen.tsx:78`) | → Share recipe text now; universal links at P9. | Lachlan decision | C·C·C | open |
| F205 | A personal Apple ID email, the ASC app id and the Team ID are committed in the public repo (`eas.json:33-39`) | Phishing target. → Make the repo private, or supply them at submit time. | Lachlan decision | C·C·C | open |

#### UI fidelity

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F109 | The saved bookmark (accent on the white disc) is 1.7–2.7:1 in both light and dark (`RecipeCard.tsx:83, 187`) | It's v1's look. → Put it on the rule 9 redesign list. | redesign list | P·P·P | open |
| F110 | "TAP TO ADJUST" wraps left-aligned inside a centred tile (`RecipeHeader.tsx:171-173`) | → `align="center"`. | now | C·C·C | open |
| F111 | Browse's heading spacing is doubled, and the filter button is 44 pt borderless where v1's is 46 pt with a border (`RecipesScreen.tsx:64-70, 153`; `TitleBlock.tsx:23`) | → A `field` IconButton shape, and drop one of the two gaps. | now | C·C·C | open |
| F112 | Inline timer chips leave amber stubs when they wrap (`RecipeBody.tsx:110-112, 171`) | → Non-breaking spaces. | now | C·C·C | open |
| F113 | The status bar is dark over the darkened recipe photo in light mode (`AppChrome.tsx:14`) | Inherited from v1. → `<StatusBar style="light">` on the recipe page. | now | P·P·C | open |
| F142 | Choosing Light or Dark in the app doesn't reach native UI such as the keyboard and share sheet (`ThemeProvider.tsx:13-23`) | → `Appearance.setColorScheme`. | now | C·C·C | open |
| F170 | Error and warning toasts show the success tick (`Toast.tsx:58`) | → A `tone` prop. | now | C·C·C | open |
| F172 | Grammar: "Start a 10 minutes timer"; "today lunch"; next week's toasts read the same as this week's (`CookScreen.tsx:117`; `PlanRecipeSheet.tsx:52-54`) | Refuted parts: "See all 1 recipes" and "Fewer serves". → A shared `plural()` and a "where" helper. | now | P·P·P | open |
| F173 | Copy points at controls that are named differently: "tap Add to collection" when it's hidden behind ⋯; "Two quick questions" when there are four; Directions vs Method (`CollectionScreen.tsx:101`; `WelcomeScreen.tsx:79`; `RecipeBody.tsx:97`) | Refuted part: the "profile" wording (D-027). → Reword. | now | C·P·P | open |
| F177 | Straight and curly apostrophes are mixed, and one sentence appears both ways (`RecipeScreen.tsx:63` vs `CookScreen.tsx:48`); this repeats v1 QUAL-28 | → Sweep the strings, and add a lint rule. | now | C·C·C | open |
| F180 | Imperial liquids print as decimal fl oz ("16.9 fl oz") and weights as "3.3 lb"; 199 of 4,022 lines (`format.ts:34-57`) | D-013 chose fl oz. → Round, or use US cups (a Lachlan decision). | Lachlan decision | C·P·P | open |
| F198 | A button label next to an icon can't shrink, so it overflows the pill at large text, even at 375 pt (`Button.tsx:75-80`) | → `flexShrink: 1` and `numberOfLines={2}`. | now | C·C·C | open |
| F199 | The 22 pt serif SectionHeader is used for Filters sections, where the spec says 16/800 sans (`FiltersScreen.tsx:50-106`; aisles and editor are P4/P6) | → Fix at each call site. | now | C·C·P | open |

#### Accessibility

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F96 | Real text and background pairs below AA aren't on the token watch-list (ticked ingredients 1.90:1; eyebrows 3.0–4.35; past plan rows at 0.6 opacity); `KNOWN_FAILURES` isn't per theme and is out of date (`tokens.test.ts:25-38`) | The colours are v1's look. → Per-theme watch-list entries (see F210). | now (test) / redesign list | C·P·P | open |
| F101 | Focus is lost when the button you pressed disappears (Welcome steps, Spin) | → `setAccessibilityFocus` on the new header. | P7/P6 | C·C·C | open |
| F102 | Chips announce themselves as checkboxes in single-choice groups, and action chips too ("+ rice, checkbox") (`Chip.tsx:22`) | → `role="radio"` and a button kind. | now | C·C·C | open |
| F103 | A ListRow's label drops its detail line (`ListRow.tsx:20`) | → Join title, detail and value. | now | C·P·C | open |
| F104 | Sheets and the drawer have no VoiceOver escape gesture (`ModalSheet.tsx:19-27`; `DrawerScreen.tsx:48-56`) | → `onAccessibilityEscape`. | now | C·C·C | open |
| F105 | SearchField has a fixed height of 46 (the text-size cap is deliberate under rule 9) (`SearchField.tsx:54, 64`) | → `minHeight`. | now | C·P·P | open |
| F106 | Inputs and switches have low non-text contrast (v1's look); the high-contrast Switch off-track is 1.14:1 (`Switch.tsx:23-25`) | → Fix the high-contrast off-track now; the rest goes on the redesign list. | now / redesign list | C·P·P | open |
| F107 | The app ignores iOS's Increase Contrast setting (`ThemeProvider.tsx:13-21`) | → Default to the system setting (needs a preferences migration). | Lachlan decision | C·C·C | open |
| F108 | On Android, the recipe page's Back and ⋯ are read last; ModalSheet's slide ignores Reduce Motion (`RecipeScreen.tsx:128-137`; `ModalSheet.tsx:19`) | → Render the nav first; fade when Reduce Motion is on. | now | C·C·C | open |
| F174 | Accessibility labels disagree with visible text: "Cook" is labelled "Mark as cooked"; seven identical "Add" buttons; the "coriander ×" chip reads as "times" (`RecipeHeader.tsx:75-81`; `PlanScreen.tsx:83`; `FoodSettings.tsx:48-49`) | → Labels that contain the visible word; per-day labels; `Remove ${c}`. | now | C·C·C | open |
| F202 | The error screen's title isn't a header or announced, and focus isn't moved (`ErrorState.tsx:13-15`) | → Header role, an announcement and a focus move. | now | C·C·C | open |

#### Performance

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F89 | Parsing the catalogue and building the ingredient index happen before the first frame (51–99 ms plus 60–70 ms) | Routes import it eagerly anyway. → Lazy getters, or a precomputed index. | now | P·P·P | open |
| F90 | Every Browse card re-renders on each keystroke and bookmark; there's no `memo` anywhere in `src` (`RecipesScreen.tsx:122-144`; `saved.ts:91-96`) | → `React.memo`, `useCallback` and a memoised `useBookmarks`. | now | C·C·C | open |
| F91 | The Saved, Collection and Add-to-plan "Saved" lists render every card with its photo inside a ScrollView | → FlatList. | P4/P6 | C·P·C | open |
| F197 | Any change to your own recipes re-parses all of them (about 0.3 ms per line without the JIT) (`recipeBook.ts:14-24`) | → A per-recipe WeakMap memo. | now | C·C·C | open |

#### Architecture, tooling and tests

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F77 | The test runners silently skip `.test.ts` files outside domain, lib and tokens (`package.json` `test:domain`; `jest.config.js` testMatch `*.tsx`) | A store test would never run. → Widen `testMatch`, and add a guard that every test file is picked up by one runner. | now | C·P·C | open |
| F79 | The structure lint rules have holes (relative, bare or dynamic cross-feature imports; new feature folders; lower layers importing features; a blocklist, not an allowlist, for domain; `.tsx` domain files; `ts-ignore`; warnings pass) (`eslint.config.js`) | No live breach. → Derive FEATURES, add `no-restricted-paths` zones, an allowlist, and `--max-warnings 0`. | now (M) | C·P·C | open |
| F80 | `scripts/*.mts` are never linted (`eslint.config.js:60`) | → Add `.mts` globs. | now | C·C·C | open |
| F81 | Duplicated logic: two `capitalise`s, day names, week maths, a `RECENT_MAX` literal, re-declared labels, three labels for the 30-minute filter | → One source for each. | now (M) | C·C·C | partly: the hydration wait is now one function |
| F82 | Dead exports; `expo-symbols` unused (autolinked through expo-router anyway); `noUnused*` flags off even though turning them on gives 0 errors | → Remove them, and turn the flags on. | now | C·C·C | open |
| F83 | Layering drift: a zustand store in `features/editor/pendingImport.ts`; pure date logic in `features/recipe/weekChoices.ts` | → Move them. | now | C·C·C | open |
| F84 | Naming: Cookmarks/saved/bookmarks; Spinner vs `/surprise`; NotFound says "Go to Today" though the tab is Feed; the map says US spelling but the code is British | → A glossary, and fix the copy. | now / Lachlan decision (glossary) | C·C·C | open |
| F85 | Comments still use old map phase numbers ("map Phase 6", "P5 rebuilds it") | → Rewrite as why-comments. | now | C·C·C | open |
| F86 | The generated `images.ts` (288 lines) will hit max-lines at about 299 recipes | → Ignore it in lint. | now | P·P·P | open |
| F155 | `catalogue:convert` writes an `images.ts` that fails `format:check` (`convert-old-recipes.mts:167`) | → Quote keys only when needed. | now | C·C·C | open |
| F156 | Ingredient alias clash: "coconut vinegar" resolves to cane vinegar | → Remove the alias, and have the index throw on duplicate phrases. | now | C·C·C | open |
| F157 | Nothing checks stored diets and ingredient ids against the current database | → A domain test that re-derives them. | now | C·C·C | open |
| F183 | Typed routes are never generated in CI or on a fresh checkout (`.expo/types` is gitignored), so route typos pass typecheck | → A node:test that checks literal hrefs against `src/app`. | now | C·C·C | open |
| F190 | Non-Latin or emoji-only ingredient items all merge into one "text:" shopping row (`derive.ts:106`) | → A Unicode-aware `normaliseWords`, or a raw-text key. | now | C·C·P | open |
| F200 | `contrastRatio` ignores translucent backgrounds and throws on `#RGB` (`contrast.ts:10-36`) | Only used in tests. → Throw when alpha < 1, and support `#RGB`. | now | C·P·C | open |
| F201 | The eyebrow test is near-tautological, and `cuisineTint` is untested (`tokens.test.ts:68-73`) | → `FAMILY satisfies Record<Cuisine, Family>`. | now | P·P·P | open |

#### Release readiness

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F71 | OTA updates are unsafe and not wired up: runtimeVersion `appVersion` with a remote autoIncrement; caret ranges on native modules; expo-updates not installed; the fingerprint policy and Sentry deferred to P11 | Latent until expo-updates is added. → Switch to the `fingerprint` policy *before* installing it; pin native modules. | now (policy) / Lachlan decision (expo-updates) | P·P·P | open |
| F72 | CI misses release checks: no `expo export`, no `expo install --check`, lint warnings pass, no timeout | → Add them. | now | C·C·C | open |
| F73 | The Android adaptive icon is the iOS icon, so the wordmark falls outside the safe zone; template permissions aren't blocked | D-011. | P11 | C·P·C | open |
| F74 | The notification handler is only set up lazily, so a Sunday reminder that fires while the app is open isn't shown (`notifications.ts:5-13`) | → Configure it at startup. | now | C·C·C | open |
| F75 | The dev gallery ships in the production bundle (a static import) | → `require` it inside the `__DEV__` branch. | P11 | C·C·C | open |
| F138 | Android 12 and later: timer alarms are inexact | D-011. | Lachlan decision (Android) | C·P·C | open |
| F153 | Six sets of recipes share an identical photo (three schnitzels, including pork; beef curry and rendang…); biryani is the same as chicken biryani | → Handle during vetting. | Lachlan decision | C·C·C | open |
| F154 | US terms in the Australian catalogue: "Shrimp" titles over prawn lists; yogurt; baking soda; broil; cilantro | Refuted part: 480°F appears only as a dual unit. → Targeted `everywhere` fixes. | now (content) | P·C·P | open |

#### Plan readiness

| ID | Finding and where | Scenario → fix | Bucket | Votes | Status |
|---|---|---|---|---|---|
| F127 | Twelve v1 inventory items are in no phase (per-question taste editors, step unit conversion, email/export a recipe, share the week plan, the hidden dishes list, iPad, moving a meal…) | Pair-with was dropped by D-007. → A keep/drop decision for each. | P4/P6 / Lachlan decision | P·P·P | partly: all are listed in `MISSING-FEATURES.md` |
| F128 | The read-first docs contradict the plan (map §3/§7/§8, PRODUCT §1/§4.13/§5, and KNOWN-ISSUES' old phase numbers) | → Superseded banners, and renumber. | now | C·C·C | open, and **worse**: D-030 contradicts `V1-PARITY-PLAN.md:97-98` and `PRODUCT.md:217` |
| F129 | No decision on analytics, storefronts or locale for the social launch | → Decide. | Lachlan decision | C·C·C | open |
| F179 | The plan names only some v1 SOC IDs; 19–21 of 30 aren't traced (including SOC-29 DM tombstoning and SOC-30 profile search) | → One traceability table from v1 ID to phase. | P8/P9 | P·P·P | open |

---

## 4. Status at `30c7435` (after the audit started)

### 4.1 What changed on `main`

Eight commits, `261a03e` to `30c7435`:

- **`7ce7396`, the storage and startup rework.** `storage.ts` and `savedState.ts` now back up a value that fails to parse. The startup gate waits for all seven stores, with a 4 s limit. Every store uses `persistentStorage()`.
- **`261a03e`, the D-029 label.** The recipe page now shows "AI-generated photo" for the 120 uncredited images.
- **`a023878`, Maestro.** 16 Maestro flows in `.maestro/`. testIDs were added across the app, and Checkbox, Stepper and Switch now accept a `testID`.
- **D-030 and its docs.** "Cupboard first, scanning in". P5 now comes before P4, and photo and receipt scanning are in scope for launch, with 3 free scans a month. It adds `MISSING-FEATURES.md` and `cupboard-brief.md`.

Apart from these, the 58 other source files that changed only gained `testID` props.

### 4.2 Findings affected

| Status | Findings |
|---|---|
| **Fixed** | F01 |
| **Partly fixed** | F02, F04, F05, F06, F70, F76, F81, F123 (by the D-030 design), F125, F127 (listed in MISSING-FEATURES), F214 (worse) |
| **Worse, or more urgent under D-030** | F128 (the read-first docs now contradict D-030). Should be raised to **high**: F123 (AI rules, now that scanning is part of launch) and F131 (the cupboard brief says "ship first"). More weight: F114, F117, F118, F122, F136, F147, F158, F181, F189, F211. F212 must now be decided before P4. |
| **Still open** | Every other finding |

### 4.3 Post-baseline observations (one re-check agent; not yet three-way verified)

These come from reviewing the new commits themselves. They carry IDs F216–F222 so they can be tracked. They have had **one** check, not three, so treat them as leads with strong evidence.

| ID | Sev | Observation | Where (at `30c7435`) | Fix |
|---|---|---|---|---|
| F216 | medium | If `AsyncStorage.getItem` *throws*, the wrapper returns null with no backup. The store then loads with defaults, and the next `set()` overwrites the real saved value, which is the exact ARCH-6 data-loss path. Before the change the store simply stayed unhydrated. A Jest proof exists (`scratchpad/recheck`). | `src/store/storage.ts:22-29` | On a read error, don't hydrate. Mark the store read-only and don't write until a later read succeeds. Show a calm message. |
| F217 | low | There are two `allHydrated` waits in a row, each with its own 4 s limit, so a hung store can hold the splash for up to about 8 s. When a wait times out, the app opens with stores still empty (for example preferences, which can show the wrong theme or send the user to Welcome). | `useAppReady.ts:66`; `oldAppImport.ts:37` | One wait. Keep writes blocked for any store that isn't hydrated. |
| F218 | low | The `.corrupt.<ts>` backups are written, but nothing lists, restores, prunes or reports them. | `savedState.ts:31`; `storage.ts:32` | Have Settings offer "Some saved data couldn't be read" with a restore or report option, and prune old backups. |
| F219 | low | The Maestro flows use `appId: host.exp.Exponent` (Expo Go), not the development build that CLAUDE.md prescribes, and they aren't run in CI. | `.maestro/*.yaml`, `.maestro/config.yaml` | Point them at the dev build's bundle id, and add a CI or nightly run. |
| F220 | low | `setItem` failures are logged only with `console.warn`, so the user never knows. This is the remaining part of F05. | `storage.ts:36-42` | See F05. |
| F221 | medium | D-030 (P5 before P4, scanning at launch) contradicts `V1-PARITY-PLAN.md:97-98` and `PRODUCT.md:217` ("scanning: later"). This is part of F128. | docs | Update the plan and PRODUCT in the same commit as D-030. |
| F222 | low | 14 controls still have no testID, and no screen is rendered in a component test. This is the remaining part of F70. | `FiltersScreen.tsx` ChipRow ×5, `RecipeGrid`, `PlanScreen.tsx:97`, Settings Segmented, TextField's inner `TextInput` | See F70. |

---

## Appendix A: refuted claims and parts of claims

No finding was refuted by a majority. These **parts** of findings, or leads from the earlier pass, were refuted and removed from the confirmed text:

| Claim | Refuted by | Why |
|---|---|---|
| F29: a double tap runs two overlapping reels | L2, L3 | The second tap would have to land within 60 ms on a different button. Only the one-frame flash is real. |
| F52: `?servings=Infinity` leaves the app unrecoverable | L1, L2 | It throws only when you open Ingredients. Retry remounts with Ingredients closed. |
| F71: OTA is unsafe *today* | L1, L2, L3 | expo-updates isn't installed, so no OTA can be delivered. The risk only appears if it's added before the fingerprint policy. |
| F143: the 7th dinner is dropped | L2, L3 | It's a coherent rolling window, because tonight is shown separately. Only the "This week" label is wrong. |
| F172: "See all 1 recipes" | L1, L2 | Unreachable: it would need 284 recipes hidden. "Fewer serves" is fine in Australian English. |
| F173: "profile" wording | L2 | D-027 decided the avatar opens Settings as a "local profile". |
| F159: contradicts D-024 | L1, L2, L3 | D-024 covers imported references, and the plan is never imported (D-005). The row copy is still wrong. |
| F154: 480°F is a US-only term | L1, L3 | It only appears as "250°C / 480°F". "Yogurt" is also an accepted Australian spelling. |
| F214: the v1 profile email gets imported | L1, L2, L3 | The importer has no email or profile field. |
| F185: suppress the foreground banner and sound | L2, L3 | The foreground sound is the only audible timer cue, so keep it. |
| F178: cap the cook log | L2, L3 | A cap would erase "cooked before" and stats. Growth is about 25 KB a year. |
| F140: the replacing toast is a bug | L2, L3 | The single slot is deliberate (Toast.tsx:2), and Restore covers list removals. The residual is the cupboard only. |
| F42: affects many lines | L1, L2 | Only 1 catalogue line at the original servings. |
| F36: catalogue timers are wrong | L1, L2, L3 | 0 catalogue steps have mixed or compound durations. Only "before serving" hits the catalogue (5 steps). |
| COR-B: "1 cups" in recipe renders | round 1 | 0 found in 238,368 recipe-page renders. It's real in *merged list* amounts (F20). |
| Lead: TZ and DST date bugs | round 1 (two agents) | 0 failures over 800+ days in 9 zones, including Lord Howe and Apia. The problem is staleness (F16), not arithmetic. |
| Lead: SSRF through import-from-link | SEC | The user types the URL, and the response is only parsed on the phone. There's no way to get data out. |
| Lead: prototype pollution through JSON-LD `__proto__` | SEC | Probed; `({}).polluted` stays undefined. |
| Lead: npm audit moderates are exploitable | SEC | uuid is build-time only. expo-router parses links with `URL.searchParams`, not `query-string.parse`. |
| Lead SEC-24: the privacy manifest drops required reasons | REL, R4N, R3V | RN 0.86's `privacy_file_aggregation_enabled` merges the core and pod reasons at pod install. Confirm with Xcode's privacy report at the first upload. |
| Lead ARCH-17: removing expo-symbols saves native size | REL | It's a dependency of expo-router, so it's autolinked anyway. |
| Lead QUAL-21: SearchField clips at the text cap | UI | A 1.6× cap is 24 pt, which fits in 46 pt. The fixed height is still worth changing (F105). |
| Lead PERF-9: timers drift or stall when locked | COR-B | Timers use an absolute end time, and the notification is scheduled for it. |
| Dev screens reachable in production | COR-D, REL | `/dev/gallery` redirects when `!__DEV__`, and its Settings row is behind `__DEV__`. |
| Dead drawer rows or settings that do nothing | COR-D, R2S | Every route exists, and every setting is used somewhere. |

---

## Appendix B: leads from `docs/audits/2026-09-30-v2-check/`

### B.1 The earlier pass's headline items

| Lead | Verdict at `6a200f4` | Finding |
|---|---|---|
| 1. A corrupt blob stops the app opening (ARCH-6/PERF-6) | **Confirmed, and wider:** the gate ran on *every* launch, across six stores | F01 (fixed at `30c7435`), F02, F216 |
| 2. 120 AI photos are unlabelled (QUAL-18) | Confirmed. D-029 was decided later, and the label shipped at `261a03e`. | F125 |
| 3. P8 "restore Supabase" has no purge of the seed accounts (SEC-5) | Confirmed | F116, F161, F204 |
| 4. One error boundary and no logger (ARCH-10/PERF-19) | Confirmed | F69 |
| 5. The OTA runtime policy is `appVersion` (ARCH-5/PERF-10) | Confirmed, but latent (expo-updates isn't installed) | F71 |
| 6. Rule 10 unmet (QUAL-30) | Confirmed and **worse** than stated: 151 of 209 controls had no testID (the lead said about 70) | F70 (partly fixed) |
| All 23 "plan gap" leads | Confirmed at HEAD. The plan text hadn't changed since `7617a17`. | F114–F124, F179 |

### B.2 Re-check of all 141 v1 findings at HEAD

`src` didn't change between `7617a17` and `6a200f4`, so this re-checked whether the earlier calls were right.

- **Agree:** 131 of 141.
- **Disagree:** 10.
  - **PREVENTED → OPEN (residual):** 8.
    - ARCH-1 (back and notification routing: F48, F133)
    - ARCH-12 (no migrations; uncapped log: F03, F178)
    - PERF-9 (timers cancelled or silent: F45–F47)
    - QUAL-8 (duplicate `capitalise`: F81)
    - QUAL-15 ("×" used as an icon: F174)
    - QUAL-22 (36 pt targets: F99)
    - QUAL-24 (iOS announcements are silent: F97, F98, F100)
    - QUAL-29 (empty state with no action: F31)
  - **GUARDED → OPEN:** SOC-12. The Sunday reminder tap doesn't route today (F133).
  - **OPEN → PREVENTED:** SEC-24, through the toolchain (see Appendix A). Medium confidence.
- The full table, one line per ID, is in the audit scratchpad (`R3V` output) and can be regenerated.

### B.3 `npm audit`

- 14 moderate: `@expo/cli`, `@expo/config(-plugins)`, `@expo/prebuild-config`, `@expo/metro-config`, `@expo/inline-modules`, `@expo/local-build-cache-provider`, `xcode`, `uuid`, `decode-uri-component`, `query-string`, `expo`, `expo-router` and `expo-splash-screen`.
- 0 high and 0 critical.
- None is reachable at runtime. uuid and xcode are build-time only, and expo-router's link parsing doesn't call `query-string.parse`.
- No action until Expo bumps them.

---

## Appendix C: coverage map

**Tools used.**
- `tsx` scripts against `src/domain`: about 60 proof scripts.
- Jest `renderRouter` for navigation.
- Jest with the AsyncStorage mock for hydration.
- A Playwright web export at 320 and 375 pt in light, dark and dark high contrast.
- An offline `expo prebuild` in a scratch copy, for iOS and Android.
- A mutation harness with 39 mutants.
- Catalogue sweeps: 285 recipes, 4,966 lines, 238,368 scaled renders.
- A fuzz test of user input: 57 messy lines and a 500-line recipe.
- The GitHub API, for repo visibility.

| Area | Examined | Findings |
|---|---|---|
| `src/store/*` (all 11) | yes, including zustand 5.0.15 persist internals | F01–F08, F55, F61, F76, F178, F203, F216–F218 |
| `src/domain/shopping`, `plan` | yes, proven with scripts, 9 time zones | F11–F13, F19, F20, F23, F130, F132, F196, F210 |
| `src/domain/ingredients`, `recipes` | yes, with catalogue sweeps and fuzzing | F24–F27, F36, F38–F44, F136, F181, F189–F195, F211 |
| `src/domain/cook`, `suggestions`, `cupboard`, `legacy` | yes | F09, F10, F30, F36, F145–F149, F158 |
| `src/features/plan`, `feed`, `recipe`, `cook` | yes | F14–F18, F22, F37, F45–F53, F169, F176, F188 |
| `src/features/recipes`, `surprise`, `welcome` | yes | F28–F35, F146, F166, F171 |
| `src/features/editor`, `saved`, `settings`, `shell`, `cupboard` | yes | F54–F62, F131, F134–F144, F162–F168, F206–F209 |
| `src/ui/*` (every primitive and pattern, read in round 4) | yes | F92–F113, F170, F198–F202 |
| `src/ui/tokens` and tests | yes; contrast maths checked against WCAG | F95, F96, F200, F201 |
| `src/lib` (notifications, dates, ids) | yes | F46, F74, F133, F137, F185, F188 |
| `src/app` routes and layouts | yes; navigation graph built from expo-router source | F48, F56, F57, F206, F209 |
| `app.json`, `eas.json`, prebuild output | yes | F67, F71, F73, F188, F205 |
| CI, eslint, jest, tsconfig, scripts | yes | F72, F77–F80, F86, F150, F151, F155, F183 |
| Catalogue data (`recipes.json`, `ingredients.json`, `assets/recipes`) | yes; integrity script, md5 of photos, diet re-derivation | F152–F158, F187 |
| Docs: plan, decisions, map, product, known issues | yes | F114–F129, F161, F179, F204, F212–F215 |
| Keep-awake, time zones and DST, secrets and history, supply chain, Hermes API use, first launch on a clean install | examined, clean | – |

**Remaining blind spots.**
1. Nothing was run on a physical device or simulator. Keyboard behaviour (F182), native sheet detents, VoiceOver focus, haptics, memory with 41 MB of photos, and Hermes startup time are all inferred.
2. Android was examined only lightly, per D-011.
3. Memory and long sessions weren't profiled (months of use, hundreds of cook events).
4. The stopping rule was met only at high/critical severity. Rounds 3 to 6 each still found new medium and low issues, mostly in parsing user input and in copy. Expect a further tail of low-severity issues there.
5. F216–F222 have had one check, not three.
