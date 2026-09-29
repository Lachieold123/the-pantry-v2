# The Pantry v2: Rebuild Map

**Owner:** Lachlan · **Builder:** Claude, with Expo (D-001, D-002) · **Written:** 29 September 2026 · **Last updated:** 29 September 2026
**Status:** Phases 0–2 done; Phases 3–7 built (see each phase's status line); next is Phase 9 polish, with Phase 8 (Pro) waiting on Lachlan. Code: github.com/Lachieold123/the-pantry-v2.

This is the blueprint for rebuilding The Pantry from the ground up. It covers:

- what the app is;
- the rules the code must follow;
- how the app is structured;
- the order it gets built in;
- how we know each piece is finished.

The old app (`the-pantry-app/`, branch `wave2/freeze-fix`) is **reference material only**. Read it to learn what it did, then design and write v2 from scratch.

Companion documents (paths from `HQ/11-ThePantryV2/`; they move into the repo in Phase 1):

- `CLAUDE-v2.md`: standing instructions for Claude. Becomes `CLAUDE.md` at the root of the new repo.
- `docs/PRODUCT.md`: the app in Claude's words, every v1 feature's job and edge cases, and the open questions (§6 there).
- `docs/DECISIONS.md`: the decision log.
- `The Pantry - Transfer/HANDOVER-REBUILD-2026-09-28.md`: history, accounts, lessons learned, launch checklist.
- `The Pantry - Transfer/docs/claude-project-notes.md`: product concept and brand notes.

---

## Contents

1. [How to use this map](#1-how-to-use-this-map)
2. [What The Pantry is](#2-what-the-pantry-is)
3. [v1 scope: in, out, later](#3-v1-scope)
4. [Principles: the ten rules](#4-principles)
5. [Why the old app broke, and the structural fix for each](#5-why-the-old-app-broke)
6. [App map: screens and navigation](#6-app-map)
7. [Domain model: the data, questioned](#7-domain-model)
8. [Architecture and folder structure](#8-architecture)
9. [Design system: making it beautiful on purpose](#9-design-system)
10. [Build phases with acceptance criteria](#10-build-phases)
11. [Quality gates: definition of done](#11-quality-gates)
12. [Claude's working method](#12-working-method)
13. [Reference guide to the old codebase](#13-reference-guide)
14. [Open decisions for Lachlan](#14-open-decisions)

---

## 1. How to use this map

- **Claude reads sections 1–5 and 12 at the start of every session**, plus the phase in progress.
- Work goes **phase by phase** (§10). A phase is finished only when every acceptance criterion is met *and* Lachlan has seen it on his phone.
- Anything this map doesn't decide is recorded in `docs/DECISIONS.md` (the decision log) before any code is written for it.
- If building reveals that the map is wrong, **update the map** in the same commit and say so. The map is a living document, not scripture.

---

## 2. What The Pantry is

**One line:** the cooking app for people who actually cook.

**The feeling:** a quiet, editorial food magazine that happens to know what's in your cupboard and what you're cooking on Thursday. It sits somewhere between a Sunday newspaper food section, a well-kept recipe notebook and a good shopping list. It's the opposite of Instagram for food.

**Who it's for:**

- The **Sunday planner**, who maps out the week and shops once.
- The **6:30pm couple** at the fridge, asking "what's for dinner?"
- The **home cook** who wants reliable recipes, not content.
- *Not* aspiring food influencers.

**The North Star journey.** Every v1 feature must make this better:

> **Sunday evening:** open The Pantry, pick five dinners from saved recipes and suggestions that use what's already in the cupboard, get one tidy shopping list sorted by supermarket aisle, and send it to your partner.
> **Monday:** tick things off in the shop. Bought items flow into the cupboard.
> **Tuesday 6pm:** you've forgotten the plan. Open the app and "Tonight" is right there, or tap **Surprise me**. Tap **Cook**, then follow it step by step, hands-free.

**The three loops.** Every screen serves exactly one:

| Loop | What the user does | v1 surfaces |
|---|---|---|
| **Discover → Save** | Finds something worth cooking and keeps it | Recipes, recipe page, Saved, Collections |
| **Plan → Shop** | Decides the week and gets the ingredients | Plan, Shopping list, Cupboard |
| **Cook → Remember** | Cooks it well and keeps a record | Cook Mode, Surprise me, cooked log |

(In v1 the "Share" part of Cook → Share means sharing a recipe or list through the normal iPhone share sheet. The social network comes later; see §3.)

**Brand rules (non-negotiable):**

- No green. No emojis anywhere in the UI.
- No infinite scroll. No engagement-bait patterns.
- No public counts on the home screen. No "For You" algorithm feed.
- Restrained motion. The spinner is the only playful moment.
- Vocabulary: **bites** (future posts), **home cooks** (users), **Cupboard** (pantry), **Inbox** (future messages).

---

## 3. v1 scope

**IN (v1, the first App Store release):**

- Recipe catalogue: browse, search, filter (cuisine, diet, meal type, time, difficulty, one-pot, in season).
- Recipe page: servings scaling, metric/imperial units, substitutions, nutrition (with a clear methodology note), mark as cooked, share.
- Saved (bookmarks) and named Collections.
- Your own recipes: write one, or import from a web link.
- Weekly Plan: 7 days × breakfast, lunch and dinner. Add from anywhere in one tap.
- Shopping list: built automatically from the plan, merged and sorted by aisle, with manual extras, tick-off, and share as text.
- Cupboard: what you have; "What can I make?"; bought items flow in.
- Surprise me: the spinner, respecting filters and what's planned.
- Cook Mode: one step at a time, screen stays awake, tap-to-start timers.
- Today (home): tonight's plan, this week at a glance, one suggestion, Surprise me.
- Onboarding: a short taste quiz leading to a personalised first screen.
- Settings: theme (light, dark, system, high contrast), units, a Sunday planning reminder, export my data, legal links.
- Pro via RevenueCat: using the existing products `thepantry_pro_monthly` and `thepantry_pro_yearly`.
- A one-time import of the old app's on-device data (bookmarks, collections, plan, list, cupboard, custom recipes). How held-back recipes, the old weekday plan and free-text custom recipes are handled is open: `PRODUCT.md` §6, decisions C–E.

**OUT of v1 (deliberately):**

- User accounts and sign-in. v1 is **local-first**, with no account needed. This removes Sign in with Apple, account deletion, password security and most privacy disclosures from the first App Store review.
- The social layer: bites, comments, follows, DMs, notifications feed, blocking, reporting.
- AI features: cupboard and receipt photo scanning.
- Push notifications from a server. Only a *local* Sunday reminder.
- Liquid Glass dock, video backgrounds, Android polish (it should run, but iOS is the target).

**LATER (designed for now, built after v1 ships):**

- v1.1: optional account and cloud sync/backup (Supabase).
- v1.2: the social layer, built on the account layer, following the anti-vanity rules.
- v1.3: AI cupboard and receipt scanning (Pro) through the existing `ai-proxy`.

"Designed for now" means the data model uses stable IDs and timestamps, and keeps storage behind a single repository layer. When sync arrives it's an addition, not a rewrite. **No simulated or fake backend code ships in v1.**

---

## 4. Principles

1. **Understand before building.** Before any feature, Claude writes 3–6 plain-English sentences:
   - what job it does for the user;
   - how it fits a loop;
   - its edge cases;
   - what "working" looks like.

   If that can't be written, the feature isn't understood yet.
2. **Question the logic.** Every old behaviour is a *hypothesis*, not a requirement. Ask:
   - Is this needed?
   - Is there a simpler way?
   - What happens with 0 items, 1 item, 500 items, weird input, no internet, or the app killed mid-action?
3. **One source of truth.** Each fact lives in exactly one place. Anything that can be calculated is calculated, never stored twice (the shopping list is *derived* from the plan).
4. **No fake, no dead.** No simulated data, no placeholder buttons, no "coming soon" in shipping code. If a control is on screen, it works and it's tested.
5. **Every state is designed:** loading, empty, error, full, and very long text. A blank screen is a bug.
6. **Small, verified steps.** One slice at a time: build, test, view on a phone, commit, push. Never batch unverified changes (this is what caused the June freeze).
7. **Neat code is a feature.**
   - Small files, clear names, one responsibility each.
   - Pure logic separated from UI.
   - Comments explain *why*.
   - A newcomer should find anything in under a minute.
8. **The design system is the only source of style.** No hard-coded colours, font sizes or spacing values in screens. Ever.
9. **Reference, don't port.** Read the old code to learn behaviour and edge cases, then write v2 fresh. The exception is the §13 "lift" list, and even that is re-read, re-tested and cleaned up.
10. **Lachlan stays in the loop, at his pace.** Plain-English explanations, one step at a time in execution mode, a screenshot for every visible change, and a stop to ask whenever there's a product, design, money or data-loss decision.

---

## 5. Why the old app broke

The old app had many bugs, but they came from a handful of *structural* causes. Fix the cause, not each symptom.

| Bug class (old app) | Real examples | Structural fix in v2 |
|---|---|---|
| **Screens stacked as modals, no real navigation** | Invisible full-screen overlay froze the app; "anti-flash matte" hack; ~30 screens always mounted | **Expo Router** with real tabs and stacks. Sheets only for short, focused tasks. |
| **One giant state object passed to everything** | Ticking a list item re-rendered the whole app; a second `useStore()` call silently created a separate copy | **Zustand** store split into slices, read through selectors. Components subscribe only to what they use. |
| **Two backends drifting apart** (local simulation vs Supabase) | "Like/save/follow never update in Supabase mode"; fake notifications; unread count always 0 | **One implementation.** v1 is local only. Sync later goes behind one repository interface with one implementation. |
| **Free-text ingredients parsed at runtime** | Scaling, merging and nutrition errors; "2 tbsp" vs "2tbsp"; guessing pluralisation | **Structured ingredients** (quantity, unit, item, prep), converted *once* by a script, validated, reviewed. |
| **Facts guessed from names** | `cuisineFor(name)` tagged paella as Middle Eastern and butter chicken as Other | Every recipe carries **explicit tags** in its data. Nothing is inferred from its title. |
| **Dead or fake UI** | Comment button with no action; dead paywall buttons; privacy policy promising a missing feature | Principle 4, plus a test or checklist item for every tappable element. |
| **States not designed** | Blank `<View/>` during loading; "no posts" shown on errors; sheets hidden by the keyboard | Every screen spec lists its states. Shared `EmptyState`, `ErrorState` and `Skeleton` components. |
| **Hard-coded styling** | Sign-in screen broke dark mode; pastel palette drifting from the brand | Tokens only. Lint rule bans colour literals outside `src/ui/tokens`. |
| **Big unverified batches** | Build #9 froze on devices; a full rollback was needed | Phase gates, small PRs, a phone test before merge, CI on every push. |
| **Work never backed up** | ~107 commits existed only on the laptop (broken auto-push hook) | Push after every session. CI badge on GitHub. No local-only branches. |
| **Brand drift** | Light theme was plain white with pastel tints; fonts never bundled (Georgia fallback) | §9 defines one design system, with real fonts bundled from day one. |

---

## 6. App map

### Information architecture: five tabs

| Tab | Purpose | Loop |
|---|---|---|
| **Today** | Tonight's dinner, this week at a glance, one thoughtful suggestion, Surprise me | All (the North Star) |
| **Recipes** | Browse, search, filter, collections of the week, "What can I make?" | Discover |
| **Plan** | The week: 7 days × 3 slots; add, move, clear | Plan |
| **Shop** | Shopping list (by aisle) and Cupboard, side by side as two segments | Shop |
| **Saved** | Bookmarks, Collections, My recipes, Cooked | Save / Remember |

Settings is reached from the Today masthead. Why five tabs rather than the old side drawer plus a feed home: each tab is one noun the user already understands, and each maps to a step of the North Star journey.

### Route tree (Expo Router)

```
app/
  _layout.tsx                 Root: fonts, theme, store hydration, splash, error boundary
  (onboarding)/               Shown until onboarding is complete
    index.tsx                 Welcome
    taste.tsx                 Taste quiz (cuisines, diet, time, avoid-list)
    reveal.tsx                "Tonight, for you" personalised first result
  (tabs)/
    _layout.tsx               Tab bar
    today/index.tsx
    recipes/index.tsx         Browse and search
    recipes/filters.tsx       (sheet)
    plan/index.tsx
    shop/index.tsx            Segments: List | Cupboard
    saved/index.tsx           Segments: Bookmarks | Collections | My recipes | Cooked
    saved/collection/[id].tsx
  recipe/[id].tsx             Recipe page (pushed over any tab)
  recipe/[id]/cook.tsx        Cook Mode (full screen)
  recipe/[id]/plan.tsx        (sheet) Pick day and slot
  recipe/[id]/collect.tsx     (sheet) Add to collection
  recipe/new.tsx              Recipe editor (also used for edit)
  recipe/import.tsx           (sheet) Import from link
  surprise.tsx                Spinner (modal)
  paywall.tsx                 (sheet) Pro
  settings/index.tsx
  settings/[section].tsx      Appearance, Units, Reminders, Data, About/Legal
```

Rules:

- Route files stay **thin**: they read params and render a feature screen from `src/features/…`. No logic lives in route files.
- Anything reachable must survive a cold start from a deep link (for example `thepantry://recipe/spaghetti-bolognese`).

### Key cross-links (the "one tap from anywhere" rule)

- Any recipe card can be long-pressed or opened into a quick menu: **Save · Add to plan · Add to collection · Cook**.
- The recipe page has sticky actions: **Save · Plan · Cook**.
- A planned recipe automatically adds its ingredients to the shopping list. Unplanning it removes them, unless the user edited them by hand.
- Ticking an item in the list offers "Move to cupboard" (on by default, and can be undone).
- Cupboard powers "What can I make?" in Recipes and the suggestions in Plan and Today.

---

## 7. Domain model

These are the nouns of the app. **Stored** means it's saved on the device. **Derived** means it's calculated whenever it's needed.

```ts
// ---- Catalogue (bundled, read-only in v1) ----
Recipe {
  id: string                    // KEEP old ids (e.g. 'spaghetti-bolognese') — needed for data migration
  title: string
  summary?: string              // one editorial line
  cuisine: CuisineId            // explicit, never inferred
  diets: DietTag[]              // vegetarian, vegan, pescatarian, gluten-free…
  mealTypes: MealType[]
  difficulty: 'easy' | 'medium' | 'hard'
  prepMinutes: number
  cookMinutes: number
  servings: number
  onePot: boolean
  seasons?: Season[]            // southern hemisphere
  image: { source: ImageRef; credit?: string }
  ingredientGroups: { title?: string; items: IngredientLine[] }[]
  steps: { text: string; timerSeconds?: number }[]
  notes?: string[]
  source: 'house' | 'user' | 'imported'
  provenance?: 'vetted' | 'ai-draft'   // see §14 decision 1
}

IngredientLine {
  quantity?: number | { min: number; max: number }
  unit?: UnitId                 // g, kg, ml, l, tsp, tbsp, cup, piece, pinch, clove, tin…
  item: string                  // canonical ingredient name, e.g. 'brown onion'
  ingredientId?: string         // link into the nutrition + aisle database
  prep?: string                 // 'finely diced'
  note?: string                 // '(or half pork)'
  optional?: boolean
  raw: string                   // original text, for display fallback and audit
}

// ---- User data (stored) ----
Bookmark      { recipeId, savedAt }
Collection    { id, name, recipeIds: string[], createdAt, updatedAt }
PlanEntry     { id, recipeId, day: ISODate, slot: 'breakfast'|'lunch'|'dinner', servings }   // same recipe may appear more than once
ListExtra     { id, text, addedAt }                       // manual shopping items
ListState     { checkedKeys: string[], removedKeys: string[] }   // keys belong to the current plan, never global
CupboardItem  { ingredientId | name, addedAt, source: 'manual'|'shop' }   // presence only, no quantities in v1
CookEvent     { recipeId, cookedAt }                      // "has been cooked" is derived from this log
Preferences   { cuisines, diets, avoid: string[], maxMinutes?, units, theme, highContrast, reminder }   // avoid matched via the ingredient database, never by keyword
Entitlement   { isPro, expiresAt?, productId? }            // mirror of RevenueCat; RevenueCat is the truth

// ---- Derived (never stored) ----
ShoppingList  = merge(plan ingredients scaled to servings) − cupboard − removed + extras, grouped by aisle
WhatCanIMake  = recipes ranked by % of ingredients already in the cupboard
Suggestions   = ranking(preferences, cupboard, recency, season, not-recently-cooked)
Streaks/Stats = from CookEvent[]
```

**What the old data actually contains** (checked in Phase 0; details in `PRODUCT.md` §7):

- Recipes hold only servings, times, difficulty, free-text ingredients, steps and notes. **Cuisine, diet, meal type and season are not in the data at all.** The old app guessed them from the recipe name. Diet only knew meat, seafood, vegetarian or other, so vegan, gluten-free and dairy-free information doesn't exist yet.
- Every v1 recipe therefore needs these tags added **by hand** in Phase 2. That's a real job, and a good reason to launch with a smaller vetted set (§14 decision 1).
- The old plan stored `recipeId → weekday` (no dates, one slot per recipe, no servings). The old list removals were stored by ingredient name and never expired.

**Questions the builder must settle (and log in `DECISIONS.md`) during Phase 2:**

- **Plan by real dates or by weekday?** The old app pinned meals to `mon…sun` with no dates, which breaks every new week. *Recommendation:* real dates, with a "This week / Next week" view. Also settle: when does "this week" start, and what happens to days that have passed?
- **How the list reacts to plan changes.** It is a pure function of the plan, the list edits and the cupboard. Which user edits "stick" when the plan changes? Removals must be scoped to the current plan: the old app hid a removed ingredient by name forever.
- **Ingredient merging rules.** When do "1 onion" + "200g onion" merge? *Recommendation:* merge only when the units convert. Otherwise show both on one line ("1 + 200g").
- **Cupboard matching.** Is "tinned tomatoes" in the cupboard enough for "400g crushed tomatoes"? Define the matching level (ingredientId) and staples that are always assumed (salt, pepper, oil, water). *Proposal:* items covered by the cupboard move to a quiet "In your cupboard" section of the list rather than disappearing, because the cupboard has no quantities.
- **Avoid list.** Map each avoid option to a group of ingredients in the database ("nuts" covers cashews, almonds and so on). Never present it as allergy-safe (`PRODUCT.md` §6, decision F).
- **Nutrition.** Show it only when ingredient coverage is at least 70%. Otherwise say "not available", rather than falling back to AI estimates.

---

## 8. Architecture

### Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo (latest stable SDK)**, React Native New Architecture, TypeScript **strict** | Same ecosystem as v1, current |
| Navigation | **Expo Router** | Real stacks and tabs; fixes the modal-soup root cause |
| State | **Zustand** with `persist` (AsyncStorage), one slice per domain, versioned migrations | Selector subscriptions; tiny API |
| Validation | Hand-written recipe checker in `src/domain/recipes/validate.ts` (D-015); persisted state versioned and checked on load | Bad data fails loudly at the boundary, not deep in the UI |
| Lists | `FlatList` / `SectionList` (FlashList only after on-device proof) | FlashList contributed to the June freeze |
| Images | `expo-image` | Caching, placeholders |
| Motion | `react-native-reanimated` | 60fps spinner and transitions |
| Fonts | `expo-font`: **Newsreader** + **Manrope** (open licence), bundled | The brand typefaces, finally real |
| Icons | One set only (SF Symbols via `expo-symbols` on iOS, with an Ionicons fallback) | Consistency |
| Payments | `react-native-purchases` (RevenueCat), anonymous app user IDs | Works with no accounts |
| Local notifications | `expo-notifications` (local schedule only) | Sunday reminder |
| Crash reporting | Sentry, **DSN set from the first build** | Visibility |
| Testing | Node's built-in test runner for `src/domain` (D-015); Jest + React Native Testing Library for components; **Maestro** end-to-end flows | Logic, components and whole journeys |
| Code quality | ESLint (expo config plus custom rules), Prettier, `tsc --noEmit` | Neatness enforced by machine |
| CI | GitHub Actions: typecheck, lint, test on every push and PR | No "works on my machine" |
| Builds | EAS Build (cloud) and EAS Update | Same EAS project as v1 |
| Dev loop | Claude works in its cloud workspace: tests prove the logic, Expo's web preview gives screenshots. Lachlan runs a **development build** (made by EAS in the cloud) on his iPhone, not Expo Go, which can't make real RevenueCat purchases. The Mac mini runs the local preview and simulator when needed | See every change on a real phone before it merges |

### Folder structure

```
the-pantry-v2/
  src/app/                    # routes only (thin); SDK 57 convention (D-019)
  src/
    domain/                   # PURE TypeScript. No React, no storage, no Expo.
      recipes/                #   types, zod schema, search, filter, season
      ingredients/            #   parse (for import), units, convert, scale, format
      shopping/               #   consolidate, aisles, derive list
      cupboard/               #   matching, what-can-I-make
      suggestions/            #   ranking
      nutrition/              #   engine + database
      stats/                  #   streaks
    data/
      catalogue/              # recipes.json (structured), images map, credits
      migrations/             # old-app import (reads 'the-pantry/v1')
    store/                    # zustand slices: saved, collections, plan, list, cupboard, cooklog, prefs, pro
    features/                 # one folder per feature: screens + feature components + hooks
      today/ recipes/ recipe/ plan/ shop/ saved/ cook/ surprise/ onboarding/ settings/ pro/
    ui/                       # design system
      tokens/                 #   colour, type, space, radius, motion, elevation
      primitives/             #   Text, Button, Chip, Card, Sheet, ListRow, Segmented, Stepper, Checkbox…
      patterns/               #   RecipeCard, Masthead, EmptyState, ErrorState, Skeleton, Toast
    lib/                      # thin wrappers: haptics, share, purchases, notifications, analytics, sentry
  docs/  DECISIONS.md  KNOWN-ISSUES.md  PRODUCT.md  (+ this map)
  scripts/                    # one-off tools: convert old recipes, validate catalogue, image checks
  maestro/                    # end-to-end flows
```

**Dependency rules** (enforced by lint where possible):

`app → features → (ui, store, domain, lib)` · `store → domain` · `domain → nothing`

- Features never import from other features. Shared things move down into `ui/`, `domain/` or `store/`.
- **File size:** aim for under 200 lines, with a hard ceiling of 300. Anything bigger gets split. The old app had 1,000–1,700-line screens.
- **Naming:**
  - `PascalCase` for components, `camelCase` for functions.
  - A screen is named `…Screen`, a sheet `…Sheet`, a card `…Card`.
  - Hooks start with `use…`.
  - Domain functions are verbs: `scaleIngredient`, `deriveShoppingList`.
- **Spelling in the UI:** Australian English ("favourites", "colour", "mince"). Code identifiers use US spelling (`color`) to match the libraries.

---

## 9. Design system

**The aim:** it should feel like a beautifully typeset cookbook printed on good paper. Calm, confident, generous with space. Photography does the talking.

### Colour (resolving the old drift)

Two base themes plus high-contrast variants. Tokens are **semantic** (what they're for), not literal (what colour they are).

| Token | Light: "Paper" | Dark: "Night" |
|---|---|---|
| `bg` | `#F7F3EA` cream paper | `#0A0A0A` warm black |
| `surface` | `#FFFDF8` | `#141312` |
| `surfaceSunken` | `#EFE9DC` | `#1C1A17` |
| `ink` | `#1A1714` | `#F7F3EA` |
| `inkSecondary` | `#4A443C` | `#CFC8BA` |
| `inkMuted` | `#6E665A` (≥ 4.5:1 on bg) | `#9C968C` |
| `rule` | `rgba(26,23,20,0.12)` | `rgba(247,243,234,0.12)` |
| `accent` | `#8E6232` amber-brown (4.8:1 on paper; the first proposal `#A2723D` failed AA) | `#E8C891` amber |
| `onAccent` | `#FFFDF8` (text on accent buttons) | `#1A1714` |
| `accentSoft` | `#F1E3CC` | `#3D2C13` |
| `danger` | `#B3443A` | `#FF7A6B` |

- Cuisine accents: one quiet tone per cuisine, used **only** for the small cuisine eyebrow label. They are never used as fills.
- **Every text/background pair must pass WCAG AA.** A unit test checks the contrast of the token pairs.
- These exact values are a starting proposal. Lachlan approves the palette in Phase 1 from a rendered sample.

### Type

| Role | Face | Size / line height | Use |
|---|---|---|---|
| Display | Newsreader | 44/48 (Today, recipe title) | One per screen |
| Title | Newsreader | 28/34 | Section heads |
| Heading | Newsreader | 20/26 | Card titles |
| Body | Newsreader | 17/26 | Steps, notes |
| UI | Manrope | 15/20 | Buttons, rows |
| Kicker | Manrope, 12, caps, +1.2 tracking | Eyebrows, labels |
| Meta | Manrope | 13/18 | Times, servings |
| Numeral | Newsreader italic, accent | Step numbers, counts |

All text components support **Dynamic Type** (the iPhone's text-size setting) up to at least XXL without breaking the layout.

### Space, shape, motion

- **Spacing:** 4-point scale (`4, 8, 12, 16, 24, 32, 48, 64`). Screen side margin is 20.
- **Radius:** `sm 8`, `md 14`, `lg 22`. Photos use `md`.
- **Hairline rules** separate sections instead of boxes and shadows.
- **Motion:** 200–280ms eased fades and slides. Nothing bounces. The spinner is the one exception, deliberately tactile with haptics.
- **Haptics:** light on toggles, selection ticks in the spinner, success on "added to plan". Nothing else.

### Imagery

- One aspect ratio per context: cards 4:5, recipe hero 4:3, thumbnails 1:1.
- One consistent colour grade across the catalogue. Phase 2 includes an image audit script (`scripts/audit-images`).
- Placeholder is a solid `surfaceSunken` block with the cuisine initial. No emoji.

### Components (build these first, in Phase 1)

- **Primitives:** `Text` (variants above), `Button` (primary, secondary, quiet, destructive), `IconButton`, `Chip`, `Segmented`, `Stepper`, `Checkbox`, `Switch`, `TextField`, `Sheet`, `ListRow`, `Divider`.
- **Patterns:** `Masthead`, `RecipeCard` (large, medium, row), `SectionHeader`, `EmptyState`, `ErrorState`, `Skeleton`, `Toast`, `ActionBar`.
- A dev-only **Design Gallery** screen (`/dev/gallery`) renders every component in every state, in both themes. Lachlan reviews the design here before any feature screen is built.

### Voice and copy

Warm, brief, confident. Talk like a good cookbook, not an app. For example, "Nothing planned for tonight. Surprise me?", not "Oops! No meals found 😢". Every empty state gets a helpful next action.

---

## 10. Build phases

Each phase lists its **Goal**, **Build** (what gets built), **Done when** (acceptance criteria), **Question first** (questions to settle before building) and **Reference** (where to look in the old app).

**The gate for every phase:** CI is green → Maestro flows pass → Claude sends screenshots (light and dark) → Lachlan tries it on his phone → merge → push.

### Phase 0: Understand (no code)

- **Goal:** Claude understands the app well enough to explain it back.
- **Build:**
  - `docs/PRODUCT.md`: the app in Claude's own words, the North Star journey, each v1 feature with its job, edge cases and "working" definition. **Drafted 29 Sep.**
  - Review it with Lachlan.
  - Walk through the old app on the phone together and note what to keep, drop or change.
  - Start `DECISIONS.md`. **Started 29 Sep; D-001 to D-012 logged.**
- **Done when:**
  - Lachlan agrees `PRODUCT.md` is right.
  - `PRODUCT.md` §6 decisions A–G and the §14 decisions here are answered or scheduled.
  - Mac mini is ready: Node LTS and Xcode installed, GitHub linked to Claude, Expo login confirmed.
- **Reference:** `HANDOVER-REBUILD-2026-09-28.md`, `docs/claude-project-notes.md`, old `docs/`.

### Phase 1: Foundations and design system

> **Status 29 Sep:** built. Expo SDK 57 app with Expo Router, TypeScript strict, ESLint (with the §8 structure rules), Jest + React Native Testing Library, CI; fonts bundled; tokens and theme provider (light, dark, system, high contrast, switching live from Settings); all §9 primitives and patterns; design gallery at `/dev/gallery`; five tabs with designed empty states; root error boundary with a working "Try again". Palette approved (D-016). **Still to do:** Maestro flows, Sentry (K-8), and Lachlan trying it on his phone.

- **Goal:** an empty app that already looks and behaves like The Pantry.
- **Build:**
  - New repo `the-pantry-v2` (same bundle ID `com.lachlanoldfield.thepantry`, same EAS project).
  - TypeScript strict, ESLint and Prettier, Jest, Maestro, GitHub Actions CI.
  - Sentry with DSN.
  - Fonts bundled, tokens, theme provider (light/dark/system/high contrast), all §9 components, Design Gallery.
  - Tab shell with 5 empty tabs and designed empty states.
  - Root error boundary with a real "Try again".
- **Done when:**
  - Cold start shows the branded splash and then the tabs with no flash.
  - Theme switches live.
  - Gallery approved by Lachlan.
  - CI badge green.
  - Contrast test passes.
  - Dynamic Type at XXL looks right.
- **Question first:** confirm the palette and fonts from rendered samples, not hex codes.

### Phase 2: Catalogue and domain logic

> **Status 29 Sep:** done except Lachlan's review. 552-entry ingredient database (99.98% of lines matched); all 285 recipes converted, tagged and validated; domain logic written with 90 tests (99% line coverage). Waiting on: Lachlan's pass through `docs/reports/recipe-review.csv`. Nutrition moved to Phase 3 (K-5).

- **Goal:** trustworthy recipe data and pure, tested logic.
- **Build:**
  - Zod recipe schema (§7).
  - `scripts/convert-old-recipes.mts`: turns the old free-text recipes into structured `IngredientLine`s, **keeping old IDs**.
  - **Hand-tagging** of every v1 recipe's cuisine, diets, meal types and seasons (the old data has none; see §7). Claude drafts the tags, Lachlan approves them in a review sheet. Nothing is guessed from titles.
  - Avoid-list ingredient groups in the ingredient database (§7).
  - A **validation report** listing every line it couldn't parse confidently, every missing tag, every image problem. Lachlan and Claude go through it and fix the data rather than hide it.
  - Domain modules: units/convert, scale, format, consolidate + aisles, cupboard matching, search/filter, season, suggestions, nutrition, stats. Each is rewritten with the old tests as a starting point, plus new edge-case tests.
- **Done when:**
  - 100% of catalogue recipes pass the schema.
  - Every recipe has an explicit cuisine and diet.
  - Domain test coverage ≥ 95%.
  - The report has no unresolved "red" items.
- **Question first:** §14 decision 1 (recipe content strategy); plan by date or weekday; merging rules; staples list.
- **Reference:** old `src/data/*` and `src/data/__tests__/*` (the "lift" list in §13).

### Phase 3: Discover (Recipes tab and recipe page)

- **Build:**
  - Browse with sections (in season, quick weeknights, by cuisine).
  - Search, with instant results and typo tolerance.
  - Filters sheet, with a count of active filters and a one-tap clear.
  - Recipe page: hero, kicker, title, meta, servings stepper, unit toggle, grouped ingredients, numbered steps, substitutions, nutrition card with methodology sheet, notes, image credit, share.
  - Sticky Save · Plan · Cook actions (Plan and Cook can be stubs *only* until their phases land. They're hidden, never shown as dead buttons).
- **Done when:**
  - Scaling 4 → 1 → 12 servings shows sensible numbers ("⅓ cup", not "0.3333 cup").
  - Unit toggle round-trips.
  - Search for "chiken" finds chicken.
  - The page scrolls at 60fps.
  - It deep-links cold.
- **Reference:** old `RecipeModal`, `RecipeBody`, `BrowseModal`, `FiltersModal`, `searchRecipes`.

> **Status 29 Sep:** built. Browse shelves, typo-tolerant search, filters sheet with active count, recipe page with servings scaling, Australian measures and substitution tips. **Still to do:** nutrition (K-5), plural wording (K-2).

### Phase 4: Save

- **Build:** bookmarks, collections (create, rename, reorder, delete with undo), the Saved tab segments, add-to-collection sheet, My recipes (editor and import-from-link), Cooked list.
- **Done when:**
  - Everything persists across a force-quit.
  - Deleting a collection can be undone.
  - Import handles a failed or non-recipe link gracefully.
  - The editor validates with the same schema as the catalogue.
- **Reference:** old `CookmarksModal`, `CollectionsModal`, `RecipeEditorModal`, `CustomMealsModal`, `importRecipe`.

> **Status 29 Sep:** built. Saving, collections, hiding a recipe, recently viewed, and your own recipes: a text-first editor, import from a link, drafts kept to finish later, edit, share as text and delete with undo (D-021, D-022).

### Phase 5: Plan and Shop (the heart of the app)

- **Build:**
  - Plan week view (this week and next), add from anywhere, move and swap by drag or a menu, per-entry servings.
  - Shopping list derived from the plan: by aisle, tick-off, manual extras, remove items, "Move to cupboard", share as neat text.
  - Cupboard: add (with autocomplete from the ingredient database), remove, staples.
  - "What can I make?"
- **Done when:**
  - The **list maths is proven by tests**: planning two recipes that both use onions gives one onion line with the right total.
  - Changing servings updates the list.
  - Unplanning removes those ingredients unless the user edited them.
  - The same recipe can be planned twice in one week, and both entries count on the list.
  - Removing a list line affects only the current plan; next week's list starts clean.
  - Ticked state survives restarts.
  - The Maestro North Star flow passes: plan 3 dinners → list → tick 2 → items move to cupboard → Today shows tonight.
- **Question first:** behaviour when a planned day passes; which list edits are sticky; how cupboard items show on the list (§7).
- **Reference:** old `CartModal`, `SlotPickerSheet`, `MealPickerSheet`, `PantryModal`, `groceryConsolidate`, `pantryMatch`.

> **Status 29 Sep:** built. Week plan on real dates, shopping list derived from the plan (edits kept per week), cupboard with "What can I make?", ticked items move to the cupboard. **Still to do:** the Maestro North Star flow (needs Xcode's simulator).

### Phase 6: Cook

- **Build:**
  - Cook Mode: one large step at a time, swipe or tap to move on, keep-awake, tap-to-start timers detected from step text, ingredients drawer, "Done" marks it cooked.
  - Surprise me spinner (honours filters, diet and the avoid list, avoids recently cooked, "Plan it" / "Cook it" on the result).
  - Cooked log and a quiet streak.
- **Done when:**
  - Timers keep going while the phone is locked (using a local notification).
  - "Done" logs the cook (the old app just closed the screen).
  - Tests prove the spinner never picks a recipe that breaks the user's diet or avoid list (the old spinner ignored both).
  - Reduce Motion gives a simple fade instead of the spin.
- **Question first:** what "hands-free" means (`PRODUCT.md` §6, decision B).
- **Reference:** old `CookModeModal`, `stepDuration`, `SpinnerModal`, `cookStats`.

> **Status 29 Sep:** built. Cook Mode (screen stays on, tap anywhere or Next, timers from step text that notify when the phone is locked, ingredients drawer, Done logs the cook with undo); Surprise me honouring diet, avoid list, hidden, planned and recent recipes, with a fade under Reduce Motion; Cooked list with a weekly streak; diet and avoid list in Settings. "Hands-free" means screen-on plus a whole-screen tap target (PRODUCT.md decision B). **Still to do:** swipe between steps (K-9).

### Phase 7: Today and onboarding

These are built late on purpose, because they combine everything else.

- **Build:**
  - Today: masthead with date, tonight's plan (or a suggestion), this week strip, one editorial pick, Surprise me.
  - Onboarding: welcome → taste quiz → a personalised reveal → optional Sunday reminder.
  - Old-app data import on first launch (silent, reported in a single "Welcome back" line).
- **Done when:**
  - Reaching a first useful screen takes under 60 seconds and 5 taps.
  - Today looks right on day 1 (empty plan) *and* day 30 (full history).
  - Old data imports correctly on a phone that has the old TestFlight build installed.
- **Question first:** held-back recipes, the old weekday plan, and free-text custom recipes (`PRODUCT.md` §6, decisions C–E).
- **Reference:** old `OnboardingModal`, `FirstRunChecklist`, `useStore` legacy-key migration.

> **Status 29 Sep:** built. Welcome → two taste questions → "Tonight, for you" reveal → optional Sunday reminder, skippable anywhere, five taps to a planned dinner. Today suggests a dinner when nothing is planned and shows the one-line "Welcome back" after an old-app import (D-023, D-024). **Still to do:** the import check on a phone with the old TestFlight build (K-12); an editorial pick on Today waits for vetted content.

### Phase 8: Pro

- **Build:** RevenueCat with the existing products, paywall sheet (designed per trigger), restore purchases, entitlement slice.
- **Proposed Pro gates** (to confirm, see §14 and `PRODUCT.md` §6, decision A): unlimited collections (free: 3), planning next week, nutrition detail. **Proposed rule (pending decision A):** a free user can always complete the North Star journey for this week (plan, list, share, cook with timers). The old app broke this by gating the planner and Cook Mode.
- **Done when:**
  - A sandbox purchase, restore and expiry all work on a device.
  - No purchase buttons are dead.
  - The paywall lists only what Pro actually does (the old one advertised features that weren't gated or didn't exist).
  - The Pro state survives restarts.
  - The paywall has clear terms and privacy links that load.
- **Reference:** old `PaywallModal`, `src/pro/purchases.ts`, `docs/SUBSCRIPTION-REVIEW-NOTES.md`.

### Phase 9: Polish, accessibility, performance, QA

- **Build:**
  - Full VoiceOver pass.
  - Dynamic Type pass.
  - Reduce Motion.
  - Contrast audit.
  - Performance budget check (§11).
  - Every screen in every state on a small phone (iPhone SE/mini size) and a large one (Pro Max size).
  - Copy review.
  - A "break it" session: airplane mode, killing the app mid-action, 500 bookmarks, 40-character recipe titles, an empty catalogue search.
- **Done when:** `KNOWN-ISSUES.md` has zero launch-blocking items.

### Phase 10: Launch

- **Build:**
  - Legal pages hosted at working URLs; the privacy policy rewritten to match v1 exactly (no accounts, no social, and so a much shorter policy).
  - App Store listing and screenshots.
  - App Privacy answers updated.
  - TestFlight build 13+ to testers for a week.
  - Submit.
- **Done when:** approved and live.
- **Reference:** handover §8, old `docs/APP-STORE-LISTING.md`, `APP-REVIEW-NOTES.md`.

### After v1

These phases get their own maps when the time comes:

- v1.1 accounts and sync (Supabase)
- v1.2 social (reuse the old schema and RLS lessons)
- v1.3 AI scanning

---

## 11. Quality gates

A feature is **done** only when every box is ticked:

- [ ] `tsc --noEmit`, ESLint and Prettier are clean. No `any`, no `@ts-ignore` without a written reason.
- [ ] Domain logic has unit tests, including edge cases (0, 1, many, weird input).
- [ ] Key interactions have component tests. The feature's Maestro flow passes.
- [ ] Every state is designed and screenshotted: loading, empty, error, full, long text, in **light and dark**.
- [ ] Tested on a real iPhone by Lachlan.
- [ ] VoiceOver labels are present. Tap targets are ≥ 44pt. Contrast is AA.
- [ ] No console warnings. No colour, spacing or font-size literals outside `src/ui/tokens`.
- [ ] Files are under 300 lines. Names follow §8. Comments explain *why*.
- [ ] `DECISIONS.md` is updated for any choice made. `KNOWN-ISSUES.md` is updated for anything deferred.
- [ ] Committed with a clear message and **pushed to GitHub**.

**Performance budgets** (measured on a release build on a mid-range iPhone):

- Cold start to interactive in under 2 seconds.
- Lists scroll at 60fps.
- Taps respond within 100ms.
- The recipe page opens in under 300ms.
- No re-render of unrelated screens when the store changes (checked with the React profiler).

---

## 12. Working method

**The loop for every slice of work:**

1. **Understand:** re-read the relevant map section and old reference code. Write the 3–6 sentence feature brief (Principle 1).
2. **Question:** list assumptions and edge cases. Check them against the old app's bugs (§5). If a product decision is needed, **stop and ask Lachlan**, offering 2–3 options and a recommendation.
3. **Plan:** a short numbered plan in plain English (what, why, how we'll know it works).
4. **Test first where it's logic:** write failing tests for the rules and edge cases.
5. **Build the smallest slice** that makes it work, using design-system components only.
6. **Verify:** run typecheck, lint and tests, run it in the simulator, screenshot light and dark, run the Maestro flow.
7. **Show Lachlan:** screenshots and a plain-English summary of what changed and how to check it on his phone.
8. **Commit and push.** One logical change per commit.

**Stop and ask Lachlan whenever the work involves:**

- a product or design decision the map doesn't settle;
- changing scope;
- anything involving money, App Store Connect, RevenueCat or Supabase;
- deleting or migrating user data;
- adding a native dependency;
- anything surprising found in the old code.

**How to explain things to Lachlan:**

- Plain English, one step at a time.
- Define jargon the first time it appears.
- Use analogies.
- Always say what to look for as the sign of success.

**Never:**

- port an old file wholesale;
- ship simulated data;
- leave a dead button;
- batch unverified changes;
- leave work unpushed at the end of a session;
- edit `node_modules` (use `patch-package` if truly needed).

---

## 13. Reference guide

Old repo: `The Pantry - Transfer/the-pantry-app/` (branch `wave2/freeze-fix`).

**Lift, then re-read, re-test and tidy:**

| Old path | Becomes | Notes |
|---|---|---|
| `src/data/recipes.ts`, `assets/recipes/`, `recipeImageCredits.json` | `src/data/catalogue/` | Converted by script to structured form; keep ids |
| `src/data/units/convert.ts`, `scaleIngredient.ts` | `src/domain/ingredients/` | Add fraction formatting, range quantities |
| `groceryConsolidate.ts`, `groceryNormalise.ts`, `groceryAisles.ts` | `src/domain/shopping/` | Works on structured lines; much simpler |
| `pantryMatch.ts`, `planSuggestions.ts`, `preferences.ts` | `src/domain/cupboard/`, `suggestions/` | Match on ingredientId |
| `nutrition/engine.ts`, `nutrition/ingredients.ts` | `src/domain/nutrition/` | Drop the AI `macros.ts` fallback |
| `substitutions.ts`, `pairings.ts`, `season.ts`, `mood.ts`, `onePot.ts`, `cookStats.ts`, `stepDuration.ts` | matching `src/domain/*` | Check season data is southern hemisphere. `season.ts` matches on recipe *names*; v1 uses a season tag instead. `pairings.ts` covers only 26 recipes (keep or drop: decision G) |
| `importRecipe.ts` | `src/domain/recipes/import.ts` | Output must pass the catalogue schema |
| `src/data/__tests__/*` | test starting points | Keep the cases, rewrite the setup |
| `legal/`, `docs/APP-*`, `SUBSCRIPTION-REVIEW-NOTES.md` | Phase 10 | Rewrite to match v1 scope |

**Read to understand behaviour, don't copy:** `RecipeModal`, `RecipeBody`, `CartModal`, `PantryModal`, `SpinnerModal`, `CookModeModal`, `OnboardingModal`, `PaywallModal`, `BrowseModal`, `SettingsModal`, `theme.ts`.

**Anti-examples** (what not to do): `HomeScreen.tsx` (modal soup), `useStore.ts` (single state blob), `social/localFeedApi.ts` + `supabaseFeedAPI.ts` (two diverging backends), `meals.ts` `cuisineFor()` (guessing from names), the `Meal.emoji` field.

**Bug archaeology** (read before building each area, to avoid repeating mistakes): `AUDIT-2026-05-27.md`, `UIUX-FINDINGS-2026-05-29.md`, `docs/ARCHITECTURE-AUDIT-2026-06-09.md`, `docs/RECOVERY-PLAN-2026-06-11.md`, `docs/STATUS-2026-06-22.md`.

**Behaviour traps found in Phase 0** (full list in `PRODUCT.md` §7). The old code's behaviour is *not* the spec in these areas:

- Cuisine, diet, meal type and season were guessed from recipe names.
- The plan was weekday-based, held each recipe once and had no servings.
- The shopping list ignored the cupboard and servings; removals by name lasted forever.
- Surprise me ignored diet and the avoid list; its cupboard filter was a stand-in.
- The avoid list matched keywords, so "nuts" missed cashews.
- Cook Mode timers stopped when the phone locked; "Done" logged nothing.
- The paywall advertised features that weren't gated or didn't exist.

---

## 14. Open decisions for Lachlan

These need an answer before (or early in) the phase shown. Once answered, each moves to `DECISIONS.md` and is marked here.

**Decided** (details in `DECISIONS.md`)

| Topic | Outcome | Log |
|---|---|---|
| App technology | Native React Native with Expo; Lovable rejected | D-001 |
| Builder and dev loop | Claude builds in its cloud workspace; EAS development build on Lachlan's iPhone | D-002 |
| Pro gates (#4, A) | Free completes the North Star; Pro = next week, more than 3 collections, nutrition detail | D-003 |
| Hands-free (B) | Screen stays on, whole-screen tap; no voice, word not used | D-004 |
| Old TestFlight data (#5, C–E) | Import everything except the stale plan and list; drop missing recipes and say how many | D-005 |
| Avoid list (F) | Ingredient-group matching, no allergy claims | D-006 |
| Small features (G) | Keep hidden and recently viewed; drop "Pair with" | D-007 |
| Recipe content (#1) | Convert all 285 as `ai-draft`; release builds show only vetted ones (~80 target) | D-008 |
| Plan by date (#3) | Real dates, Monday start, this week and next | D-009 |
| Shopping list rules | Merge only convertible units; edits scoped to the week; "In your cupboard" section | D-010 |
| Android (#6) | iOS only at launch | D-011 |
| Palette and fonts (#2) | Approved by Lachlan from the design specimen | D-012, D-016 |
| Measures | Australian metric (250 ml cup, 20 ml tbsp) | D-013 |
| Recipe corrections | One reviewed fixes file, applied by the converter | D-014 |
| Domain dependencies | None; hand-written validation, Node test runner | D-015 |
| App version | 2.0.0, so old-app updates can't reach v2 or vice versa | D-017 |
| Draft recipes in test builds | Shown in development and preview builds only | D-018 |
| Route folder | `src/app/` | D-019 |
| Build machine | Claude's workspace on the Mac mini | D-020 |

**Still open (Lachlan)**

| # | Decision | Needed by |
|---|---|---|
| 1 | Cook-test and mark the launch recipes as vetted | Before Phase 10 |
| 7 | Restore or back up the paused Supabase project | **This week** |
