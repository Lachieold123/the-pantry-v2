# Maestro flows

End-to-end tests that tap through The Pantry the way a person would, on the iOS
Simulator, in Expo Go. There's one flow per area of the app. Every flow starts
from a fresh install (`clearState`), so each one stands alone and can run by
itself.

## The easy way

Double-click `scripts/run-maestro.command` in Finder. It checks the tools are
installed, boots a simulator, starts Metro, runs every flow, and stops Metro
when it's done. The report and screenshots go to
`~/Desktop/HQ/11-ThePantryV2/.transfer/`.

## Prerequisites

- **Xcode**, from the Mac App Store. Open it once so it can finish installing its
  components, including an iOS Simulator.
- **Maestro CLI**:
  `curl -fsSL "https://get.maestro.mobile.dev" | bash`
  Then open a new Terminal window and check it with `maestro --version`.
- **Node 22 or later**, and the project's packages (`npm install`).
- **Expo Go on the simulator.** `npx expo start --go --ios` installs it the first
  time and opens the app in it. Keep that Metro server running while the tests
  run. Flows open the app at `exp://127.0.0.1:8081`.

## Run them

From the repo root, with Metro running (`npx expo start --go --ios`):

```
maestro test .maestro/                          # every flow, in the order in config.yaml
maestro test .maestro/06-recipe-page.yaml       # one flow
maestro test .maestro/ --format junit --output report.xml   # with a report
```

`maestro studio` opens a browser view of the running app, which helps when
writing or fixing a flow.

## The flows

| File | What it covers |
| --- | --- |
| `01-welcome-complete.yaml` | First launch: answer the taste quiz (with Back), plan tonight's pick, decline the reminder |
| `02-welcome-skip.yaml` | First launch: Skip, and a relaunch stays past the quiz |
| `03-shell-navigation.yaml` | Tab bar, side menu to every destination and back, "+" opens the editor, avatar opens Settings |
| `04-feed.yaml` | Have this tonight, the plan badge shows 1, Start cooking, Surprise me |
| `05-browse.yaml` | Every quick chip and the pill, a mood shelf, See all, a misspelt search, the filters sheet, save from a grid card, no results |
| `06-recipe-page.yaml` | Save/undo, plan it, share, mark cooked/undo, servings and units, tick an ingredient, the "⋯" menu |
| `07-plan.yaml` | Both weeks and views, add a meal, change servings, remove/undo; shopping list tick, remove/undo, add an extra, send |
| `08-cupboard.yaml` | Add by search, remove/undo, the "move ticked shopping here" switch (and that it works), what can I make |
| `09-cookmarks.yaml` | Empty state, then a saved recipe listed and opened |
| `10-collections.yaml` | Create (and refuse a duplicate), open, rename, delete/undo, add a recipe to one |
| `11-my-recipes.yaml` | Import rejects a bad link; write a recipe with validation, save, open, edit, delete/undo; cancel asks first |
| `12-recent-and-stats.yaml` | Recently viewed and Kitchen stats, empty then filled |
| `13-cook-mode.yaml` | Next/back, swipe, ingredients, a timer, Done counts as cooked |
| `14-surprise.yaml` | Time limits, spin, spin again, open, plan it, cook it |
| `15-settings.yaml` | Appearance, high contrast, diet and avoid, Sunday reminder, units, retake the quiz |
| `16-empty-states.yaml` | Every empty state on a fresh install |

Shared steps live in `subflows/` and only run when a flow calls them:

- `_wait_for_app.yaml`: waits for the app to load in Expo Go.
- `_setup_skip_welcome.yaml`: gets past the welcome quiz to the Feed.
- `_open_recipe.yaml`: opens a recipe by searching Browse (`QUERY`, `RECIPE_ID`).
- `_browse_toggle_chip.yaml`: turns one quick chip on and clears it (`CHIP`).

## How they're written

- Taps use testIDs (`id:`); outcomes are checked against real on-screen text.
  Ids for lists come from the data: `plan-entry-<id>`, `shopping-item-<ingredient>`,
  `cupboard-item-<ingredient>`, `collection-row-<id>`, `recipe-card-<recipeId>`.
- `optional: true` is only used for things outside the app: iOS permission
  alerts, the "Open in Expo Go?" prompt, and the share sheet's Close button.
- On iOS a control inside another tappable control (the bookmark on a grid card,
  the + and − of a stepper) can be hidden from tests. Those flows tap a point on
  the outer control instead, for example `point: "88%,50%"` for a stepper's +.
- Recipes used: Carbonara (serves 2) and Vegetable Lasagna (8 steps, the last is
  "Rest 20 minutes."). If the catalogue changes these, update the flows.
- Screenshots (`takeScreenshot`) are named after the screen, like `feed-home`.
