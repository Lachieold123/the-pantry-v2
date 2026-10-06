# Naming audit, 6 October 2026

Lachlan asked for this as part of the simplification pass (item 4). The rule
being checked: **one thing, one name, everywhere it appears**. That covers the
words on screen, the screen readers' labels, toasts, messages the app sends,
and the names inside the code, so the code reads the way the app does.

## The words the app uses

| Thing | Its name | Not |
| --- | --- | --- |
| The four tabs | Home · Plan · List · Cupboard | Feed, Planner, Groceries, Pantry |
| Your saved recipes | Cookmarks (the button says Save / Saved) | Saved, Bookmarks, Favourites |
| The page with Cookmarks, Collections, My recipes, Recent | Library | Saved, Your kitchen |
| Recipes you've opened lately | Recent | Recently viewed, Recents |
| The page behind your picture | You | Menu, Profile |
| Sharing a kitchen with others | Household | Sharing, Family |
| The quick pick | Surprise me | Spinner, Spin |
| Typing what's in the cupboard | Add a list | Type a list |
| Step-by-step cooking | Cook Mode | Cook mode |
| The paid tier | The Pantry Pro | Premium, Plus |

On pushed pages the small kicker above the title names where the page lives
and the title says what it is: You / Your kitchen, You / Library,
Settings / Preferences, Household / *household name*, Kitchen stats / Your cooking.

## What was wrong, and what changed

| # | Where | Was | Now | Why it mattered |
| --- | --- | --- | --- | --- |
| 1 | Household invite message | "go to Settings → Household" | "tap your picture at the top, then Household" | **A real bug.** Household left Settings in this pass, so the invite sent people to a place that no longer has it. |
| 2 | Joining while already in a household | "leave it first in Settings → Household" | "tap your picture at the top, then Household" | Same as #1. |
| 3 | You page row | Recently viewed | Recent | The Library tab says Recent. The toast is now "Recent list cleared". |
| 4 | Library kicker | Your kitchen | You | "Your kitchen" is the You page's title, so two different pages had the same heading. |
| 5 | Household page kicker | Sharing | Household | The You row that opens it says Household. |
| 6 | Cupboard scan sheet | Type a list instead | Add a list instead | The button and sheet are called Add a list. |
| 7 | Surprise me's settings and "Why this" | Pantry | Cupboard | The app is The Pantry, but the place you keep food is the Cupboard. "Pantry" here read like the app's name. |
| 8 | Cupboard shelf for rice, pasta, tins | Pantry | Dry goods | Same reason as #7: a "Pantry" shelf inside the Cupboard tab was confusing. |
| 9 | Code: Surprise me | SpinnerScreen, useSpinner, `spinner-*` test ids, SPINNER tokens, domain `spinner.ts` | SurpriseScreen, useSurprise, `surprise-*`, SURPRISE, `surpriseDeck.ts` | The code used v1's old name for a feature the app calls Surprise me. (The old app's storage key `dinner-spinner/v1` stays, because that's how v1 data is found.) |
| 10 | Code: unused | `menu` and `spinner` icons; welcome tokens left from the old quiz, reveal and reminder | removed | Leftovers from screens that no longer exist. |
| 11 | Comments | "taste quiz" | "welcome" | The quiz is gone. |

## Checked and left alone

- **Save / Saved on the recipe page, Cookmarks as the place.** A verb on the
  button and a noun for the place. The toast joins them: "Saved to Cookmarks".
- **"Shopping list" as the List tab's title.** It's the kicker / title pattern:
  List / Shopping list.
- **Browse / Discover.** Same pattern: Browse is the place, Discover the heading.
- **Settings / Preferences.** Same pattern, and it matches the You row.

## Still to decide (Lachlan)

- **The photo and camera permission text** in `app.json` still promises
  scanning: "…when you share a dish you cooked or scan a receipt" and "…a
  dish you cooked, a receipt or your fridge". Scanning isn't switched on.
  Apple asks that these say what the app does now, and changing them only
  takes effect in the next build. Suggest: "The Pantry uses your photos when
  you share a dish you cooked." and "The Pantry uses the camera to photograph
  a dish you cooked." Then add scanning back when it ships.
