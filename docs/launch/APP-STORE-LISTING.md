# The Pantry: App Store listing

**Drafted 7 October 2026** by Claude for P11, from the code (D-038 to D-043, D-051). **Re-checked against the code on 20 November 2026** (branch `audit/deep-1120`, deep audit REL2-9, REPO-9): every claim below describes a store build (`INTERNAL_BUILD` false, `src/lib/build.ts`). Character counts were measured with Python `len()` (7 Oct) and `wc -m` (20 Nov), which count the way App Store Connect does for these fields.

This is the only listing file. It replaces `app-store-listing.md` (5 October), which git tracked alongside it under a name that differed only in case; that copy was removed on 20 November and its useful parts (fallback-name advice, the screenshot size warning, the version note) are folded in here. App Privacy answers, the shared-content age-rating answer and the App Review notes are in `app-store-privacy-and-review.md`.

> **OWNER TO DO BEFORE SUBMITTING**
> 1. **Household** needs the live migrations applied (`supabase/APPLY-LIVE.md`), Supabase's anonymous sign-ins on, then the two-phone test on a new build (`docs/HOUSEHOLD.md` › Needs Lachlan, `docs/launch/RELEASE-NOTES.md`). Until then, use the description **without** the SHARE THE KITCHEN block, and skip screenshot 8.
> 2. **Sign in with Apple** needs the Apple provider set up in Supabase and the `apple-token` and `delete-account` functions deployed (`docs/ACCOUNTS.md`, audit S2-4). Until then, delete the last sentence of YOUR KITCHEN STAYS YOURS.
> 3. **Pro** goes on sale in the first build whose `src/lib/legal.ts` has both the privacy and terms links (`canSellPro`, line 24) and whose products Apple returns. Add THE PANTRY PRO block to that build's description, list the in-app purchases, and check in App Store Connect whether either product has an introductory offer. Don't mention a free trial unless one exists.
> 4. **Host the support and privacy pages** (URLs section) and get a support email.
> 5. **Reserve the app name** in App Store Connect early.

## Name and subtitle

| Field | Limit | Text | Count |
| --- | --- | --- | --- |
| **App name** | 30 | `The Pantry: Cook What You Have` | **30** |
| App name (fallback) | 30 | `The Pantry` | 10 |
| **Subtitle** | 30 | `Plan, shop and cook the week` | **28** |
| Subtitle (alternative) | 30 | `Tonight's dinner, sorted.` | 25 |

- "The Pantry" on its own is almost certainly taken. Reserve the full name in App Store Connect early. It's exactly 30 characters, so don't add anything to it.
- The name says the core idea (cook from what you have). The subtitle says the North Star (plan, shop, cook). Between them they carry the words people search for, so the keywords below don't repeat any of them.
- If you use the alternative subtitle, "plan" and "shop" are no longer indexed from it. `meal planner` and `shopping list` in the keywords still cover them.
- The name under the icon on the phone stays "The Pantry" (`app.json`).

## Promotional text

Limit 170. It can be changed at any time without a new version.

```
See what you can cook tonight from what's already in your cupboard. Then plan the week, get one tidy shopping list, and cook it step by step.
```

**Count: 141 / 170**

## Description

Limit 4,000. Plain Australian English, scannable, every line checked against the code.

### With Household (use once Household is live)

```
Tonight's dinner, sorted.

The Pantry starts with what you already have. Tell it what's in your cupboard and fridge, and it shows the dishes you can cook right now, with nothing to buy. Every card says why it's there.

WHAT I HAVE
• Dishes you can cook tonight from what's on hand, at the top of Home
• Dishes one or two things short, with exactly what they need
• Fill your cupboard in seconds: search, quick adds, or type or paste a list

PLAN THE WEEK
• Pick breakfast, lunch and dinner for each day, with servings for each meal
• Ideas for each day, drawn from your cupboard and your tastes
• An optional Sunday reminder to plan the week

ONE TIDY SHOPPING LIST
• Written for you from your plan, merged and sorted by aisle
• Leaves off what's already in your cupboard
• Add a recipe's ingredients without planning it, or add anything else by hand
• Tick things off as you shop, and they move into your cupboard
• Send it to your partner in Messages or WhatsApp

SHARE THE KITCHEN
• Invite your partner or housemates with a link or code. No account or password needed
• Everyone sees the same plan, list and cupboard, updated live
• Tick milk off at the shops and it's in everyone's cupboard

COOK STEP BY STEP
• Cook Mode shows one large step at a time and keeps the screen on
• Tap any time in a step to start a timer. It keeps counting with your phone locked
• Check the ingredients mid-cook without losing your place
• Mark it cooked, and your suggestions stay fresh

AND THE REST
• 270+ recipes from around the world, with filters for meal, time, cuisine and difficulty
• Surprise me, for when nobody can decide
• Save recipes and sort them into collections
• Write your own recipes, or import one from a web link
• Keep a photo record of the dishes you've cooked
• Kitchen stats: what you cook most, and your cooking streak
• Metric or imperial, with Australian cups and spoons
• Light and dark mode, a high-contrast option, and support for VoiceOver and larger text

YOUR KITCHEN STAYS YOURS
No ads and no tracking. Everything works without an account. Sign in with Apple only if you want your kitchen backed up and on a second phone.

A note on allergies: "Ingredients to avoid" steers suggestions, but it isn't an allergy filter. Always check ingredients and labels yourself.
```

**Count: 2287 / 4,000** (about 2,743 with THE PANTRY PRO block)

### Without Household (use until then)

The same text without the SHARE THE KITCHEN block.

**Count: 2057 / 4,000** (about 2,513 with THE PANTRY PRO block)

### THE PANTRY PRO: add before YOUR KITCHEN STAYS YOURS once Pro is on sale

```
THE PANTRY PRO
Everything above is free, including planning the week you're shopping for. Pro adds planning next week too, and no limits on collections, your own recipes and link imports. Monthly or yearly. Payment is charged to your Apple Account and renews automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel in your App Store account settings.

Terms of Use: [terms URL]
Privacy Policy: [privacy policy URL]
```

**Count: 454** (block alone, measured 20 Nov). This matches `docs/PRO.md` and `src/domain/pro/pro.ts` (free: 3 collections, 10 own recipes, 5 imports a month; Pro plans next week too). Free covers the North Star, and Pro is "more", never "unlocked". Don't put a price in the text: the App Store shows each country's price itself.

The 7 October draft said "with a 7-day free trial on yearly". That's removed: RevenueCat shows no trial on either product, and the app now offers a trial only when the App Store product has an introductory offer and Apple says the buyer is eligible (`src/domain/pro/purchase.ts:76-89`). If you add an introductory offer in App Store Connect, you may add "Yearly can start with a free trial for people who haven't had one." and nothing more specific.

**Checked against the code (20 November 2026):**

| Claim | Where it's true |
| --- | --- |
| 270+ recipes | A store build ships only `reviewed` and `vetted` recipes (`src/domain/recipes/provenance.ts:7`): 271 `reviewed` today. The 4,664 `ai-draft` and 561 `ai-assisted` recipes show only in development and preview builds (audit REL2-13). If the recipe fixes change the count, recount before pasting (`grep -c '"provenance": "reviewed"'` over `src/data/catalogue/recipes.json`) |
| Dishes one or two things short, with what they need | Home's "Nearly there" (`src/features/feed/FeedScreen.tsx:183`) |
| Every card says why it's there | D-051: each card's reason line comes from what scored |
| Breakfast, lunch and dinner, with servings | Plan's three slots and the servings pill |
| Sunday reminder | `setSundayReminder`: a local notification at 4pm Sunday (`src/lib/notifications.ts`) |
| The list merges, sorts by aisle and leaves off the cupboard | `src/domain/shopping` |
| Add a recipe's ingredients without planning it | D-037 |
| Ticked items move into the cupboard | The `moveTicked` setting |
| Send it in Messages or WhatsApp | The iOS share sheet (`src/lib/share.ts`) |
| Invite with a link or code, no account needed | `src/features/household/words.ts:25` (link `thepantry://join/CODE` and the code); anonymous sign-in. Works for real users only after to-do 1 |
| Updated live | Realtime on `household_rows` (`src/lib/liveRows.ts`). Once the live migrations make the channel private, only a new build gets live rows (`RELEASE-NOTES.md`) |
| Timers keep counting with the phone locked; screen stays on | Local notifications, and `expo-keep-awake` in Cook Mode |
| Import from a web link | `ImportLinkScreen` reads schema.org Recipe data, fetched from the phone (`src/lib/fetchPage.ts`) |
| Photo record of dishes | Plates, kept on the phone only |
| Kitchen stats, streak | `StatsScreen`, `domain/cook/stats` |
| High contrast, VoiceOver, larger text | Settings › High contrast (`src/ui/tokens/colour.ts`); the accessibility audit of 7 October 2026 |
| No ads, no tracking | `NSPrivacyTracking: false` (`app.json`); no ads or analytics SDKs |
| Works without an account; Sign in with Apple only | `src/store/signInWays.ts:40`; email codes off (`src/lib/emailCodes.ts:9`) |

**Deliberately left out, because a store build doesn't have it:**

- Scanning: a store build hides the scan buttons (`SCAN_WAYS_SHOWN`, `src/lib/build.ts:20`).
- Other cooks, cook profiles and following: hidden in store builds (`COMMUNITY_SHOWN`, `src/lib/build.ts:19`). Its 99 cooks are AI personas (audit S2-7).
- Email sign-in: `EMAIL_CODES_CONNECTED` is off.
- Prices, and any free trial (see above).
- Nutrition.
- Sharing dishes with other people: plates stay on the phone.
- "Cook-tested": no recipe is tested yet.
- "Reviewed by us" or "checked by chefs": the recipes were reviewed with AI help (terms, section 5).
- "AI-powered": don't use it. Some photos are AI-generated, and they're labelled so on the recipe page.

## Keywords

Limit 100. Comma-separated, no spaces after commas, no competitor names. No word from the name or subtitle (the, pantry, cook, what, you, have, plan, shop, and, week), because Apple already indexes those.

```
recipes,meal planner,shopping list,grocery,fridge,leftovers,dinner,cookbook,ingredients,kitchen
```

**Count: 95 / 100**

Swaps to try if these underperform: `weeknight`, `meal prep`, `supermarket`, `groceries`, `budget`, `family meals`, `vegetarian`. Check the count stays at or under 100.

## Categories

- **Primary:** Food & Drink
- **Secondary:** Lifestyle (Productivity is the alternative, if you want to lean on the list)

## Age rating questionnaire

Expected result: **4+** (Apple's newer scale shows this as 4+ too).

| Question | Answer | Why |
| --- | --- | --- |
| Cartoon or fantasy violence; realistic violence; prolonged graphic or sadistic violence | None | |
| Sexual content or nudity; graphic sexual content | None | |
| Profanity or crude humour | None | |
| Horror or fear themes | None | |
| Mature or suggestive themes | None | |
| Alcohol, tobacco or drug use or references | None | Some recipes use wine or beer as a cooking ingredient. That's an ingredient, not a portrayal of drinking. "Infrequent/Mild" is the cautious choice and still rates 4+ |
| Medical or treatment information | None | No nutrition or medical advice is shown anywhere (no kcal, calorie or nutrition text in the screens). The avoid list says plainly that it isn't an allergy filter |
| Health or wellness topics | None | |
| Simulated gambling; contests; gambling | None / No | |
| Loot boxes | No | |
| Unrestricted web access | No | "Import from a link" reads a recipe from a page. It doesn't show web pages |
| **User-generated content** | **No** (recommended; see `app-store-privacy-and-review.md` §2) | A store build shows no public posts, profiles or feeds: the other-cooks screens are hidden. Plates (dish photos) stay on the phone, and only the owner sees them. Household shares the plan, list, cupboard and member names only with people the owner invited: private, invite-only, up to 8, no strangers and no messages. If App Review disagrees, the fallback is Yes, which brings guideline 1.2's report and block requirements. **Re-answer if the community screens are turned on in store builds, or when social (P9) ships** |
| Messaging or chat | No | **Change when messages ship (P9)** |
| Advertising | No | |
| Parental controls; age assurance | No | The app doesn't ask anyone's age (audit S2-16; privacy policy, section 9) |
| Made for Kids | No | General audience. Don't opt into the Kids category |

## URLs

The domain isn't bought yet, so every URL is a placeholder. Apple needs the support and privacy URLs live before you submit for review. The privacy and terms URLs also go into `src/lib/legal.ts`, and filling them is what puts Pro on sale in the app.

| Field | Required? | Value |
| --- | --- | --- |
| Support URL | Yes | `https://[domain]/support`: a simple page with your contact email and a short FAQ |
| Marketing URL | No | `https://[domain]`, or leave blank |
| Privacy Policy URL | Yes | `https://[domain]/privacy`: the published `privacy-policy.md` (re-checked 20 Nov; settle its DECIDE points first) |
| Terms of Use (EULA) | Yes, with subscriptions | Use Apple's standard EULA plus `https://[domain]/terms`, linked from the description's Pro block |
| Copyright | Yes | `2026 [legal name of business or person]` |

Until the domain is bought, a free GitHub Pages or Notion page works for support, privacy and terms. Apple accepts any public HTTPS page.

## Screenshots (6.9-inch iPhone)

**Size:** 1320 × 2868 portrait (1290 × 2796 is also accepted). Apple shrinks this set for smaller iPhones, so it's the only one you need. Up to 10 screenshots; the first 3 show in search results. The old media pack's screenshots are 1170 × 2532 (6.1-inch) and **won't be accepted**: re-capture, or centre each on a 1320 × 2868 canvas. Don't stretch them.

**How to capture:** use a store-style build (no `EXPO_PUBLIC_SHOW_DRAFT_RECIPES`), so the shots show what a buyer gets: 271 recipes, no other cooks, no scan buttons. Use the iPhone 17 Pro Max simulator (or any 6.9-inch device) in light mode, with a cupboard of about 15 everyday items and a week with 4 or 5 dinners planned. Use real accounts, plans and recipes, not mock-ups. The status bar should show 9:41 with full battery (`xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100`).

**Style:** white background, caption in Georgia, near-black, above the screen; amber only as an accent. No glossy device frames. Captions up to about 40 characters, so they read at thumbnail size.

**Rules:**

- **Never show** the paywall, email sign-in, or anything from a development build (draft recipes, other cooks, scan, test switches).
- **Feature real (Pexels or Wikimedia) photos large.** AI-generated photos may appear small inside a screen, never as the hero.
- **Only show screenshot 8 once Household is live.**

| # | Screen | Caption | Count |
| --- | --- | --- | --- |
| 1 | Home on What I have: "Ready now" cards (a real-photo recipe on top) | Dinner from what's already in your cupboard | 43 |
| 2 | Home, scrolled to "Nearly there" | One thing short? It says exactly what | 37 |
| 3 | Cupboard: jars by shelf, quick adds row | Add your cupboard in seconds | 28 |
| 4 | Plan tab: week strip and a day with dinner planned, ideas rail below | Plan the week in one sitting | 28 |
| 5 | List tab: by aisle, a couple of items ticked | One tidy list, sorted by aisle | 30 |
| 6 | Cook Mode: a step with a running timer | Cook one clear step at a time | 29 |
| 7 | Recipe page: hero photo, info tiles, ingredients with HAVE tags | Every recipe scales to your table | 33 |
| 8 | Household screen: two members, invite button (only once Household is live) | Share the plan and list at home | 31 |
| 9 | Surprise me card deck | Can't decide? Spin for dinner | 29 |
| 10 | Library: Cookmarks and collections | Save favourites into collections | 32 |

- Frames 1 to 3 sell the core idea (cook from what you have), so they come first.
- Frame 1 needs a real-photo recipe on top. Shakshuka, Omelette and Carbonara have Pexels photos; check each is in the store build first.
- One dark-mode frame (Cook Mode works well at night) is optional, for variety.

## What's New

```
The first release of The Pantry. See what you can cook with what you have, plan the week, get one tidy shopping list and cook step by step. We'd love your feedback.
```

**Count: 164 / 4,000.** Apple doesn't show this for a first release; use it for TestFlight's "What to Test", and reuse it if the field appears.

**Version number:** `app.json` says **2.0.0**, deliberately (D-017, so old over-the-air updates can't land on it). App Store Connect's version must match the build, so the first App Store version is **2.0.0**, not 1.0. That's fine; nobody outside TestFlight saw 1.0.
