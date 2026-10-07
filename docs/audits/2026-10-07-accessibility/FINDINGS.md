# Accessibility audit, 7 October 2026

P11 (launch readiness). Claude read every screen in `src/features` and every shared piece in `src/ui` against the plan's rule 9 (`docs/V1-PARITY-PLAN.md`) and Apple's guidelines. Tools: a script listing every `Pressable` with its role, label and size; a heading scan; the contrast maths in `src/ui/tokens/contrast.ts` run over every text and background token pair in light, dark and both high-contrast themes; and reading each sheet, modal, animation and error path.

## The short version

The app was already in good shape: every control has a role, and every icon-only button has a label (`IconButton` makes the label required). Images are hidden or labelled, Reduce Motion is respected by the Reanimated animations, `Text` caps Dynamic Type sensibly, and core text passes WCAG AA in all four themes. The real gap was **iOS hearing nothing**. `accessibilityLiveRegion` is Android-only, so on an iPhone, errors, finished timers, new Cook Mode steps and tour steps all changed silently.

| Severity | Found | Fixed | Left |
| --- | --- | --- | --- |
| Critical (blocks a task) | 0 | 0 | 0 |
| Major (a task is much harder) | 8 | 7 | 1 (needs a phone test) |
| Minor | 12 | 8 | 4 (3 for the redesign, 1 by design) |
| In files another session owns | 4 | 0 | 4 (listed at the end) |

**Severity:** *Major* means a VoiceOver, Dynamic Type or Reduce Motion user can't easily finish the task. *Minor* means it's slower or less clear, or falls short of Apple's 44pt rule while staying usable.

## What changed in the code

- **`src/ui/primitives/accessibility.ts`** (new):
  - `announce` and `useAnnounce(message)` speak a message on iOS when it appears. Android is skipped, because its live regions already do it.
  - `useReduceMotion` and `useScreenReader` read the system settings with plain React Native, so shared sheets don't pull Reanimated into tests.
- **Tests:**
  - `src/ui/primitives/accessibility.test.tsx` (new): field errors and error blocks are spoken, error titles are headings, toasts mention Undo, plate photos are named and recipe photos stay decorative.
  - `src/features/cook/CookControls.test.tsx`: a finished timer is spoken once.
  - `src/ui/tokens/tokens.test.ts`: contrast now also covers text on cards, the amber wash, every pastel tint, and the fixed toast, library-card and photo-disc surfaces.
- **testIDs:** all unchanged.

## Findings

| # | Where | Issue | Severity | Fixed? |
| --- | --- | --- | --- | --- |
| 1 | `ui/primitives/TextField.tsx`, `ui/patterns/CollectionNameDialog.tsx`, `features/editor/EditorDetails.tsx`, `features/plates/PostScreen.tsx`, `features/pro/PaywallScreen.tsx`, `features/household/HouseholdScreen.tsx`, `features/household/JoinScreen.tsx`, `features/settings/DeleteAccount.tsx`, `features/cupboard/ScanSheet.tsx` | Problems shown under a field or a button ("That name's taken", "Couldn't join", the camera refused) were only in Android live regions, so VoiceOver said nothing. A blind user tapped Save and heard silence | Major | **Yes.** `useAnnounce(problem)` in each. Every `TextField` `error` is covered, which also covers the import-link and recipe-editor fields |
| 2 | `ui/patterns/ErrorState.tsx` | `accessibilityRole="alert"` doesn't speak on iOS when it appears, and the title wasn't a heading | Major | **Yes.** It announces "title. body", and the title is a header |
| 3 | `features/cook/CookScreen.tsx` | Next, Previous and swipe change the step under VoiceOver's focus, which stays on the button. The new step was never read. The counter's live region is Android-only | Major | **Yes.** On iOS it announces "Step 3 of 8. Fry the onion…". Android keeps its counter live region |
| 4 | `features/cook/TimerBar.tsx` | A timer finishing in the app (no lock-screen banner) changed to "Time's up" silently on iOS | Major | **Yes.** It announces "Time's up: 20 minutes, step 3" once per timer. Tested |
| 5 | `ui/patterns/Toast.tsx` | Toasts with Undo vanished after 4.5 s, too short to swipe to Undo after VoiceOver finishes reading. Nothing said Undo existed | Major | **Yes.** With a screen reader on, toasts stay 6 s, or 12 s with Undo, and the announcement ends "Undo available." Sighted timing is unchanged |
| 6 | `ui/patterns/Toast.tsx` | On iOS the toast is drawn in a `FullWindowOverlay` (its own window, so it shows above sheets). VoiceOver may not be able to swipe into that window to reach Undo | Major | **No: needs a phone test.** Turn on VoiceOver, remove a jar from the Cupboard, and try to reach Undo by swiping right. If it can't be reached, the fix is a Magic Tap (two-finger double-tap) handler on the provider that runs the latest Undo |
| 7 | `ui/patterns/ModalSheet.tsx`, `features/cook/CookIngredientsSheet.tsx` | The small sheets slid up even with Reduce Motion on. Reanimated respects the setting; React Native's `Modal` doesn't | Major | **Yes.** They fade instead, as iOS's own sheets do. The tour and name dialogs already fade |
| 8 | `ui/primitives/SearchField.tsx` | The search box (and Home's search button) had a fixed 46pt height. At large Dynamic Type sizes the text clipped | Major | **Yes.** `minHeight: 46`, so it grows. It looks the same at default sizes |
| 9 | `features/tour/TourOverlay.tsx` | Moving to the next tour card didn't say what the new card says (the live region is Android-only) | Minor | **Yes.** It announces "2 of 4. Title. Body" once the card is placed |
| 10 | `features/surprise/SurpriseScreen.tsx` | The spin landed on a new dish silently | Minor | **Yes.** It announces the dish's name |
| 11 | `features/plates/PlateScreen.tsx`, `features/plates/PostScreen.tsx`, `ui/patterns/RecipeImage.tsx` | Your own dish photos are the content of a plate, but they were hidden from VoiceOver like decorative recipe photos | Minor | **Yes.** `RecipeImage` takes an optional `label`. Plates say "Your photo of Lasagne, 1 of 2". Recipe photos stay decorative, because the card names the dish |
| 12 | `features/welcome/OnVideo.tsx` | The welcome backdrop photo wasn't explicitly hidden | Minor | **Yes.** `accessible={false}` |
| 13 | `features/recipe/RecipeHeader.tsx` (Edit pill, about 34pt) | Under the 44pt target | Minor | **Yes.** `hitSlop={SPACE.xs}`, so the target is about 50pt and the look is unchanged |
| 14 | `features/recipes/RecipesScreen.tsx` (Browse's active-filter pill, about 31pt) | Under 44pt | Minor | **Yes.** `hitSlop={SPACE.xs}`, about 47pt |
| 15 | `features/plan/DaySlots.tsx` ("For 4" servings pill, about 20pt with 8pt slop, so 36pt) | Under 44pt | Minor | **Yes.** `hitSlop={SPACE.sm}`, 44pt |
| 16 | `features/plates/PostScreen.tsx` (photo remove disc, 24pt with 6pt slop, so 36pt) | Under 44pt | Minor | **Yes.** `hitSlop={slopFor(PLATE.removeDisc)}`, 44pt |
| 17 | `features/pro/PlanChoice.tsx` (chosen plan), `features/recipe/CupboardSummary.tsx` ("Check you have") | Muted grey caption on the amber wash (`inkMuted` on `accentSoft`) is 4.42:1 in light mode, just under AA | Minor | **Yes.** These use `inkSoft` (about 7.7:1). Both are v2 additions, so v1's look isn't affected. The pair is documented in the token test |
| 18 | `ui/patterns/EmptyState.tsx` | With a button, the title wasn't a heading. Without one, the block reads as one line, which is right | Minor | **Yes** |
| 19 | `features/recipe/RecipeBody.tsx` (ingredient tick rows, 36pt) | Under 44pt. They are full-width and stacked with no gap, so slop would overlap the next row | Minor | **No: for the redesign.** Raising them to 44pt changes v1's ingredient spacing (rule 9: don't quietly alter the look) |
| 20 | `ui/patterns/JarChip.tsx` (cupboard jars, about 42pt with slop) | 2pt short. The chips sit 7pt apart, so more slop would overlap a neighbour | Minor | **No: for the redesign.** One step of `JAR.padY` would do it |
| 21 | `ui/tokens/colour.ts` (`accent` amber on white, 2.7:1) | Fails AA as text | Minor | **No: already handled.** `accent` is now only used for fills, rules and dots, and amber text uses `accentText`. It's on the token test's `KNOWN_FAILURES` list, which may only shrink |
| 22 | `ui/primitives/Text.tsx`, `features/shell/TabBar.tsx`, `features/shell/AppHeader.tsx`, `ui/primitives/Avatar.tsx` | Dynamic Type is capped: body text grows 1.8×, headings 1.5×, display 1.3×. Tab labels and the wordmark grow 1.2×, and the avatar initial doesn't grow. iOS's largest accessibility size is about 3× | Minor | **No: by design** (map rule 9: "text size is capped so it scales without breaking layouts"). Fixed heights that clipped are gone (#8; the week strip was fixed in health check #13). If a tester needs more, raise the body cap to 2.2× first |

### Checked and fine

- **Roles and labels:** all 70 `Pressable`s, every `IconButton` (its label is required), chips, checkboxes, switches, the stepper (adjustable, with increment and decrement), tabs and tab lists, and radio groups (`Segmented`, Home's What I have / Everything, the Pro plans, filter chips). The collection card's long press has an accessibility action.
- **States:** selected, checked, disabled and busy are set on every stateful control.
- **Headings:** every screen title, sheet title and section title is a header.
- **Modals:** focus is trapped (`accessibilityViewIsModal`), and each modal has a visible Close and a VoiceOver escape gesture: the drawer, tour, sheets, Cook ingredients and the name dialog.
- **Motion:**
  - Reanimated animations follow the system setting by default (`ReduceMotion.System`).
  - Cook Mode's step fade, Surprise me's spin and the skeleton shimmer check it explicitly.
  - Nothing auto-plays.
- **Gestures:** every gesture has a button alternative. Cook Mode's swipe and tap-anywhere have Next and Previous. Removing from the list has an × button.
- **Contrast:** every pair in `MUST_PASS` passes in light, dark and both high-contrast themes, as do the cuisine eyebrows, the toast, the cream library cards and the photo discs. Disabled and decorative grey (`inkSubtle`) isn't used for readable text.
- **Live counts on iOS** (Browse's result count, Home's ready count, the welcome progress) are deliberately not announced on each change: it would talk over typing. Android's live regions stay.

## In files another session owns (not edited)

These are in `src/features/account/*` and `src/features/settings/Account*.tsx`, which another session is editing. Each needs the same one-line fix as #1: `import { useAnnounce } from '@/ui/primitives/accessibility';`, then `useAnnounce(problem);` after the `problem` state.

| # | Where | Issue | Severity |
| --- | --- | --- | --- |
| A1 | `features/account/AccountSheet.tsx`, about line 97 (`account-problem`) | The sign-in problem is in an Android-only live region, so it's silent on iOS | Major |
| A2 | `features/account/EmailSheet.tsx`, about line 80 (`account-problem`) | Same | Major |
| A3 | `features/account/CodeStep.tsx`, about line 86 (`account-code-problem`) | Same: a wrong code is silent | Major |
| A4 | `features/settings/AccountSection.tsx`, about line 126 (`settings-sign-out-problem`) | Same | Minor |

## For Lachlan to try on the phone

1. Turn on VoiceOver (Settings › Accessibility › VoiceOver, or triple-click the side button if you've set the shortcut).
2. In Cook Mode, tap Next. You should hear the new step read out.
3. Start a 1-minute timer, wait for it to finish, and you should hear "Time's up".
4. Remove a jar from the Cupboard. You should hear "… Undo available." Then try to reach Undo by swiping right (finding #6).
5. Turn on Reduce Motion, open a recipe's servings sheet, and check it fades in rather than sliding.
6. Set the largest text size (Settings › Accessibility › Display & Text Size › Larger Text), and check Home's search box isn't clipped.
