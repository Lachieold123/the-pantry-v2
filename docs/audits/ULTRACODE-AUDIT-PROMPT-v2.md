# Ultracode deep-audit prompt for v2 (paste everything below the line into a fresh session)

---

ultracode

You are auditing **The Pantry v2**, an Expo (SDK 57, React Native 0.86, React 19.2, Expo Router) cooking app, in the GitHub repo `Lachieold123/the-pantry-v2`, branch `main`. If the repo isn't already in your workspace, attach it and clone it. Confirm HEAD with `git log -1 --oneline`.

I want the deepest audit this codebase has had. Orchestrate many parallel agents, one or more per dimension below. Adversarially verify every finding: two or three independent sceptic agents, each with a different lens, try to refute it, and only CONFIRMED findings reach the report. Keep running finder rounds until two rounds in a row find nothing new. Read the real code. No generic advice.

## Read first

- `CLAUDE.md`: the project rules.
- `docs/V1-PARITY-PLAN.md`: the plan and its 12 rules. Phases P1–P3 are built. P4–P11 are not built yet, so don't report "feature X is missing" if a phase covers it.
- `docs/DECISIONS.md`: D-001 to D-029.
- `docs/KNOWN-ISSUES.md`.
- `docs/audits/2026-09-30-original-app/`: the 141-finding audit of v1. v2 must not repeat any of it.
- `docs/audits/2026-09-30-v2-check/`: a first static pass of v2 against that audit, plus a v1 feature inventory. Treat its findings as leads to verify, not as truth. Say which ones you confirm or refute.

## Project facts

- **Structure:**
  - Routes live in `src/app` and stay thin.
  - Feature screens live in `src/features/*`, and features never import each other.
  - Pure logic lives in `src/domain` (no React).
  - Zustand stores live in `src/store`, persisted to AsyncStorage.
  - Design tokens live in `src/ui/tokens` and primitives and patterns in `src/ui`.
  - The data is a 285-recipe catalogue plus the ingredient database in `src/data`.
- **Commands:** `npm run typecheck`, `npm run lint`, `npm test` (node:test domain tests, then Jest component tests). The npm registry may be blocked where you run. If it is, say so and audit statically.
- **Not built yet:** backend, accounts, social, payments and AI. For those, audit the plan's readiness (is each audit finding covered by a rule or phase?), not missing code.

## Guardrails for every agent

- Don't change `main`. No `git push` to `main`, no EAS builds or updates, and nothing that touches Supabase, RevenueCat or App Store Connect.
- Finder and verifier agents are read-only.
- Only one writer agent, at the end, writes the deliverables. It commits them on a new branch, `audit/v2-deep-audit-<date>`, and pushes that branch only.

## Dimensions (each gets its own agents, then adversarial verification)

1. **Correctness:** every feature's code path, walked as a sceptical QA engineer.
   - The areas: Feed/Tonight, Browse (chips, moods, search, filters, results), the recipe page (servings, units, ticks, the actions sheet, cooked), Plan and the shopping list (derivation, edits, ticking into the cupboard, week boundaries, time zones and daylight saving), Cupboard, Cook Mode (timers, notifications, keep-awake), Saved/Collections/My recipes/editor/import from link, the welcome quiz, Settings, the side menu and tab bar, and the old-app import.
   - For each: race conditions, wrong states, dead ends, and file:line bugs.
2. **Data integrity and resilience:**
   - store versioning and migrations;
   - a corrupt or oversized saved blob;
   - hydration order;
   - an app killed mid-write;
   - storage full;
   - clock changes;
   - every place a failure could wipe or overwrite user data.
3. **Security and privacy (client):**
   - deep links and the `thepantry://` scheme;
   - import-from-link fetching and parsing (SSRF, huge responses, malicious HTML);
   - share text injection;
   - secrets in the bundle;
   - PII in logs;
   - notification content;
   - the iOS privacy manifest;
   - dependency vulnerabilities (`npm audit` if it runs).
4. **UI and design fidelity:** compare each built screen against `docs/design/V1-DESIGN-SPEC.md` and `docs/design/v1-reference/*.jpg`.
   - Check light, dark and high contrast.
   - Check long text, huge Dynamic Type and small phones.
   - Find visual bugs, clipping, overlap and inconsistent spacing.
   - Find any literal colours, sizes or spacing outside `src/ui/tokens`.
5. **Accessibility:** WCAG AA contrast (tokens and real pairings), roles and labels on every control, 44-point targets, focus order, screen reader flow in sheets and modals, and Reduce Motion.
6. **Performance:**
   - re-render behaviour (store selectors, unstable callbacks, memoisation);
   - list virtualisation;
   - startup path and catalogue parsing;
   - image sizes and bundle weight;
   - timers and listeners;
   - memory.
7. **Architecture and code quality:**
   - rule compliance (thin routes, features not importing features, domain purity, the 300-line limit, comments that explain why);
   - dead code, duplication and naming consistency;
   - test coverage of critical paths, and whether tests check behaviour.
8. **Release readiness:**
   - `app.json` and `eas.json` (runtimeVersion policy, OTA safety, iOS and Android config);
   - error boundaries and the absence of a logger;
   - CI (`.github/workflows`);
   - Maestro readiness (testIDs on every control);
   - native dependencies that aren't used.
9. **Plan readiness:** for P4–P11, find anything in the v1 audit or the v1 feature inventory that no phase or rule covers, especially for backend, social and moderation (Apple guideline 1.2), accounts and deletion, payments, and AI.

## Every finding needs

- a severity (critical, high, medium or low);
- file:line evidence;
- a concrete failure scenario;
- a proposed fix;
- the verifiers' votes.

A final completeness critic asks what the sweep missed, and runs one more targeted round.

## Deliverables (on the audit branch only)

1. `docs/audits/<date>-v2-deep-audit/DEEP-AUDIT.md`: an executive summary; confirmed findings by severity; an appendix of refuted findings; and a coverage map of what was examined.
2. `docs/audits/<date>-v2-deep-audit/ACTION-PLAN.md`: fixes in order, as (a) fix now, (b) fold into a phase, which one, (c) needs Lachlan's decision. Estimate the effort for each.
3. End your reply with the ten most important findings, one line each, and the name of the branch you pushed.
