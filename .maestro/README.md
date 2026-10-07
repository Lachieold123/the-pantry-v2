# Maestro flows

> Everyday journey checks now run on the web build (`npm run test:web`, `e2e/web`, D-040). Maestro is for release checks of what only an iPhone shows.

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
  run. Flows open the app at `${METRO_URL}`; the runner starts its own Metro on port 8082 and passes `-e METRO_URL=exp://127.0.0.1:8082`. To run a flow by hand: `maestro test -e METRO_URL=exp://127.0.0.1:8081 .maestro/07-plan.yaml`.

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
| `01-welcome-complete.yaml` | First launch: "Anything you don't eat?" (with Back), tap three things into the cupboard, land on What I have, walk the tour, replay it from Settings |
| `02-welcome-skip.yaml` | First launch: Skip, and a relaunch stays past the welcome |
| `03-shell-navigation.yaml` | Tab bar (Home · Plan · ＋ · List · Cupboard), Browse from Home's search, side menu to every destination and back, Browse's "+" opens the editor, the centre "+" opens Share a dish, avatar opens Settings |
| `04-feed.yaml` | The "What I have" switch, the cards and filters, no-match and Clear filters, tonight's planned dinner leads, What I have with a stocked cupboard |
| `05-browse.yaml` | Every quick chip and the pill, a mood shelf, See all, a misspelt search, the filters sheet, save from a grid card, no results |
| `06-recipe-page.yaml` | Save/undo, plan it, share, mark cooked/undo, servings and units, tick an ingredient, the "⋯" menu |
| `07-plan.yaml` | Add a meal, change servings, remove/undo, a suggestion; then the List tab: tick, remove/undo, add an extra (the field at the top of the list), A–Z, clear/undo, send, both weeks |
| `08-cupboard.yaml` | Add by search, remove/undo, no "Add one thing" or "Stock up" any more, the "move ticked shopping here" switch (and that it works), what can I make |
| `09-cookmarks.yaml` | Empty state, then a saved recipe listed and opened |
| `10-collections.yaml` | Create (and refuse a duplicate), open, rename, delete/undo, add a recipe to one |
| `11-my-recipes.yaml` | Import rejects a bad link; write a recipe with validation, save, open, edit, delete/undo; cancel asks first |
| `12-recent-and-stats.yaml` | Recent and Kitchen stats, empty then filled |
| `13-cook-mode.yaml` | Next/back, swipe, ingredients, a timer, Done counts as cooked |
| `14-surprise.yaml` | Surprise me: deck, meal and time settings, tap to spin, spin again, how it works, plan it, cook this |
| `15-settings.yaml` | Appearance, high contrast, diet and avoid, Sunday reminder, units, redo the welcome |
| `16-empty-states.yaml` | Every empty state on a fresh install |
| `17-home-what-i-have.yaml` | Home's "What I have / Everything" switch: empty-cupboard state, the cupboard line opens the Cupboard, the line counts a stocked cupboard, Everything hides it, search opens Browse |
| `18-share-a-dish.yaml` | The centre "+": Share says what's missing, the photo choice, link a recipe, the preview, Close keeps a draft, Discard clears it (no photo: the system picker can't be automated) |
| `19-plate-page.yaml` | No plates on a fresh Home, and a link to a missing plate says so (a real plate needs a photo, so it can't be made here) |
| `20-scan-coming-soon.yaml` | Both scan sheets say "Coming soon" with no dead camera button; Not now closes; Add a list instead works |
| `21-list-tab.yaml` | Plan a recipe, then tick an item off on the List tab: count drops by one, it moves to the cupboard, unticking takes it back |
| `22-first-use-tour.yaml` | The tour's card appears (once its spotlight has settled) after Skip on a fresh install, Skip tour ends it, a relaunch doesn't bring it back, Settings replays all four stops |
| `23-recipe-to-list.yaml` | Carbonara's "Add to list": untick one, add the rest, the sheet then names what's already on the list, and the List tab has them |
| `24-pro.yaml` | Settings' Pro row opens a paywall that says Pro isn't on sale yet; with the development "Preview the free limits" switch on, planning next Sunday opens Pro instead (Monday to Saturday) |
| `25-household.yaml` | Start sharing from Settings → Household, see yourself and "Up to date", then leave. Needs the internet and anonymous sign-ins on in Supabase |
| `26-account.yaml` | Signed out, Settings' first row "Back up your kitchen" opens the sign-in sheet with Continue with Apple and no email (hidden until `EMAIL_CODES_CONNECTED`); Not now closes it. No real sign-in (Apple's sheet and an inbox are checked by hand) |

Shared steps live in `subflows/` and only run when a flow calls them:

- `_wait_for_app.yaml`: waits for the app to load in Expo Go.
- `_setup_skip_welcome.yaml`: gets past the welcome and the first-use tour to Home.
- `_open_recipe.yaml`: opens a recipe straight from a link over Home (`RECIPE_ID`), so Back lands on Home.
- `_open_browse.yaml`: opens Browse from Home's search bar (Browse isn't a tab since D-033).
- `_browse_toggle_chip.yaml`: turns one quick chip on and clears it (`CHIP`).

## How they're written

- Taps use testIDs (`id:`); outcomes are checked against real on-screen text.
  Ids for lists come from the data: `plan-entry-<id>`, `shopping-item-<ingredient>`,
  `cupboard-item-<ingredient>`, `collection-row-<id>`, `recipe-card-<recipeId>`.
- `optional: true` is only used for things outside the app: iOS permission
  alerts, the "Open in Expo Go?" prompt, and the share sheet's Close button.
- On iOS a control inside another tappable control (the bookmark on a grid card,
  the + and − of a stepper, the "For 2" pill and × on a planned meal) is hidden
  from tests, and so is any text inside a control that has its own label. Those
  flows tap a point on the outer control instead, for example
  `point: "88%,50%"` for a stepper's +, and check the outer control's whole
  label ("Diet, Vegetarian", "Weeknight dinners, 0 recipes").
- Text can be below the fold even when it's on the page. Anything under a big
  card or a list uses `scrollUntilVisible` first.
- Recipes used: Carbonara (serves 2) and Vegetable Lasagna (8 steps, the last is
  "Rest 20 minutes."). If the catalogue changes these, update the flows.
- Screenshots (`takeScreenshot`) are named after the screen, like `feed-home`.
