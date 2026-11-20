# Lane 5: Experience, design, accessibility and words

Audit of branch `audit/deep-1120` (8bbbacd), 20 Nov 2026. Auditor only: nothing in `src/` was changed.
Method: the static web build (`dist/`, served on 4415) at 390x844, light and dark, with Supabase blocked
except public GET reads on the feed screens; token maths with the app's own `contrast.ts`; code reads.
Tools in `tools/L5/` (`shots.ts`, `checks.ts`, `sheets.ts`, `contrast.ts`, `a11yscan.ts`, `sweepread.ts`).
Evidence in `evidence/L5/` (`shots/`, `sheets/`, `contrast.md`, `a11yscan.txt`, `sweep.json`).

## Summary

| Severity | Count |
|---|---|
| S1 Blocker | 0 |
| S2 Loses people | 2 |
| S3 Annoying | 9 |
| S4 Polish | 7 |
| **Total** | **18** |

The five worst, in plain words:

1. **UX-1:** The big ＋ in the tab bar says "Share a dish you cooked", but nobody else ever sees it. The page then says sharing "comes with accounts", and accounts already exist.
2. **UX-2:** The "From other cooks" feed page can't be reached. No menu row, button or link opens it any more.
3. **UX-3:** Switches, empty plan slots, sheet handles and borders are too faint to see in both themes (K-37 is still open). The High contrast switch itself is nearly invisible.
4. **UX-4:** Recipe editor errors show code words to people, for example "prepMinutes must be whole minutes between 0 and 3 days." and "title is longer than 80 characters".
5. **UX-5:** Home says the same thing four ways ("Ready now", "Nearly there", "Can cook now", "Missing 1-2"), and "Picked for you" names two different things.

**Coverage:**
- Screens: 39 of 39 non-dev screens shot in light and dark (100%). 35 of 39 were shot in their main loaded state (90%).
- Not shot loaded: the plate, published-recipe and cook-profile pages (only "missing" states), and join with a real code (forbidden).
- Dev routes: 2 excluded.
- Hand-merged screens (Home, paywall, onboarding and checklist, My recipes, Cupboard): all read in code and screenshots.

## Index

| ID | Sev | Fix | Conf | Title | Where |
|---|---|---|---|---|---|
| UX-1 | S2 | owner | CONFIRMED | "Share a dish" shares with nobody; plate page copy is stale | TabBar.tsx:104, DrawerScreen.tsx:101, PlateScreen.tsx:79, PostScreen.tsx:227 |
| UX-2 | S2 | auto | CONFIRMED | Community feed `/feed` is orphaned: nothing links to it | DrawerScreen.tsx:79-107, CommunityRail.tsx:47 (unrendered), HomeForYou.tsx:41 |
| UX-3 | S3 | owner | CONFIRMED | Control edges under 3:1: Toggle tracks, borders, dashed slots, sheet handles (K-37) | colour.ts, Toggle.tsx:22,24, DaySlots.tsx:217, PostScreen.tsx:265, Sheet.tsx:60, ModalSheet.tsx:79, CookIngredientsSheet.tsx:144 |
| UX-4 | S3 | auto | CONFIRMED | Draft problems leak field names and code wording | domain/recipes/draft.ts:130, validate.ts:17-40, MyRecipesTab.tsx:41, RecipeEditorScreen.tsx:86 |
| UX-5 | S3 | auto | CONFIRMED | Home repeats "can cook / nearly" four ways; "Picked for you" means two things | FeedScreen.tsx, HomeTiers.tsx:22-23, HomeForYou.tsx:41, PlanParts.tsx:88 |
| UX-6 | S3 | owner | CONFIRMED | "Coming soon" scan tiles and unbuyable Pro still in store builds (K-25 / REL-06) | CupboardScreen.tsx, ScanSheet.tsx:177, PaywallScreen.tsx:84-85 |
| UX-7 | S3 | owner | CONFIRMED | North Star: planning a week takes about 15 taps; Cook Mode only from a recipe page | DaySlots.tsx, AddToPlanSheet.tsx, RecipeScreen.tsx:154 |
| UX-8 | S3 | auto | LIKELY | Cook timers: not grouped, "Cancel timer" doesn't say which, double announcement on Android | TimerBar.tsx:22-42 |
| UX-9 | S3 | auto | CONFIRMED | Small token contrast misses: Library count text, dark no-photo icon, dark tour card edge | ui/tokens/library.ts, colour.ts (raisedEdge) |
| UX-10 | S3 | auto | LIKELY | Faint text on photos fails on light photos (meta lines, video captions) | RecipeCard.tsx:109, ShelfCard.tsx:29, HeroCarousel.tsx:96, FIXED.onPhotoFaint/videoQuiet |
| UX-11 | S3 | auto | CONFIRMED | Missing collection page says "Not found", "0 recipes" and "This collection is gone" at once | CollectionScreen.tsx:31-35 |
| UX-12 | S3 | owner | CONFIRMED | Cupboard jar line colours under 3:1 in both themes | JarChip.tsx:35, CupboardLists.tsx:42, tokens/cuisine.ts |
| UX-13 | S4 | auto | CONFIRMED | First run stacks checklist, tour and hero; tour step 1 explains "What I have" while Everything is on | FirstRunChecklist.tsx, TourOverlay.tsx, PantrySwitch.tsx |
| UX-14 | S4 | auto | CONFIRMED | Cupboard intro says "what you have" three times | CupboardScreen.tsx:50-53 |
| UX-15 | S4 | auto | CONFIRMED | Cookable list says "Ready to cook" in the kicker and on every row | CookableList.tsx:24 |
| UX-16 | S4 | auto | CONFIRMED | Two wordings for offline; straight apostrophe in one error | household/words.ts:5, lib/published.ts:107, RecipeScreen.tsx:94 |
| UX-17 | S4 | auto | CONFIRMED | Checklist ring has a label but isn't `accessible`, so VoiceOver skips it | FirstRunChecklist.tsx:36 |
| UX-18 | S4 | auto | LIKELY (web-only?) | "What I have" truncates to "What I h…" when the count is three digits | PantrySwitch.tsx |

## Findings

### UX-1 · S2 · owner · CONFIRMED · "Share a dish" shares with nobody
- **What the person sees:**
  - The middle ＋ tab is labelled "Share a dish you cooked" (`TabBar.tsx:104`), and the menu row says "Share a dish" (`DrawerScreen.tsx:101`).
  - The page that opens is titled "Share a dish" and its button says **Share**.
  - Afterwards the plate page says "Only you can see your plates for now. Sharing with friends comes with accounts." (`PlateScreen.tsx:79`, `PostScreen.tsx:227`).
  - Accounts (Apple backup) and households already exist, so the line reads like a broken promise. The same thing is called a "dish" in two places and a "plate" in the third.
- **Evidence:** `shots/12-post-light.png`, `shots/06-menu-light.png`, `sheets/light-1-02.png`.
- **Root cause:** The v1 social feature was rebuilt as a private photo log. The words still describe the social version.
- **Smallest fix (owner picks one):**
  - (a) Rename to "Log a dish" or "Add a photo of what you cooked", make the button "Save", and drop "comes with accounts".
  - (b) Keep "Share" only once plates really reach other people.
- **Test that would have caught it:** A words test listing every `label`/title that contains "Share", each tied to a flow that really sends something.

### UX-2 · S2 · auto · CONFIRMED · The community feed can't be reached
- **What the person sees:**
  - Home shows a "From other cooks · Picked for you" section, but there is no "See all".
  - The menu has Discover, My kitchen and Tools with no feed row.
  - `/feed` ("What they're cooking") still works when opened directly (`shots/13-feed-light.png`). A person just can't get there.
- **Evidence:**
  - `CommunityRail.tsx:47` holds the only `router.push('/feed')`, and `CommunityRail` is imported nowhere.
  - `DrawerScreen.tsx:79-107` has no feed row.
- **Root cause:** The Home engine merge replaced CommunityRail with HomeForYou and dropped the link.
- **Smallest fix:**
  - Add a "See all" action to the HomeForYou `SectionHeader` that pushes `/feed`.
  - Or add a Discover menu row "From other cooks" with the existing `community` icon.
- **Test that would have caught it:** A route-reachability test listing every non-dev route with at least one `router.push`/`href` from a rendered screen.

### UX-3 · S3 · owner · CONFIRMED · Controls too faint (K-37 still open)
- **What the person sees:**
  - The off Switch track is a pale grey on white (1.90:1). Off and on are hard to tell apart, and the High contrast switch itself is the hardest to see (`shots/06-settings-*.png`).
  - Dashed "Add dinner" slots, sheet handles and the Post photo box are barely there.
  - Hairline borders are 1.14:1 in light and 1.25:1 in dark.
- **Evidence:** `contrast.md`, which gives the token names, ratios and every use site:
  - `inkSubtle` on `bg`: 1.90 light, 2.02 to 2.17 dark.
  - `border`: 1.14 light, 1.25 dark.
  - `accent` as the switch's on track: 2.74 light.
- **Root cause:** The v1 look (D-025) uses hairlines and a pale track. Changing them changes the look, so it was left for Lachlan.
- **Smallest token change that passes 3:1:**

  | Token | Theme | Change to |
  |---|---|---|
  | `inkSubtle` | light | `#939393` |
  | `inkSubtle` | dark | `#626263` |
  | `accent` (on track only) | light | `#BF8A51` |
  | `border` | light | `rgba(0,0,0,0.42)` |
  | `border` | dark | `rgba(255,255,255,0.34)` |

  `border` only needs the change where it is a control's edge. A lighter route is a new `controlEdge` token used by Toggle, DaySlots, PostScreen and the sheet handles, leaving dividers alone.
- **Test that would have caught it:** Add `inkSubtle on bg (ui)` and `accent on bg (ui)` to `tokens.test.ts` MUST_PASS.
- **Old ID:** K-37 (health check #23).

### UX-4 · S3 · auto · CONFIRMED · Editor errors show code words
- **What the person sees:**
  - A draft card in My recipes says "title is longer than 80 characters" (lower case, field name first; `shots/07-library-mine-light.png`).
  - The editor's "Almost there:" line can say:
    - "prepminutes must be whole minutes between 0 and 3 days" (the minutes fields allow 4 digits, so 9999 is enterable; `EditorDetails.tsx:96,107`)
    - "servings must be a whole number from 1 to 50"
    - "difficulty must be easy, medium or hard"
- **Evidence:**
  - `draft.ts:130` falls back to `` `${root} ${p.message}.` `` for every field except title-empty, ingredients, method and mealTypes.
  - `RecipeEditorScreen.tsx:86` lower-cases and joins the messages.
- **Root cause:** Catalogue-validator wording is reused as UI copy.
- **Smallest fix:** Add plain cases to `toDraftProblem`:
  - summary: "Keep the description under 120 characters."
  - title too long: "Shorten the name to 80 characters."
  - minutes: "Times go up to 3 days."
  - servings: "Serves 1 to 50."

  Never fall back to `root`.
- **Test that would have caught it:** A unit test in `draft.test.ts` asserting no DraftProblem message contains a camelCase word.

### UX-5 · S3 · auto · CONFIRMED · Home repeats itself; "Picked for you" means two things
- **What the person sees:**
  - Home's own recipes appear under:
    - "Ready now · n / More you can cook"
    - "Nearly there / One or two things short"
  - Further down, other cooks' recipes appear again under:
    - "Can cook now · n"
    - "Missing 1-2 · n" (`HomeTiers.tsx:22-23`)
  - "Missing 1-2" reads like jargon.
  - Plan's day ideas are headed "Picked for you" (`PlanParts.tsx:88`), and so is Home's other-cooks section (`HomeForYou.tsx:41`).
- **Evidence:** `shots/02-home-stocked-*.png`, `x-home-foryou-online-light.png`.
- **Root cause:** HomeTiers was merged into HomeForYou alongside the existing grids, and the words were never reconciled.
- **Smallest fix:**
  - Reuse the house wording in HomeTiers: "Ready now" and "Nearly there".
  - Rename Home's section to "From other cooks" with no second title, or rename Plan's to "Ideas for this day".
- **Test that would have caught it:** A words test that headings are unique across the Home tree.

### UX-6 · S3 · owner · CONFIRMED · "Coming soon" and unbuyable Pro still ship (K-25)
- **What the person sees:**
  - The Cupboard shows "Scan receipt" and "Photo of food" tiles. Tapping one opens "Coming soon / Scanning isn't switched on yet" (`ScanSheet.tsx:177`; `shots/05-cupboard-scan*.png`).
  - Pro says "Pro isn't on sale here yet. Until it is, nothing in the app is limited." with only "Got it".
- **Root cause:** D-041 kept them on purpose.
- **Smallest fix:** Hide both tiles behind the same flag as scanning, so a dead button is never shown ("No fake, no dead"), and keep "Add a list".
- **Old ID:** K-25 / REL-06.

### UX-7 · S3 · owner · CONFIRMED · North Star tap count
Measured on the web build:

| Job | Taps | Notes |
|---|---|---|
| Plan the week (7 dinners) | ≈15 | Plan tab 1, then for each day: tap the empty slot 1 and pick an idea 1. There is no "fill the week" or "plan the rest". |
| Send the list | 3 | List tab, Send, then the system share sheet. Good. |
| Cook tonight | 2 to 3 | Home hero 1 → Start Cook Mode 1, or Plan → today's meal → Start Cook Mode. Cook Mode only opens from a recipe page (`RecipeScreen.tsx:154`): no "Cook" on a planned meal card. |

- **Smallest fix:** A quiet "Fill empty dinners" action on Plan using the existing `useSlotIdeas`, plus a Cook action on today's planned meal. This is a product call for Lachlan.

### UX-8 · S3 · auto · LIKELY · Cook timers for VoiceOver
- **What the person hears:**
  - Each running timer is read as separate elements: "Step 2 · guanciale", "5:42", then "Cancel timer". With two timers the person can't tell which Cancel is which.
  - When a timer ends, `accessibilityLiveRegion="assertive"` (Android) and `useAnnounce("Time's up: …")` both fire, so Android reads it twice.
- **Evidence:** `TimerBar.tsx:22-42`, `:15`.
- **Smallest fix:**
  - Make the label column `accessible` with the label `` `${label}, step n, ${countdown} left` ``.
  - Make the button label `` `Cancel ${label} timer` ``.
  - Drop the live region and keep `useAnnounce`.
- **Old ID:** The "timer chip VoiceOver" item in K-39. The in-text chips are links with good labels (`CookStep.tsx:50-57`); this is the bar under them. A device check is still owed.

### UX-9 · S3 · auto · CONFIRMED · Small token contrast misses

| Token | Ratio | Change to | Where |
|---|---|---|---|
| `LIBRARY.count` light | 4.29 (comment claims 4.3) | `#9B6E2E` | "3 recipes" italic count |
| `LIBRARY.wellIcon` dark | 2.63 | `#736B62` | no-photo icon |
| `raisedEdge` dark | 1.83 | `rgba(247,243,234,0.36)` | tour card edge |

- **Test that would have caught it:** Extend `tokens.test.ts` over `libraryColours()` for both themes.

### UX-10 · S3 · auto · LIKELY · Faint text over light photos
- **What the person sees:** Card meta and time lines can be unreadable on a white plate photo:
  - `onPhotoFaint` at the `videoScrim50` end stop fails 4.5:1.
  - `videoQuiet` fails on every scrim.
- **Evidence:** `contrast.md` (worst case: white photo).
- **Smallest fix:** Use `onPhotoMuted` for meta, or deepen the scrim end stop.
- **Confidence:** LIKELY because real photos are rarely pure white.

### UX-11 · S3 · auto · CONFIRMED · Missing collection reads as unfinished
- **What the person sees:** A big header "Not found", then "0 recipes", then "This collection is gone / It may have been deleted" (`shots/07-collection-missing-*.png`).
- **Smallest fix:** When the collection is missing, render only the EmptyState with the back chip, as RecipeScreen does.

### UX-12 · S3 · owner · CONFIRMED · Cupboard jar lines too faint
- **Evidence:** The category `soft` colours on `bg` are about 2.76 to 2.98 in light. In dark they are 2.51 for proteins, 2.85 for sauces and 3.00 for other (`contrast.md`).
- **Smallest fix:** Darken or lighten each `soft` by about 5%, or treat the lines as decorative and rely on the text label (it already carries the meaning). Owner call, because these are brand colours.

### UX-13 · S4 · auto · CONFIRMED · First two minutes
- **What the person sees:**
  - After welcome (8 short, clear steps), Home stacks the Getting started checklist (0/4), the tour overlay and the hero.
  - Tour step 1 "What I have" explains the cupboard view while "Everything" is selected and the cupboard count is 0 (`shots/02-home-tour-*.png`).
- **Smallest fix:** Hold the checklist until the tour ends, and have tour step 1 point at the switch with "Fill your cupboard and this shows what you can cook now."

### UX-14 · S4 · auto · CONFIRMED · Cupboard intro repeats itself
- **What the person sees:** "What do you have?", then "Tell us what you have. We'll show what you can cook tonight.", then "Step 1 · Add what you have."
- **Smallest fix:** Change the subtitle to "We'll show what you can cook tonight."

### UX-15 · S4 · auto · CONFIRMED · "Ready to cook" on every row
- **What the person sees:** The kicker reads "226 recipes / Ready to cook" and every row repeats it. Many rows have no photo, so the list feels thin.
- **Smallest fix:** Drop the per-row tag inside the "ready" section.

### UX-16 · S4 · auto · CONFIRMED · Word consistency
- **What the person sees:**
  - The offline message is worded two ways: "Couldn't reach The Pantry. Check you're online and try again." (household) and "Couldn't reach the server. Check your connection and try again." (Home's other-cooks section and the feed).
  - `RecipeScreen.tsx:94` "We couldn't find that recipe" uses a straight apostrophe; everywhere else uses curly ones.
- **Smallest fix:** Use one shared `offline` string, and use a curly apostrophe.

### UX-17 · S4 · auto · CONFIRMED · Checklist ring skipped by VoiceOver
- **Evidence:** `FirstRunChecklist.tsx:36`: the View has an `accessibilityLabel` but not `accessible`, so iOS never focuses it. The step buttons do carry `checked`, so progress is still reachable.
- **Smallest fix:** Add `accessible`.

### UX-18 · S4 · auto · LIKELY (web-only?) · "What I h…"
- **What the person sees:** With 226 matches, the switch label truncates (`shots/02-home-stocked-*.png`).
- **Root cause:** `adjustsFontSizeToFit` is iOS-only. On iOS the text shrinks instead, which is fine. A device check is owed.
- **Smallest fix:** Cap the count badge at "99+".

## What the person sees when L3 and L4 failures happen (not re-reported)

| Failure | What the person sees |
|---|---|
| DATA-4, DATA-12 | Nothing. The phone quietly leaves the household or stops backing up; Settings still says backed up until it next renders. There is no toast or banner. |
| DATA-5 | Nothing. Set-aside rows are never shown, so items vanish silently on sign-out. |
| DATA-7 | "Leave household" succeeds; unsent ticks and plan changes just disappear. |
| DATA-9 | The app opens normally with no sync, account or household, and no message. |
| DATA-13 | The join error promises single-use, 2-day codes. That's wrong for live codes, so people retry codes they think have expired. |
| S2-7 (L4) | Home's "From other cooks" cards show a name, handle and avatar for AI personas, with nothing saying so (`x-home-foryou-online-light.png`). |
| S2-11 | Household "Remove" and "Cancel unused invites" are visible (`shots/14-household-member-light.png`) and would fail against live. |

## Carry-over

| ID | Status |
|---|---|
| K-7 | Not re-tested (known web-only). |
| K-11 | Not re-tested (known web-only). |
| K-25 / REL-06 | Still open → UX-6. |
| K-37 | Still open → UX-3. |
| K-39 | Still owed on a device: VoiceOver timers (UX-8), Dynamic Type 200%, offline expired session, Library at 285 Cookmarks. |
| REL-07 | Still fixed: `app.json:133-134` only asks for photos and camera to photograph a dish, with no scanning promise and microphone off. |
| REL-22 | Still fixed in code: the `Text` body cap is 2.0. Lower caps are deliberate on JarChip 1.3, Badge 1.2, TabBar 1.2, WaysIn 1.3, and Avatar and brandMark 1. Device check is in K-39. |
| REL-23 | Still fixed (D-049), not re-tested in depth. |
| Timer-chip VoiceOver | In-text chips are fine; the timer bar is UX-8. |
| 6 Oct naming #1 to #9 | All still hold: no "Spinner", "Recently viewed", "Type a list", "Sharing" kicker or "Pantry" shelf in UI strings (grep). New naming drift: UX-1 (dish/plate) and UX-5 (Picked for you). |

## Refuted or not a finding

- **`inkMuted` on `accentSoft` (4.42):** No real text uses this pairing.
- **`bullet` dot at 1.76:** Decorative.
- **Missing accessibility roles:** 0 Pressables lack a role (`a11yscan.txt`). The 11 label-less ones all have text children.
- **Cupboard and Settings switches with no role or name in the web sweep:** RN-web Switch output. `Toggle.tsx` passes `accessibilityLabel` to the native Switch, so this is web-only.
- **Small controls in the sweep (38 px chips, 37 px Library tabs, 29 px Pills):** All carry `hitSlop` (IconButton, LibraryTabs, Pill), so they are 44+.
- **"Testing: ranked as you / Change" on Home:** Shown only when `__DEV__` or `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1` (`HomeForYou.tsx:23`). The production profile lacks the flag (L4 K-29).
- **Feed offline spinner forever:** Refuted. The error and "Try again" appear (`x-feed-offline-15s-light.png`). Home's section also shows its error (`x-home-foryou-offline-light.png`).
- **`09-recipe-long-own` shows "couldn't find":** The seeded long recipe is a draft, and drafts open in the editor, not the recipe page. This is a test artefact.
- **Locked plan day shows no lock on web:** Purchases are not connected on web, so limits don't apply there. Expected.
- **`08-browse-noresults`:** My query didn't apply, so the no-results state was not captured. See Not tested.

## Not tested

- Real VoiceOver and TalkBack.
- Dynamic Type at 200% on a device.
- Reduce Motion on a device (code paths checked).
- iOS sheets and keyboard.
- Notifications and timer alerts.
- Haptics.
- The paywall with real prices and plan lengths (K-38). Purchases are not connected on web, so plan lengths could not be seen.
- Apple sign-in and the email code flow.
- Household create and join, and invite links (forbidden).
- Loaded plate, published recipe and cook-profile pages.
- Browse with no results.
- The Library at 285 Cookmarks.
- Any landscape or iPad layout.
