# The Pantry v2: Product

**Status:** Open questions decided (delegated by Lachlan) and logged in `DECISIONS.md` · **Written:** 29 September 2026 · **By:** Claude
**Sources:** `REBUILD-MAP.md`, `CLAUDE-v2.md`, `HANDOVER-REBUILD-2026-09-28.md`, `docs/claude-project-notes.md`, and a read-through of the old app's code (`the-pantry-app/`, branch `wave2/freeze-fix`).

This is the app in my own words: what it is, who it's for, what every v1 feature is for, and what "working" means for each. Where the old code behaves differently from what the planning documents assume, I've said so. Section 6 lists the questions I need you to answer before Phase 1.

Nothing in here is final until you agree it's right.

---

## Contents

1. [The app in one paragraph](#1-the-app-in-one-paragraph)
2. [Who it's for](#2-who-its-for)
3. [The North Star journey, step by step](#3-the-north-star-journey)
4. [v1 features](#4-v1-features)
5. [What the old app does that v1 drops](#5-what-v1-drops)
6. [Things I need you to decide](#6-things-i-need-you-to-decide)
7. [What I found in the old code](#7-what-i-found-in-the-old-code)
8. [What happens next](#8-what-happens-next)

---

## 1. The app in one paragraph

The Pantry helps a household answer "what are we eating this week?" once, on Sunday, and then stops them having to think about it again. You pick a handful of dinners, the app writes one tidy shopping list for you, and on a weeknight it tells you what's on tonight and walks you through cooking it. It looks and reads like a good cookbook rather than a social app: quiet, typeset, photography-led, with no feeds, counts or engagement tricks. In v1 everything lives on your phone. There are no accounts, no social network and no AI scanning.

## 2. Who it's for

| Person | What they want | What serves them |
|---|---|---|
| The Sunday planner | Decide the week once, shop once | Plan, Shopping list |
| The 6:30pm couple | An answer to "what's for dinner?" in ten seconds | Today, Surprise me |
| The home cook | Recipes that work, followed without fuss | Recipe page, Cook Mode |

**Not for:** people who want to post their food, grow a following or scroll for inspiration. If a feature mainly serves them, it doesn't belong in v1.

**The test for any feature:** does it make the North Star journey (below) faster, calmer or more reliable? If not, it waits.

## 3. The North Star journey

This is the one routine the whole app is built around. Every v1 feature should be traceable to a step here.

| When | What the user does | What the app does | Feature |
|---|---|---|---|
| **Sunday evening** | Opens the app, picks five dinners | Offers saved recipes first, then suggestions that use what's already in the cupboard and fit their tastes | Plan, Saved, Suggestions |
| | Opens the shopping list | Has already built it: every ingredient from the five recipes, scaled to the servings chosen, merged (two recipes' onions become one line), minus what's in the cupboard, sorted by supermarket aisle | Shopping list |
| | Sends it to their partner | Formats it as clean text and opens the iPhone share sheet (Messages, WhatsApp, Notes) | Share |
| **Monday** | Ticks things off in the shop | Ticked items move into the cupboard (can be undone) | Shopping list → Cupboard |
| **Tuesday 6pm** | Has forgotten the plan, opens the app | Today shows tonight's dinner first. If nothing's planned, one suggestion and a Surprise me button | Today, Surprise me |
| | Taps Cook | Shows one step at a time in large type, keeps the screen on, runs timers that survive the phone locking | Cook Mode |
| | Taps Done | Logs it as cooked, so it isn't suggested again next week | Cooked log |

**The three loops.** Every screen serves exactly one:

- **Discover → Save:** find something worth cooking and keep it (Recipes, recipe page, Saved, Collections).
- **Plan → Shop:** decide the week and get the ingredients (Plan, Shopping list, Cupboard).
- **Cook → Remember:** cook it well and keep a record (Cook Mode, Surprise me, Cooked).

(The older documents call the third loop "Cook → Share", because it included posting a "bite". With social gone from v1, "Remember" is the right name. Sharing in v1 means the iPhone share sheet.)

---

## 4. v1 features

For each feature: its **job** (what it does for the user), **edge cases** (where it's likely to go wrong), **working** (what we'll check to call it done) and **vs old app** (what changes).

### 4.1 Today (the home tab)

- **Job:** answer "what are we eating tonight?" the moment the app opens.
- **Shows, in order:** date masthead · tonight's planned dinner (or one suggestion if nothing's planned) · this week at a glance · one editorial pick · Surprise me. Settings is reached from the masthead.
- **Edge cases:**
  - Day 1: nothing planned, nothing saved, nothing cooked. Must still look finished and point to one next action.
  - Tonight has breakfast and lunch planned but no dinner.
  - It's 11pm, so tonight's dinner is effectively over. Does Today roll to tomorrow?
  - Tonight's recipe was deleted (a custom recipe) since it was planned.
- **Working:** correct on day 1 (empty) and day 30 (full history); opens in under 2 seconds cold; one tap from Today to Cook Mode for tonight's dinner.
- **vs old app:** new. The old home was a social feed plus a Pro-only "recipe of the day".

### 4.2 Recipes (browse, search, filter)

- **Job:** find something worth cooking without scrolling forever.
- **Includes:** browse sections (in season, quick weeknights, by cuisine), instant search with typo tolerance, a filter sheet (cuisine, diet, meal type, time, difficulty, one-pot, in season) with a count of active filters and one-tap clear, and "What can I make?" from the cupboard.
- **Edge cases:** filters that match nothing; a search with no results; a misspelling ("chiken"); a one-letter search; very long recipe titles.
- **Working:** "chiken" finds chicken; every filter combination either shows results or a designed empty state with a way out; lists scroll smoothly; no infinite scroll (sections end).
- **vs old app:** the old app **guessed** each recipe's cuisine, diet and meal type from its name (paella was tagged Middle Eastern). v1 reads explicit tags from the recipe data, which means every recipe has to be tagged by hand in Phase 2. "In season" also matched on the recipe name; v1 uses a season tag.

### 4.3 Recipe page

- **Job:** let someone decide whether to cook this, then cook it successfully.
- **Includes:** photo, cuisine label, title, times, servings stepper (scales every quantity), metric/imperial toggle, ingredients in groups, numbered steps, substitution tips, nutrition (with a "how we calculate this" note), notes, image credit, share. Sticky actions: **Save · Plan · Cook**.
- **Edge cases:**
  - Scaling produces silly numbers ("0.3333 cup", "1.5 eggs").
  - Ingredients with no quantity ("salt and pepper") or ranges ("2–3 cloves").
  - Nutrition data covers too few of the ingredients to be honest (map rule: only show if at least 70% is covered).
  - Opened cold from a link (`thepantry://recipe/…`).
- **Working:** 4 → 1 → 12 servings reads sensibly ("⅓ cup"); unit toggle round-trips without drift; opens in under 300ms; deep links work from a cold start.
- **vs old app:** the servings you chose on the recipe page were forgotten when you planned it. In v1, servings belong to the plan entry and flow through to the shopping list. The old app also had "Pair with" suggestions (only 26 recipes had them); v1 scope doesn't mention them (see §6).

### 4.4 Saved: bookmarks and collections

- **Job:** keep the recipes you want to come back to, organised your way.
- **Includes:** bookmarks; named collections (create, rename, reorder, delete with undo); a recipe can be in several collections; the Saved tab has four segments: Bookmarks · Collections · My recipes · Cooked.
- **Edge cases:** deleting a collection by accident; two collections with the same name; 500 bookmarks; a bookmarked recipe that no longer exists in the catalogue (see §6, decision C).
- **Working:** everything survives a force-quit; deleting a collection can be undone; large lists stay fast.
- **vs old app:** same idea, rebuilt properly. The old app also let you **hide** dishes so they never appeared; v1 scope doesn't mention hiding (see §6).

### 4.5 My recipes: write your own, or import from a link

- **Job:** get the family recipes and the ones you found online into the same plan and list as everything else.
- **Includes:** a recipe editor (also used to edit); import from a web link (reads the recipe data most recipe sites embed).
- **Edge cases:** a link that isn't a recipe; a site that blocks the request; no internet; an imported recipe with no photo; ingredients the app can't understand; editing a recipe that's already in this week's plan.
- **Working:** imports and hand-written recipes pass the same checks as the built-in catalogue; a failed import says so plainly and offers to write it by hand; a custom recipe planned this week still produces shopping-list lines.
- **vs old app:** the old editor stored ingredients as free text. v1 stores them in structured form (quantity, unit, item), so custom recipes scale and merge like built-in ones. Imported ingredient lines will need a parse step with a "check these" review for lines it isn't sure about.

### 4.6 Plan

- **Job:** decide the week in one sitting.
- **Includes:** this week and next week, 7 days × breakfast, lunch and dinner; add from anywhere in one tap; move or swap; servings per entry; clear.
- **Edge cases:**
  - The same recipe twice in one week (leftovers, a favourite).
  - A planned day passes. Does it stay visible, fade, or roll off?
  - It's Sunday night. Is "this week" the one ending tonight or the one starting tomorrow?
  - The phone's date or timezone changes.
- **Working:** add from recipe page, card menu and Surprise me result; per-entry servings change the list immediately; the plan survives restarts and rolls over cleanly at the week boundary.
- **vs old app, and this is a big one:** the old plan was stored by **weekday, not date** ("Tuesday", not "Tuesday 7 October"), so last week's plan silently became this week's. It could also hold each recipe **only once** in the whole week, had **no servings per meal**, and clearing a slot deleted the recipe from the shopping list too. The map's recommendation (real dates, this week and next) fixes all of that.

### 4.7 Shopping list

- **Job:** one list, in aisle order, that's right without editing.
- **How it's built:** calculated fresh every time from the plan. It is never stored as a separate copy. The formula: all planned ingredients, scaled to each entry's servings → merged → minus what's in the cupboard → minus lines you removed → plus your manual extras → grouped by aisle.
- **Includes:** tick-off; manual extras ("dishwashing liquid"); remove a line; "Move to cupboard" on tick (on by default, undoable); share as neat text.
- **Edge cases:**
  - Merging "1 onion" with "200g onion". Map recommendation: only merge when units convert; otherwise show "1 + 200g" on one line.
  - A line you removed or edited, then the plan changes. Which of your edits "stick"?
  - Ticking an item, then the plan changes so that item's quantity goes up.
  - Staples you always have (salt, pepper, oil, water).
  - An empty plan with manual extras only.
- **Working:** tests prove the maths (two recipes with onions → one onion line, right total); changing servings updates the list; unplanning removes those ingredients unless you edited them; ticks survive restarts; shared text reads cleanly in Messages.
- **vs old app:** the old list **ignored the cupboard**, **ignored servings**, and ticking did **not** move anything to the cupboard. Removing a line hid that ingredient **by name, forever**: remove "onion" once, and onions never appeared on any future list until you pressed "restore". All of this is new or fixed in v1.

### 4.8 Cupboard and "What can I make?"

- **Job:** know what you've already got, so the app doesn't send you out for it and can suggest meals that use it.
- **Includes:** add (with autocomplete from the ingredient list), remove, staples that are always assumed; bought items flow in from the list; "What can I make?" ranks recipes by how much of them you already have.
- **Edge cases:**
  - How specific is a match? Is "tinned tomatoes" enough for "400g crushed tomatoes"? Is "rice" enough for "arborio rice"?
  - Quantities: the cupboard knows you *have* flour, not *how much*. So a recipe needing 1kg of flour counts as covered.
  - A cupboard that's never been maintained is full of things long used up.
- **Working:** matching works at the ingredient level (not by fuzzy text), is consistent everywhere it's used (list, suggestions, What can I make), and never makes the shopping list drop something you actually need without you being able to see why.
- **vs old app:** matching was text-based ("rice" matched any line containing "rice"). Staples were salt, black pepper, olive oil, butter and water.

**My view:** the "no quantities" limitation is fine for v1, but the list should show a quiet "in your cupboard" section rather than silently dropping items, so the user can add one back if they're running low.

### 4.9 Surprise me

- **Job:** break the "I don't know, what do you want?" deadlock with a single tap.
- **Includes:** the spinner (the one deliberately playful moment, with haptics); respects filters, diet, the avoid list and what's already planned; avoids recently cooked; the result offers **Plan it** and **Cook it**.
- **Edge cases:** filters leave nothing to pick; one possible result; Reduce Motion is on; the user spins ten times in a row.
- **Working:** never picks a recipe that breaks the diet or avoid list (proven by tests); Reduce Motion gives a simple fade; an empty pool shows a designed "loosen your filters" state.
- **vs old app:** the old spinner **ignored the diet and avoid list entirely** (a vegetarian could be served beef), and its "from my cupboard" filter was a **stand-in**: it just picked recipes with six or fewer ingredients. Both break the "no fake" rule.

### 4.10 Cook Mode

- **Job:** get you from raw ingredients to dinner without scrolling a recipe with floury hands.
- **Includes:** one large step at a time, swipe or tap to move on, screen stays awake, tap-to-start timers found in the step text ("simmer 20 minutes"), an ingredients drawer, **Done** logs it as cooked.
- **Edge cases:** several timers running at once; the phone locks mid-timer; a phone call interrupts; a step mentions a time that isn't a timer ("keeps for 3 days"); a range ("8–10 minutes").
- **Working:** timers keep counting and alert you with the phone locked; Done marks the recipe cooked; nothing is cut off at the largest text size.
- **vs old app:** timers **stopped when the phone locked** or you switched apps, and **Done just closed the screen** without logging anything. Cook Mode was also Pro-only (see §6, decision A).

### 4.11 Cooked log

- **Job:** a quiet record of what you've actually made, which also keeps suggestions fresh.
- **Includes:** a list of cooks with dates; a gentle streak. No badges, no nagging.
- **Edge cases:** cooking the same thing twice in a day; marking cooked by mistake (undo); a year of history.
- **Working:** feeds "not recently cooked" into Surprise me and suggestions; undo works.
- **vs old app:** had both a cooked on/off flag and a dated log. v1 keeps only the dated log; "has this been cooked?" is calculated from it.

### 4.12 Onboarding

- **Job:** get a new user to a useful, personal first screen in under a minute.
- **Includes:** welcome → short taste quiz (cuisines, diet, time, things to avoid) → "Tonight, for you" reveal → optional Sunday reminder. Old-app data is imported silently on first launch.
- **Edge cases:** the user skips everything; picks no cuisines; picks a combination that matches no recipes (vegan + no legumes + under 15 minutes); denies notification permission.
- **Working:** first useful screen in under 60 seconds and 5 taps; the reveal always shows at least one recipe, even for picky answers.
- **vs old app:** very similar flow, minus the "Cook with friends" intent (social is gone).

### 4.13 Settings

- **Includes:** theme (light, dark, system, high contrast); units; Sunday planning reminder; export my data; privacy policy and terms; about.
- **Working:** theme switches live; export produces a file the user can save; legal links load real pages.
- **vs old app:** drops social settings (private account, activity and message notifications, sign out).

### 4.14 Pro (paid)

- **Job:** pay for the app's development without making the free version feel broken.
- **Includes:** RevenueCat with the existing products (`thepantry_pro_monthly` $4.99, `thepantry_pro_yearly` $44.99), a paywall sheet worded for whatever feature triggered it, restore purchases.
- **Working:** sandbox purchase, restore and expiry all work on a real phone; Pro survives restarts; no purchase button is ever dead; terms and privacy links on the paywall load.
- **Which features are Pro is an open decision.** See §6, decision A.

### 4.15 Bringing across old TestFlight data

- **Job:** testers who used the old app don't lose their bookmarks, collections, plan, cupboard or recipes.
- **Working:** on a phone with the old build installed, the new build brings everything across once, silently, and shows a single "Welcome back" line.
- **Edge cases:** see §6 (decisions C, D and E). The old data isn't shaped like the new data in several ways.

---

## 5. What v1 drops

These exist in the old app and are deliberately out of v1. Everything marked **Later** comes back after launch; the rest I'd drop unless you say otherwise.

| Old feature | v1 | Why |
|---|---|---|
| Accounts and sign-in (email, Google, Apple) | **Later** (v1.1) | Local-first removes most App Review burden |
| Bites, comments, likes, follows, DMs, notifications, block, report | **Later** (v1.2) | Half the old code; heavy review obligations; not needed for the North Star |
| AI cupboard and receipt scanning | **Later** (v1.3) | Server costs; not needed for the North Star |
| Recipe of the Day (Pro) | Replaced | Becomes the free "editorial pick" on Today |
| Mood collections, Recommended tab | Replaced | Folded into Recipes browse sections and Today |
| Stats screen | Replaced | Cooked log with a quiet streak |
| Recently viewed | Not mentioned | Your call (§6) |
| Hidden dishes | Not mentioned | Your call (§6) |
| "Pair with" suggestions | Not mentioned | Your call (§6) |
| Name-only custom meals (a dish name with no recipe) | Not mentioned | Your call (§6) |
| Liquid Glass dock, video backgrounds | Dropped | Native risk; not core |

---

## 6. Things I need you to decide

> **Update 29 September 2026:** all of these are now decided. Lachlan delegated them, and each went with the recommendation below; see `DECISIONS.md` D-003 to D-012. What's left for Lachlan is in `REBUILD-MAP.md` §14.

Each has my recommendation. The first five are genuine conflicts I found between the planning documents, or between the documents and the old code. The rest are the map's §14 list.

### A. Pro must not block the North Star journey
The old app put the **weekly planner** and **Cook Mode** behind Pro, which is two of the three North Star steps. The map proposes Pro gates of unlimited collections, Cook Mode timers and hands-free, planning next week, and nutrition detail. The handover proposed Cook Mode, the planner and unlimited collections.

- **Option 1:** Free users can complete the whole North Star (plan this week, list, share, cook with timers). Pro = next week's plan, unlimited collections, nutrition detail, and later features.
- **Option 2:** Match the old app: planner and Cook Mode are Pro.
- **Option 3:** Free trial of everything for 7 days, then Option 1 gates.

**Recommendation: Option 1.** A free user who can't plan a week never finds out why the app is good. Pro should feel like "more", not "unlocked". Needed by Phase 8, but it affects how Phases 5–6 are built.

### B. "Hands-free" Cook Mode
The North Star says "follow it step by step, hands-free", and the old paywall sold "Cook Mode — guided, hands-free", but nothing in the old app or the new Cook Mode build actually defines hands-free (voice control, or a big tap-anywhere target?). **Recommendation:** in v1, "hands-free" means a screen that stays on and a whole-screen tap target to move on. Drop the word from anything user-facing until there's voice control.

### C. Vetted recipes vs importing testers' data
Decision 1 recommends launching with ~80 vetted recipes and holding back the rest. Decision 5 recommends importing testers' old data. Together, some imported bookmarks, collections and plan entries will point at recipes that aren't in v1.

- **Option 1:** Import them anyway and show held-back recipes to their owners only, labelled "Not yet tested".
- **Option 2:** Drop those references quietly on import.
- **Option 3:** Drop them, and tell the user in the "Welcome back" line how many were set aside.

**Recommendation: Option 3.** Honest, and no half-supported recipes in the app. Tester numbers are small, so the cost is low.

### D. Moving an old weekday plan onto real dates
The old plan says "Tuesday dinner", with no date. **Recommendation:** import it into the current week if it's before Wednesday, otherwise next week; tell the user in the same "Welcome back" line. Or simpler: don't import the plan at all (it's almost certainly stale) and only import everything else.

### E. Old custom recipes and name-only meals
Old custom recipes are free text; v1 needs structured ingredients. The old app also had "custom meals" that were just a name with no recipe. **Recommendation:** import custom recipes through the same parser as web imports, flagging lines it's unsure of for the user to check; turn name-only meals into draft recipes with a title and nothing else, visible in My recipes.

### F. The avoid list is not an allergy filter
The old "things to avoid" list worked by finding words in ingredient text. "Nuts" wouldn't catch cashews, and "Gluten" wouldn't catch flour. If v1 shows this list next to words like "allergy" or "gluten", someone could get hurt. **Recommendation:** in v1, call it "Ingredients to avoid", match on the ingredient database (so "nuts" covers cashews, almonds and so on), and add a line saying it isn't a substitute for checking labels. Don't offer allergen names until the data can back them.

### G. Small old features: keep or drop?
**Recommendation:**
- **Hidden dishes:** keep. It's one field, costs almost nothing, and lets people say "never show me liver".
- **Recently viewed:** keep as a small row in Saved, since it helps "what was that recipe I looked at?".
- **Pair with:** drop for v1. Only 26 recipes have it, and vetting it is extra work.

### Map §14 decisions

| # | Decision | Map recommendation | Status |
|---|---|---|---|
| 1 | Recipe content (285 AI-drafted recipes) | ~80 vetted, labelled "Tested in The Pantry kitchen" | **Needed by Phase 2.** I agree. Note it also means hand-tagging every recipe's cuisine, diet, meal type and season, because the old data has none of these. |
| 2 | Palette and fonts | Approve from rendered samples | Phase 1 |
| 3 | Plan by date vs weekday | Date | **Agree strongly.** See 4.6 |
| 4 | Pro gates | Free tier genuinely useful | See decision A |
| 5 | Old TestFlight users | Import | Agree, with decisions C–E |
| 6 | Android at launch | iOS only | Agree |
| 7 | Supabase project (paused) | Back up now | **Urgent, your job this week**, along with pushing the old code to GitHub |

---

## 7. What I found in the old code

The rules say to stop and flag anything surprising in the old code. Most of these are covered in section 4, but here they are in one place so nothing gets lost.

1. **Every recipe's cuisine, diet and meal type is guessed from its name.** The recipe data has none of these fields. Diet only knows meat, seafood, vegetarian or other; there's no vegan, gluten-free or dairy-free information at all. Phase 2's tagging job is bigger than the map implies.
2. **The plan is stored by weekday with no dates**, holds each recipe only once, and has no per-meal servings.
3. **The shopping list ignored the cupboard and servings**, ticks never moved items to the cupboard, and removing a line hid that ingredient by name forever.
4. **Surprise me ignored diet and the avoid list**, and its cupboard filter was a stand-in (six or fewer ingredients).
5. **The avoid list is simple word-matching**, so it misses obvious cases (decision F).
6. **Cook Mode timers stopped when the phone locked**, and Done didn't log the cook.
7. **The paywall advertised things Pro didn't actually do.** Its benefits list included "Allergen filtering", "AI recipe builder", "Recipe of the day" and "Share & export grocery lists". None of these was behind the paywall (sharing the list was free all along), and allergen filtering was really the word-matching avoid list. Only the planner, Cook Mode, bite photos and the AI scans were gated. Selling features that aren't there is also an App Review rejection risk, so in v1 the paywall lists only what Pro really does.
8. **"In season" matched on the recipe name** ("Pumpkin Soup" in autumn), not the ingredients.

None of these are criticisms of the effort that went in. They're exactly the structural problems the map sets out to fix, and they confirm it's right to rebuild rather than port.

---

## 8. What happens next

Phase 0 is done when you agree this document is right and every §6 decision is either answered or given a phase. The remaining Phase 0 steps:

1. **You review this document.** Mark anything wrong, and answer or defer decisions A–G.
2. **Walk through the old app on your phone together.** Note what to keep, drop or change.
3. **Start `docs/DECISIONS.md`**, recording your answers from step 1.

Two non-code jobs that shouldn't wait: **restore or back up the Supabase project** and **push the old app's ~107 unpushed commits to GitHub** (handover §0).

One housekeeping note: there's no `the-pantry-v2` repo yet, so this file lives in `HQ/11-ThePantryV2/docs/`. It moves into the repo's `docs/` folder when Phase 1 creates it.
