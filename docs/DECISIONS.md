# The Pantry v2: Decision log

One entry per decision, newest at the bottom. Open questions live in `PRODUCT.md` §6 until they're answered here.

---

## D-001 · Build v2 as a native React Native app (Expo)

- **Date:** 29 September 2026
- **Decided by:** Lachlan
- **Decision:** v2 is a native React Native app built with Expo, as the rebuild map assumes. It is not a web app.
- **Why:** The App Store is the target. Native keeps the existing bundle ID, EAS project and RevenueCat products, and the option to import old testers' data. It also gives Cook Mode timers, haptics and keep-awake without add-ons.
- **Considered and rejected:** Lovable. It only builds web apps, so reaching the App Store needs a Capacitor wrapper. That adds an App Review risk (guideline 4.2) and makes importing the old app's data impractical.

---

## D-002 · Build with Claude Code and Expo, not an AI app-builder platform

- **Date:** 29 September 2026
- **Decided by:** Lachlan, on Claude's recommendation
- **Decision:** Claude builds v2 with Expo in a GitHub repo, working in Claude's own cloud workspace. Logic is proven by automated tests there; screens are checked through Expo's web preview and screenshots. Lachlan tests on his iPhone through a development build made by EAS's cloud build service. The Mac mini (Node, Xcode) runs the local preview and simulator when needed.
- **Amended 29 Sep:** originally "Claude Code on the Mac mini". Changed because most early work doesn't need the Mac, and it lets Claude work while Lachlan is away.
- **Why:** The map's code rules and automatic checks are easier to enforce in our own repo than inside a hosted builder. The project needs things those builders handle poorly: real RevenueCat purchases (which need a development build, not Expo Go), the existing bundle ID and EAS project, and the old app's logic and tests.
- **Considered and rejected:** Replit and Bolt (both build Expo apps and can publish to the App Store) and Rork (now writes Swift, not React Native).

---

The decisions below were delegated to Claude by Lachlan on 29 September 2026 ("make logical and rational decisions for this build"). Lachlan can overturn any of them; each is cheap to change until the phase shown.

## D-003 · Free users can complete the North Star (PRODUCT.md decision A)

- **Decision:** Free covers this week's plan, the shopping list, sharing it, the cupboard, Surprise me, and Cook Mode with timers. Pro adds planning next week, more than 3 collections, and full nutrition detail. Prices and products stay as they are in RevenueCat; changing them is Lachlan's call.
- **Why:** A free user who can't plan and cook one week never learns why the app is good. The old app gated the planner and Cook Mode.

## D-004 · "Hands-free" in v1 (decision B)

- **Decision:** Cook Mode keeps the screen on and treats the whole screen as a "next step" tap target. No voice control in v1, and the word "hands-free" isn't used in the app or on the paywall.

## D-005 · Importing old TestFlight data (decisions C, D, E; map §14 #5)

- **Decision:** Import bookmarks, collections, cupboard, cook log, hidden dishes and custom recipes. **Don't import the old plan or shopping list:** they're weekday-based and almost certainly stale. References to recipes not in v1 are dropped, and the one-line "Welcome back" message says how many. Custom recipes go through the same parser as web imports; lines it isn't sure of are flagged for the user to check. Name-only "custom meals" become draft recipes with just a title.

## D-006 · Avoid list is not an allergy filter (decision F)

- **Decision:** Called "Ingredients to avoid". Each option maps to a group of ingredients in the database ("Nuts" covers cashews, almonds, peanuts and so on); free-text entries match ingredient names. The screen carries a line saying it's a convenience, not a substitute for checking labels. No allergen claims anywhere.

## D-007 · Small old features (decision G)

- **Decision:** Keep hidden dishes (a "Not for us" action) and recently viewed (a row in Saved). Drop "Pair with" for v1.

## D-008 · Recipe content strategy (map §14 #1)

- **Decision:** All 285 recipes are converted and kept, each marked `provenance: 'ai-draft'` until Lachlan cook-tests it and marks it `vetted`. Release builds show only vetted recipes, labelled "Tested in The Pantry kitchen"; development builds show everything. The target is about 80 vetted recipes at launch; choosing and cooking them is Lachlan's job.

## D-009 · Plan by real dates (map §14 #3)

- **Decision:** Plan entries have real dates. Weeks start on Monday. The Plan tab shows this week and next. Past days this week stay visible but muted. Entries from earlier weeks are hidden and pruned after 8 weeks (the cook log keeps the history). The same recipe can be planned more than once.

## D-010 · Shopping list rules (map §7 questions)

- **Merging:** lines merge only when their units convert (g + kg, tsp + tbsp). Otherwise they share one line ("1 + 200g onion").
- **Edits:** ticks and removals belong to the current week's list. They never carry into next week, and a removal only hides that ingredient until the plan for that week changes it.
- **Cupboard:** items the cupboard covers move to a muted "In your cupboard" section at the bottom, rather than vanishing, because the cupboard has no quantities. Staples (salt, pepper, oil, water) are always treated as covered.

## D-011 · iOS only at launch (map §14 #6)

- **Decision:** iOS is the target. The app should run on Android, but it isn't polished or tested there for v1.

## D-012 · Palette and fonts (map §14 #2): starting point only

- **Decision:** Build with the §9 palette and Newsreader + Manrope. This is a starting point for Lachlan to approve or change from the design gallery screenshots; it isn't final.
- **Correction (29 Sep):** the map's light-theme accent `#A2723D` only reaches 3.8:1 on the paper background, below the 4.5:1 needed for text. It's darkened to `#8E6232` (4.8:1). A test now checks every text colour pair in every theme, and that no colour is green.

## D-013 · Australian metric measures

- **Date:** 29 September 2026 · **Decided by:** Claude (delegated)
- **Decision:** 1 cup = 250 ml, 1 tbsp = 20 ml, 1 tsp = 5 ml. Imperial display converts weights to oz/lb and larger liquid amounts to fl oz; spoons and cups stay as written. Imperial weights snap to quarters ("1¼ lb"), not eighths or thirds.
- **Why:** The app and its cooks are Australian. The difference from US measures (15 ml tablespoon) matters when merging spoons on the shopping list, so it's fixed in one place.

## D-014 · Hand fixes to recipe content live in one reviewed file

- **Date:** 29 September 2026 · **Decided by:** Claude (delegated)
- **Decision:** Corrections to the old recipes are made in `scripts/data/recipe-fixes.json` and applied by the conversion script, never by hand-editing the generated catalogue. Each replacement must match exactly once or the conversion fails.
- **First fixes:** chicken kiev cooked to 75°C (was 70°C); burgers cooked through (were "medium"); live lobsters chilled before cooking; raw egg and raw fish notes on 9 recipes; 6 risottos and soups now list vegetable stock first, so they're correctly vegetarian.

## D-015 · The domain layer has no dependencies

- **Date:** 29 September 2026 · **Decided by:** Claude (delegated)
- **Decision:** Everything in `src/domain` is plain TypeScript with no packages. Recipe validation is a hand-written checker (`src/domain/recipes/validate.ts`) rather than Zod, and domain tests use Node's built-in test runner (`node:test`, run with `tsx --test`). Jest and React Native Testing Library are for components only; Maestro for journeys.
- **Why:** Package downloads were blocked in the build workspace, and it's cleaner anyway: the maths that matters most can be tested anywhere in under a second, and it can't break when a library changes.

## D-016 · Palette, fonts and cuisine tones approved

- **Date:** 29 September 2026 · **Decided by:** Lachlan
- **Decision:** The Paper and Night palettes, Newsreader + Manrope, and the 25 cuisine tones shown in the design specimen are approved as the v2 design system. This closes map §14 #2.

## D-017 · v2 ships as version 2.0.0

- **Date:** 29 September 2026 · **Decided by:** Claude (delegated)
- **Decision:** The app version is 2.0.0, same bundle ID and EAS project.
- **Why:** Over-the-air updates are matched to installed apps by version. The old TestFlight build is 1.0.0 on the `production` channel; if v2 also said 1.0.0, an update could land on the old app's native code and crash it on launch (handover lesson 4).

## D-018 · Test builds show draft recipes

- **Date:** 29 September 2026 · **Decided by:** Claude (delegated)
- **Decision:** Development and preview builds set `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1` (in `eas.json`), so Lachlan and testers see all 285 recipes. Store builds show vetted recipes only (D-008).

## D-019 · Routes live in `src/app/`

- **Date:** 29 September 2026 · **Decided by:** Claude (delegated)
- **Decision:** Expo Router routes live in `src/app/`, the SDK 57 convention, rather than a top-level `app/` as the map first drew. Everything else in §8 stands. Lint enforces the structure: no colour literals outside tokens, no React or Expo in `src/domain`, no feature importing another feature, thin route files, 300-line limit.

## D-020 · Where the app is built

- **Date:** 29 September 2026 · **Decided by:** Claude (delegated)
- **Decision:** Package installs and Expo builds run in the Claude workspace on Lachlan's Mac mini (which can reach npm); commits come back through this session to GitHub. Supersedes the "cloud workspace" part of D-002.

## D-021 · Your own recipes are stored as the words you typed

- **Date:** 29 September 2026 · **Decided by:** Claude (delegated)
- **Decision:** A recipe you write or import is saved as its text (ingredients one per line, method one step per line) and turned into a structured recipe each time it's read, using the same parser as the catalogue. Ids start with `my-`, so they can never clash with a built-in recipe. An unfinished recipe (no cuisine, no method) is kept under "To finish" and can't be planned or cooked until it's complete.
- **Why:** One source of truth. Editing never fights a half-converted copy, and improvements to the parser or ingredient database fix old recipes for free.

## D-022 · Import from a link reads the recipe sites embed for search engines

- **Date:** 29 September 2026 · **Decided by:** Claude (delegated)
- **Decision:** The phone fetches the page and reads its schema.org "Recipe" data (JSON-LD), never the visible layout. The result opens in the editor to check before anything is saved. Photos aren't imported in v1. Sites that block apps or hide their data get a plain message and a "Write it in by hand" button.

## D-023 · "Tonight, for you" rules

- **Date:** 29 September 2026 · **Decided by:** Claude (delegated)
- **Decision:** Diet, avoid list and hidden dishes are hard rules (as in Surprise me). Loved cuisines and weeknight time only move recipes up the list, so picky answers still get a suggestion. Planned and recently cooked dishes move down. The order is fixed for the day. Used by the onboarding reveal and by Today when nothing is planned.

## D-024 · How the old-app import works (extends D-005)

- **Date:** 29 September 2026 · **Decided by:** Claude (delegated, within D-005)
- **Decision:**
  - Reads the old app's saved data (`the-pantry/v1`, or the two older key names) once, on first launch, before the first screen. The old data is never changed or deleted.
  - A marker is written before anything is applied, so an interrupted import can't run twice and duplicate things. Everything is merged into what's already there.
  - References to dishes that exist in the catalogue are kept even if the dish isn't vetted yet, so they reappear once it is. Only dishes missing entirely are dropped, and the "Welcome back" line says how many.
  - An old edited built-in recipe comes across as "(my version)" of your own; references keep pointing at the built-in.
  - If the tester finished the old onboarding, their answers carry over and the welcome is skipped.
- **Still needs:** a check on a phone that has the old TestFlight build (K-12).
