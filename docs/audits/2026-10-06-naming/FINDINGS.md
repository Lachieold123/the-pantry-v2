# Naming audit, 6 October 2026

Lachlan asked for this as part of the simplification pass (item 4). The rule
being checked: **one thing, one name, everywhere it appears**. That covers the
words on screen, the screen readers' labels, toasts, messages the app sends,
and the names inside the code, so the code reads the way the app does.

## The words the app uses

| Thing | Its name | Not |
| --- | --- | --- |
| The tabs | Home · Plan · ＋ · List · Cupboard | Feed, Planner, Groceries, Pantry |
| Your saved recipes | Cookmarks (the button says Save / Saved) | Saved, Bookmarks, Favourites |
| The page with Cookmarks, Collections, My recipes, Recent | Library | Saved |
| Recipes you've opened lately | Recent | Recently viewed, Recents |
| Sharing a kitchen with others | Household | Sharing, Family |
| The quick pick | Surprise me | Spinner, Spin |
| Typing what's in the cupboard | Add a list | Type a list |
| Step-by-step cooking | Cook Mode | Cook mode |
| The paid tier | The Pantry Pro | Premium, Plus |

On pushed pages the small kicker above the title names where the page lives,
and the title says what it is: Your kitchen / Library, Settings / Preferences,
Household / *household name*, Kitchen stats / Your cooking.

## What was wrong, and what changed

| # | Where | Was | Now | Why it mattered |
| --- | --- | --- | --- | --- |
| 1 | Side menu | Spinner | Surprise me | **Seen by every user.** The menu used v1's old name for the feature that's called Surprise me everywhere else. |
| 2 | Side menu row | Recently viewed | Recent | The Library tab says Recent. The toast is now "Recent list cleared". |
| 3 | Household page kicker | Sharing | Household | The Settings row that opens it says Household. |
| 4 | Cupboard button and scan sheet | Type a list, Type a list instead | Add a list, Add a list instead | The sheet it opens is called Add a list. |
| 5 | Surprise me's settings and "Why this" | Pantry | Cupboard | The app is The Pantry, but the place you keep food is the Cupboard. "Pantry" here read like the app's name. |
| 6 | Cupboard shelf for rice, pasta, tins | Pantry | Dry goods | Same reason as #5: a "Pantry" shelf inside the Cupboard tab was confusing. |
| 7 | Code: Surprise me | SpinnerScreen, useSpinner, `spinner-*` test ids, SPINNER tokens, domain `spinner.ts`, icon `spinner` | SurpriseScreen, useSurprise, `surprise-*`, SURPRISE, `surpriseDeck.ts`, icon `surprise` | The code used v1's old name for the feature. (The old app's storage key `dinner-spinner/v1` stays, because that's how v1 data is found.) |
| 8 | Code: unused | Welcome tokens left from the old quiz, reveal and reminder | Removed | Leftovers from screens that no longer exist. |
| 9 | Comments | "taste quiz" | "welcome" | The quiz is gone. |

## Checked and left alone

- **Save / Saved on the recipe page, Cookmarks as the place.** A verb on the
  button and a noun for the place. The toast joins them: "Saved to Cookmarks".
- **"Shopping list" as the List tab's title.** It's the kicker / title pattern:
  List / Shopping list.
- **Browse / Discover.** Same pattern: Browse is the place, Discover the heading.
- **Settings / Preferences.** Same pattern. The menu row says "Settings & preferences".

## Still to decide (Lachlan)

- **The photo and camera permission text** in `app.json` mentions scanning a
  receipt and your fridge. Scanning isn't switched on yet: its buttons open
  "Coming soon" sheets. Apple asks that these say what the app does now, and
  changing them only takes effect in the next build.
