# Health check, 5 October 2026

A full pass over today's app: every screen in light and dark, seeded and empty, at 390pt and 320pt wide, plus a code audit for dead controls, missing states, accessibility, contrast and the CLAUDE.md rules. Contrast ratios were computed (`contrast.txt`), tap targets measured (`targets.json`), and style literals listed (`literals.txt`). Screenshots were taken from the web build and are not committed.

**31 findings: 2 blockers, 15 should fix, 14 polish.** The "Status" column is filled in as fixes land; see the end of this file.

## What's already clean

- No colour literals outside `src/ui/tokens`, no file over 300 lines, no feature importing another feature.
- Every Pressable has a role and a label or text; selected, checked and disabled states are exposed; photos are hidden from the screen reader.
- No dead or fake buttons. The scan sheet's "Coming soon" is deliberate (K-14).

## Blockers

1. **Decimal quantities lose their whole number.** `src/domain/recipes/draft.ts` treated "1." as a list number, so "1.5 kg lamb" became "5 kg lamb" and "0.5 tsp" became "5 tsp", in recipes you write or import. The wrong amounts reached the shopping list. Fix: only strip a number followed by `.` or `)` and a space.
2. **White text on amber fails contrast** (2.74:1 light, 2.04:1 dark, 1.67:1 dark high contrast): tab badges, the "Cooked" pill, `Badge`, the finished timer, accent buttons. `tokens.test.ts` let it pass as a known failure.

## Should fix

3. Amber text on white is 2.74:1: page kickers, shopping aisle labels, recipe "on" states.
4. Cuisine eyebrows use one hex in both themes at 9.5pt; most fail on white, on the cream cards and in dark.
5. Surprise me (light): the italic "me" is 1.6:1; the deck's cuisine label has no scrim on pale photos.
6. Light `danger` (#D85A5A) is 3.8:1 on white: Clear, Delete collection, field errors.
7. Counts don't match their lists (menu Cookmarks 8 vs Saved 7, etc.): counts use raw ids, including recipes that no longer exist. Deleting a recipe leaves plan entries and bookmarks behind.
8. The "What I have | Everything" switch truncates at 320pt and at large text sizes; the count pill has a fixed height. "Cupbo…" in the tab bar and List's "Next week" pill also clip at 320pt.
9. "Nearly there" need lines truncate the very thing they say ("Need 2: cabbage, cucu…").
10. Tour: "Skip tour" sits on the header avatar; stop 1's card covers the pantry line.
11. VoiceOver can get stuck in sheets: no `onAccessibilityEscape`, the backdrop Close is hidden by `accessibilityViewIsModal`, dropdown pickers have no close control.
12. Tap targets under 44pt: small `Segmented` (36), Cook/Cooked pill (36), List week pills (41), jar chips (41), the "From N things · Change" line (32), settings switch rows (only the switch is tappable).
13. Week strip cells have a fixed height and clip at the largest text sizes.
14. Duplicate recipe photos: bibimbap shows a bulgogi bowl; beef-curry = beef-rendang; the three schnitzels; the two gyudons; the two quesadillas; the two tagines.
15. Heavy black blocks in light mode: empty collection mosaic quadrants, empty collections, no-photo library cards.
16. The recipe page's grab handle floats over scrolling text.
17. Copy says "scan a receipt" while scanning is Coming soon (Cupboard, Home empty state, tour stop 2).

## Polish

18. Not-found button says "Back to Feed".
19. The menu says "Cookmarks", the page says "Saved".
20. Three different missing-recipe states, mixed apostrophes.
21. "Ingredients :" with a space before the colon (VoiceOver reads "colon").
22. Ticked ingredient lines are nearly invisible (`inkSubtle`, 1.9:1).
23. Field borders and the switch's off track are under 3:1.
24. Library card meta is 4.0:1 at 11pt.
25. The contrast test checks the wrong pairs and grandfathers real failures.
26. 46 size/spacing literals and about 48 raw icon sizes outside tokens (`literals.txt`); lint doesn't catch them.
27. My recipes shows raw validator text ("title is longer than 80 characters").
28. Empty My recipes: "Import from a link" is misaligned.
29. Time is written three ways ("4h 40 min", "1 hr", "4h 40m").
30. Editor placeholders look like real content.
31. Web only: the focused search field draws a square outline.

## Status

Fixed on 5 October 2026 (typecheck, lint, 246 domain tests and 24 component tests pass; re-shot in light and dark):

| # | Status |
| --- | --- |
| 1 | Fixed: numbering needs a space after "1." or "1)"; tests for "1.5 kg", "0.5 tsp" and "1.5 hours". |
| 2 | Fixed: `onAccent` is dark ink on amber (6.4:1 light, 9.7:1 dark); light high contrast keeps white on its deeper amber (5.9:1). |
| 3 | Fixed: new `accentText` token for amber text and icons (5.3:1 light); `accent` is for fills only. |
| 4 | Fixed: eyebrows have a light-ground and a dark-ground colour per cuisine, all at least 4.6:1; the test checks every cuisine on every ground. |
| 5 | Fixed: "me" uses `accentText`; a top scrim sits behind the spinner card's label. |
| 6 | Fixed: light `danger` is #B33A3A (5.9:1); dark `onDanger` is dark ink. |
| 7 | Fixed: drawer and collect-sheet counts only count recipes that still exist. Deleted recipes keep their references so Undo restores everything; the lists already skip them. |
| 8 | Fixed on iOS: the switch labels shrink to 70% before truncating; the count pill grows. (Web can't shrink text to fit.) |
| 9 | Fixed: need notes get two lines. |
| 10 | Fixed: "Skip tour" moved onto the card (every stop but the last); stop 1's spotlight takes in the "From N things" line. |
| 11 | Fixed: VoiceOver's escape gesture closes every modal (sheets, Cook ingredients, drawer, name dialog, tour); small sheets have a visible Close button. |
| 12 | Fixed: small segmented control, Cook pill and List pills reach 44pt through hit slop; the "Change" line is 44pt tall; a whole Settings switch row is the switch. Jar chips (41pt) left as they are, because they sit close together. |
| 13 | Fixed: week strip days have a minimum height and grow. |
| 14 | Open: needs new photos (Lachlan). |
| 15 | Fixed: the library well is light in light mode. |
| 16 | Not reproduced on iOS: the handle sits outside the scroll view; web only. |
| 17 | Fixed: no copy mentions scanning while it's Coming soon. |
| 18 | Fixed: "Back to Home". |
| 19 | Open: Cookmarks or Saved is Lachlan's call. |
| 21 | Fixed: VoiceOver reads "Ingredients", not "Ingredients colon"; the spaced colon stays on screen (v1's look). |
| 22 | Fixed: ticked lines use `inkMuted`. |
| 24 | Fixed: library meta at 0.62 alpha. |
| 25 | Fixed: the contrast test now requires the real pairs and grandfathers only `accent` on `bg`. |
| 20, 23, 26–31 | Open, polish. |
