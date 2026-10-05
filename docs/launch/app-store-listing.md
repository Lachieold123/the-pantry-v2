# The Pantry: App Store listing (draft)

**Written:** 5 October 2026, by Claude, from the code and the media pack. Every claim below was checked against the app as it is today (no accounts, no server, scanning "Coming soon"). Character counts were measured with Python; Apple counts characters the same way for these fields.

> Before you paste anything in, read the **Blockers** in `README.md`. Recipes that passed the editorial review now ship (D-036); none is cook-tested yet.

## Name and subtitle

| Field | Limit | Text | Count |
| --- | --- | --- | --- |
| **App name** (recommended) | 30 | `The Pantry: Cook What You Have` | **30** |
| App name (fallback) | 30 | `The Pantry` | 10 |
| **Subtitle** (recommended) | 30 | `Tonight's dinner, sorted.` | **25** |
| Subtitle (alternative) | 30 | `Plan, shop and cook the week` | 28 |

- App names must be unique on the App Store, and "The Pantry" on its own is very likely taken. The recommended name adds the app's core idea. It's exactly 30 characters, so don't add anything to it.
- The tagline makes the best subtitle. Apple indexes the name, subtitle and keywords together, so the keywords below don't repeat any word from them.
- If you use the shorter fallback name, use the alternative subtitle, so "cook" and "plan" still appear somewhere.
- The name under the icon on the phone stays "The Pantry" (from `app.json`), whichever store name you choose.

## Promotional text

Limit 170. You can change this any time without a new app version.

```
See what you can cook tonight with only what's already in your cupboard. Then plan the week, get one tidy shopping list, and cook it step by step.
```

**Count: 146 / 170**

## Description

Limit 4,000. Aim was about 1,500, scannable.

```
Tonight's dinner, sorted.

The Pantry starts with what you already have. Tell it what's in your cupboard and fridge, and it shows the dishes you can cook right now, with nothing to buy. Just short? "Nearly there" shows the recipes that are one or two things away, and says exactly what they need.

WHAT I HAVE
• Recipes you can cook tonight with only what's on hand, at the top of the home screen
• "Nearly there" for dishes one or two ingredients short
• Add your cupboard in seconds: search, quick adds, or type or paste a list

PLAN THE WEEK
• Pick dinners for this week and next, with servings for each meal
• Plan the same favourite twice if you like
• An optional Sunday reminder to plan the week

ONE TIDY SHOPPING LIST
• Written for you from your plan, merged and sorted by aisle
• Leaves off what's already in your cupboard
• Tick things off as you shop, and they move into your cupboard
• Send it to your partner in Messages or WhatsApp

COOK STEP BY STEP
• Cook Mode shows one large step at a time and keeps the screen on
• Tap-to-start timers that keep counting with your phone locked
• Mark it cooked to keep a record, and your suggestions stay fresh

AND THE REST
• Surprise me, for when nobody can decide
• Save recipes and sort them into collections
• Write your own recipes, or import one from a web link
• Keep a photo record of the dishes you've cooked
• Metric or imperial, with Australian cups and spoons
• Light and dark mode, and a high-contrast option

YOUR KITCHEN STAYS YOURS
No account, no ads, no tracking. Everything you add stays on your iPhone.

A note on allergies: "Ingredients to avoid" steers suggestions, but it isn't an allergy filter. Always check ingredients and labels yourself.
```

**Count: 1718 / 4,000**

What it deliberately leaves out, because it isn't true yet: accounts, sharing dishes with other people, scanning, Pro, nutrition, and any number of recipes. "[number] recipes" is true now (the reviewed count); "cook-tested" is only true for recipes you've cooked.

## Keywords

Limit 100. Comma-separated, no spaces after commas. No word from the name ("the", "pantry", "cook", "what", "you", "have") or the subtitle ("tonight's", "dinner", "sorted"), because those are already indexed.

```
recipes,meal planner,shopping list,grocery,fridge,leftovers,weeknight,cookbook,ingredient,kitchen
```

**Count: 97 / 100**

Words to swap in later if these underperform: `pantry` is in the name already, so consider `meal prep`, `supermarket`, `groceries`, `family meals`, `budget`. Check the count stays at or under 100.

## Categories

- **Primary:** Food & Drink
- **Secondary:** Lifestyle

## Age rating answers

Answer App Store Connect's age-rating questionnaire like this. The expected result is **4+**.

| Question area | Answer | Why |
| --- | --- | --- |
| Violence (cartoon, realistic, prolonged, graphic) | None | |
| Sexual content or nudity | None | |
| Profanity or crude humour | None | |
| Horror or fear themes | None | |
| Mature or suggestive themes | None | |
| Alcohol, tobacco or drug use or references | None | Some recipes cook with wine or beer as an ingredient. That's a cooking ingredient, not a portrayal of drinking. If you'd rather be cautious, "Infrequent/Mild" still keeps a low rating. |
| Medical or treatment information | None | No medical advice. Nutrition isn't shown yet. |
| Health or wellness topics | None | |
| Simulated gambling, contests, real gambling | None / No | |
| Loot boxes | No | |
| Unrestricted web access | No | "Import from a link" reads a recipe from a page; it doesn't display web pages. |
| User-generated content shared with others | No | Plates stay on the phone and only you see them. **Change to Yes when social launches.** |
| Messaging or chat | No | **Change when messages launch.** |
| Advertising | No | |
| Parental controls / age assurance | No | |
| Made for Kids | No | General audience. Don't opt into the Kids category. |

## URLs

| Field | Value |
| --- | --- |
| Support URL (required) | [support URL] (a simple page with your contact email and a short FAQ is enough) |
| Marketing URL (optional) | [marketing URL] |
| Privacy Policy URL (required) | [privacy policy URL], the published `privacy-policy.md` |
| Terms of Use / EULA | Leave Apple's standard EULA selected, and link your terms from the description footer or support page: [terms URL] |
| Copyright | [year] [legal name of business or person] |

## Screenshot plan (6.9-inch iPhone)

**Size:** 1320 × 2868 portrait (1290 × 2796 is also accepted for this slot). The media pack's screenshots are 1170 × 2532, which is a 6.1-inch size and **won't be accepted for the 6.9-inch slot**. Re-capture the same screens at 1320 × 2868, or place each one centred on a 1320 × 2868 canvas with the caption above it. Don't stretch them.

**Style:** white background (#FFFFFF), caption in Georgia, near-black (#1A1A1A), with an amber (#C99155) accent at most. No glossy device frames (media pack rule). Use light mode for all eight; dark versions exist if you want one dark frame.

**Rules from the media pack:** never show `20-scan-receipt-coming-soon` (scanning isn't live). Only feature real (Pexels) photos large: Shakshuka, Omelette and Carbonara are real. AI-generated photos may appear small inside a screen, never as the hero.

| # | Screen to capture | File in `/tmp/claude-0/media/screens/light/` | Caption | Count |
| --- | --- | --- | --- | --- |
| 1 | Home on **What I have**: "Ready now · Nothing to buy" (Shakshuka) | `01-home-what-i-have.png` | See what you can cook tonight with what you have | 48 |
| 2 | Home's **Nearly there** shelf ("Need 1: …") | `03-home-nearly-there.png` | One or two things short? It says what you need | 46 |
| 3 | Cupboard, Step 1: add what you have | `16-cupboard-add.png (or 17-cupboard-jars.png)` | Add your cupboard in seconds | 28 |
| 4 | Plan: the week strip and a day's meals | `12-plan-week.png` | Plan the week in one sitting | 28 |
| 5 | The shopping list by aisle | `14-shopping-list.png` | One tidy shopping list, sorted by aisle | 39 |
| 6 | Cook Mode, a step with its timer | `10-cook-mode-step.png` | Cook one clear step at a time | 29 |
| 7 | A recipe page, ingredients with HAVE tags (a real-photo recipe) | `07-recipe-ingredients.png` | Every quantity scales to your servings | 38 |
| 8 | Surprise me card deck | `11-surprise-me.png` | Can't decide? Spin for dinner | 29 |

- Frames 1–3 sell the core idea, so they come first: the first three are what most people see in search results.
- Check frame 7 shows a recipe with a real photo. If `07-recipe-ingredients` shows an AI photo at the top, capture Carbonara or Omelette instead.
- Optional: an App Preview video (15–30 s) can be cut from the clips in `/tmp/claude-0/media/clips/` (a, c, d, e, g in that order). It must also be recaptured at the 6.9-inch size.

## What's New in this version

```
The first release of The Pantry. See what you can cook with what you have, plan the week, get one tidy shopping list and cook step by step. We'd love your feedback.
```

**Count: 164 / 4,000**

Apple doesn't show "What's New" for an app's very first release, so you may not see the field until your first update. Keep this for the TestFlight "What to Test" notes, and reuse it if the field appears.

Note on the version number: `app.json` says **2.0.0**, deliberately (D-017, so old over-the-air updates can't land on it). App Store Connect's version must match the build, so the first App Store version will be **2.0.0**, not 1.0. That's fine; nobody outside TestFlight saw 1.0.

## App Review notes

Paste into App Store Connect › App Review Information › Notes. Tick **"Sign-in required": No**.

```
The Pantry is a cooking app: it shows what you can cook with what's in your cupboard, plans the week, builds a shopping list from the plan, and walks you through cooking.

- No login or account is needed. Everything is stored on the device; the app has no server.
- To see the main feature: open the Cupboard tab, add a few things (e.g. eggs, tomato, onion, feta, bread), then go back to Home. "What I have" shows the dishes you can cook now, and "Nearly there" shows dishes one or two things short.
- Plan: tap Plan, then add a dinner to any day. The List tab then shows the shopping list built from the plan. Tapping the share button opens the standard iOS share sheet.
- Cook Mode: open any recipe and tap Cook. Timers in the steps schedule a local notification, which is why notification permission is requested (only when a timer or the Sunday reminder is first used).
- Camera and Photos are used only by "Share a dish" (the centre + button), to attach photos of a dish you cooked. These photos stay on the device and are not uploaded or shown to anyone else; the screen says so.
- Cupboard > Scan receipt / Photo of food shows "Coming soon". Scanning isn't switched on in this version and sends nothing anywhere; the sheet offers typing a list instead.
- "Import from a link" (side menu > My recipes > Import from a link) fetches the public web page the user pastes, directly from the device, and reads its schema.org Recipe data.
- Some recipe photos are AI-generated and are labelled "AI-generated photo" on the recipe page; the others are credited Pexels photos.
- No in-app purchases, ads, analytics or tracking.

Contact: [your name], [contact email], [phone number]
```

**Count: 1678 / 4,000**
