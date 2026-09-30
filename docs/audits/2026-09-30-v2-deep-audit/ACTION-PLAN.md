# Action plan: fixes from the v2 deep audit

- **Source:** `DEEP-AUDIT.md` in this folder. Audited at `6a200f4`, re-checked at `30c7435`.
- **Scope:** only findings still open at `30c7435`. F01 is already fixed.
- **Effort:** S = under an hour · M = half a day · L = one to two days.
- **How to use it:** work top to bottom. Each numbered step is one small, verified change, as CLAUDE.md asks: typecheck, lint, test, simulator, screenshots, a Maestro flow, then Lachlan's phone.

---

## (c) Needs Lachlan's decision: do these first, because several block the rest

Listed most urgent first. Each has a recommendation.

| # | Decision | Findings | Options (recommendation first) | Effort | When |
|---|---|---|---|---|---|
| C1 | **Back up the paused v1 Supabase project** before it can no longer be restored | F161 | (a) Download a backup from the dashboard now (recommended). (b) Restore it now, then pause again. Don't unpause it as-is for long (C2). | S | **This week** |
| C2 | **This repo is public** and holds v1's backend security write-up and a personal Apple ID email | F204, F205 | (a) Make `the-pantry-v2` private, one click (recommended). (b) Keep it public, but redact `security.md` and move `appleId` out of `eas.json`. (c) Purge the history (needs a force-push). | S | This week |
| C3 | **Never restore the v1 Supabase project as-is.** Choose a new production project plus a separate dev project | F116, F186 | (a) A new prod project with a fresh schema, plus a dev project, and seed scripts that refuse prod (recommended). (b) Reuse the old project only after purging the seed users, rotating keys and revoking grants. Also decide what happens to v1 testers' server data. | M | Before P8 |
| C4 | **Define "next week" for the Pro gate** so the Sunday plan stays free | F212, F213 | (a) Free covers "the week you're planning": this week, or next week from Sunday on. Pro is further ahead. No retroactive lock-out: gate new creation only (recommended). (b) Drop "next week" as a gate. | S | **Before P4** (P5 now comes first) |
| C5 | **Mark recipes as vetted, and set the minimum count for a release build** | F68, F151, F88 | (a) Add `vetted` and time overrides to the fix files, and a release check that fails below N vetted (N ≈ 80, per D-008) (recommended). (b) Allow drafts in TestFlight builds only. | S (the decision) | Before the first TestFlight |
| C6 | **Old-app cook history has no dates** | F09 | (a) Import each `cookedRecipes` id as one cook dated at import time, marked "date unknown" in stats (recommended). (b) Import only a "cooked before" flag. | S | Before any tester opens v2 |
| C7 | **Time-sensitive timer notifications** (adds an entitlement to the App ID) | F188 | (a) Add the time-sensitive entitlement for Cook timers only (recommended). (b) Accept that Focus modes silence them. | S | Now |
| C8 | **The cupboard carry-over rule** | F15, F134 | (a) Only long-life items move into the cupboard when ticked, and unticked extras carry forward (recommended). (b) Shop-sourced items expire after N days. (c) Turn `moveTickedToCupboard` off by default. | S | With P5 (D-030) |
| C9 | **Diet tags: rennet cheese and optional meat lines** | F152, F187 | (a) Optional meat or fish lines block vegetarian and pescatarian tags; keep the rennet cheeses tagged vegetarian, with a note on each recipe (recommended). (b) Strict rennet rule, which shrinks the vegetarian pool. | S | Now |
| C10 | **Vegan pool of 5 dinners** | F158 | (a) Vet or add about 10 vegan dinners through the fix files (recommended). (b) A designed "we're short on vegan dinners" state. | M | Before launch |
| C11 | **Australian under-16 social media law** | F121 | (a) Get a short legal opinion before designing P8 sign-up (recommended). (b) Launch social as 16+ with age assurance. (c) Launch without DMs. Re-answer the age rating in P11. | M | Before P8 |
| C15 | **Clock and log safety:** prune against a high-water mark (F08); keep the cook log uncapped, or roll up old events (F178) | F08, F178 | (a) High-water mark and uncapped log (recommended). | S | Before P6 |
| C12 | **Local data and accounts** | F115 | (a) The library, plan, cupboard and cook log stay on the device, and sign-out never wipes them (recommended). (b) Full sync with a merge rule. | S / XL | Before P8 |
| C13 | Social scope against the map's brand rules (counts, feed order); DM request policy; video at launch | F126, F119, F124 | Recommended: counts on post detail only; a chronological feed; mutual follows go to the inbox and everyone else to Requests; photos only at launch. | S | Before P9 |
| C14 | Keep or drop for 12 v1 items; analytics and storefronts; the Cooked pill as a log or a toggle; lemon zest plus juice; imperial liquids (fl oz vs US cups); Browse obeying diet; welcome-back skip semantics; iOS Increase Contrast; expo-updates; the v1 auth key cleanup | F127, F129, F51, F196, F180, F33, F148, F107, F71, F186 | One batch of short answers, logged as D-031 onward. | S | Before P6 |

---

## (a) Fix now: in order

### Step 1: data safety and the North Star (do these first)

| # | Fix | Findings | Effort |
|---|---|---|---|
| A1 | When a storage *read fails*, don't hydrate with defaults. Block writes for that store, and show a calm message. Guard `entries` in `plan.ts`. One startup wait, not two. List and restore the backups. | F216, F02, F217, F218, F04, F03 (versioned `persistOptions` helper before the first version bump), F06 (hold writes until the first read settles) | M |
| A2 | Tell the user when a save fails (storage full): an `onSaveFailed` hook and a toast. | F05, F220 | S |
| A3 | Fix the old-app import field names (`recents`, `cookedRecipes`), and build the test fixture from v1's real type. Make re-runs idempotent and version the marker. Reverse the Cookmarks order. Mention dropped, hidden and cupboard items in the welcome line. Treat an all-default v1 quiz as skipped. | F09 (C6), F07, F145, F149, F148, F10 | M |
| A4 | Ticks and removals worked out over the whole week, stored as a base quantity, and kept while need ≤ ticked. Untick removes a cupboard item that came from the shop. Migrate `listEdits`. | F11, F12, F13, F14, F19 | M |
| A5 | A `useToday()` hook (AppState plus midnight), used at every `toISODate(new Date())` site. | F16 | S |
| A6 | The editor's decimal parser `\d+[.)](?!\d)`; the Unicode bullet list; "Step n –". | F39, F191 | S |
| A7 | Planned servings carried through to the recipe page, Cook and the plan sheet. Validate the servings param. One `MAX_SERVINGS`. Reset servings and ticks when the recipe changes. | F37, F52, F21, F50 | S |
| A8 | Cook Mode: confirm before leaving while a timer runs; dedupe timers; handle permission denial with an "Open Settings" toast; cancel late-resolving notifications; clearer notification wording; configure the handler at startup. Time-sensitive timers once C7 is decided. | F45, F46, F47, F185, F74, F188 | M |
| A9 | Cold deep links: an `unstable_settings` anchor on `(tabs)`, `goBackOr('/')`, and a `goToTab()` helper for "Browse recipes" and NotFound. | F48, F206, F84 | S |

### Step 2: correctness users will notice

| # | Fix | Findings | Effort |
|---|---|---|---|
| A10 | Search: exact matches first, typo matching only when nothing else matches; a trailing 1-letter prefix; empty-normalised query → []; synonyms in the index; `useDeferredValue` and a shared index. | F24, F25, F26, F27, F87 | M |
| A11 | Avoid list and diets: custom words mapped to ids and families; generic pork, lamb and fish entries; unmatched lines with no amount block tags; "or" lines handled conservatively; the optional regex widened; "Optional:" headings. | F136, F211, F181, F189, F195, F194 | M |
| A12 | A shared `fitsTaste()` for Add-to-plan Ideas and Cupboard's canMake, ranked with For you. | F131 | S |
| A13 | Quantity parsing and display: thousands separators, mixed numbers, second amounts flagged; eighths and "a pinch"; kg below 1 shown as g; plurals from the printed number; "half a lemon"; "small handful"; drizzle. | F38, F40, F41, F20, F42, F44, F192, F193, F190 (Unicode-aware keys), F43 (after C14) | M |
| A14 | Step timers: `NUMBER_PATTERN`, compound durations, delete "before serving". °C → °F in step text in imperial mode. | F36, F49 | S |
| A15 | Cook Mode ingredients with group headings and capitalised lines (a shared list in `src/ui/patterns`). | F169 | S |
| A16 | The editor: don't demote a finished recipe; dismiss before navigating; save latch; name the bad line in errors; friendly duration messages; `Object.hasOwn`; Android/web Back guard. | F54, F56, F60, F168, F59, F62, F208 | M |
| A17 | Import hardening: a size cap, no quadratic regexes, entity clamp and try/catch, https upgrade, strip tracking, abort on unmount, a busy guard. | F63, F64, F65, F58, F167 | S |
| A18 | Counts from resolved recipes; plan rows for drafts; orphan entries left out of Tonight and the counts. | F55, F159, F17, F144 (guard a missing recipe, clamp the plan day), F22 ("Cooked tonight" state, after C14) | S |
| A19 | Surprise: clear the result on a time change; spin guard; exclude the last pick; empty state with a cause and an action; softer intro copy; the card opens a full page. | F28, F29, F30, F31, F171, F209 | S |
| A20 | Browse: preset pill logic; own recipes in store builds; "Show all"; "1 recipe match". | F32, F34, F35, F160 | S |
| A21 | The list: count extras; disable Send when empty; dates in the share title; Undo for extras and dedupe; Sunday reminder routes to Plan; reminder switch checks permission, with Open Settings and no snap-back. | F132, F135, F133, F137, F164, F23 (down-rank next week's plan too) | S |
| A22 | Undo that restores, not toggles; the collection delete flash; a double-tap guard on leaving actions; Welcome photo tap, stale offset and retake stack; the unsave toast. | F162, F203, F165, F163, F146, F166, F57, F175, F61 (unique names in a reducer), F140 (keep an Undo toast), F207 (clear the drawer timeout) | S |

### Step 3: accessibility and UI (all on v1's look, per D-025)

| # | Fix | Findings | Effort |
|---|---|---|---|
| A23 | An `announce()` helper for iOS (Cook step, timer done, counts, errors); a save action on cards; the toast says "Undo available" and stays while a screen reader is on; escape gestures; the error screen header and announcement. | F97, F98, F100, F104, F202 | M |
| A24 | 44 pt targets through hitSlop; chip roles (radio, button); labels that match visible text; ListRow detail; focus after a step; Android reading order and Reduce Motion in ModalSheet. | F99, F102, F174, F103, F101, F108, F105 (SearchField minHeight) | S |
| A25 | High-contrast tokens: `onAccent` black in dark high contrast, a darker `danger` in light high contrast, a selected-tab cue, the switch off-track. Per-theme watch-list in `tokens.test.ts` with ratio floors. | F95, F96, F106, F200 and F201 (contrast helper and tighter token tests); F109 goes on the rule 9 redesign list | S |
| A26 | Keyboard: `automaticallyAdjustKeyboardInsets` on Screen and Sheet. Native appearance follows the in-app theme. | F182, F142 | S |
| A27 | Layout: action row wraps; step-number width; FAB at 56 pt; Button label shrinks; "TAP TO ADJUST" centred; timer chip nbsp; Filters section heading; Browse head spacing and filter button; status bar over photos. | F92, F93, F94, F198, F110, F112, F199, F111, F113 | S |
| A28 | Copy: curly apostrophes with a lint rule; plural and "where" helpers; toast tone; control names; Plan copy; Feed "Next few days"; Cupboard search messages; a single empty state on Plan. | F177, F172, F170, F173, F141, F143, F139, F176 | S |

### Step 4: tests, tooling and release

| # | Fix | Findings | Effort |
|---|---|---|---|
| A29 | Tests that constrain behaviour: add the missing assertions for every surviving mutant (avoid and diets table, share text, week boundaries and April DST, Surprise pools, streak, old-app timestamps, units, contrast floor); a field-level round-trip; `TZ` in `test:domain`; mark bug-encoding tests with finding IDs. | F210 | M |
| A30 | Test runners pick up every `*.test.ts`. Store, hydration, migration and import tests. Pure reducers moved into `src/domain`. A component render test per screen state. The remaining testIDs. Maestro pointed at the dev build and run in CI. | F77, F76, F70, F222, F219, F83 | L |
| A31 | Lint: numeric style literals and token ± n banned (values moved into tokens first); structure-rule holes closed; `.mts` linted; `--max-warnings 0`; `noUnused*` on; typed-route check; generated files ignored. | F78, F79, F80, F82, F183, F86 | M |
| A32 | CI: `expo export`, `expo install --check`, a timeout, and a concurrency group. | F72 | S |
| A33 | Error boundaries per route group; "Go to Tonight"; `src/lib/logger.ts`. | F69 | M |
| A34 | Branded splash on the `bg` tokens; `export:web` with drafts on; a vetted-count release check (C5). | F67, F68 | S |
| A35 | Converter: count hits across groups, report unknown and zero-match fixes, write outputs only when clean, split warnings from errors, emit Prettier-clean output, and add vetting and time overrides (C5). | F150, F151, F155 | M |
| A36 | Data checks: alias-collision assertion; re-derive diets and ids in tests; content fixes for US terms, duplicate photos and the omelette line. | F156, F157, F154, F153, F187 | S |
| A37 | Performance: memoised cards and `useBookmarks`; the Cook tick moved into TimerBar; per-recipe build memo; lazy ingredient index; FlatList for long lists. | F90, F53, F197, F89, F91 | M |
| A38 | Small architecture tidy-ups: one `capitalise`, labels and constants; stale phase comments; move `pendingImport` and `weekChoices` into the right layer; runtimeVersion `fingerprint` and pinned native modules. | F81, F85, F83, F71 | S |

---

## (b) Fold into a phase

| Phase | Add to its brief | Findings | Effort |
|---|---|---|---|
| **Now (docs)** | Bring the plan, PRODUCT and KNOWN-ISSUES into line with D-028, D-029 and D-030 (P5 before P4, scanning at launch). Superseded banners on the map. Close PRODUCT §4.6's Sunday question in D-009. | F128, F221, F125, F212 | S |
| **P5 Cupboard (now first)** | The F131 filter as step 1; cupboard carry-over rule (C8); old-app pantry names; an empty "What can I make?" state; generic ingredient entries. | F131, F15, F147, F139, F211 | – |
| **P4 Plan** | The Sunday default for the list view only; one empty state; the plural list names; FlatList for the saved section. | F18, F176, F130, F91 | – |
| **P6 Library and Cook** | Cook session store (timers survive leaving); saved editor drafts; the v1 items kept by C14; Settings content (legal, export). | F45, F184, F127, F117 | – |
| **P7 Onboarding** | Terms and privacy hosted and versioned before the consent screen; focus management; reset the reveal offset. | F117, F215, F101, F166 | – |
| **P8 Backend and accounts** | An account lifecycle block (auth store, signOut and deleteAccount, Apple revoke, RevenueCat erase, forgot password); the local-data rule (C12); a traceability table closing every v1 SEC and SOC ID; wipes that keep the import marker; a new storage key for the session; the age decision (C11). | F114, F115, F118, F179, F214, F186, F121 | L |
| **P9 Social** | Notifications block (token lifecycle, preferences, typed deep links); rule 6 extensions; universal links; UGC terms at the first post; video decision. | F120, F119, F66, F215, F124 | M |
| **P10 Pro and AI** | RevenueCat identity, entitlement never persisted, webhook, 3.1.2 disclosure, Manage subscription, lapse rule; an AI rule (server keys, caps, consent under 5.1.2(i)), which is **earlier under D-030**. | F122, F123, F213 | M |
| **P11 Release** | Fingerprint check plus Sentry; age rating re-answered; App Privacy labels; adaptive icon and blocked permissions; dev gallery out of the bundle; Android exact alarms (if Android ships). | F71, F121, F117, F73, F75, F138 | M |

---

## What success looks like

- **Step 1:**
  - A new jest suite proves that a corrupt blob, a failed read and a failed write never lose data or hang the app.
  - The North Star week (plan on Sunday, tick on Monday, open on Tuesday) keeps every tick, in a test that crosses midnight.
  - A pasted "1.5 kg" stays 1.5 kg.
- **Step 4:** the mutation harness (`scripts/` or CI) kills at least 90% of the 34 mutants.
- **Decisions:** each decision above is logged as a D-0xx before the phase it blocks starts.
