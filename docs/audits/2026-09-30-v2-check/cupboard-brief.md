# Feature brief: the Cupboard ("cook from what you have")

**Date:** 30 September 2026 · **For:** Lachlan · **Phase:** P5 (Cupboard), with hooks into P4 (Plan), P6 (Surprise me, Cook Mode), P7 (onboarding) and P10 (AI scanning)

**The founder's line:** the central idea of The Pantry is "cook recipes based on the ingredients in your pantry". It has to be easy, and it has to be central. Today v2 has a thin version: a search box, a flat list and six "What can I make?" rows.

**Sources read:**
- v1 (`/home/claude/v1/the-pantry-app`): `src/screens/PantryModal.tsx` (all 1,696 lines), `src/pro/**`, `supabase/functions/ai-proxy/index.ts`, `supabase/migrations/0012_ai_usage_rate_limit.sql`, `src/store/useStore.ts`, `src/data/{ingredients,pantryMatch,planSuggestions,pro,recipeOfTheDay}.ts`, and the pantry parts of RecipeBody, CookModeModal, CartModal, SpinnerModal, BrowseModal, FirstRunChecklist and OnboardingModal. Also TODO.md, the AUDIT/UIUX/DEBUG files and `docs/*`.
- v2 (`/home/claude/the-pantry-v2`): the Cupboard screen, domain, store and ingredient database, BrowseSections, ShoppingListView, `domain/shopping/derive.ts`, `domain/suggestions/*`, `domain/legacy/oldApp.ts`, tokens, and the docs (plan, decisions, product, map, spec, both audits).
- The v1 reference screenshots `light-12`, `light-12b` and `dark-12`.

Line numbers point at those checkouts. v1 paths are relative to `v1/the-pantry-app/`.

---

## 1. How v1's pantry worked, end to end

### 1.1 State

- **One array of display strings.** `pantryItems: string[]` in the single persisted blob (`src/store/useStore.ts:183`, empty default `:224`). It held names like "Chicken" or "Rice", and after a scan also free text like "Greek yogurt" or "Onions". There were no ids, quantities, dates, sources or expiry.
- **Actions** (`useStore.ts:761-789`):
  - `addPantryItems(names)` trims, skips blanks and dedupes case-insensitively. The first spelling wins.
  - `removePantryItem(name)`, and `clearPantry()`.
- **Local only.** The cupboard never synced to Supabase, although `legal/PRIVACY.md:53-55` said it did (security audit, line 200). It was included in data export (`src/data/dataExport.ts:86`).
- **The staples switch was never saved.** `assumeStaples` was a local `useState(true)` inside the screen (`PantryModal.tsx:303`). The screen stayed mounted (`keepMounted`, `:442`), so the switch held within a session and reset to "on" at every launch.

### 1.2 The ingredient vocabulary (`src/data/ingredients.ts`)

- **About 199 ingredients** in 15 fine categories (`:17-261`), each with `{name, emoji, aliases?}`. Aliases are substrings, for example Rice → "jasmine rice", "basmati", "arborio".
- **7 coarse categories for the UI:** Proteins, Vegetables, Fruit, Sauces, Pantry, Dairy, Herbs (`:283-304`). `coarseCategoryOf(name)` looks up the exact name only and falls back to **Pantry** for anything unknown (`:320-322`).
- **Quick adds** were hard-coded (`QUICK_ADD_NAMES`, `:339-342`): Onion, Eggs, Chicken, Olive oil, Lemon, Mushroom, Bell pepper, Parmesan, Spinach.
- **Staples** (`STAPLE_KEYWORDS`, `:348-355`): 'salt', 'black pepper', 'pepper to taste', 'olive oil', 'butter', 'water'. They matched as substrings.
- **Matching tokens.** `expandItemTokens(name)` (`:370-375`) returns the name plus its aliases, lower-cased. Free-text items return only their own name.
- **`searchIngredients`** (`:387-405`) ranks exact > prefix > substring > "the query contains the token". Only the post composer used it. The Cupboard search did its own plain `includes` over names (`PantryModal.tsx:394-410`).

### 1.3 Every way to add an item

| Route | How it worked | Where |
|---|---|---|
| **Search** | A text field. Results are a substring match on names only (aliases ignored). Rows say "ADD" or "IN CUPBOARD". Tapping adds the item and clears the query. The empty result reads `No ingredients match "…"`. | `PantryModal.tsx:394-410, 577-623` |
| **Quick adds** | A horizontal row of the 9 hard-coded names, minus any already added. One tap adds. The row hides when all 9 are in. | `:348-356, 544-572` |
| **Browse by category** | "BROWSE / Stock the cupboard": 7 underline tabs (default Vegetables) and a 3-column tile grid. Tapping a tile toggles the item in or out. Selected tiles take the category tint. | `:730-774, 799-842` |
| **"Add one thing"** | The top 3 ingredients that would unlock the most near-miss recipes. The + button adds. | `:209-286, 706-723, 1044-1079` |
| **Photo scan (Pro)** | "Snap pantry — AI reads the shelf". See §1.7. | `:474-489, 317-321` |
| **Receipt scan (Pro)** | "Scan receipt — Bulk add at once". See §1.7. | same |
| **Staples** | Not added. They're assumed by the switch (`:626-638`) and never appear as chips. | |
| **Ticked shopping** | **Did not exist in v1.** Ticking or removing a shopping line never touched the cupboard, and the list never subtracted the cupboard (`CartModal.tsx` has no pantry reference beyond suggestions; PRODUCT.md:141). | |
| **Onboarding / first-run checklist** | **Nothing.** The onboarding steps are intent, diet and avoid, cuisines, time and skill (`OnboardingModal.tsx:282-285`). The checklist's 4 steps are taste, tonight's dinner, save a recipe and profile (`FirstRunChecklist.tsx:42-54`). The cupboard is never mentioned. | |

### 1.4 How items were shown

- **Page head:** "CUPBOARD / What do you have? / Tell us what you have. We'll surface recipes that use the most of it." (`:460-466`)
- **Scan row first**, above the cupboard, on purpose: "manually tapping 30 ingredients one-at-a-time is the wrong path" (`:468-489`).
- **"YOUR CUPBOARD" header**, for example "6 ingredients · 5 categories", with a red CLEAR (`:497-519`). Clear asks for confirmation ("Clear your cupboard? This removes all N ingredients…", `:418-432`). The kicker and the count truncate at 390 pt ("YOUR CUPBOA…", "5 categ…": spec §8.2 #10, `light-12`).
- **Category "jars".** Items are grouped into the 7 coarse categories in a fixed order. Each group has a head (tracked kicker, a gradient hairline, and an italic serif count), then wrapped pills (`:332-343, 902-941`).
  - Each pill is a "labelled jar": a category tint fill, an italic serif initial and a quiet × (`:955-991`).
  - Tapping anywhere on the pill removes the item, with no undo.
  - The palette is 24 hard-coded hex values (`:88-106`), light-only. It glares in dark mode (`dark-12`, spec §8.2 #7).
- **Empty state:** "Tap items below to start filling your cupboard." (`:520-523`)

### 1.5 Matching: v1 had three matchers, not one

**A. The Cupboard's own matcher** (`findMatches`, `PantryModal.tsx:124-207`):
1. For every ingredient **line** of every recipe, lower-case it. Test each user item's tokens with `line.includes(token)`. The first item that hits wins and counts toward `userItemsUsed`.
2. Otherwise, if staples are on, a staple substring counts as covered. Otherwise the line is `missing`.
3. **Hard rule:** a recipe needs at least 1 user item, otherwise any recipe with salt and oil would match (the "rice → Margherita bug", `:178-181`).
4. `pct = round(covered / totalLines × 100)`. Sort by user items used (descending), then fewest missing, then highest pct (`:201-205`).
5. Results are split into two sections:
   - **"N FROM YOUR COOKMARKS / From your saved":** saved recipes only, in matcher order, top 10 (`:372-376, 655-678`).
   - **"N PICKED FOR YOU / Suggested for you":** the rest, scored as `pct + scoreMeal(prefs)`. `scoreMeal` returns −1 for a diet or avoid failure, and those are dropped. Top 10 (`:377-390, 680-703`). **Saved matches were not diet-filtered.**
6. **Match card** (`:993-1032`): an ink card 196 wide, a 1:1 photo, a "✓ 43%" pill, cuisine eyebrow, title, and "32m · 8 to buy". "N to buy" is **missing lines**, not missing ingredients.
7. **Zero matches:** "0 RECIPES MATCH / You can make this tonight / Nothing matches yet — add a couple more staples." (`:643-653`)
8. **"Unlock more / Add one thing"** (`topUnlocks`, `:213-286`):
   - A near miss is a recipe that uses at least 1 user item and has 1–4 missing lines (`NEAR_MISS_MAX_MISSING = 4`).
   - Each catalogue ingredient not already added scores +1 per near-miss recipe it would fill at least one missing line of.
   - The top 5 are computed and 3 are shown, as "Add garlic · Unlocks N more recipes".

**B. The shared helpers** (`src/data/pantryMatch.ts`):
- `recipeCoverage(recipe, items, {assumeStaples})` counts lines (`:38-78`).
- `lineCoveredBy(line, items, {assumeStaples})` (`:90-110`).
- The logic is the same substring matching, **duplicated** from the Cupboard's matcher.

**C. Plan suggestions** (`src/data/planSuggestions.ts:30-76`):
- **"From your cupboard"** mode (kicker "SUGGESTED FOR THIS DAY") is used when the cupboard is non-empty and at least 1 recipe uses an item. It ranks by distinct items used, then lines covered, then preferred cuisine. **Staples are ignored and diet/avoid aren't checked.**
- Otherwise **"Popular this week"**, ranked by cuisine preference and season (`:79-82`).

### 1.6 Where matches surfaced across the app

| Surface | What it did | Where |
|---|---|---|
| Cupboard | Both shelves, "Add one thing" (matcher A) | `PantryModal.tsx:640-723` |
| Recipe page | A **"✓ HAVE"** pill on each line the cupboard covers, with staples suppressed ("a HAVE pill next to salt is noise") | `components/RecipeBody.tsx:132-156` |
| Cook Mode ingredients sheet | The same, via `lineCoveredBy` | `pro/cookMode/CookModeModal.tsx:296-297` |
| Bite (post) recipe page | The same, via RecipeBody | `screens/PostRecipeModal.tsx:215` |
| Plan tab | The day's suggestion shelf (matcher C) | `screens/CartModal.tsx:167-180` |
| Surprise me (Spinner) | A "Pantry: From cupboard" filter that was **fake**: it kept recipes with 6 or fewer lines (`SpinnerModal.tsx:64-67, 103-113`, TODO comments). The "Why this" panel shows "X of Y ingredients on hand" from `recipeCoverage` with staples on (`:330-339`). | |
| Browse | "ALL RECIPES / **Browse by your pantry**" was a **title only**: 4 shuffled recipes (`BrowseModal.tsx:217-218, 441-445`). The "Pantry staples" mood shelf is a regex on recipe names (`:98`). | |
| Feed / home | Nothing | |
| Recipe of the day | Nothing. "Tailored to your cupboard" was paywall copy for a feature that didn't exist (`data/recipeOfTheDay.ts:8-10`, `data/pro.ts` `recipe_of_the_day`) | |
| "AI recipe builder" | Paywall copy only: "Type the ingredients in your cupboard, or snap a photo of the fridge" (`data/pro.ts` `ai_recipe`). `requirePro('ai_recipe')` is never called. It is also advertised in `docs/APP-STORE-LISTING.md:50`. | |

### 1.7 The AI scan pipeline (Pro)

**Entry and gate.** `openScan(mode)` calls `requirePro('pantry_scan' | 'receipt_scan')`. For a free user that shows the paywall with feature copy ("Photograph your cupboard", "Add the whole shop in one photo", `data/pro.ts:73-84`). For a Pro user it sets `scanMode` (`PantryModal.tsx:317-321`).

**Orchestrator** (`pro/pantryScan/PantryScanFlow.tsx`): stages `source → scanning → review` as three sibling bottom sheets (`:57-71, 152-187`).
1. **Capture** (`:100-139`): the camera or the library via `expo-image-picker`, with a permission request each time, `quality: 0.85`, no editing, **one photo per scan**.
2. **Compression** (`pantryScan/imagePrep.ts`): `expo-image-manipulator` resizes the width to 1024, re-encodes as JPEG at 0.7, and returns base64 as a `data:image/jpeg;base64,…` URL. The code comment says 4–6 MB becomes 100–300 KB.
3. **Loading sheet** (`:161-179`): "Identifying ingredients…" or "Reading your receipt…". It can't be dismissed, and there is **no cancel**.
4. **Client call** (`pro/ai/client.ts`):
   - `callVision` requires `EXPO_PUBLIC_AI_PROXY_URL` and throws `no_credentials` otherwise (`:247-256`).
   - It attaches the Supabase session JWT only when the URL parses to `*.supabase.co|in/functions/*` (`:287-299, 349-362`).
   - It POSTs `{prompt, imageDataUrl, model: 'gpt-4o-mini', maxTokens: 800}` (`:303-312`). **The prompt text is sent from the phone.**
   - A 429 becomes `rate_limited`, "AI is busy". Any other non-200 becomes `bad_response` carrying **the raw proxy body** (`:317-326`). The reply must be `{text}`.
   - **There is no client timeout in this checkout.** AUDIT-FIXES #6 claims a "35s client ceiling", but `client.ts` has no AbortController.
5. **Server** (`supabase/functions/ai-proxy/index.ts`), in this order:
   1. Method and CORS: `*` allowed (`:78-82, 282-288`).
   2. A JWT is required. `auth.getUser()` is called with the anon client (`:85-97`).
   3. **Pro entitlement** via the RevenueCat REST `GET /v1/subscribers/{uid}` on **every call**, failing closed (503 on error, 403 "AI features require The Pantry Pro.") (`:102-111, 240-272`).
   4. Validation (`:114-140`):
      - prompt: at most 4,000 characters;
      - `imageDataUrl` must start with `data:image/` and be at most 8 MB;
      - model allowlist `gpt-4o-mini | gpt-4o`, otherwise the mini;
      - `maxTokens` clamped to 1–2,000.
   5. **Quota:** `bump_ai_usage(uid)` with the service role atomically increments `ai_usage(user_id, day, calls)`. More than `AI_DAILY_CALL_CAP` (default **50/day**) returns 429 "Daily AI limit reached" (`:147-161`; migration 0012). This runs after validation, so a malformed body doesn't spend a slot. **A slot is spent even if OpenAI then fails or times out.**
   6. OpenAI `POST /v1/chat/completions` with a single user message: `[{type:'text', text: prompt}, {type:'image_url', image_url:{url: dataUrl, detail:'low'}}]`, a 30-second abort, and 504 on timeout (`:168-206`).
   7. Errors: 429 "AI is busy"; other upstream errors return **OpenAI's own error text** to the client (`:208-213`, SEC-17). It returns `{text: choices[0].message.content}` (`:222-227`).
6. **Prompts** (built on the phone, `pro/ai/identifyIngredients.ts`):
   - **Pantry** (`:25-60`) asks for JSON only, with the schema `{items:[{name, confidence 0..1}]}`. It says: combine duplicates, skip non-food, `{items:[]}` if nothing is edible, leave out anything below 0.6 confidence, and aim for 5–20 items. It sets strict naming rules: strip the brand, the variety or origin, and quality adjectives; strip cuts unless recipes distinguish them (keep chicken breast vs thigh); display case. The examples are in US terms ("Greek yogurt", QUAL-26).
   - **Receipt** (`:70-110`) uses the schema `{storeName|null, items:[{name, note|null}]}`. `note` holds only a weight or count ("500g", "x2"), never prices. It skips bags, deposits, totals, loyalty lines and household goods. It combines duplicates, returns an empty list if the photo isn't a receipt, uses the same naming rules plus "Ground beef" (US; AU is "beef mince"), and sets `maxTokens: 1500`.
7. **Parsing** (`:126-205`):
   - `extractJson` strips code fences and takes the first `{` to the last `}`, then `JSON.parse`. A failure throws `bad_response` ("AI didn't return a list of items. Try a clearer photo.").
   - Items without a string `name` are dropped. Confidence is clamped to 0–1, and receipts get confidence 1.
   - Duplicates are removed by exact lower-case name. **"Onion" and "Onions" both survive.**
8. **Review** (`pantryScan/ScanReviewSheet.tsx`):
   - Every item is a row. It is **pre-ticked if confidence ≥ 0.6** (`:43-52`), but the prompt already told the model to leave out anything below 0.6, so the unticked path never happens.
   - Each row has an inline rename (`TextInput`, `:194`) and a remove (`:206`).
   - The header is "IDENTIFIED INGREDIENTS / We spotted these in the photo", or "FROM YOUR RECEIPT / From your Coles receipt" when a store name came back (`:81-87`). An empty result reads "We didn't find anything edible in this photo. Try a clearer shot."
   - The CTA "Add N to cupboard" is disabled at 0.
9. **Commit** (`PantryScanFlow.tsx:141-150`):
   - `store.addPantryItems(names)` adds **the model's free text as is**, with a toast "Added N items to your cupboard".
   - Receipt `note` values (weights and counts) are **thrown away**.
   - The names are never mapped to the catalogue. So "Chicken breast" or "Greek yogurt" land in the **Pantry** category (the name lookup misses), and match only on their own full string.
   - "Onions" (plural, as the prompt's own examples produce) **fails to match "1 onion, diced"**.
10. **Errors** (`:86-97`): `Alert.alert('Scan failed', err.message)` shows **raw technical text** such as "Proxy responded 403: {…}" (QUAL-27), then returns to the source picker. Picker errors also show `err.message` (`:117, :137`).
11. **Costs, as stated in v1:**
    - **No per-scan cost is written down anywhere.** The only controls are the 50/day cap, `detail:'low'` ("bills a flat ~85 tokens", `ai-proxy/index.ts:190-192`), the mini model by default, and the token caps.
    - AUDIT-FIXES:29 and :77 say to "validate scan accuracy on real photos … bump back to `high` if it regresses". That was never recorded as done.
    - TODO.md:397 records one successful end-to-end smoke test with a real receipt.
    - HANDOVER-REBUILD:198 says to "Drop AI features until they earn their server costs".
12. **Privacy:**
    - Photos go to OpenAI through the proxy, with no user identifiers attached (security audit, line 282).
    - That processing is disclosed in PRIVACY.md and the App Privacy answers (`docs/APP-PRIVACY-ANSWERS.md:39, 98`).
    - Nothing is stored on our side.
    - Receipts can carry loyalty numbers and card digits. Nothing masks them.

### 1.8 Expiry and quantities

**None.** There were no quantities, dates or expiry anywhere in the cupboard. The receipt weights and counts were parsed and then dropped at commit. v2 keeps presence-only on purpose (D-010), but its `CupboardItem` already carries `addedAt` and `source` (`src/domain/cupboard/match.ts:8`).

---

## 2. What was bad or broken in v1 (don't repeat it)

### Matching
1. **Substring matching gave false positives on a large scale.** Counted in v1's `recipes.ts`:
   - "Sage" counts the 29 *sausage* lines;
   - "Peas" counts 16 *chickpea* lines;
   - "Corn" counts 53 *cornflour* lines;
   - "Rice" counts 25 *rice vinegar/wine* lines;
   - "Milk" counts 24 *coconut milk* lines;
   - "Chicken" counts 35 *chicken stock* lines;
   - "Onion" counts 135 *spring onion* lines;
   - "Lemon" counts 12 *lemongrass* lines;
   - the staple "butter" covers *peanut butter*, *butternut* and *buttermilk*.

   v2's whole-word, longest-phrase matcher fixes this (`src/domain/ingredients/database.ts:97-107`). Keep it.
2. **It matched far too loosely.** 6 items gave "**273 PICKED FOR YOU**" out of 285 recipes (`light-12b`). The saved shelf offered Butter Chicken at 31% with "18 to buy". That list isn't "what I can make", it's the catalogue.
3. **Counts were per line, not per ingredient.** "1 tsp salt" and "salt to taste" counted twice. Garnish and "to serve" lines inflated "N to buy".
4. **The percentage was misleading.** Staples inflated it. A recipe could show 43% while needing 8 things.
5. **Three matchers gave three different answers.** Cupboard (staples on or off), the recipe page (staples off), Surprise (staples on) and Plan (no staples, no diet) all disagreed about the same recipe.
6. **Diet and avoid rules had holes.** The saved shelf and Plan suggestions ignored diet and the avoid list.
7. **Free-text items were second class.** Scanned names fell into "Pantry" and matched only their literal string. Plurals broke matching.

### Features that pretended
8. The Surprise me "From cupboard" filter meant "6 or fewer ingredients".
9. "Browse by your pantry" was 4 random recipes.
10. "Tailored to your cupboard" (recipe of the day) and the "AI recipe builder" were sold on the paywall and in the App Store listing but not built (PRODUCT.md:295).

### The cupboard itself
11. **The staples switch wasn't saved.** It reset every launch (feature inventory, line 479). Its label said "butter", which only mattered as a substring.
12. **No undo on remove.** One tap anywhere on a chip deleted it. The × was a 16×16 target (quality audit line 292).
13. **The cupboard went stale.** Nothing removed items: not cooking, not time. The shopping list didn't subtract the cupboard, and ticks didn't add to it. The loop was never closed.
14. **Quick adds were hard-coded.** 9 names that never changed with the user or the catalogue.
15. **The results sat below the fold.** On a phone you scroll past scan tiles, the jars, quick adds, search and the staples switch before seeing a single recipe (`light-12` shows no recipes at all).
16. **Visual bugs:** light-only pastel tints in dark mode, 24 hex literals, soft-on-tint contrast of 2.3:1, and header truncation at 390 pt (spec §1.4, §8.2 #7 and #10; quality audit lines 171 and 272).
17. **A 1,696-line screen** with the matcher inside the UI file (architecture audit line 116), and `SectionHeader` redefined locally.

### Scanning (SEC-17, QUAL-26, QUAL-27, plus code reading)
18. **The phone sends the prompt.** The prompt is free-form from the client, so a Pro user gets a general-purpose GPT on our key, up to the cap.
19. **RevenueCat is called on every request, before the rate limit.** Scripted free accounts can push us into RevenueCat's rate limits and deny real users.
20. **Internals leak.** OpenAI and proxy error bodies reach the user's alert. CORS allows `*`.
21. **The quota is spent on failures** (timeouts, upstream 5xx). Denied attempts aren't counted. The user can't see how many scans are left.
22. **No client timeout.** The loading sheet can't be cancelled.
23. **The model's free text goes straight into the cupboard.** Nothing maps it to the catalogue. Receipt quantities are dropped. Duplicates are exact-string only.
24. **Accuracy was never checked.** `detail:'low'` means OpenAI works from a small, low-detail copy of the photo, which is risky for small receipt text. The 1024 px resize is partly wasted.
25. **US terms** in the prompts ("yogurt", "ground beef").
26. **One photo per scan.** A fridge plus a pantry needs two paid scans.
27. **The 0.6 confidence pre-tick is dead code** (the prompt already drops items below 0.6).
28. **Receipts aren't masked.** Card and loyalty numbers go to OpenAI unmasked, and that isn't stated.

### Carried into v2 unless fixed
29. **The import mapping.** v2 imports v1 names through `index.match` (`src/domain/legacy/oldApp.ts:170-172`). A check of all 199 v1 names against v2's database found:
   - **14 are dropped silently:** Pork, Lamb, Turkey, Sardines, Tempeh, Fennel, Banana, Berries, Grapes, Noodles, Curry paste, Jam, Chia seeds, Flax seeds.
   - **Generic names map to one narrow variant:**
     - "Chicken" → `chicken-pieces` (5 catalogue lines, against 39 for `chicken-thigh`);
     - "Rice" → `white-rice`;
     - "Onion" → `brown-onion`;
     - "Beef" → `beef-steak` (1 line);
     - "Stock cube" → `chicken-stock`.

   An imported v1 cupboard will match almost nothing.

---

## 3. Gap table: v1 against v2 today

| Capability | v1 | v2 today | Gap |
|---|---|---|---|
| Storage | Free-text names in one blob | Ingredient ids + `addedAt` + `source`, own persisted store (`src/store/cupboard.ts`) | v2 is better. Keep it. |
| Vocabulary | ~199 names, substring aliases | 552 ids, whole-word aliases, aisles, groups (`src/data/ingredients/ingredients.json`) | v2 is better, but has **no families**: `brown-onion`, `white-onion` and `red-onion`, or `jasmine-rice`, `basmati-rice` and `white-rice`, are unrelated. Having one never covers the other. |
| Categories for display | 7 coarse, category jars | Flat A–Z list of rows (`CupboardScreen.tsx:104-134`) | Needs a coarse category derived from aisle, and the jar chips. Tokens already exist (`src/ui/tokens/cuisine.ts:82-93`, still light-only). |
| Search | Name substring | Word-prefix over name and aliases, `+ Name` chips, clears after one add (`:45-51, 79-103`) | Fine. Add ranking, a "keep adding" mode and "in cupboard" states. |
| Quick adds | 9 hard-coded | None | Missing |
| Category browse grid | Yes | None | Missing |
| "Add a list" (type or paste several) | No | No | New: cheap and on-device (see §4) |
| Photo scan | Pro, gpt-4o-mini | None (P10) | Server work |
| Receipt scan | Pro | None (P10) | Server work |
| Ticked shopping → cupboard | No | **Yes**, on by default, with a switch (`ShoppingListView.tsx:31-34`) | v2 only. Keep. |
| Shopping list respects the cupboard | No | **Yes**: an "In your cupboard" section, never dropped (D-010, `domain/shopping/derive.ts:44, 142`) | v2 only. Keep. |
| Remove with undo | No undo | Undo toast "X used up" (`:119-127`) | Keep. |
| Clear all | Yes, with confirm | None | Missing |
| Count line | "6 ingredients · 5 categories" | "In the cupboard · N" | Minor |
| Staples | Toggle (not saved): salt, pepper, olive oil, butter, water | Fixed: `salt`, `black-pepper`, `olive-oil`, `neutral-oil`, `water`. No butter, no switch. The empty-state copy says so. | Decide the model (§4.5) |
| Matching unit | Lines, substring | Distinct ingredient ids. Staples, optional lines and **unquantified lines** are left out (`match.ts:195-205`; 707 unquantified non-staple lines are "to serve" and garnish) | v2 is better. Needs families and a main/shelf split (§4.3). |
| Ranking | Items used → missing → pct; taste merged for suggestions | Ratio → missing → time (`match.ts:213-230`) | No tiers, no taste, no saved-first |
| **Diet, avoid and hidden in matches** | Partly (suggested only) | **Hidden only.** `CupboardScreen.tsx:55` and `BrowseSections.tsx:49-53` don't apply diet or the avoid list | **A v2 bug:** a vegetarian with eggs in the cupboard can be shown chicken dishes |
| "From your saved" shelf | Yes | No | Missing |
| "Suggested for you" shelf | Yes (10, taste-ranked) | "What can I make?" (6 rows) | Partial |
| Match card (%, "N to buy") | Ink card, % pill | Row card, "You have 3 of 5" | P5 styling. Decide % against counts. |
| Zero-match state | "Add a couple more staples" | None (the section just disappears) | Missing |
| "Add one thing" (unlocks) | Yes | No | Missing. Keep it (the inventory says so). |
| Recipe page HAVE pills | Substring | Id match (`RecipeBody.tsx:50`) | Done. Add a "swap" state and a summary with actions. |
| Cook Mode HAVE pills | Yes | No (P6) | P6 |
| Plan "From your cupboard" suggestions | Yes (weak) | No (P4) | P4. Must use the same function. |
| Browse "cook with what you have" | Fake | Real: `whatCanIMake`, 4 picks (`BrowseSections.tsx:53, 121-137`) | Needs tiers and diet rules |
| Feed / Tonight uses the cupboard | No | No (`domain/suggestions/forYou.ts` has no cupboard input) | New |
| Surprise me "from my cupboard" | Fake | None | P6: build it for real |
| "Add missing to shopping list" | No | No | New |
| After cooking: "used anything up?" | No | No | New |
| Freshness | No | `addedAt` stored, unused | Decide (§4.9) |
| Onboarding / checklist cupboard step | No | No | P7 decision |
| v1 import | n/a | 14 names dropped, generics narrowed (§2 #29) | Fix with families |
| Scan pipeline hardening (SEC-17) | Partly done | Plan gap (audit-status line 94) | Add to P10 |

---

## 4. Proposed v2 design: "cook from what you have", central and easy

### 4.1 Principles

1. **The answer comes first, the inventory second.** The Cupboard exists to answer "what can I cook tonight?". So once there's anything in the cupboard, the tab shows results at the top.
2. **Honest tiers, not a percentage of everything.** The data shows why. v2's catalogue needs a median of **14 distinct non-staple ingredients per recipe**. I simulated v2's current rules with a well-stocked 27–30 item fridge and pantry:

   | Assumption | Ready now | Missing 1–2 | Missing 3–4 | Missing 5+ |
   |---|---|---|---|---|
   | Nothing beyond the 5 staples | 1 | 10 | 33 | 234 |
   | Also assume the spice rack | 1 | 23 | 66 | 188 |
   | Also assume spices, sauces/oils and baking | 6 | 39 | 93 | 138 |

   A pure "have everything" filter will almost always be empty. A percentage over everything is what produced v1's "273 picked for you". What people mean by "I can make this" is: **I have the main things, and the shelf bits I probably have.** The design has to model that.
3. **One function, everywhere.** Cupboard, Browse, Feed, the recipe page, Plan, Surprise and Cook Mode all call one pure `cookable()` in `src/domain/cupboard/`, so the numbers never disagree.
4. **Hard rules always apply:** diet, avoid list and "Not for us".
5. **No fake, no dead.** No section appears unless it's computed from the real cupboard. Every empty state says what to do next.

### 4.2 Data model (pure domain, D-010 intact: ids only, no quantities)

Changes to the ingredient database, made as reviewed data edits (in the spirit of D-014), with a test:

- **`family?: string`**, for example `onion`, `rice-white` or `chicken`. Same-family ingredients count as **"have, with a swap"**, not as missing. Only interchangeable families get one (brown/white onion yes, spring onion no; jasmine/basmati/white rice yes, arborio no). This needs a cook's judgement: **founder decision**.
- **`shelf?: true`** marks long-life "pantry shelf" items: dried spices, oils, vinegars, sauces, condiments, baking basics, stock powder. Most can be derived from aisle (`herbs-spices`, `sauces-oils`, `baking`, many `asian-international` items) and then overridden by hand.
- **`perishable?: true`**, derived from aisle (fruit-veg, meat, seafood, dairy-eggs, bakery, deli), for "use it up" ranking and optional freshness nudges.
- **Coarse display category**: a pure mapping from aisle (plus overrides) to v1's 7 jars. Unknown maps to Other, never silently to "Pantry".
- **"Any" entries for the picker**, for example "Onion (any)". They add the family's default id, so quick adds and scans can use plain words.

Cupboard store (`src/store/cupboard.ts`), migrated through `version`:
- `items: CupboardItem[]`, unchanged. Extend `source` to `'manual' | 'shop' | 'scan' | 'receipt' | 'import'`.
- **`shelf: { mode: 'assume' | 'mine', ids: string[] }`**: the "always in my kitchen" list (§4.5). It replaces the unsaved v1 switch and is **persisted**.
- All transitions as pure reducers in `src/domain/cupboard/` with node:test, per the audit's QUAL-31.

### 4.3 The matcher: `cookable(recipe, cupboard, shelf, index)`

For each non-optional, linked, **quantified** ingredient (unquantified lines are "to serve" or garnish), classify it as one of:

| Class | Rule |
|---|---|
| `have` | The id is in the cupboard |
| `swap` | Another id from the same family is in the cupboard (shown "Have · swap brown onion") |
| `staple` | Salt, pepper, oil, water |
| `shelf` | The item is `shelf`, and the user's shelf contains it (mode "mine"), or mode is "assume" and it's a default shelf item. Shown as "check you have" on the recipe page, never counted as "to buy" |
| `missing` | Everything else. These are the things to buy. |

Also return `usesFromCupboard` (have + swap ids), `missingIds` and `perishablesUsed`.

**Tiers** (each is a pure function of the above):
- **Ready tonight:** `missing = 0`.
- **Missing 1–2:** `missing ≤ 2`, and it uses at least 1 cupboard item.
- **Everything else is hidden** from the Cupboard. Browse's grid can still show "You have 5 of 12".

**Ranking within a tier:**
1. Uses the most of your cupboard, weighting perishables so fresh food gets used up.
2. Fewer swaps.
3. Saved first.
4. Taste score: the same preference signal as `forYou` (cuisines, weeknight time).
5. Quicker first.
6. A stable daily jitter, so the list doesn't reshuffle on every visit.

**Filters first:** diet, avoid list and hidden, reusing `eligibleForSurprise`'s rules (`domain/suggestions/surprise.ts`).

**"Add one thing"** (v1's best idea, kept): among recipes that are **missing exactly 1–2**, count which single missing id appears most. Show the top 3 as "Add garlic · makes 6 more recipes ready". The + adds it to the **shopping list** by default, with an "I've got it" option that adds it to the cupboard. That's a founder decision, see §6.

**Display copy, instead of v1's %:** "Ready" / "Need 1: lemon" / "Need 2: lemon, feta". Naming the missing items is more useful than "8 to buy" or "43%". The v1 ink match card keeps its pill, but the pill reads "Ready" or "Need 1".

### 4.4 Where it lives in the shell

**Cupboard tab** (v1 components and styling, re-ordered so the answer comes first):
1. The title block, as v1 ("CUPBOARD / What do you have?").
2. **An add bar**, always visible: a typeahead field, plus a camera button (P10; hidden until scanning exists, per D-027) and an "Add a list" button.
3. **When the cupboard isn't empty: "Tonight from your cupboard".** The v1 ink match-card rail:
   - **Ready** first, then **Need 1–2**.
   - "From your saved" comes first inside each tier; v1 had two shelves, and this is one rail with saved pinned.
   - "See all" opens a pushed list route (`/cupboard/cookable`) with tier headers. It's virtualised (PERF-17).
   - Card tap opens the recipe. Long-press, or the ⋯ action sheet, offers: Plan it · Add missing to list · Cook now.
4. **"Add one thing"**, 3 rows (v1 style).
5. **"Your cupboard"**, as v1's category jars with counts and Clear (with confirm and undo):
   - Tapping a jar removes it, with an undo toast ("Garlic used up · Undo").
   - Fix the header truncation.
   - Dark-mode tints are decided by the founder (§6).
   - Jars for items with a `swap` family show no extra detail.
6. **Quick adds**, derived rather than hard-coded: the most-used ingredients in the visible catalogue that you don't have, weighted by your saved recipes. Ten chips; tapping adds.
7. **"Always in my kitchen"**: a row summarising the shelf ("Assuming a stocked spice rack, oils and sauces · Edit"). It opens a sheet to tick your shelf.
8. **"Stock the cupboard"**: v1's category tabs and 3-column tiles (toggle in and out).

When the cupboard is empty, 3–8 still show. Item 3 is replaced by an empty state: "Add a few things you have and we'll show what you can cook tonight". Its action focuses the add bar. There's no fake or sample content.

**Beyond the tab:**

| Surface | What it shows | Phase |
|---|---|---|
| **Feed · Tonight** (nothing planned) | "Cook with what you have": the top Ready or Need-1 recipe, beside the `forYou` pick, with "Have this tonight". Give `forYou` an optional `cookable` boost input rather than a second ranking. | P5 (domain), wire in Feed |
| **Browse** | The existing "Cook with what you have" section switches to tiers and diet rules. The note reads "Ready" / "Need 1: lemon". Tapping the header opens `/cupboard/cookable`. | P5 |
| **Recipe page** | HAVE pills (done), plus a **swap** pill ("Have · brown onion") and a **"check"** style for shelf lines. One summary line above the ingredients: "You have 9 of 12 · Need 3", with two actions: **Add 3 to shopping list** and **Plan it**. | P5 |
| **Plan · suggestions** | "From your cupboard" uses `cookable` tiers, not a separate ranking. The fallback stays "Popular this week" (v1 copy). | P4, sharing the P5 domain function |
| **Shopping list** | Already subtracts the cupboard and moves ticks in. No change, but it uses families so a planned "white onion" is covered by "brown onion". Show it as "In your cupboard (brown onion)" so it's never silent. | P5 |
| **Surprise me** | A real "From my cupboard" option meaning Ready plus Need ≤ 1. The "Why this" panel gets a true line: "Uses 4 things in your cupboard". | P6 |
| **Cook Mode** | HAVE pills in the ingredients sheet. On finish: **"Used anything up?"**, a checklist of the perishables this recipe used from the cupboard, unticked by default, where one tap removes the ticked ones. This is how the cupboard stays true without quantities. | P6 |
| **Onboarding / checklist** | Optional: a "What's always in your kitchen?" shelf step, and a checklist item "Tell us what's in your cupboard" that ticks when the cupboard has 5 or more items. | P7, founder decision |

### 4.5 Staples and the "shelf"

- **The staples** (salt, pepper, oils, water) stay assumed and never show on the list, as D-010 says. Recommendation: add **butter** to match v1's copy and how people cook. It's used in 89 catalogue lines.
- **The shelf** is new, and it's what makes results feel real.
  - Mode **"Assume a stocked kitchen"** (default): every `shelf` ingredient is treated as "check you have". This is v1's switch, persisted, but much broader.
  - Mode **"Only what I tick"**: a sheet listing the common shelf items by category (spices, sauces, oils and vinegars, baking), each ticked in or out.
- **The shopping list** still lists shelf items the recipe needs. They go in the muted "In your cupboard" section when assumed, so you can add one back if it's run out. This extends D-010's rule from 5 staples to the shelf: **founder decision**.

### 4.6 Add flows, fastest first

| Flow | Design | Needs server? |
|---|---|---|
| **Typeahead** | The existing word-prefix search, better ranked (exact > name prefix > alias prefix > contains, then catalogue frequency). Show "Onion (any)" family rows first. **Keep the keyboard up and the query cleared after each add** so you can type-add-type. Rows that are already in show "In cupboard". No results: "No ingredient by that name. Try a simpler word, like 'rice'." (existing copy) | No |
| **Add a list** | A sheet with a multi-line field: "Type or paste what you've got: *eggs, 2 onions, half a cabbage, feta*". Split on commas and new lines, run each part through the existing `parse` + `index.match`, and show the same **review sheet** the scans use. Matched items are ticked; unmatched rows get "Pick the closest…" (typeahead) or are skipped. Free, instant, on the phone, and it reuses the scan review UI so P10 only adds a new source. | No |
| **Quick adds** | Derived chips (§4.4, item 6) | No |
| **Category browse** | v1's tabs and tiles | No |
| **Ticked shopping** | Exists | No |
| **"I've got it"** on a recipe's missing line | Adds that id to the cupboard | No |
| **Photo scan** | See §4.7. Up to 3 photos per scan (fridge, pantry, freezer). The review sheet groups by category. | Yes (P8/P10) |
| **Receipt scan** | See §4.7 | Yes (P8/P10) |

### 4.7 The scan pipeline, rebuilt (P10)

**Phone (`src/features/cupboard/scan/`):**
1. **Capture:** `expo-image-picker` (already on the P8–P10 native list), camera or library, up to 3 photos. A preview strip where you can remove a photo, and a clear "Nothing leaves your phone until you tap Scan".
2. **Prepare:** `expo-image-manipulator` resizes the long edge to 1024 at JPEG 0.7. Receipts: crop hints, or let the user crop.
3. **Call** `POST /functions/v1/cupboard-scan` with `{task: 'pantry' | 'receipt', images: [base64…]}`. **No prompt from the phone.** A 40-second timeout and a Cancel button.
4. **Show errors in plain English, from a fixed map, never raw text:**
   - "Couldn't reach the scanner. Check your connection."
   - "You've used today's scans. More tomorrow."
   - "That didn't look like food. Try a clearer photo."
   - "Scanning needs Pro" (opens the paywall).
5. **Review sheet** (shared with "Add a list"):
   - Items arrive **as ingredient ids**, grouped into the 7 jars.
   - High confidence items are pre-ticked. Low confidence items are unticked, with a "Not sure" tag.
   - Items already in the cupboard show "Already in".
   - Unknown items ("Hot chips") show "Pick the closest…" or "Skip".
   - The CTA reads "Add 12 to cupboard". An undo toast follows, with `source: 'scan' | 'receipt'`.
6. The parse and validation of the server reply are pure domain code (`src/domain/cupboard/scanResult.ts`) with fixtures.

**Server (Supabase Edge Function, P8/P10):**
1. **Authentication:** a verified JWT.
2. **Entitlement:** a **cached** entitlement table updated by a RevenueCat webhook, with a 5-minute cache fallback (SEC-17).
3. **Quota:**
   - Count **attempts** before any external call, **denied ones included**.
   - **Refund the slot if the upstream call fails.**
   - Return `remaining` in every reply, so the phone can show "8 scans left today".
4. **The prompt is built server-side** from the `task` enum. It carries AU English naming ("yoghurt", "beef mince", "capsicum") and **the ingredient vocabulary**: the 552 ids and names, about 4k tokens.
5. **Structured output:** the model must return `{items: [{id | null, name, confidence}]}` with a JSON schema, and `id` must come from the vocabulary. Free text is kept only as the `name` of unknown items. This removes v1's mapping problem entirely.
6. **Receipts:** food only, `note` for weight or count (kept for display in the review sheet, not stored: D-010), and the store name. The prompt tells the model to ignore card and loyalty numbers. Better, the phone masks the bottom of the receipt; that's for the founder to decide.
7. **Image detail:** low for shelves, high for receipts, tuned on a benchmark set.
8. **Photos are never stored or logged.** Log only the task, latency, item count and outcome.
9. **Generic errors** to the client, CORS limited to the app (no `*`), and a request size cap.
10. **A benchmark before launch:** 20 real fridge and pantry photos plus 10 Australian receipts (Coles, Woolworths, Aldi). Measure precision and recall of ids against a hand label, for each model candidate and detail setting.

**Cost:** v1 never wrote down a per-scan cost. The estimates below use public list prices as I understand them. **Check them against current price lists before deciding.**
- **gpt-4o-mini**, low detail, with a ~4k-token vocabulary: roughly **US$0.001–0.002 per scan**. The mini model bills images at an inflated token count, which is still cheap at its rate.
- **gpt-4o**, low detail, with the vocabulary: roughly **US$0.01–0.02 per scan**.
- **High detail on receipts** adds a few thousand image tokens: still under 1 cent on mini.
- **v1's worst case:** the cap of 50/day on mini is about US$0.05–0.10 per user per day. A cap of 10–20/day is plenty for real use.

### 4.8 What can be built now, and what needs the server

| Now, on the phone (P5, no new native modules) | Needs the server or AI (P8/P10) |
|---|---|
| Families, shelf, perishable and category fields in the ingredient data, with tests | The `cupboard-scan` Edge Function, quota table, entitlement cache and RevenueCat webhook |
| `cookable()`, tiers, "Add one thing", reducers (node:test) | Model or provider choice and the benchmark |
| The Cupboard tab rebuilt in v1's look: add bar, results rail, jars, quick adds, shelf sheet, browse grid, Clear, undo | Photo and receipt capture UI (needs `expo-image-picker` and `expo-image-manipulator`: native, so it needs the founder's OK per CLAUDE.md) |
| "Add a list" plus the shared review sheet | Pro gating of scans (RevenueCat, P10) |
| Diet, avoid and hidden applied to every cupboard surface (fixes the current v2 bug) | Privacy policy and App Privacy updates for photo processing |
| Recipe page summary with "Add missing to list" and "Plan it" | Cross-device cupboard sync (only if accounts should carry it: a decision, not required) |
| Browse, Feed and Plan (P4) using `cookable` | |
| Fix the v1 import with families and "any" entries (and re-run on K-12's phone) | |
| "Used anything up?" after Cook Mode (P6) | |

### 4.9 Freshness (optional, presence-only)

`addedAt` already exists. The proposal: perishables older than a set number of days show a small "Still got these?" row at the top of the jars (Keep all · Remove ticked). There are no dates on chips and no expiry tracking, and D-010 is unchanged. This is a founder decision. Without it, the "Used anything up?" prompt after cooking is the main thing keeping the cupboard true.

### 4.10 States and tests (per CLAUDE.md)

- **States to design and test** for every surface:
  - empty cupboard;
  - cupboard with no Ready recipes (only Need 1–2);
  - no matches at all ("Add one thing" leads);
  - diet filters remove everything;
  - long ingredient names in jars;
  - 150 or more items (virtualised);
  - scan loading, cancelled, error, empty result, all unknown, over quota, not Pro.
- **Domain tests:**
  - families;
  - shelf modes;
  - tier edges (0, 1, 2, 3 missing);
  - unquantified and optional lines;
  - diet and avoid exclusion;
  - "Add one thing" ranking;
  - the parse of a pasted list;
  - validation of the scan reply;
  - store migration v1 → v2;
  - legacy import of all 199 v1 names.
- **Maestro flows:**
  - add by typeahead → Ready appears → open the recipe → "Add 2 to list" → the list shows them;
  - add a list → review → commit → undo;
  - remove with undo;
  - clear with confirm;
  - edit the shelf;
  - Browse → "Cook with what you have".
- **Screenshots** in light and dark for each state, side by side with `light-12`, `light-12b` and `dark-12`.

### 4.11 Build order inside P5 (small verified steps)

1. Data: families, shelf, perishable and coarse category, with the review file and a test.
2. Domain: `cookable`, tiers, unlocks and shelf reducers, with tests.
3. The diet and avoid fix on the current Cupboard and Browse (ship first; it's a correctness bug).
4. The Cupboard tab layout: add bar, results rail, jars, quick adds, browse grid, Clear.
5. The shelf sheet and staples migration.
6. "Add a list" and the shared review sheet.
7. The recipe page summary and actions, and the Browse and Feed wiring.
8. The import fix.

P4 and P6 then consume `cookable`. P10 adds scan sources to the existing review sheet.

---

## 5. Risks and trade-offs

- **Families** need careful, human-reviewed data. Wrong swaps (red for brown onion in a salad) would be worse than none. Start conservative: onions (brown and white), white rice varieties, stocks (not across meat types), tinned tomatoes (crushed and diced).
- **The "assume a stocked kitchen" default** will sometimes promise a spice you don't have. The recipe page's "check you have" lines and the muted section on the list make that visible rather than silent.
- **Putting results above the jars** is a deliberate departure from v1's order, under D-025's "visually indistinguishable". Every component stays v1's; only the order changes.

## 6. Decisions for Lachlan

1. **Is AI scanning in scope for launch at all?**
   - The conflict: P10 includes it; PRODUCT.md:217 says "Later (v1.3)"; the v1 handover says "Drop AI features until they earn their server costs".
   - **Recommendation:** build "Add a list" now (free, no server). Ship scanning in P10 only after the benchmark.
2. **Is scanning Pro-only?**
   - Options: (a) Pro-only, as v1; (b) free with 3 scans a month, unlimited on Pro within the cap; (c) free for everyone.
   - D-003 makes the cupboard free.
   - **Recommendation: (b).** It shows free users the magic, and the cost is small.
3. **Which model and provider?**
   - Options: OpenAI gpt-4o-mini (v1's, cheapest), gpt-4o (more accurate), or another vision model such as Anthropic's Claude Haiku or Google's Gemini Flash.
   - **Recommendation:** decide by the 30-photo benchmark. Default to the cheapest model that reaches about 90% precision on ids.
4. **The daily scan cap** (v1: 50). **Recommendation:** 15 a day for Pro, with the remaining count shown in the app.
5. **Photo privacy:**
   - Photos are never stored on our side.
   - Ask the provider for zero data retention if available.
   - Should receipts be masked or cropped on the phone before sending (card and loyalty numbers)?
   - Update the privacy policy.
   - **Recommendation:** never store photos, and add an on-phone crop step for receipts.
6. **Should results sit above the cupboard list?** This departs from v1's order, not its look. **Recommendation: yes.**
7. **Staples and the shelf:**
   - Options: (a) keep v2's fixed 5; (b) v1's toggle, persisted; (c) the proposed "always in my kitchen" shelf with "assume a stocked kitchen" as the default.
   - This extends D-010. Also: add butter to the staples?
   - **Recommendation: (c), plus butter.**
8. **Ingredient families and swaps:** approve the conservative starting list (§5) and the "Have · swap" display.
9. **What the "Add one thing" + does:** add to the shopping list (recommended) or to the cupboard.
10. **"Add missing to shopping list":**
    - Options: (a) via "Plan it" only (one source of truth: the list derives only the missing items); (b) also as ingredient-linked extras, which is a change to the list model.
    - **Recommendation:** both. Extras gain an optional `ingredientId`, so they tick into the cupboard too.
11. **Freshness:** none, the "Still got these?" nudge for perishables (recommended), or real expiry dates (no: it breaks D-010 and adds a lot of friction).
12. **Onboarding and checklist** (P7): add a "What's always in your kitchen?" step and a "Stock your cupboard" checklist item? **Recommendation:** add the checklist item; keep onboarding as v1.
13. **Dark-mode jar tints:**
    - The current v2 tokens keep v1's pastels in dark mode (`src/ui/tokens/cuisine.ts:76-81`). Spec §8.2 #7 calls that a v1 bug, and D-025 says v1's bugs aren't copied.
    - **Recommendation:** dark variants in the tokens.
14. **Match card label:** v1's "43%" pill, or "Ready" / "Need 1". **Recommendation:** "Ready" / "Need 1", which is more honest and more useful.
15. **The v1 import:** accept the family-based mapping, so generic v1 names ("Chicken", "Pork", "Noodles") become family entries instead of being dropped or narrowed. This needs a re-run on your phone (K-12).
