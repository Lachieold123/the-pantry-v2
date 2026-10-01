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

## D-025 · v2 takes on v1's look and shell

- **Date:** 30 September 2026 · **Decided by:** Lachlan
- **Decision:** v2 looks visually indistinguishable from the original app for now. That means:
  - v1's palette (white, amber accent `#C99155`, pastel tints);
  - Georgia serif and the system sans;
  - v1's layouts and components;
  - v1's shell: a header with menu, wordmark, inbox and avatar; tabs Feed · Browse · + · Cupboard · Plan; a side drawer.
- **What it replaces:** D-016 (Paper/Night palettes, Newsreader + Manrope) and D-012's tab layout. It also changes CLAUDE.md's brand line: v1's greens and the few emoji it shows are allowed for now.
- **How it's built:** the look is expressed only through design tokens and shared components (`docs/design/V1-DESIGN-SPEC.md`), so the later redesign is a change of tokens, not of screens.
- **v1's own bugs aren't copied:** things like invisible dark-mode badges and light-only tints in dark mode are fixed (spec §8.2). Contrast failures that would change the look (the amber accent as text is 2.7:1) are logged for the redesign instead.

## D-026 · Social at launch

- **Date:** 30 September 2026 · **Decided by:** Lachlan
- **Decision:** v2 launches with v1's social features:
  - accounts and profiles;
  - the feed and posts (photos and video);
  - likes, comments and saves;
  - follows;
  - messages and notifications;
  - report and block.

  This replaces PRODUCT §5 and D-002's "local-first, no accounts".
- **How it's built:** to the standard in `docs/V1-PARITY-PLAN.md`. The server enforces every rule, including two-way blocking and counts kept by the database. Moderation meets Apple guideline 1.2 before any social feature ships. All server data goes through TanStack Query. None of the audit's social or security findings may come across.

## D-027 · The shell before social arrives

- **Date:** 30 September 2026 · **Decided by:** Claude, under D-025/D-026 (Lachlan to confirm when he reviews P2)
- **Decision:** until accounts and social ship (P8–P9), v1's shell shows only what works:
  - **Feed** is the home: "Tonight" (planned dinner or a suggestion, with Cook or "Have this tonight"), what's coming up this week, and recipes picked for you. Posts join below it in P9.
  - The header's **inbox** button and the drawer's **Notifications** and **Messages** rows appear with P9. Before that they would open nothing.
  - The centre **"+"** adds a recipe (the recipe editor). In P9 it becomes "Share a bite", which can also save to My recipes.
  - The **avatar** and the drawer's profile row open Settings, and read "Local profile" until accounts exist.
- **Why:** "No fake, no dead" (CLAUDE.md). A button that opens an empty inbox, or a feed of placeholder posts, is exactly what the audit flagged in v1 (ARCH-7, SOC-2, QUAL-1).
- **Also:** the drawer is a route (`/menu`), not an always-mounted overlay (ARCH-1, PERF-1). Settings and the library pages are pushed screens, as in v1.

## D-028 · Nutrition is calculated, with AI only for the gaps

- **Date:** 30 September 2026 · **Decided by:** Lachlan
- **Decision:** every recipe shows a per-serving nutrition panel, worked out like this:
  - Each ingredient in our database gets values per 100 g and typical weights (1 onion ≈ 150 g, 1 cup of flour ≈ 150 g). Sources: Food Standards Australia New Zealand's food composition data (AFCD) where it covers the food.
  - Recipes, including ones people post, are calculated on the phone from their matched ingredient lines. The same recipe always gives the same numbers, and it costs nothing to run.
  - An AI fills in only the lines the calculator can't match or weigh (P8/P10, server side, needs the API key approved).
  - Every panel carries a disclaimer: estimates from the ingredient list, a guide only, not medical or dietary advice. It also says how many lines were left out, if any.
- **Replaces:** D-007's "no nutrition" for this feature; V1-PARITY-PLAN's "ask Lachlan" row.

## D-029 · AI-generated photos are labelled

- **Date:** 30 September 2026 · **Decided by:** Lachlan
- **Decision:** the 120 catalogue photos with no photographer credit are v1's AI-generated images. They stay, labelled "AI-generated photo" on the recipe page, and are replaced with real photos over time (audit QUAL-18).

## D-030 · Cooking from your cupboard is central, and scanning is in

- **Date:** 30 September 2026 · **Decided by:** Lachlan
- **Decision:**
  - "Cook from what you have" is a central feature. It's rebuilt before the Plan work (P5 moves ahead of P4), to the design in `docs/audits/2026-09-30-v2-check/cupboard-brief.md`:
    - one shared "what can I cook" engine, with **Ready tonight** and **Need 1–2** tiers;
    - category jars, quick adds, "Add one thing" and "Add a list";
    - cupboard matches on the Feed, in Browse, on recipes and in Plan.
  - Photo scanning of shelves or the fridge, and receipt scanning, are in scope for launch.
    - **Access:** every account gets 3 free scans a month. Pro is unlimited within a daily cap of about 15.
    - **Model:** chosen by testing Claude and OpenAI vision models on about 30 real photos, then decided on accuracy and cost. The API key and server come to Lachlan for approval when we get there.

## D-031 · The spinner is v1's card deck, with honest parts

- **Date:** 30 September 2026 · **Decided by:** Lachlan
- **Decision:**
  - Surprise me is v1's full-screen card deck again: the "03 / 42" counter, "Surprise *me*", the Meal, Time and Pantry chips, the tilted deck with tap-to-spin, Why this, Spin again and Cook this. It keeps v2's Plan it.
  - The choosing lives in `domain/suggestions/spinner.ts`. It uses the same hard rules as everything else (diet, avoid list, "not for us"), and a spin never lands on the card it started from.
  - Three v1 parts are replaced, not copied:
    - **From cupboard** used to mean "six ingredients or fewer". Now it uses the shared cupboard engine (Ready or Need 1–2).
    - **Why this** used to say "Similar to dishes you liked", which wasn't true. Now it only says true things: what it uses from the pantry, the time, and whether it's in Cookmarks or cooked before.
    - The **"@recipe-id" handle** on the card was fake. It's dropped until recipes have real authors.
  - The Feed's "Surprise me instead" button under tonight's suggestion is removed. The spinner stays in the side menu, under "Not feeling it?" and in the empty Feed.

## D-032 · Simpler shape: Plan and List are separate tabs, and Home is v1's feed

- **Date:** 1 October 2026 · **Decided by:** Lachlan asked for it ("shopping list and plan should be two separate things"; "too complicated and needs simplifying"); Claude chose the layout below, and Lachlan can still reverse it.
- **Decision:**
  - **Five tabs:** Home · Browse · Plan · List · Cupboard, in the order a week goes (plan it, shop for it, put it away).
    - Plan is the week only.
    - List is the shopping list only, still worked out from the plan (D-009). Its badge counts what's left to buy this week.
    - The Plan tab's black list card opens List on that week.
  - **v1's centre "+" is gone.** "Add a recipe" is the "+" beside Browse's title, in the side menu, and in My recipes.
  - **Home is v1's feed layout:** Meal, Time, Cuisine and Difficulty chips; five big cards to swipe, with dots; then "What's cooking?" in two columns.
    - Until social arrives (P9), the cards are recipes, and each label says why it's there: "Tonight · On the plan", "From your cupboard · Ready now" or "Picked for you · Easy".
    - Nothing says "Editor's pick" or "Trending", because neither is true yet.
    - v2's separate Tonight, Coming up and From your cupboard sections are folded into the cards. The Plan and Cupboard tabs carry the detail.
  - **Scanning skeleton (D-030):**
    - The Cupboard has "Scan receipt" and "Photo of food" beside "Type a list".
    - The flow is: choose a photo, read it, check the same review list as "Add a list", then add.
    - It is fully built and tested, including the 3-a-month allowance.
    - The camera (expo-image-picker, a native module) and the reader (server and API key) wait for Lachlan's approval. Until then the sheet says "Coming soon" and offers the typed list.

## D-033 · The centre "+" is back as "Share a dish", and Browse opens from Home

- **Date:** 1 October 2026 · **Decided by:** Lachlan (chose "Browse moves to Home" from three options)
- **Decision:** this replaces part of D-032.
  - **Tabs:** Home · Plan · ＋ · List · Cupboard. Browse is no longer a tab:
    - it opens from a "Search recipes" bar at the top of Home, ready to type;
    - it's also in the side menu, and behind "Browse all recipes" under Home's grid.
  - **The ＋ is v1's camera post, "Share a dish":**
    - up to five photos, taken or chosen (expo-image-picker, approved);
    - what it is, a few words, time, serves, and how hard;
    - optionally linked to one of our recipes, which fills the blanks;
    - a preview of the card it makes.
  - **Plates stay on this phone until accounts and social arrive (P9).** They show on Home under "Your plates", and each opens to its own page with the photos, the words and the linked recipe. The page says plainly that only you can see them for now.
  - What you type is kept as a draft, so closing never loses it.
  - "Add a recipe" is on Browse and in the menu. "Share a dish" is in the menu too.
  - **The Cupboard reads in the order you use it:**
    1. Step 1: add what you have (search, quick adds, then type a list, scan a receipt or take a photo of your food).
    2. Step 2: what's in your cupboard.
    3. Step 3: what you can cook.
    4. Then "Unlock more" and "Stock up". When the cupboard is empty, the stock-up grid sits right under the add tools.
  - The scan camera now works, but scanning stays "Coming soon" until the reader is connected (K-14).

## D-034 · "What I have" is the first thing on Home

- **Date:** 2 October 2026 · **Decided by:** Lachlan asked for it ("the central purpose … recipes you can cook using only the items you have on hand", "extremely clean and concise", "at the top of the home page"). Claude chose the design below.
- **Research:**
  - SuperCook splits results into "Recipes you can make" and "missing 1–2 ingredients". Reviewers call that its best decision, because it tells you at a glance whether you can cook now or need one shop.
  - Most pantry apps hide the match behind an input step, or a filter among many. Nothing on their first screen says "here's what you can cook now".
- **Options considered:**
  1. A pantry chip as the first of the filter chips. It's compact, but it reads as one filter among equals, which undersells the point of the app.
  2. A big "You can cook 12 dishes" card above the feed. It's clear, but it adds a block above the content and duplicates the cards.
  3. **Chosen:** a two-way switch at the very top, **What I have · 12 | Everything**, with search as an icon beside it. Meal, Time, Cuisine and Difficulty sit in one row underneath.
- **Decision:**
  - The pantry side comes first and is wider. It's amber, and it shows the live count of dishes ready now, so the count follows the other filters.
  - Home opens on it whenever the cupboard can make something. Otherwise it opens on Everything.
  - A quiet line under the switch says "From 12 things in your cupboard · Change", and opens the Cupboard.
  - In "What I have", the cards and grid are only dishes ready now, labelled "Ready now · Nothing to buy". Then comes a **Nearly there** shelf of dishes one or two things short, each saying what it needs.
  - If nothing is ready, the closest dishes take the cards, clearly labelled with what they need.
  - Tonight's planned dinner leads only when the cupboard can make it.
  - Everything works from the same engine as the Cupboard tab (`store/cookable`). The diet and avoid list always apply.
  - "Your plates" shows in Everything only, so "What I have" stays about what you can cook now.
