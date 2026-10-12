# Cloud 02 · P5 Cupboard: handoff

Branch `cloud/02-p5-cupboard`, from `preview-2026-10-08`. Not merged.

## What was already there

Categories (the jars), quick adds, search, Add a list, the scan sheets, Clear with undo, and the "What you can cook" rail. This was built earlier under D-030, D-033 and D-042. Those decisions still apply: the page reads Step 1 add, Step 2 what's in, Step 3 what you can cook. "Add one thing" and "Stock up" stay out.

## What P5 added

- **The staples switch on the page.** It's v1's "Assume I have pantry staples", and it sits between the jars and the matches, as in v1, because it changes what the matches show.
  - It flips the "Always in my kitchen" shelf between *Assume stocked* and *Only what I tick*. This is the same setting the shelf sheet uses, so the two can't disagree.
  - It's saved. v1's switch wasn't (C9).
  - The caption says that salt, pepper, oil and water always count, either way.
- **"From your saved".** These are your Cookmarks that use something in the cupboard, with the fewest things to buy first.
  - A saved recipe that needs more than two things still shows, as "5 to buy" (v1 showed these too).
  - A bookmark that shares nothing with the cupboard isn't shown.
  - Diet, the avoid list and "not for us" apply, as everywhere.
- **"Suggested for you".** These are the engine's Ready and Need 1–2 matches, without the ones already on "From your saved". "See all" is unchanged.
- **Step 2's kicker** now counts categories too: "12 things · 5 categories", like v1.
- **Code:**
  - `src/domain/cupboard/shelves.ts` holds the pure logic, with 10 tests.
  - `src/store/cookable.ts` now returns `fromSaved` and `suggested`.
  - `src/features/cupboard/MatchShelves.tsx` replaces `CookRail`.
  - `StaplesToggle` is in `CupboardSettings.tsx`.
  - The changelog comment in `CupboardScreen.tsx` is gone (QUAL-10).
- **Tests:**
  - 7 new component tests in `CupboardScreen.test.tsx`. This is the first component test of the Cupboard screen itself.
  - 1 new web journey in `e2e/web/cook-and-cupboard.spec.ts`: a saved recipe leads "From your saved", and the switch survives a reload.

## Results

- Typecheck, lint and prettier are clean.
- `npm test`: 341 domain tests and 116 component tests pass.
- Web journeys: 42 passed and 4 failed. All 4 failures are Pro tests (`plan-pro-nudge`, `pro-benefits`, in light and dark). They don't involve the Cupboard; I didn't confirm them against the base branch.
- Light screenshot checked against `light-12b-cupboard-2.jpg`.

## Calls Claude made (easy to reverse)

1. Saved recipes more than two things short still show on "From your saved", counted ("5 to buy"), as v1 did. The alternative is to show only Ready and Need 1–2.
2. The switch sits above the matches (v1's place), while "Always in my kitchen" and "Move ticked shopping here" stay at the foot.

## Needs a phone check (Lachlan)

- **The staples switch:** turn it off and back on, and watch the matches change. Do the caption's two lines read well at large text sizes?
- **Both rails:** they should scroll sideways, with the cards an even height. "Need 1" and "5 to buy" pills should read on the ink cards in light and dark.
- **The Step 2 kicker** at large Dynamic Type: it wraps rather than truncating, but check it looks right beside "Clear".
- **Maestro:** there's no flow for the new controls (`cupboard-staples`, `saved-match-*`) yet. The simulator wasn't available here.
