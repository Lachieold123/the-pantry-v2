# Cloud 04 · P7 onboarding: handoff

**Branch:** `cloud/04-p7-onboarding`, from `preview-2026-10-08` (dac1e37). Not merged anywhere.
**Decision:** D-050 in `docs/DECISIONS.md`.

## Needs Lachlan first

1. **This reverses part of D-041.** On 6 October you cut the welcome to two steps (diet, then cupboard) and dropped the taste quiz, the reveal and the reminder question. The parity plan's P7 (30 September) lists v1's full flow, and this branch builds it, keeping D-041's cupboard step. If you still want the two-step welcome, say so: the new steps are separate pieces, so going back is small (`QUESTION_STEPS` in `src/domain/welcome/onboarding.ts` and the screen's switch). The checklist and the terms tick work either way.
2. **Terms tick is dormant.** It only shows once `LEGAL_URLS.terms` in `src/lib/legal.ts` has a published https link (K-23). v1's "I'm 13+" is left out because the draft terms set no age; add an age line to the terms first if you want it (social will likely need one).
3. **Look at it on the phone:** the iOS notification prompt after "Allow notifications", and the welcome at large text sizes.

## What's built

- **Welcome, in v1's order:** hello (+ terms) → What brings you here? → Anything you don't eat? → What do you love eating? → How long do you have? + skill level → What's in your cupboard? → Tonight, for you → A nudge when it counts → Home. Skip leaves from any step; Back keeps answers; a redo from Settings keeps everything and doesn't ask for the terms again.
- **Answers do real things:** skill lifts recipes that suit in `forYou` (Home and the reveal), never hides any. "Cook this tonight" puts the chosen pick on tonight's plan; "Spin again" shows three more. "Allow notifications" turns on the existing Sunday reminder via `expo-notifications` (already installed, no new module); the preview shows the reminder's exact words (`SUNDAY_REMINDER_TEXT`). Skill is also in Settings › Cooking.
- **First-run checklist on Home:** fill your cupboard, plan a dinner, save a recipe, cook something (opens Surprise me), plus "Share your kitchen" if asked for. Each step is worked out from the stores; what you came for goes first, unfinished steps lead. Closed or completed, it's gone for good. Only people who come through the new welcome see it.
- **Old-app import:** unchanged. Testers who finished the old onboarding still skip the welcome (and so don't see the checklist).

## Files

- Domain: `src/domain/welcome/onboarding.ts`, `checklist.ts` (+ tests); skill in `src/domain/suggestions/forYou.ts`.
- Stores: `src/store/preferences.ts` (v4: `intents`, `skill`, `termsAcceptedAt`), new `src/store/checklist.ts`.
- Screens: `src/features/welcome/` (`TasteSteps`, `RevealSteps`, `Consent`, reworked `WelcomeScreen`), `src/features/feed/FirstRunChecklist.tsx`, Settings skill row.
- Tests: `WelcomeScreen.test.tsx` (11), `FirstRunChecklist.test.tsx` (5), domain tests, `src/lib/legal.test.ts`; web journeys in `e2e/web/first-run.spec.ts`; Maestro `01-welcome-complete.yaml` and the skip subflow (closes the checklist so other flows see Home as before).
- Screenshots (web build): `docs/reports/cloud-04-p7/`. The Home shot was taken before unfinished steps were moved to the front of the row.

## Results

- typecheck, lint, prettier: clean.
- `npm test`: 346 domain tests and 119 component tests pass.
- `npm run test:web`: 44 pass, 4 fail. The 4 (`library.spec.ts:44`, `pro-and-household.spec.ts:14`, light and dark) fail the same way on the untouched base branch: the paywall's `pro-benefits` never shows. Not caused by this work; worth a look.
- Maestro not run (no simulator here).

## Left out on purpose

- Intents and skill aren't synced to the account: the server checks the shape of prefs rows (D-048), so adding names there needs a migration check first.
- The ring is a count in a circle, not v1's drawn arc (that needs `react-native-svg`, a native module). v1's green "done" colour is the amber accent (the token test forbids green).
- No age gate, no server record of consent (comes with accounts and social, P8/P9).

## Separate: a stray change in this worktree

The worktree started with an uncommitted rewrite of `docs/launch/APP-STORE-LISTING.md` from another session. It isn't part of this branch; it's saved as a patch at `/tmp/cloud04/app-store-listing-uncommitted.patch` on the Mac.
