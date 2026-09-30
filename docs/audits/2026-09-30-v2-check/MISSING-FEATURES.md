# What v2 is missing from v1 (30 September 2026)

This is drawn from a line-by-line read of v1's code: 285 features, with the sources below. The status reflects `main` at the time of writing, with phases P1–P3 built.

- Full inventory: `v1-feature-inventory.md`
- Cupboard deep-dive: `cupboard-brief.md`

## 1. Cook from what you have (the central feature)

**What v1 had:**
- **Ways to add:**
  - search
  - 9 quick adds
  - a category tile grid
  - "Add one thing"
  - Pro photo scan of your shelves
  - Pro receipt scan
- **How your cupboard showed:** tinted "jars" in 7 categories, with a count and a Clear button.
- **How matches showed:**
  - match cards with a percentage and "N to buy";
  - "From your saved" and "Suggested for you" shelves;
  - HAVE pills on recipes;
  - "From your cupboard" suggestions on the Plan tab.

**What v1 got wrong:**
- **Crude matching by text.** "Sage" matched sausage, "onion" matched spring onion and "butter" matched peanut butter. Six items produced "273 recipes for you".
- **Three separate matchers that disagreed.**
- **Two fake features:** Browse's "by your pantry" was 4 random recipes, and Surprise me's "From cupboard" filter really meant "6 or fewer ingredients".
- **Scanning weak spots:** scanned names went straight in as free text and often didn't match.

**What v2 has today:** search to add, a flat list, a "What can I make?" list, HAVE pills, undo, and ticked shopping moving into the cupboard. Its matching uses real ingredient ids, which is already better than v1's.

**What's missing:**

| # | Feature | Buildable now? |
| --- | --- | --- |
| C1 | One shared "what can I cook" engine used everywhere. It sorts each ingredient into have, swap (for example brown for white onion), staple, "check your shelf" or missing, and names what's missing instead of giving a percentage. | Yes |
| C2 | Two tiers everywhere: **Ready tonight** and **Need 1–2 more**, filtered by your diet, avoid list and hidden dishes. Today's version ignores diet and avoid: **bug** | Yes |
| C3 | Results at the top of the Cupboard tab, with cards that say "Need 1: lemon" | Yes |
| C4 | "Add missing to shopping list" and "Plan it" straight from a match | Yes |
| C5 | "Add one thing": the single ingredient that unlocks the most recipes | Yes |
| C6 | Category jars (7 categories), count line, Clear with confirm | Yes |
| C7 | Quick adds, chosen from the catalogue's most-used ingredients | Yes |
| C8 | Category tile grid to tap items in and out | Yes |
| C9 | An editable "always in my kitchen" shelf of staples (v1's switch wasn't even saved) | Yes |
| C10 | **Add a list:** paste or type "eggs, 2 onions, feta", review, add. It works offline and shares its review screen with the scans | Yes |
| C11 | **Photo of your shelves or fridge adds items** (AI), with a review step | Needs a server and AI (P8/P10) |
| C12 | **Photo of a receipt adds items** (AI), with a review step | Needs a server and AI (P8/P10) |
| C13 | Cupboard matches on the Feed ("Cook with what you have"), in Browse, Plan and Surprise me | Yes |
| C14 | "Used anything up?" when you finish Cook Mode | Yes |
| C15 | "Still got these?" nudge for perishables | Yes |
| C16 | Fix the v1 import, which drops 14 of your old items and maps "Chicken" to the wrong cut | Yes |

## 2. Missing from every phase of the plan

| # | Feature | Suggested phase |
| --- | --- | --- |
| M1 | Settings rebuilt as v1's grouped cards | P6 |
| M2 | Export my data | P6, extended in P8 |
| M3 | Terms and Privacy links | P6, hosted in P11 |
| M4 | Edit cuisines, weeknight time and skill one at a time | P6 |
| M5 | Crash reports opt-out | P11 |
| M6 | Notification settings (master switch, likes, comments, follows, messages) | P9 |
| M7 | Sign out, and sign out everywhere | P8 |
| M8 | Delete account (Apple requires it) | P8 |
| M9 | Pro status and Manage subscription | P10 |
| M10 | Forgot password | P8 |
| M11 | Email-confirmation link that finishes sign-in | P8 |
| M12 | Nutrition panel ("how we calculate" sheet): decided, D-028 | Next |
| M13 | "Pair with" suggestions (only 26 recipes had them) | Your call |
| M14 | Oven temperatures and amounts in method steps converted for imperial | Fix now |
| M15 | Share or email a built-in recipe as full text | Fix now |
| M16 | Share links that open for people without the app | P11 |
| M17 | "Search the web" (recommend dropping) | Your call |
| M18 | Add a recipe to the shopping list without giving it a day | P4 |
| M19 | Share the week's plan as text | P4 |
| M20 | List of "Not for us" dishes, with un-hide | P6 |
| M21 | iPad support (v1 on, v2 off) | P11, your call |

## 3. Started but not finished

| Area | What's missing |
| --- | --- |
| Recommended | v1 had a full ranked list with "Update preferences"; v2 shows 4 picks on the Feed |
| Kitchen stats | most of v1's numbers, and Clear history |
| Spinner (Surprise me) | dinners only (v1 had breakfast and lunch too) |
| Cook Mode | ingredients view lacks sections, HAVE and swaps; timers can't be paused |
| Photo credits | shown as plain text rather than links |
| Plan (P4) | "N of 21 meals" progress bar, and the shopping list preview card |
| Library (P6) | "Clear" on Recently viewed; remove a recipe from a collection while viewing it |
| Plan | moving or swapping a planned meal: the logic exists, but there's no button |

## 4. Gaps neither app covers (the plan's own rules need them)

- Blocked accounts list, with unblock (P9)
- Report and block from inside a message thread (P9)
- Delete your own comment (P9)
- A server that actually sends push notifications (P9). v1 stored device tokens but never sent a push.
