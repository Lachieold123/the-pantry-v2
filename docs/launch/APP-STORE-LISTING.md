# The Pantry: App Store listing

**Drafted 7 October 2026** by Claude for P11, from the code as it stands (D-038 to D-044). Character counts were measured with Python (`len()`, which counts the way App Store Connect does for these fields).

This replaces `app-store-listing.md` (5 October). That file was written before Household, Accounts and Pro, and it says "no account" and "no server", which is no longer true. Keep it only for its App Review notes, and update those as `README.md` describes.

> **Before you paste:** the description only claims what works today. Three things are built but need your dashboard steps before they work for real users, so check each one first:
> 1. **Household** needs Supabase's anonymous sign-ins switched on, then the two-phone test (`docs/HOUSEHOLD.md` › Needs Lachlan). Until then, use the description **without** the SHARE THE KITCHEN block, and skip screenshot 8.
> 2. **Sign in with Apple** needs the migration applied and the Apple provider set up (`docs/ACCOUNTS.md`). Until then, delete the last sentence of YOUR KITCHEN STAYS YOURS.
> 3. **Pro isn't on sale** (RevenueCat is wired, D-045, but Apple returns no products until App Store Connect is finished), so nothing in the app is limited. The listing doesn't mention Pro or prices. When purchases go live, add the block in "When Pro goes on sale" below and list the in-app purchases.

## Name and subtitle

| Field | Limit | Text | Count |
| --- | --- | --- | --- |
| **App name** | 30 | `The Pantry: Cook What You Have` | **30** |
| App name (fallback) | 30 | `The Pantry` | 10 |
| **Subtitle** | 30 | `Plan, shop and cook the week` | **28** |
| Subtitle (alternative) | 30 | `Tonight's dinner, sorted.` | 25 |

- "The Pantry" on its own is almost certainly taken. Reserve the full name in App Store Connect early. It's exactly 30 characters.
- The name says the core idea (cook from what you have). The subtitle says the North Star (plan, shop, cook). Between them they carry the words people search for, so the keywords below don't repeat any of them.
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

**Count: 2287 / 4,000**

### Without Household (use until then)

The same text without the SHARE THE KITCHEN block.

**Count: 2057 / 4,000**

**Checked against the code:**

| Claim | Where it's true |
| --- | --- |
| 270+ recipes | 273 `reviewed` recipes ship (D-036). The 12 `ai-draft` ones are hidden in store builds |
| Dishes one or two things short, with what they need | Home's ranking and `MatchCard` ("Need 1: …") |
| Every card says why it's there | D-044: each card's reason line comes from what scored |
| Breakfast, lunch and dinner, with servings | Plan's three slots and the servings pill |
| Sunday reminder | `setSundayReminder`: a local notification at 4pm Sunday |
| The list merges, sorts by aisle and leaves off the cupboard | `src/domain/shopping` |
| Add a recipe's ingredients without planning it | D-037 |
| Ticked items move into the cupboard | The `moveTicked` setting |
| Timers keep counting with the phone locked; screen stays on | Local notifications, and `expo-keep-awake` in Cook Mode |
| Import from a web link | `ImportLinkScreen` reads schema.org Recipe data |
| Photo record of dishes | Plates, kept on the phone only |
| Kitchen stats, streak | `StatsScreen`, `domain/cook/stats` |
| High contrast, VoiceOver, larger text | Settings › High contrast; the accessibility audit of 7 October 2026 |
| No ads, no tracking, works without an account | `docs/launch/PRIVACY.md` |

**Deliberately left out, because it isn't true yet:**

- Scanning: it shows "Coming soon".
- Email sign-in: `EMAIL_CODES_CONNECTED` is off.
- Pro and prices.
- Nutrition.
- Sharing dishes with other people: plates stay on the phone.
- "Cook-tested": no recipe is tested yet.
- "AI-powered": don't use it. Some photos are AI-generated, and they're labelled so on the recipe page.

### When Pro goes on sale, add before YOUR KITCHEN STAYS YOURS

```
THE PANTRY PRO
Everything above is free, including planning the week you're shopping for. Pro adds planning further ahead, and no limits on collections, your own recipes and link imports. Monthly or yearly, with a 7-day free trial on yearly. Payment is charged to your Apple ID and renews automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel in your App Store account settings.

Terms of Use: [terms URL]
Privacy Policy: [privacy policy URL]
```

This matches `docs/PRO.md`: free covers the North Star, and Pro is "more", never "unlocked". It adds about 480 characters, which still fits easily. Don't put a price in the text: the App Store shows each country's price itself.

## Keywords

Limit 100. Comma-separated, no spaces after commas, no competitor names. No word from the name or subtitle (the, pantry, cook, what, you, have, plan, shop, and, week), because Apple already indexes those.

```
recipes,meal planner,shopping list,grocery,fridge,leftovers,dinner,cookbook,ingredients,kitchen
```

**Count: 95 / 100**

Swaps to try if these underperform: `meal prep`, `supermarket`, `groceries`, `budget`, `family meals`, `vegetarian`. Check the count stays at or under 100.

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
| Medical or treatment information | None | No nutrition or medical advice. The avoid list says plainly that it isn't an allergy filter |
| Health or wellness topics | None | |
| Simulated gambling; contests; gambling | None / No | |
| Loot boxes | No | |
| Unrestricted web access | No | "Import from a link" reads a recipe from a page. It doesn't show web pages |
| **User-generated content** | **No** | Plates (dish photos) stay on the phone, and only the owner sees them. Household shares the plan, list, cupboard and member names only with people the owner invited. It's private, invite-only, with no public posts, no strangers and no messages. If App Review disagrees, the fallback is Yes, which brings guideline 1.2's report and block requirements (P9). **Change to Yes when social (P9) ships** |
| Messaging or chat | No | **Change when messages ship (P9)** |
| Advertising | No | |
| Parental controls; age assurance | No | |
| Made for Kids | No | General audience. Don't opt into the Kids category |

## URLs

The domain isn't bought yet, so every URL is a placeholder. Apple needs the support and privacy URLs live before you submit for review, and also before Pro can go on sale (`src/lib/legal.ts` stays empty until then).

| Field | Required? | Value |
| --- | --- | --- |
| Support URL | Yes | `https://[domain]/support`: a simple page with your contact email and a short FAQ |
| Marketing URL | No | `https://[domain]`, or leave blank |
| Privacy Policy URL | Yes | `https://[domain]/privacy`: the published privacy policy. **Update it first:** `privacy-policy.md` still says "no accounts and no server". See `PRIVACY.md` §5 |
| Terms of Use (EULA) | Only with subscriptions | Use Apple's standard EULA plus `https://[domain]/terms`, linked from the description once Pro is on sale |
| Copyright | Yes | `2026 [legal name of business or person]` |

Until the domain is bought, a free GitHub Pages or Notion page works for support and privacy. Apple accepts any public HTTPS page.

## Screenshots (6.9-inch iPhone)

**Size:** 1320 × 2868 portrait (1290 × 2796 is also accepted). Apple shrinks this set for smaller iPhones, so it's the only one you need. Up to 10 screenshots; the first 3 show in search results.

**How to capture:** use the iPhone 17 Pro Max simulator (or any 6.9-inch device) in light mode, with a cupboard of about 15 everyday items and a week with 4 or 5 dinners planned. Use real accounts, plans and recipes, not mock-ups. The status bar should show 9:41 with full battery (`xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100`).

**Style:** white background, caption in Georgia, near-black, above the screen; amber only as an accent. No glossy device frames. Captions up to about 40 characters, so they read at thumbnail size.

**Rules:**

- **Never show** the scan sheet ("Coming soon"), the paywall, or email sign-in.
- **Feature real (Pexels) photos large.** AI-generated photos may appear small inside a screen, never as the hero.
- **Only show screenshot 8 once Household is live.**

| # | Screen | Caption | Count |
| --- | --- | --- | --- |
| 1 | Home on What I have: "Ready now" cards (a real-photo recipe on top) | Dinner from what's already in your cupboard | 43 |
| 2 | Home, scrolled to the dishes one or two things short | One thing short? It says exactly what | 37 |
| 3 | Cupboard: jars by shelf, quick adds row | Add your cupboard in seconds | 28 |
| 4 | Plan tab: week strip and a day with dinner planned, ideas rail below | Plan the week in one sitting | 28 |
| 5 | List tab: by aisle, a couple of items ticked | One tidy list, sorted by aisle | 30 |
| 6 | Cook Mode: a step with a running timer | Cook one clear step at a time | 29 |
| 7 | Recipe page: hero photo, info tiles, ingredients with HAVE tags | Every recipe scales to your table | 33 |
| 8 | Household screen: two members, invite button (only once Household is live) | Share the plan and list at home | 31 |
| 9 | Surprise me card deck | Can't decide? Spin for dinner | 29 |
| 10 | Library: Cookmarks and collections | Save favourites into collections | 32 |

- Frames 1 to 3 sell the core idea (cook from what you have), so they come first.
- Frame 1 needs a real-photo recipe on top. Shakshuka, Omelette and Carbonara have Pexels photos.
- One dark-mode frame (Cook Mode works well at night) is optional, for variety.

## What's New

```
The first release of The Pantry. See what you can cook with what you have, plan the week, get one tidy shopping list and cook step by step. We'd love your feedback.
```

**Count: 164 / 4,000.** Apple doesn't show this for a first release; use it for TestFlight's "What to Test". The first App Store version is **2.0.0**, to match `app.json` (D-017).
