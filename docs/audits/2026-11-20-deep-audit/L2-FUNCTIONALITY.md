# Lane 2: functionality and logic (20 Nov 2026)

Branch `audit/deep-1120` at `8bbbacd`. I drove the web build `dist/` (exported the way CI does it, drafts shown) on port 4412 with Playwright at 390 x 844, light, with every request to `supabase.co` aborted (`tools/L2/lib.ts`). I re-ran the domain maths with scripts against `src/domain` and the catalogue. Probes are in `tools/L2/`, their output and screenshots in `evidence/L2/`. A browser stands in for the phone: notifications, keep-awake, haptics, the photo picker, Sign in with Apple and purchases could not be run, so findings on those are LIKELY at most.

## Live objects created

None. Before the coordinator's safety note, two probes (`recent-dup.ts`, `home-carbonara.ts`) ran without the block. `net-check.ts` shows what a launch sends: only `GET /rest/v1/published_recipes` (the public feed, read three times). No sign-in, household, invite or account flow was run at any point. After the note, every probe aborts Supabase requests.

## Summary

| Severity | Count |
|---|---|
| S1 Blocker | 1 |
| S2 Loses people | 3 |
| S3 Annoying | 4 |
| S4 Polish | 7 |
| **Total** | **15** |

The five worst, in plain words:

1. **F-1.** Scaling only changes the first number in a line. Carbonara (a store-build recipe) at 24 serves says "36 egg yolks + 1 whole egg". At 2 serves the list says "Egg 3" when you need 4. 354 more lines carry an amount in a note that never scales, such as "(about 1.5kg total)".
2. **F-3.** The avoid list (allergies) doesn't catch ingredients it can't identify in typed, imported or household recipes: Nutella, marzipan, frangipane and XO sauce pass "nuts" and "shellfish". The recipe page never warns.
3. **F-4.** The paywall can promise "Start 7-day free trial" to someone who has already used their trial, because store eligibility is never checked. That person is charged straight away.
4. **F-5.** Pro can go on sale with no privacy or terms links (merge judgement call 1). Apple rejects that under 3.1.2.
5. **F-2.** Small amounts round to nothing when scaled down: "0 tsp nutmeg", "0 cup mint" (656 lines in 461 recipes at 1 serve). Kilos below one print as "0.4 kg" instead of "375 g".

The known breakage `library.spec.ts:18` is a **test problem, not a duplicate anyone sees** (F-9).

Coverage: 22 of 42 routes driven in the browser and 9 more traced in code, so **31 of 42 (74%)**. Every Lane 2 area in the prompt was looked at; see Coverage.

## Index

| ID | Sev | Fix | Conf | Title | Where |
|---|---|---|---|---|---|
| F-1 | S2 | auto | CONFIRMED | A second amount inside a line, or in its note, never scales | src/domain/ingredients/format.ts:12-22; carbonara and 13 more; 354 note lines |
| F-2 | S3 | auto | CONFIRMED | Scaled-down amounts print "0 tsp" / "0 cup"; "0.4 kg"; ⅜ prints as 0.4 | src/domain/ingredients/quantity.ts:80-92; format.ts:35-62 |
| F-3 | S2 | auto | CONFIRMED | Avoid list misses unidentified allergen words in typed, imported and household recipes; no warning on the recipe page | src/domain/recipes/diets.ts:85-98; features/recipe/RecipeScreen.tsx |
| F-4 | S2 | auto+owner | LIKELY | Free trial shown to buyers who aren't eligible for it | src/lib/purchases.ts:97-104; src/domain/pro/purchase.ts:61-77 |
| F-5 | S1 | auto+owner | CONFIRMED (test) | Pro sells with empty legal links (judgement call 1) | src/features/pro/BuyPanel.tsx; LegalRows.test.tsx `it.failing` |
| F-6 | S3 | auto | LIKELY | Closing Cook Mode, or tapping Done, silently kills running timers and their alerts | src/features/cook/useCookTimers.ts:35-41; CookScreen.tsx:128 |
| F-7 | S3 | auto | LIKELY | Undo on "… cooked" doesn't put used-up items back in the cupboard | src/features/cook/CookScreen.tsx:107-114 |
| F-8 | S3 | auto | LIKELY | Free limits bypassed: the menu's "Add a recipe" and the orphan `/my-recipe/import` skip the allowance | src/features/shell/DrawerScreen.tsx:102; editor/ImportLinkScreen.tsx:19-22; editor/useRecipeEditor.ts:60 |
| F-9 | S4 | auto | CONFIRMED | `library.spec.ts:18`: the second Carbonara is the hidden Home underneath, not a duplicate | e2e/web/library.spec.ts:30; src/app/_layout.tsx:48 |
| F-10 | S4 | auto | CONFIRMED | Gone recipes still counted: "3 of 21 meals", the Plan badge, a "0 recipes" collection; the collect sheet accepts a gone recipe | features/plan, shell/useCounts.ts, recipe/CollectSheet.tsx |
| F-11 | S4 | auto | CONFIRMED | Deep-link params not clamped: "1000000000 people", plans dated 2020 or 2030 | src/app/recipe/[id]/list.tsx; features/plan/AddToPlanSheet.tsx |
| F-12 | S3 | auto | LIKELY | Cook Mode timer edge cases: "45 min to 1 hour" and "1 minute 30 seconds" each give two timers | src/domain/cook/cook.ts:12-15 |
| F-13 | S4 | auto | CONFIRMED | Search: "mac n cheese" finds nothing | src/domain/recipes/searchWords.ts |
| F-14 | S4 | auto | LIKELY | Link import downloads the whole page before the size cap when there's no Content-Length | src/lib/fetchPage.ts:26-29 |
| F-15 | S4 | auto | CONFIRMED | Skill weight 0.75 (judgement call 6): "Confident" cooks never see a hard dish in Home's top 25 | src/domain/suggestions/score.ts:64; welcome/onboarding.ts:34-44 |

## Findings

### F-1 · S2 · auto · CONFIRMED · A second amount inside a line, or in its note, never scales
**What the person sees.** On Carbonara, change the serves to 24 (the sheet allows it). The line reads **"36 egg yolks + 1 whole egg"**. At the default 2 serves, the shopping list says **"Egg 3"** when the recipe needs 4 eggs (3 yolks + 1 whole). In imperial at 24 serves: "5¼ lb spaghetti | 3.2 lb guanciale | 36 egg yolks + 1 whole egg" (`evidence/L2/journeys1.txt`, `j1-recipe-max-servings-imperial.png`, `j1-list-after-servings.png`, list "Egg 36").
**Scale.** `tools/L2/compound-lines.ts`: 14 lines in 14 recipes hold a second amount after "+" or "zest and N tbsp juice" (3 of them in store-build recipes, Carbonara included). `tools/L2/catalogue-maths.ts`: **354 lines in 252 recipes** have an amount in the note that never scales. Some are fine because they're per item ("4 cod fillets (180g each)"). Others become false: "2 racks pork ribs (about 1.5kg total)" and "2 cups stock (500 ml)" scaled to ½ cup still say "(500 ml)" (`evidence/L2/maths.txt`).
**Root cause.** `scaleLine` (format.ts:12) multiplies `quantity` only. The item ("egg yolks + 1 whole egg") and the note are text. The shopping list's `deriveShoppingList` also counts only `quantity`, so the list under-buys.
**Fix.** Data: split the 14 compound lines into two lines through `scripts/data/recipe-fixes.json` + `catalogue:convert` (D-014), for example "3 egg yolks" and "1 egg". Code: in `scaleLine`, when the ratio isn't 1 and the note matches an amount (`NUMBER_PATTERN` + unit), either scale it with the same ratio or drop it. "Each" notes stay as they are. A `catalogue:check-text` rule that refuses "+ N" inside an item stops new ones. This overlaps lane 7 on content.
**Test.** domain: `scaleLine(parse('2 cups (500 ml) stock'), 0.25)` has no "500 ml"; catalogue check: no item matches `/\+\s*\d/`.

### F-2 · S3 · auto · CONFIRMED · Scaled-down amounts print as "0", and kilos below one as "0.4 kg"
**What the person sees.** At 1 serve: "0 tsp nutmeg" (pumpkin-soup), "0 cup mint leaves" (spanakopita). That's **656 lines in 461 recipes**. "1/8 tsp cayenne" at a quarter is "0 tsp". "1.5 kg potatoes" at a quarter is "0.4 kg" (375 g; 248 lines in 239 recipes at 1 serve), while "1,500 g" scaled the same way is "375 g". ⅜ has no glyph, so "0.4 cup flour" and "2.4 tsp cumin" appear (579 lines in 197 recipes at 12 serves). "0 eggs" typed in the editor shows as "½ eggs". Evidence: `evidence/L2/maths.txt`, `evidence/L2/catalogue-maths.txt`.
**Root cause.** `formatKitchenNumber` (quantity.ts:80-92) returns the whole part when the fraction is under 1/24, so 0.03 becomes "0". `displayUnit` (format.ts:35-41) only moves g to kg upwards, never kg to g below 1. `PRINT_FRACTIONS` lacks ⅜ ⅝ ⅞. `roundCount` floors counts at ½, so 0 becomes ½.
**Fix.** In `formatAmount`, an amount above 0 that rounds to 0 prints the smallest fraction ("⅛ tsp") or "a pinch" for tsp. In metric, kg/l under 1 converts to g/ml and goes through `formatMeasuredNumber`. Add ⅜ ⅝ ⅞ to `PRINT_FRACTIONS`. A quantity of 0 should be flagged by the editor's parse issues, not shown as ½.
**Test.** format tests for `scaleLine('1/4 tsp', 1/8)` ≠ "0 tsp", `('1.5 kg', 0.25)` = "375 g", `('1 cup', 0.375)` = "⅜ cup".

### F-3 · S2 · auto · CONFIRMED · The avoid list misses allergens it can't identify, and the recipe page never warns
**What the person sees.** Someone who set "nuts" to avoid still gets a household member's (or their own imported) recipe with "2 tbsp nutella", "100 g marzipan" or "100 g frangipane" in Browse, Surprise me and Plan's search. "1 tbsp XO sauce" passes "shellfish". Opening any recipe, from a saved link, an old bookmark or one saved before the avoid list was set, shows no warning. Evidence: `tools/L2/avoid-search.ts` → `evidence/L2/avoid-search.txt` (`containsAvoided` returns false for all four; cashews, satay, pesto and tahini are caught).
**Root cause.** `containsAvoided` (diets.ts:85-98) checks the fixed options only through the matched ingredient's groups. A line with no `ingredientId` is invisible to the options; only *custom* words get a text fallback. The catalogue is 100% matched (L1-BASELINE), so this bites typed text: own recipes, link imports and household `sharedRecipes`. `deriveDiets` handles unmatched lines carefully (no diet tag), but the avoid list doesn't.
**Severity.** Per the rubric an allergen error is S1. I put it at S2 because only person-typed text is affected and the catalogue is clean. A fixer may raise it.
**Fix.** Give each `AVOID_OPTIONS` entry a word list (nuts: nut, nutella, marzipan, praline, frangipane, satay, gianduja…; shellfish: prawn, shrimp, crab, lobster, oyster, XO, scallop…). In `containsAvoided`, test unmatched lines' words against it, the way custom words already work. Add the missing names as aliases in the ingredient data. On `RecipeScreen`, show a line such as "Contains nuts, which you avoid" when `containsAvoided` is true.
**Test.** diets test: a recipe with the line "2 tbsp nutella" and `{options:['nuts']}` → true.

### F-4 · S2 · auto + owner · LIKELY · The paywall offers a free trial to people who can't have one
**What the person sees.** A returning subscriber who has already had the trial sees "7 days free, then A$x a year" and a button **"Start 7-day free trial"**, then is charged at once. That's a surprise charge and a 3.1.2 misrepresentation.
**Trace.** `lib/purchases.ts:97-104` takes `Purchases.getOfferings()` and maps packages with `plansFrom`. `trialDaysOf` (purchase.ts:61) reads `product.introPrice`, which RevenueCat fills from the product whether or not this Apple ID is eligible. Nothing in `src` calls `checkTrialOrIntroductoryPriceEligibility` (grep: no `Eligib` anywhere). `terms.ts` says "Days of free trial the store offers this buyer", which the code doesn't do. This is the k38 port (judgement call 2), never run against the sandbox.
**Fix.** In `lib/purchases.ts`, after loading the offering, call `Purchases.checkTrialOrIntroductoryPriceEligibility(productIds)`. Pass `trialDays` only when the status is `INTRO_ELIGIBILITY_STATUS_ELIGIBLE`, and treat unknown as no trial. `planFrom` takes an `eligible` flag.
**Owner.** One sandbox run with a tester that already used the trial (needs a device and a sandbox account).
**Test.** purchase.test: an ineligible package gives `trialDays: undefined` and `buyLabel` "Subscribe".

### F-5 · S1 · auto + owner · CONFIRMED (the guard test is marked failing) · Pro sells with empty legal links
This is INTEGRATION judgement call 1, re-checked. `BuyPanel` shows the buy button whenever RevenueCat returns products. `LEGAL_URLS` is empty, and `LegalRows.test.tsx` documents this as an `it.failing` KNOWN FAILURE. On the web build `/pro` says "not on sale yet", but on a phone with live products the buy button appears with no privacy or terms links, and Apple rejects that under 3.1.2. **Fix (auto, now):** `BuyPanel` renders the not-on-sale state while `legalLinks()` is empty, and the `it.failing` goes back to `it`. **Owner:** publish the privacy policy and terms (K-23) and give their URLs. This may also be raised by lane 6; one fix closes both.

### F-6 · S3 · auto · LIKELY · Leaving Cook Mode silently kills running timers
**What the person sees.** A 40-minute roast timer is running. They tap ✕ to look at the recipe page, or Done on the last step. The timer and its lock-screen alert are gone, with no question. Nothing rings.
**Trace.** Timers live in component state (`useCookTimers`). The unmount effect (useCookTimers.ts:35-41) cancels every scheduled notification. `CookHeader onClose={() => goBack(router)}` (CookScreen.tsx:128) and `finish` (CookScreen.tsx:107) don't look at `timers`. The cancelling is deliberate (BUG-22), but nothing warns first. It can't be run on the web (no notifications).
**Fix.** When `timers.some(t => !isFinished(t, now))`, close and Done ask through the existing `ActionSheet`: "Your 38 min timer will stop. Leave anyway?" A bigger fix keeps timers in a small store that outlives the screen.
**Test.** CookControls.test: with a running timer, Close shows the confirm and doesn't navigate.

### F-7 · S3 · auto · LIKELY · Undo after "cooked" leaves the cupboard emptied
`finish(usedUp)` (CookScreen.tsx:107-114) removes the ticked items from the cupboard. The toast's undo only calls `undoCooked(event.id)`. The probe confirms the removal (`journeys1.txt` step 6: egg gone from the cupboard after "Used anything up?"). After Undo, the cook log is restored but the egg stays gone. **Fix:** `undo: () => { undoCooked(event.id); addToCupboard(usedUp, 'manual'); }`, the same pattern `RecipeScreen.tsx:193` uses. **Test:** CookDone.test: undo restores the cupboard items.

### F-8 · S3 · auto · LIKELY · Free limits can be walked around
`useAllowance` guards My recipes' Add/Import rows (MyRecipesEntry.tsx:33,41) and Browse's add button (RecipesScreen.tsx:76). The menu's **"Add a recipe"** (DrawerScreen.tsx:102) opens `/my-recipe/edit` with no check, and `useRecipeEditor.save` (line 60) doesn't check either, so a free user can make an 11th recipe. `/my-recipe/import` (ImportLinkScreen) is no longer linked from anywhere since `cloud/03`, but the route still works by deep link and has no imports or my-recipes check. It does nothing today (limits are off until Pro is on sale) and loses Pro revenue later. **Fix:** move the my-recipes check into `useRecipeEditor.save` for new recipes, the one choke point. Either delete the orphan route or guard it with `allowed('imports')`. **Test:** editor test: at 10 recipes with limits on, saving a new one opens the paywall and keeps the draft.

### F-9 · S4 · auto · CONFIRMED · `library.spec.ts:18` is a test problem, not a duplicate
`tools/L2/recent-dup.ts` finds two `recipe-card-carbonara` elements. One sits in `recent-screen › library-screen` (visible, 170 x 187). The other sits in **`feed-screen`** with a 0 x 0 box. `unstable_settings.initialRouteName = '(tabs)'` (src/app/_layout.tsx:48) mounts Home underneath any deep-linked stack screen. Home's "More for you" grid ranks the just-viewed Carbonara in through the `viewed` weight of 1.5 (score.ts; `home-carbonara.ts`: with Recent empty, no Carbonara on Home). Nobody sees two cards. The locator isn't scoped.
**Which merge.** Not `475f286` in the way suspected: that merge only adds one `getByLabel('Recipe link')` line to this spec and changes no card or Home code. The failure needs Home's top grid to include a viewed Carbonara, which depends on the ranking inputs merged before it (preview batch 01's recipes, the home-engine merge). I can't pin the exact merge without re-exporting each, which this lane mustn't do.
**Fix:** `page.getByTestId('recent-screen').getByTestId('recipe-card-carbonara')` at lines 30 and 35 (and Cookmarks at line 15 for the same reason).

### F-10 · S4 · auto · CONFIRMED · What every screen shows for a recipe that no longer exists (lane 3 hand-over)
`tools/L2/missing-recipe.ts` seeded a plan entry, a bookmark, a collection, Recent and the cook log with a removed catalogue id and a deleted own-recipe id. Screenshots are `evidence/L2/missing-*.png`.

| Screen | What it shows | Verdict |
|---|---|---|
| Plan | "A recipe that's no longer available" with ✕ to remove | good. But the head says **"3 of 21 meals"** and the Plan tab badge says 3 with one dead |
| List | skips it silently (4 items from Carbonara only) | fine |
| Home Tonight | falls back to normal picks | fine |
| Cookmarks / Recent | dropped from list and count | fine |
| Collection | "Gone ones · 0 recipes · This collection is empty", with the dead ids still stored | misleading but harmless |
| Stats | counts the gone recipe's cooks in streak and total; leaves it out of Most cooked | fine |
| `/recipe/<gone>`, `/cook`, `/plan`, `/list` sheets | clear "isn't available any more" states | good |
| `/recipe/<gone>/collect` | **offers "Create and add"**, so a gone id can be added to a collection | bug (deep link only) |
| `/plate/x`, `/collections/x`, editor `?id=x` | clear gone states | good |

**Fix:** count plan meals with `mealCount(entries.filter(e => getRecipe(e.recipeId)))` in the plan head and in `useCounts` (which already has `resolving` for Recent). `CollectSheet` shows the same missing state as `AddToListSheet`. Lane 3's DATA-10 (leaving a household keeps plan entries for recipes that are gone) lands on this table. The plan screen handles it acceptably.

### F-11 · S4 · auto · CONFIRMED · Deep-link params aren't clamped
`/recipe/carbonara/list?servings=1e9` shows "FOR 1000000000 people … Egg 1500000000" and lets you add it. `/plan/add?day=2020-01-01` plans into a long-pruned week ("Add dinner for Wednesday"). `?day=2030-01-01` plans outside the two visible weeks, so the meal can't be seen or removed until then. `slot=brunch` falls back to dinner (fine), and junk days fall back to today (fine). Evidence: `evidence/L2/bad-params.txt`. **Fix:** clamp servings to the ServingsSheet's 1–24. `AddToPlanSheet` accepts only days from today to the end of next week (`visibleWeeks`), otherwise today.

### F-12 · S3 · auto · LIKELY · Timer edge cases in step text
"Cook for 45 min to 1 hour" gives two chips (45 min and 1 hour). The rule is upper bound only, so it should be one 60-minute chip. "Microwave 1 minute 30 seconds" gives two chips (1 min and 30 s) instead of one 90-second timer. Catalogue: 1 recipe (bulgogi) has the first pattern and none have the second. Typed and imported recipes will. Also, 34 steps say "overnight" and still offer a timer for their hours ("Rest 4 hours minimum, ideally overnight"), which is acceptable. `formatCountdown(-5)` returns "-1:-5", but `secondsLeft` clamps at 0, so it can't show. Evidence: `evidence/L2/maths.txt`. **Fix:** extend `DURATION` with `(?:\s*(\d+)\s*(?:seconds?|secs?))?` after minutes, and allow a range whose ends have different units. **Test:** cook.test cases for both strings.

### F-13 · S4 · auto · CONFIRMED · "mac n cheese" finds nothing
"mac and cheese" finds 7 recipes. "mac n cheese" finds 0, because every word must match and "n" matches nothing. Other names and spellings work well (aubergine/eggplant, courgette, cilantro, shrimp, "spag bol", "bolognaise", "chiken", "phad thai"), all in 2–6 ms over 5,496 recipes (`evidence/L2/avoid-search.txt`). **Fix:** in `searchWords.ts`, drop "n", "'n'" and "&" as connector words, the way "and" is treated.

### F-14 · S4 · auto · LIKELY · Link import reads the whole page before checking its size
`fetchPage.ts:26-29` checks `content-length` and then calls `response.text()`. A chunked response (no length) is read in full before `MAX_PAGE_BYTES` applies. A huge or endless page means memory and time spent before "too big". The 15 s timeout bounds it. **Fix:** read `response.body` with a reader and stop at the cap.

### F-15 · S4 · auto · CONFIRMED · Skill weight 0.75 re-checked: it works, except "Confident" never sees a hard dish
`tools/L2/skill-weight.ts` ranks Home's top 25 (Tue 6pm and Sat 9am, no history). Unset gives 20 easy and 5 medium. "Just starting" gives 25 easy (as intended). "Comfortable" is identical to unset, because it lifts easy and medium alike. "Confident" gives 13 medium, 12 easy and **0 hard** in both moments. "Up for a challenge" never surfaces one of the 304 hard dishes. **Fix:** in `skillLift`, give confident + hard 2 steps (like starting + easy), or give comfortable + medium a lift without easy. Judgement call 6 otherwise holds up.

## Merge judgement calls in this lane, re-checked

| Item | Verdict |
|---|---|
| `forYou.ts` retired, BUG-13 via `rankForSlot` | holds. `/plan/add` offers breakfast ideas for breakfast; slot.test covers it |
| `store/suggestions.ts` + `useToday()` | holds. Both hooks re-render at midnight and on return (lib/today.ts). Minor: within a day, the ranking only re-reads the quarter-hour on a render, so a Home left open from 11:50 keeps breakfast-time order. Not raised |
| `FeedScreen` (ranking + `useToday` for Tonight) | holds. Tonight falls back cleanly when its recipe is gone (F-10) |
| `AddToPlanSheet` (eatable-only search, deferred query) | holds. Diet and avoid apply (eatable.ts → `eligibleForSurprise`); junk `day` falls back to today; see F-11 for out-of-range days |
| `PostScreen`, `SearchField`, `HouseholdScreen`, `RecipeScreen` | merged pieces present. Not driven: Post and Household would touch live (coordinator's rule); RecipeScreen and SearchField work in every probe |
| Home ranking vs Home engine | both live; `HomeForYou` reads the live feed, which was blocked here, so only its error state was seen. It applies diet and avoid (homeFeed.ts:65-74) |
| Cooking-skill weight 0.75 | see F-15 |
| Paywall plan-length port | words are right for P1Y/P1M/P3M; the trial is not eligibility-checked (F-4); legal links are F-5 |

## Carry-over (8 Oct audit and K-items in this lane)

| ID | Status |
|---|---|
| BUG-01 | still fixed: a tick holds, then unticks when the plan needs more (Egg 3 ticked → 36 unticked; `journeys1.txt` step 2) |
| BUG-02 | still fixed: a double tap on Plan confirm makes one entry (`journeys1.txt` step 1) |
| BUG-06, BUG-09 | still fixed (code, derive.ts:103-114; e2e audit-fixes) |
| BUG-07 | still fixed: Browse and Plan search use `useEatable` |
| BUG-08 | still fixed (week.ts `listWeek`) |
| BUG-11 | still fixed: one chip per segment (CookStep.tsx:36) |
| BUG-12 | still fixed, and survived the merge (`useToday` in both hooks) |
| BUG-13 | still fixed via `rankForSlot` |
| BUG-14 | still fixed (search probe) |
| BUG-15, BUG-20 | still fixed ("1,500 g" → 1½ kg; "1 x 400 g tin" → 400 g) |
| BUG-19 | still fixed for "juice of 1 lemon"; the "2 lemons, zest and 3 tbsp juice" data lines are F-1 |
| BUG-21 | still fixed for the 8 Oct cases; new edge cases in F-12 |
| BUG-22, BUG-23 | still fixed (code); F-6 is a different trap |
| BUG-24, BUG-25 | still fixed (useLinkImport.ts abort, try around `extractRecipe`) |
| BUG-26 | not re-run |
| BUG-27 | still fixed (`softPick` for every card) |
| BUG-03/04/05/10/16/17/18/28/29 | lane 3 |
| K-13 | fixed: the source credit is on the recipe page (e2e library.spec:85) |
| K-14, K-25 | still open: `/cupboard/scan` says "Coming soon" in every build (seen). Owner: switch scanning on (key + service) or hide the two buttons in store builds |
| K-26 | still open: share text uses `thepantry://`. Owner: a web domain for universal links |
| K-38 | ported (judgement call 2); see F-4 |
| K-39 | still open: needs a phone |
| K-11 | web-only; not re-checked |

## Coverage

Routes (L1 §1, 42): **driven in the browser (22):** `/`, `/plan`, `/list`, `/library` (4 tabs), `/collections/[id]`, `/stats`, `/recipe/[id]`, `/recipe/[id]/plan`, `/list`, `/collect`, `/cook`, `/plan/add`, `/cupboard/scan`, `/pro`, `/browse`, `/my-recipe/edit`, `/my-recipe/import`, `/dev/gallery`, `/dev/home-viewer`, `+not-found`, `/account`, `/plate/[id]`. **Traced in code (9):** `/surprise` (surprise.ts, surpriseDeck), `/cupboard`, `/cupboard/cookable`, `/settings` (units, reminder, reset), `/filters` (search.ts), `/menu` (DrawerScreen), `/household`, `/join/[code]`, `/post`. **Not covered (11):** `/welcome` walk-through, `/feed`, `/feed/[id]`, `/cooks/[id]` (live feed blocked), `/cupboard/add-list`, `/cupboard/shelf`, `/account/email`, and the four alias routes `/saved`, `/collections`, `/my-recipes`, `/recent` (each one line onto LibraryScreen). That's 31/42 = 74%.

Domain maths re-run on the prompt's awkward inputs (0.33 cup, "1 x 400 g tin", 1,500 g, 2 to 3, a pinch, scaling 4→1 and 4→12, merging, timers): `maths.ts`. Catalogue-wide counts: `catalogue-maths.ts`, `compound-lines.ts`.

## Not tested, and why

- Notifications, keep-awake, haptics, the photo picker, Sign in with Apple, purchases and restore: no phone (browser proxy). F-4 and F-6 are LIKELY for that reason.
- Household, join, invite, sign-in and account deletion: the coordinator ruled out live writes, and lane 3 owns the data rules. Not driven.
- Feed, cook profiles, plates sharing to the feed: Supabase blocked.
- Two phones, offline/slow network, app killed mid-write, DST: lane 3 covers sync. The plan dates use local `setDate` arithmetic, which is DST-safe by construction (week.ts:42-46). Not run under TZ changes.
- A year of data and the old-app import: not seeded.
- 200% Dynamic Type, VoiceOver, dark mode: lane 5.

## Noticed in passing (for other lanes)

- **Store builds show 271 of 5,496 recipes** (`shipsInStoreBuilds`; catalogue-maths.ts). The web build, TestFlight previews and CI all show the drafts, so nothing tested reflects what an App Store user sees. Lane 6/7, and an owner decision.
- `e2e/web/serve.mjs` has no `.webp` type, so photos are served as `application/octet-stream`. Chrome sniffs them, Safari may not. It doesn't affect the app.
- A launch requests `published_recipes` three times (`net-check.ts`). Lane 6.
- Published recipes' `diets` come from the server row as stored (published.ts:168). Whoever publishes sets them. Lane 4: are they derived server-side?
- Recipe-page ingredient ticks reset on leaving or reload. That may be intended, so it isn't raised.

## Refuted

- "Tick doesn't hold after the item moves to the cupboard": it holds and stays in its aisle (derive.ts:153-160).
- "Skill weight makes a beginner's Home all-easy only by accident": the probe shows it's the intended lift (F-15 covers the confident side).
- "Junk `day` param crashes Plan add": it falls back to today.
