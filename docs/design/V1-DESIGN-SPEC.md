# V1 design spec: The Pantry (old app), extracted for re-implementation

**Status:** reference extract, 30 Sep 2026. Read-only source: `/home/claude/old-audit` (cited as `file:line`, paths relative to `old-audit/src/` unless they start with `App.tsx`/`app.json`). Screenshots: `docs/design/v1-reference/*.jpg` (390 × 844 pt, rendered 2× from the Expo **web** export).

**Scope:** every visual value the old code sets, grouped so it can become tokens + components. Where the code and a screenshot disagree, or where the old code has a bug, it is flagged with **⚠**. Section 8 collects all of those.

> **Conflict to resolve before building (not a design question this doc can settle):** "visually indistinguishable from v1" contradicts D-016 (Paper/Night palettes + Newsreader/Manrope approved) and the CLAUDE.md brand rules ("no green, no emojis in the UI, Newsreader + Manrope"). v1 uses Georgia + system sans, several greens, and a few emoji glyphs. See §8.1.

---

## 0. Conventions and rendering notes

- **Units** are React Native points (pt). Screenshots are 2×, so 1 pt = 2 px in the JPGs.
- **Theme access.** Every themed screen builds styles with `makeStyles(theme)` from `useTheme()` (`theme.ts:175`). A `theme` export that is always LIGHT also exists for back-compat (`theme.ts:183`).
- **Serif weights on iOS.** `SERIF` is Georgia (`theme.ts:9-13`). iOS Georgia ships Regular and Bold only, so `fontWeight` 500 renders as Regular and 600/700/800 all render as Bold. The screenshots (web, Georgia) show the same two-step behaviour. If v2 swaps to a font with real 500/600 cuts, 600-weight titles will look lighter than v1. To match v1, map serif 600 → 700.
- **Sans** is the platform default (San Francisco on iOS, Roboto on Android; the web export shows Arial/Helvetica). No custom font is loaded (`theme.ts:4-8`). `fontWeight` 800/900 is used widely on sans.
- **Line heights** not set in code fall back to the platform default (about 1.2× on iOS).
- **Page transitions.** Tab roots (Browse, Cupboard, Plan) mount with `animationType="none"`. Pushed screens slide up (see §6).
- **Hairline.** `StyleSheet.hairlineWidth` = 1 physical pixel (0.33 pt on 3× iPhones). Many dividers use it; others use a full `1`.

---

## 1. Colour

### 1.1 Core palette (`theme.ts`)

| Old key | Light (`theme.ts:24-67`) | Dark (`theme.ts:71-106`) | HC light (`theme.ts:121-126`) | HC dark (`theme.ts:127-132`) | Proposed token | Role |
|---|---|---|---|---|---|---|
| `bg` | `#FFFFFF` | `#0A0A0A` | `#FFFFFF` | `#000000` | `color.bg` | page background, text on ink fills |
| `bgSoft` | `#F7F7F7` | `#141414` | `#F0F0F0` | `#101010` | `color.bgSoft` | inputs, chips, tiles, sunken cards, pressed rows |
| `card` | `#FFFFFF` | `#141414` | `#FFFFFF` | `#000000` | `color.card` | raised cards, drawer panel, hero buttons |
| `cardAlt` | `#F4F4F4` | `#1F1F1F` | `#E8E8E8` | `#1C1C1C` | `color.cardAlt` | "other" cuisine tint only |
| `border` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.10)` | `rgba(0,0,0,0.55)` | `rgba(255,255,255,0.6)` | `color.border` | all 1 pt borders, dividers, progress tracks |
| `borderSoft` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.32)` | `rgba(255,255,255,0.35)` | `color.borderSoft` | defined, no screen uses it |
| `ink` | `#1A1A1A` | `#F7F3EA` | `#000000` | `#FFFFFF` | `color.ink` | primary text; **also the fill of every "black" pill/card** (inverts to cream in dark) |
| `inkSoft` | `#4A4A4A` | `#D1D1D6` | `#1A1A1A` | `#F0F0F0` | `color.inkSoft` | body copy, step text, secondary labels |
| `inkMuted` | `#6E6E6E` | `#9C968C` | `#363636` | `#C8C8C8` | `color.inkMuted` | meta, kickers, placeholders, inactive tabs |
| `inkSubtle` | `#BCBCBC` | `#48484A` | `#595959` | `#9A9A9A` | `color.inkSubtle` | handles, rules, disabled, italic numerals |
| `accent` | `#C99155` | `#E0AC6E` | `#8A5A22` | `#F0C081` | `color.accent` | amber: kickers, badges, saved bookmark, step rule |
| `accentDeep` | `#A2723D` | `#C99155` | `#6E4A1C` | `#E0AC6E` | `color.accentDeep` | timer-chip text, "START →", edit label |
| `accentSoft` | `#FBEDD6` | `#3D2C13` | (light) | (dark) | `color.accentSoft` | timer-chip fill, pairings card, edit pill |
| `orange` | `#F5B945` | `#F5B945` | — | — | `color.orange` | ingredient bullet dot |
| `orangeDeep` | `#D8A030` | `#D8A030` | — | — | `color.orangeDeep` | unused |
| `orangeSoft` | `#FCE9C5` | `#3A2C12` | — | — | `color.tint.orange` | Mexican tint, "medium" difficulty chip |
| `peach` | `#F5B5A0` | same | — | — | `color.peach` | unused |
| `peachSoft` | `#FBDDD0` | `#3A201A` | — | — | `color.tint.peach` | Italian/meat/snack tint |
| `yellow` | `#FFE9A8` | same | — | — | `color.yellow` | unused |
| `butter` | `#FFF3CC` | `#3A2F18` | — | — | `color.tint.butter` | Indian/breakfast tint |
| `mint` | `#D6EFE0` | `#1F3D2C` | — | — | `color.tint.mint` | Middle Eastern/veg/lunch tint (**green**) |
| `sky` | `#D6E6F2` | `#1F2E3D` | — | — | `color.tint.sky` | American/seafood tint |
| `lavender` | `#E3DCF3` | `#28213D` | — | — | `color.tint.lavender` | European/dinner tint |
| `rose` | `#F8D2DD` | `#3D202A` | — | — | `color.tint.rose` | Asian tint, "hard" chip |
| `danger` | `#D85A5A` | `#FF6B6B` | — | — | `color.danger` | numeric badges, destructive labels, liked heart |

Shared layout tokens (`theme.ts:16-22`): `rowH 64`, `radiusXl 32`, `radiusLg 24`, `radiusMd 18`, `radiusSm 12`. HC themes inherit everything not overridden (`theme.ts:133-134`).

### 1.2 Category tint palettes (all **light-only** ⚠)

Built from `LIGHT_THEME` at module load, so they never switch in dark mode (`theme.ts:187-210`).

| Map | Key → `{bg, ink}` | Proposed token |
|---|---|---|
| `CUISINE_COLORS` (`theme.ts:187-196`) | italian `peachSoft`/`#8A4B2C`; mexican `orangeSoft`/`#8A6020`; asian `rose`/`#9A3B5E`; indian `butter`/`#8A6C20`; middleEastern `mint`/`#3A6E4E`; american `sky`/`#3D6488`; european `lavender`/`#5B4F8A`; other `cardAlt`/`inkSoft` | `color.cuisineTint.<key>.{bg,ink}` |
| `DIET_COLORS` (`theme.ts:198-203`) | meat `peachSoft`/`#8A4B2C`; seafood `sky`/`#3D6488`; vegetarian `mint`/`#3A6E4E`; other `cardAlt`/`inkSoft` | `color.dietTint.*` |
| `MEAL_TYPE_COLORS` (`theme.ts:205-210`) | breakfast `butter`/`#8A6C20`; lunch `mint`/`#3A6E4E`; dinner `lavender`/`#5B4F8A`; snack `peachSoft`/`#8A4B2C` | `color.mealTint.*` |
| Filters time/difficulty (`screens/FiltersModal.tsx:42-52`) | quick `mint`, medium `butter`, slow `peachSoft`; easy `mint`, medium `orangeSoft`, hard `rose`; one-pot `mint` (`:157`) — all with `activeInk = theme.ink` | reuse tints |

Used by: `MealCard` eyebrow + no-photo fill, `MealRow` bubble, `RecipeModal` hero band fallback (`RecipeModal.tsx:161,182`), `FiltersModal` active chips.

### 1.3 Cuisine eyebrow colours (text on card/photo)

`data/cuisineColors.ts:11-58`. Same hex in light and dark ("tuned for dark backgrounds", `:4-5`). Used by every card except `MealCard`.

| Label | Hex | Label | Hex |
|---|---|---|---|
| ITALIAN | `#B85A3D` | INDIAN | `#C66A3C` |
| KOREAN | `#3D9C6E` (green) | ASIAN | `#B05060` |
| FRENCH | `#7C6FB8` | EUROPEAN | `#8A6FB0` |
| JAPANESE | `#C04A38` | VEGAN / VEGETARIAN | `#4FAA72` (green) |
| AMERICAN | `#B88E47` | BREAKFAST | `#B89247` |
| MIDDLE EASTERN | `#3D9E82` (green) | DESSERT | `#B07088` |
| MEXICAN | `#C87838` | | |

Fallback tags by dish name (`cuisineColors.ts:32-41`): BOWL `#4FAA72`, COMFORT `#B88E47`, QUICK `#B88E47`, BAKE `#B07088`, MORNING `#B89247`, PASTA `#B85A3D`, GRILL `#B85A3D`; last resort DISH `#9c968c` (`:58`). Proposed token: `color.cuisine.<key>`.

⚠ Two cuisine systems coexist: `MealCard` (Recently viewed, Recommended) uses `CUISINE_COLORS[].ink` (e.g. INDIAN `#8A6C20`, olive), everything else uses `CUISINE_EYEBROW` (INDIAN `#C66A3C`, rust). Screenshot `light-20-recent` shows the olive INDIAN; `light-11c-browse-3` shows the purple EUROPEAN `#8A6FB0`.

### 1.4 Cupboard category palette (**light-only** ⚠)

`screens/PantryModal.tsx:88-97` — `{tint, bold, soft}`; `CHIP_INK #2a2218` (`:106`) for chip names.

| Category | tint (fill) | bold (initial, ×) | soft (rule, selected border) |
|---|---|---|---|
| Proteins | `#ffdbd2` | `#973023` | `#d37d6f` |
| Vegetables | `#cff3d5` | `#006c28` | `#63ab74` |
| Fruit | `#f9e6bf` | `#7b4e00` | `#b7933f` |
| Sauces | `#ffdec8` | `#923900` | `#cf8358` |
| Pantry | `#fde4bf` | `#814a00` | `#bd8f41` |
| Dairy | `#f3e8bf` | `#715400` | `#ae9740` |
| Herbs | `#d8f1cc` | `#316800` | `#7aa761` |
| Other | `#ffe0c4` | `#8d3e00` | `#ca874e` |

Chip border = `soft` + `73` alpha suffix (≈45 %, `PantryModal.tsx:969`). Screenshot `dark-12-cupboard` confirms the pastel chips stay light on the black page. Proposed: `color.pantryCat.<cat>.{tint,bold,soft}`, `color.pantryChipInk`.

### 1.5 Hard-coded colours with a clear role

| Role | Value | Where | Mode behaviour | Proposed token |
|---|---|---|---|---|
| Toolbar fade | light `rgba(255,255,255,0)→1→1`; dark `rgba(10,10,10,0)→1→1`, stops `[0,0.5,1]`, height 110 | `components/Toolbar.tsx:73-81,193` | switches on literal `theme.bg === '#FFFFFF'` ⚠ (HC dark `#000` gets the `#0A0A0A` fade) | `gradient.toolbarFade` (derive from `bg`) |
| FAB fill / icon | `theme.ink` / `theme.bg`; ring `theme.bg` 5 pt | `Toolbar.tsx:116,251,264-265` | inverts (black in light, cream in dark) | `color.ink`, `color.bg` |
| FAB shadow | `#000` @0.45 | `Toolbar.tsx:259-262` | both | `shadow.fab` |
| Toolbar badge | fill `accent`, text `#FFFFFF` | `Toolbar.tsx:230,235` | both | `color.onAccent = #FFFFFF` |
| Numeric badge (masthead/inbox) | fill `danger`, text `#FFFFFF` | `components/Badge.tsx:29,49` | both | `color.onDanger` |
| Drawer count badge | fill `ink`, text `#FFFFFF` | `screens/SideDrawer.tsx:356,360` | ⚠ invisible in dark (white on cream; see `dark-14-drawer`) | fix: text `color.bg` |
| Filter count badge | fill `accent`, text `#FFFFFF` | `BrowseModal.tsx:833,836` | both | |
| Toast | fill `#F7F3EA`, icon + text `#0A0A0A`, shadow `#000` @0.35 | `components/Toast.tsx:102,131,141,133` | fixed cream in **both** modes | `color.toast.bg/ink` |
| Streak / shopping / cook-mode "black" cards | `theme.ink` fill, `theme.bg` text | `StatsModal.tsx:213`, `CartModal.tsx:1037`, `RecipeModal.tsx:862` | invert to cream in dark (`dark-13b-plan-2`) | `color.ink` |
| Shopping-card chip | `rgba(0,0,0,0.05)` on ink | `CartModal.tsx:1064` | ⚠ near-invisible on black in light | `color.inkChipOnInk` |
| Cook Mode CTA icon disc | `rgba(255,255,255,0.10)` | `RecipeModal.tsx:870` | ⚠ invisible on cream in dark | |
| HAVE pill | fill `ink`, text/icon `bg` | `components/RecipeBody.tsx:452-459` | inverts | |
| Match % pill | fill `ink`, text/icon `bg` | `PantryModal.tsx:1340,1344` | inverts (cream pill in dark, `dark-12b`) | |
| Timer chip idle / running / paused / done | `accentSoft`/`accentDeep`; `ink`/`#FFFFFF`; `inkSubtle`/`ink`; `accent`/`#FFFFFF` | `components/StepText.tsx:146-173` | ⚠ running = white on cream in dark | `color.timer.*` |
| Photo bookmark disc (MealCard) | `rgba(255,255,255,0.92)`, icon `inkSoft`/`accent` | `MealCard.tsx:148,66` | fixed white | `color.onPhotoDisc` |
| Photo bookmark disc (Browse preview) | `rgba(255,255,255,0.94)`, icon `#1A1A1A`/`accent` | `BrowseModal.tsx:1126,709` | fixed white | |
| Feed heart disc | `rgba(255,255,255,0.92)`, icon `#1A1A1A` / `danger` | `FeedScreen.tsx:839,561` | fixed | |
| Multi-photo pip | `rgba(0,0,0,0.55)` + `#FFFFFF` icon | `FeedScreen.tsx:824,542` | fixed | |
| Hidden overlay | `rgba(0,0,0,0.4)`, label `#FFFFFF` | `MealCard.tsx:130,135` | fixed | |
| Recipe-of-day scrim | `transparent → rgba(0,0,0,0.78)`, stops `[0.4,1]` | `BrowseModal.tsx:629-634` | fixed | `gradient.photoScrim.rotd` |
| Collection card scrim | `transparent → rgba(0,0,0,0.75)`, stops `[0.55,1]` | `BrowseModal.tsx:598-603` | fixed | `gradient.photoScrim.shelf` |
| Feed hero scrim | `rgba(0,0,0,0) → rgba(0,0,0,0.85)`, stops `[0.45,1]` | `FeedScreen.tsx:358-363` | fixed | |
| Spinner hero scrim | `transparent → rgba(0,0,0,0.2) → rgba(0,0,0,0.92)`, stops `[0.3,0.45,0.92]` | `SpinnerModal.tsx:695-700` | fixed | |
| Spinner page glow | `transparent → rgba(232,200,145,0.05) → transparent` @`[0.2,0.55,0.9]` + `transparent → rgba(232,200,145,0.04)` @`[0.7,1]` | `SpinnerModal.tsx:359-370` | both | |
| Spinner peek dim | `rgba(0,0,0,0.55)` | `SpinnerModal.tsx:667` | fixed | |
| Recipe hero top scrim | `rgba(0,0,0,0.25) → 0`, height 110 | `RecipeModal.tsx:191-195` | fixed | |
| On-photo title | `#FFFFFF` (rotd, shelf, feed hero); `#F7F3EA` (spinner hero) | `BrowseModal.tsx:974,1012`, `FeedScreen.tsx:735`, `SpinnerModal.tsx:915` | fixed | `color.onPhoto` |
| On-photo meta | `rgba(255,255,255,0.85)` text, `0.6`/`0.55` dots, `0.75` counts, `0.8` icons | `FeedScreen.tsx:749-760,378`; `SpinnerModal.tsx:929-935`; `BrowseModal.tsx:1021` | fixed | `color.onPhotoMuted` |
| Amber (serif accents) | `#E8C891` | `SpinnerModal.tsx:43`; `CookmarksModal.tsx:37`; `CollectionsModal.tsx:32` | fixed | `color.amberLight` |
| Spinner corner rule | `rgba(232,200,145,0.85)` | `SpinnerModal.tsx:903` | fixed | |
| Cream library card | `#F7F3EA` fill, title `#0E0E0E`, meta `rgba(20,18,16,0.55)`, dot `rgba(0,0,0,0.35)`, image well `#1A1815`, no-photo icon `#3A3631` | `CookmarksModal.tsx:42-45,350,179`; `CollectionsModal.tsx:37-40,506,569` | fixed cream in **both** modes (screenshot `light-17` shows cream cards on white) | `color.libraryCard.*` |
| Overlay scrims | sheets `rgba(0,0,0,0.5)` (`BottomSheet.tsx:258`, `SpinnerModal.tsx:1068`, `UserProfileModal.tsx:616`); drawer `rgba(0,0,0,0.42)` (`SideDrawer.tsx:262`); dropdown `rgba(0,0,0,0.4)` (`FilterDropdown.tsx:139`) | | fixed | `color.scrim` (0.5), `color.scrimDrawer` (0.42) |
| Onboarding glass | fills `rgba(255,255,255,0.12/0.14)`, borders `0.16/0.18`, track `0.22`, outline btn `0.3`, text `0.7/0.75/0.82/0.85/0.9`, primary `#FFFFFF`; page `#000` | `OnboardingModal.tsx:700-963,967-1080` | fixed (always dark) | `color.onVideo.*` |
| Onboarding scrims | welcome top `rgba(0,0,0,0.25)→0` h180; bottom `0→0.78` from 40 %; quiz `0.5→0.7→0.88` @`[0,0.45,1]`; reveal/notif `0.55→0.72→0.9` | `OnboardingModal.tsx:201-209,264-269,553-557,640-644` | fixed | |
| Checklist "done" | `#5C7D52` (green); ring track `#ECE7DD` light / `rgba(255,255,255,0.16)` dark; card shadow `#1B1813` | `components/FirstRunChecklist.tsx:21,134,174` | branches on `isDark` | |
| Composer photo × | `rgba(0,0,0,0.7)` | `RecipeModal.tsx:1072` | fixed | |
| Recipe `Cooked` pill | active fill `accent`, icon/text `#FFFFFF` | `RecipeModal.tsx:966,507,969` | both | |
| Amber button label | `#FFFFFF` on `accent` | `CustomMealsModal.tsx:193`, `RecipeModal.tsx:1368` | both | `color.onAccent` |
| Staples switch | track off `border`, on `ink`; thumb `bg` (on) / `ink` (off) | `PantryModal.tsx:634-636` | ⚠ web export shows a teal RN-web thumb (`light-12b`) | |
| Settings switch | track off `bgSoft`, on `accent`; thumb `#FFFFFF` | `SettingsModal.tsx:553-554` | both | |
| Splash / app background | `#FFFFFF` (iOS), adaptive icon bg `#14110d` | `app.json:10,15,122` | | |

---

## 2. Typography

### 2.1 Families

- `font.serif` = Georgia (iOS) / `serif` (Android) / `Georgia, "Times New Roman", serif` (web) — `theme.ts:9-13`. Used for display, titles, card names, big numbers, italic accents.
- `font.sans` = system default (no `fontFamily` set). Used for everything else: kickers, body, buttons, chips, tab bar.

### 2.2 Type roles

Counts are style definitions with that exact combo across `components/`, `screens/`, `pro/` (dead duplicate styles in `RecipeModal.tsx:1133-1344` are counted, marked "dup"). "ls" = letterSpacing, "lh" = lineHeight, "UP" = uppercase (usually typed in caps rather than `textTransform`).

#### Wordmark and screen headings

| Proposed token | Family | Size | Weight | ls | lh | Other | Colour | Uses (count) |
|---|---|---|---|---|---|---|---|---|
| `type.wordmark` | serif | 24 | 600 | -0.4 | 30 | centred | ink | Masthead "The Pantry" `Masthead.tsx:103-111` (1). Drawer brand is 22/700/-0.4 `SideDrawer.tsx:305-311` |
| `type.screenKicker.accent` | sans | 11 | 800 | 3 | — | UP, mb 6 | accent | "BROWSE" `BrowseModal.tsx:771-777`, INBOX, SETTINGS, KITCHEN STATS, RECENTS, RECIPES BY, PLAN (MealPicker) … (16 incl. onboarding white variant) |
| `type.screenKicker.muted` | sans | 11 | 700 | 3 | — | UP, mb 8 | inkMuted | "CUPBOARD" `PantryModal.tsx:1091-1097`, "PLAN" `CartModal.tsx:720-726` (2). "TONIGHT'S DINNER" is 11/700/**3.5**, mb 10 `SpinnerModal.tsx:795-801` |
| `type.display.tabRoot` | serif | 38 | 700 | -0.8 | (Plan 44) | mb 14 on Cupboard | ink | "Discover", "What do you have?", "Your week" (3) `BrowseModal.tsx:778-784`, `PantryModal.tsx:1098-1105`, `CartModal.tsx:745-753` |
| `type.display.library` | serif | 52 | 500 (renders Regular) | -1.8 | 52 | mt 8 | ink | "Saved", "Your shelves" (2) `CookmarksModal.tsx:306-314`, `CollectionsModal.tsx:439-447` |
| `type.display.spinner` | serif | 48 | 500 | -1.2 | 52 | accent word: italic 400 `#E8C891` | ink | "Surprise *me*" (1) `SpinnerModal.tsx:802-818` |
| `type.display.welcome` | serif | 44 | 700 | -1 | 48 | white | `#FFFFFF` | onboarding welcome (1) `OnboardingModal.tsx:1006-1014` |
| `type.title.pushed` | serif | 30 | 700 | -0.6 | 34 | — | ink | pushed-screen titles: Activity/Messages, Preferences, Recently viewed, Your cooking, Saved bites… (11, includes feed hero & spinner hero variants) `InboxModal.tsx:410-416`, `FilteredMealsModal.tsx:153-160`, `StatsModal.tsx:202-209`, `SettingsModal.tsx:584-590` (no lh) |
| `type.title.pushedSans` (legacy) | sans | 28 | 800 | -0.8 | 32 | — | ink | "Your own meals", "Refine your rotation", result name (3) `CustomMealsModal.tsx:161`, `FiltersModal.tsx:196` |
| `type.title.onboarding` | serif | 34 | 700 | -0.8 | 38 | mb 14 | `#FFFFFF` | quiz step titles (1) `OnboardingModal.tsx:729-737` |
| `type.title.recipe` | serif | 32 | 700 | -0.6 | 36 | mb 4 | ink | recipe page title `RecipeModal.tsx:787-796`; notif step title (white, centred) `OnboardingModal.tsx:915-924` (2) |
| `type.title.profile` | serif | 32 | 700 | -0.5 | — | centred, mb 4 | ink | profile name `UserProfileModal.tsx:433-441` (1) |
| `type.title.section` | serif | 22 | 700 | -0.4 | 26 | — | ink | section titles under a kicker ("Recipe of the day", "From your saved", "From your cupboard") (9) `BrowseModal.tsx:936-943`, `PantryModal.tsx:1293-1301` (+mt 4), `CartModal.tsx:974-981`, `FeedScreen.tsx:778-785` |
| `type.kicker.section.accent` | sans | 11 | 800 | 2.5 | — | UP, mb 4 | accent | Browse + Feed section kickers (7) `BrowseModal.tsx:929-935`, `FeedScreen.tsx:771-777`, `PaywallModal` hero kicker |
| `type.kicker.section.muted` | sans | 11 | 700 | 2.5 | — | UP | inkMuted | Cupboard/Plan/Spinner section kickers, sheet kickers (11) `PantryModal.tsx:1125-1130`, `CartModal.tsx:967-973`, `SpinnerModal.tsx:976-983` |
| `type.kicker.list` | sans | 11 | 800 | 2 | — | UP | inkMuted | sheet titles, settings section labels, aisle headers (accent), "OR IMPORT FROM A LINK" (10) `SettingsModal.tsx:615-622`, `FilterDropdown.tsx:154-161`, `CartModal.tsx:1156-1163` |
| `type.kicker.drawer` | sans | 10 | 800 | 2 | — | UP | inkMuted | drawer section labels (3) `SideDrawer.tsx:322-329` |
| `type.kicker.slot` | sans | 10 | 700 | 2 | — | UP, mb 8 | inkMuted | "BREAKFAST/LUNCH/DINNER" (3) `CartModal.tsx:894-900` |
| `type.kicker.library` | sans | 10.5 | 700 | 2.5 | — | UP, after 22×1 rule | inkMuted | "SAVED", "COLLECTIONS" (2) `CookmarksModal.tsx:300-305` |
| `type.kicker.cupGroup` | sans | 10.5 | 700 | 2.8 | — | UP, opacity 0.85 | ink | "PROTEINS" etc. (1) `PantryModal.tsx:1178-1184` |

#### Cards

| Proposed token | Family | Size | Weight | ls | lh | Colour | Uses |
|---|---|---|---|---|---|---|---|
| `type.eyebrow.card` | sans | 9.5 | 800 | 1.8 | — | cuisine colour | Browse preview, match card, create preview (3) `BrowseModal.tsx:1139-1144`, `PantryModal.tsx:1350-1355` |
| `type.eyebrow.cardTight` | sans | 9.5 | 800 | 1.6 | — | cuisine | Plan suggestion, cookmark/collection cards (3) `CartModal.tsx:1009-1014`, `CookmarksModal.tsx:378-383` |
| `type.eyebrow.row` | sans | 10 | 800 | 1.8 | — | cuisine | Plan slot card (1) `CartModal.tsx:919-924` |
| `type.eyebrow.trending` | sans | 10 | 800 | 2 | — | cuisine | trending row (1) `BrowseModal.tsx:1078-1083` |
| `type.eyebrow.hero` | sans | 10.5 | 800 | 2 | — | cuisine | recipe of the day (1) `BrowseModal.tsx:967-972` |
| `type.eyebrow.mealCard` | sans | 10 | 700 | 1.2 | — | `CUISINE_COLORS.ink`, textTransform UP | `MealCard.tsx:111-117` (1) |
| `type.eyebrow.spinnerCorner` | sans | 10 | 800 | 2.8 | — | `#E8C891`, UP | `SpinnerModal.tsx:905-911` (1) |
| `type.cardTitle.l` | serif | 17 | 600 | -0.3 | 19 | ink | Browse preview, trending name (+mb 4) (2) `BrowseModal.tsx:1145-1151,1084-1092` |
| `type.cardTitle.mealCard` | serif | 17 | 700 | -0.2 | 21 | ink, minH 42 | `MealCard.tsx:118-126` (1) |
| `type.cardTitle.library` | serif | 17 | 600 | -0.2 | 18.5 | `#0E0E0E`, minH 38, mt 4, mb 8 | cookmark/collection recipe cards (2) |
| `type.cardTitle.scan` | serif | 17 | 600 | -0.2 | 19 | ink | Snap pantry / Scan receipt (1) `PantryModal.tsx:1459-1466` |
| `type.cardTitle.match` | serif | 18 | 600 | -0.3 | 20 | `bg` (on ink card), mb 6 | `PantryModal.tsx:1356-1364`; unlock title same size, no lh (2) |
| `type.cardTitle.m` | serif | 16 | 600 | -0.3 | — | ink | Plan slot meal title `CartModal.tsx:925-931` (1); collection name 16/600/-0.2 lh18 `CollectionsModal.tsx:585-592` |
| `type.cardTitle.s` | serif | 15 | 600 | -0.2 | 18 | ink, mb 6 | Plan suggestion `CartModal.tsx:1015-1023` (1) |
| `type.cardTitle.onPhoto.l` | serif | 30 | 700 | -0.6 | 32–34 | `#FFFFFF` / `#F7F3EA` | feed hero, spinner hero |
| `type.cardTitle.onPhoto.m` | serif | 26 | 700 | -0.5 | 30 | `#FFFFFF` | recipe of the day `BrowseModal.tsx:973-980` |
| `type.cardTitle.onPhoto.s` | serif | 19 | 700 | -0.3 | 23 | `#FFFFFF`, mb 2 | Cook-by-mood shelf `BrowseModal.tsx:1011-1019` |
| `type.cardMeta` | sans | 12 | 600 | — | — | inkMuted / inkSoft / `bgSoft` on ink | trending meta, plan meal meta, match meta (17 incl. other 12/600 uses) |
| `type.cardMeta.s` | sans | 11 | 600 | — | — | inkSoft / inkMuted | plan suggestion "22m", tile handle (8) |
| `type.cardMeta.library` | sans | 11 | 500 | — | — | `rgba(20,18,16,0.55)` | cookmark foot (6 incl. others) |
| `type.shelfCount` | sans | 12 | 600 | — | — | `rgba(255,255,255,0.75)` | "12 recipes" on mood cards |

#### Body, lists, controls

| Proposed token | Family | Size | Weight | ls | lh | Colour | Uses |
|---|---|---|---|---|---|---|---|
| `type.body.ingredient` | sans | 15 | 400 | — | 22 | ink (checked: inkSubtle + line-through) | `RecipeBody.tsx:436-440` |
| `type.body.step` | sans | 15 | 400 | — | 23 | inkSoft | `RecipeBody.tsx:495` |
| `type.body.m` | sans | 14 | 400 | — | 20 (most) | inkMuted / inkSoft | subtitles, empty bodies, notes (14/21) — 43 defs |
| `type.body.s` | sans | 13 | 400 | — | 18–20 | inkMuted | hints, helper copy — 28 defs |
| `type.body.xs` | sans | 12 | 400 | — | — | inkMuted | settings helper/rowSub/footer — 16 defs |
| `type.subtitle.page` | sans | 14 | 400 | — | 20 | inkMuted (Cupboard) / inkSoft (Spinner), maxWidth 320 | `PantryModal.tsx:1106-1111`, `SpinnerModal.tsx:819-824` |
| `type.body.italicNote` | sans italic | 12 | 400 | — | 17 | inkMuted, arrow `↳` accent 700 non-italic | substitution line `RecipeBody.tsx:461-474` (4) |
| `type.heading.sans` | sans | 20 | 800 | -0.4 | — | ink, mt 12 mb 14 | "Ingredients :", "Directions :", "Notes :", "Nutrition :" `RecipeBody.tsx:402-409`; empty titles (4 + 5 with no ls) |
| `type.heading.sans.s` | sans | 16 | 800 | -0.2/-0.3 | — | ink, mb 12 | "Comments", "Top cuisines", Filters sections (3+) `RecipeModal.tsx:978-984`, `StatsModal.tsx:261-267` |
| `type.group` | sans | 12 | 700 | 1.5 | — | inkMuted, UP, mt 10 mb 8 | ingredient group "VEGETABLES" `RecipeBody.tsx:412-420` (3) |
| `type.row` | sans | 15 | 600 | — | — | ink | drawer items `SideDrawer.tsx:345-350`, action-sheet rows, suggestion rows, rank label (8+1) |
| `type.row.s` | sans | 14 | 600 | — | — | ink | settings rows `SettingsModal.tsx:646`, staples title (6) |
| `type.rowValue` | sans | 13 | 500 | — | — | inkMuted | settings values (7) |
| `type.name` | sans | 14 | 800 | -0.2 | — | ink | drawer profile name, person name, recipe author name (7) |
| `type.name.l` | sans | 15 | 800 | -0.2 | — | ink | inbox row, profile stat number (4) |
| `type.label.button.l` | sans | 16 | 700 | — | — | `bg` | "Spin again" `SpinnerModal.tsx:1035` |
| `type.label.button` | sans | 14 | 800 | 0.3 | — | `bg` on ink | Edit profile/Follow `UserProfileModal.tsx:501` (5) |
| `type.label.button.alt` | sans | 14 | 700 | 0.3 | — | | servings Reset/Done (5) |
| `type.label.button.nav` | sans | 14 | 800 | 0.2 | — | `bg` | Cook Mode Next/Done, "Back to cooking" (3) |
| `type.label.button.onVideo` | sans | 15 | 800 | 0.3 | — | ink on white | onboarding primary (4) + arrow glyph 16/800 |
| `type.label.button.amber` | sans | (default ≈14–15) | 800 | 0.5 | — | `#FFFFFF` | My recipes Add/Import `CustomMealsModal.tsx:193` |
| `type.label.chip` | sans | 13 | 700 | 0.1 | — | ink / `#FFFFFF` active | `Chip.tsx:55-59` (3) |
| `type.label.quickChip` | sans | 13 | 700 | — | — | ink / bg active | Browse quick chips `BrowseModal.tsx:915-920` |
| `type.label.dropdown` | sans | 14 | 700 | — | — | ink / bg active | `FilterDropdown.tsx:130-135` |
| `type.label.segment` | sans | 15 | 700 (active 800) | — | — | inkMuted / bg | Browse Recipes/People `BrowseModal.tsx:856-857`; settings segment 13/700 inkSoft (`SettingsModal.tsx:665`) |
| `type.label.underlineTab` | sans | 13.5 | 700 | — | — | inkSoft / ink | Plan tabs `CartModal.tsx:790-795`; Inbox tabs 14/700/0.2 inkMuted→ink `InboxModal.tsx:436-442`; Cupboard browse tabs 14/600 `PantryModal.tsx:1637-1644` |
| `type.label.tabBar` | sans | 11 | 700 | 0 | — | ink active / inkMuted | `Toolbar.tsx:217-221` |
| `type.badge` | sans | 11 | 800 | — | 13 | `#FFFFFF` | `Badge.tsx:48-55`; drawer badge 11/800; toolbar badge 10/700 `Toolbar.tsx:234-238` |
| `type.pill.have` | sans | 9 | 800 | 1 | — | `bg` | HAVE `RecipeBody.tsx:455-460` (3) |
| `type.pill.match` | sans | 12 | 800 | — | — | `bg` | "43%" `PantryModal.tsx:1344` |
| `type.toast` | sans | 14 | 700 | 0.1 | 18 | `#0A0A0A` | `Toast.tsx:140-149` |
| `type.info.big` | sans | 16 | 800 | -0.2 | — | ink (accent when adjusted) | info tiles "23", "Easy" `RecipeBody.tsx:379-384` |
| `type.info.unit` | sans | 11 | 600 | — | — | inkMuted | "min", "servings" |
| `type.info.label` | sans | 10 | 700 | 0.5 | — | inkMuted, textTransform UP, mt 4 | "COOKING" `RecipeBody.tsx:390-397` |
| `type.stepNumber` | sans | 22 | 800 | — | — | ink, width 22, centred | `RecipeBody.tsx:482-488` |
| `type.timer` | inherits step text | 15 | 700 | — | 23 | see §1.5 | `StepText.tsx:146-154` (padding 8/2, radius 6 — ⚠ padding/radius on nested Text is ignored on iOS; the web render shows a pill) |
| `type.nutrition.calLabel` / `.calValue` | sans | 18 / 28 | 800 | -0.4 / -1 | — | ink | `RecipeBody.tsx:565-576` |
| `type.nutrition.row` / `.indent` / `.unit` | sans | 14 / 14 / 12 | 700 / 500 / 600 | — | — | ink / inkSoft (pl 16) / inkMuted | `RecipeBody.tsx:594-613` |

#### Numbers

| Token | Family | Size | Weight | ls | lh | Colour | Where |
|---|---|---|---|---|---|---|---|
| `type.number.streak` | serif | 72 | 700 | -2 | 76 | bg (on ink) | `StatsModal.tsx:219-226` |
| `type.number.cookStep` | serif italic | 64 | 500 | -2 | 64 | inkSubtle | `CookModeModal.tsx:431-440` |
| `type.number.servings` | serif | 56 | 700 | -2 | 60 | ink | `ServingsAdjusterModal.tsx:140` |
| `type.number.trending` | serif | 32 | 700 | -1 | — | inkMuted, width 44, "01" | `BrowseModal.tsx:1062-1069` |
| `type.number.statTile` | serif | 28 | 700 | -0.6 | — | ink | `StatsModal.tsx:245-251` |
| `type.number.unlock` / `browseTileMark` | serif italic | 22 | 500 | -0.4 | (22) | inkSubtle | `PantryModal.tsx:1385-1396,1672-1680` |
| `type.number.dayDate` | serif | 18 | 700 | -0.4 | — | ink / bg active | `CartModal.tsx:838-847` |
| `type.number.rank` | serif | 18 | 700 | — | — | inkMuted, width 22 | `StatsModal.tsx:277-283` |
| `type.number.chipInitial` | serif italic | 16 | 500 | -0.3 | 18 | category bold, width 12 | `PantryModal.tsx:1229-1238` |
| `type.number.count` | serif italic | 13–15 | 500–600 | -0.1 | — | inkMuted (cup group) / `#E8C891` (library "4") | `PantryModal.tsx:1189-1196`, `CookmarksModal.tsx:320-328` |
| `type.dayName` / `.dayDate` | serif | 26 / 18 | 600 | -0.4 / -0.2 | — | ink / inkMuted | Plan "Wednesday · Sep 30" `CartModal.tsx:867-880` |

#### Empty states (four different patterns ⚠)

| Pattern | Title | Body | Where |
|---|---|---|---|
| A (most) | sans 20/800 ink, mb 8 | sans 14 inkMuted centred (lh 20) | Feed `FeedScreen.tsx:905-906`, Inbox `InboxModal.tsx:511-512`, Recently viewed, Stats |
| B (library) | serif 26/600/-0.4 ink centred | sans 13.5/19 inkSoft, maxW 300 | Cookmarks, Collections |
| C (spinner) | serif 22/700 ink | sans 13 inkSoft | `SpinnerModal.tsx:1057-1064` |
| D (profile) | sans 18/800 ink | 14/20 inkMuted | `UserProfileModal.tsx:585-592` |

---

## 3. Spacing, layout, radii, shadows

### 3.1 Screen gutters and rhythm

| Thing | Value | Source |
|---|---|---|
| Standard horizontal padding | **20** | Masthead, title blocks, section heads, rows (`Masthead.tsx:78`, `BrowseModal.tsx:767`, `CartModal.tsx:716`…) |
| Recipe sheet / Cook Mode body / onboarding body | 24 | `RecipeModal.tsx:780`, `CookModeModal.tsx:421`, `OnboardingModal.tsx:716` |
| Library head / grid | 22 / 16 | `CookmarksModal.tsx:287,338` |
| Feed filter bar / grid rows / hero carousel | 12 / 10 / 12 margin | `FeedScreen.tsx:671,797,681` |
| Cupboard scan row / browse grid | 18 / 16 | `PantryModal.tsx:1426,1648` |
| Title block | pt 8, pb 18 (Browse, Plan) / 24 (Cupboard) | `BrowseModal.tsx:766-770`, `PantryModal.tsx:1086-1090` |
| Section head | pb 14; kicker → title gap 4 | `BrowseModal.tsx:923-935` |
| Gap after a shelf / section block | 24–28 (`paddingBottom` 26 quick chips, 28 rotd/shelves/matches, 24 trending/suggestions) | `BrowseModal.tsx:896,952,986,1029`, `PantryModal.tsx:1314` |
| Horizontal card gap | 12 (shelves, grids); 8 (chips, week strip) | |
| Scroll bottom padding under toolbar | 160 | `BrowseModal.tsx:1155`, `PantryModal.tsx:1083`, `CartModal.tsx:712`, `SpinnerModal.tsx:741`, `FeedScreen.tsx:667` |

### 3.2 Card sizes and aspect ratios

| Card | Width | Photo ratio | Radius | Border | Source |
|---|---|---|---|---|---|
| Browse preview grid (2-col, gap 12, mb 12) | flex 1 | 4:3 | 16 | 1 `border`, bg `card` | `BrowseModal.tsx:1100-1118` |
| `MealCard` grid (2-col, gap 12) | flex 1 (odd last item stretches full width ⚠ `light-20-recent`) | 4:3 | 24 (`radiusLg`) | 1 `border` | `MealCard.tsx:84-102`, `FilteredMealsModal.tsx:176-181` |
| Recipe of the day | 100 % | 16:9 | 18 | none, bg `bgSoft` | `BrowseModal.tsx:953-960` |
| Cook-by-mood shelf | 260 | 4:3 | 18 | none | `BrowseModal.tsx:995-1002` |
| Trending row thumb | 64 × 64 | 1:1 | 12 | none | `BrowseModal.tsx:1070-1076` (skeleton thumb 56, r12) |
| Cupboard match card (ink) | 196 | 1:1 | 18 | none, bg `ink` | `PantryModal.tsx:1319-1330` |
| Plan suggestion card | 158 | 4:3 | 14 | 1 `border`, bg `bgSoft` | `CartModal.tsx:990-1002` |
| Plan slot meal card | 100 % | thumb 56 × 56 r10 | 14 | 1 `border`, bg `bgSoft`, padding 10, gap 12 | `CartModal.tsx:901-918` |
| Library (cookmark) card | 47.5 % (grid gap 12) | 1:1 | 18 | none, bg `#F7F3EA` | `CookmarksModal.tsx:341-352` |
| Collection mosaic | 48 % (`space-between`, rowGap 18) | 1:1, 2 × 2 cells, 1 pt gutters | 16 | none, bg `#1A1815` | `CollectionsModal.tsx:236,554-580` |
| Feed hero | page width − 24 | 4:5 | 24 | none | `FeedScreen.tsx:705-716` |
| Feed tile (2-col, gap 10, mb 14) | flex 1 | 1:1 | 24 | 1 `border` | `FeedScreen.tsx:796-814` |
| Spinner hero | 100 %, maxW 320 | 4:5.2 | 22 | none | `SpinnerModal.tsx:855-868` |
| Spinner peek | 78 %, maxW 260 | 4:5.2 | 22 | none | `SpinnerModal.tsx:958-972` |
| Profile post grid (3-col) | 32.5 %, rowGap 6 | 1:1 | 8 | none | `UserProfileModal.tsx:541-553` |
| Create-post photo tile | 112 × 132 | — | 14 | dashed 1 when empty | `CreatePostModal.tsx` (styles) |
| Cupboard browse tile (3-col) | 31.7 %, minH 90, gap 8 | — | 14 | 1 `border` | `PantryModal.tsx:1652-1667` |
| Scan shortcut (2-col) | flex 1, gap 10 | — | 16 | 1 `border`, bg `bgSoft` | `PantryModal.tsx:1434-1445` |
| Stat tile (3-col, gap 12) | flex 1 | — | 18 | 1 `border`, bg `card` | `StatsModal.tsx:235-244` |
| First-run checklist step | 132 × ≥118 | — | 15 | 1.4 | `FirstRunChecklist.tsx:195-205` |

### 3.3 Radii in use

`theme.radius*`: 32 (`radiusXl`, only via sheet literal 32), 24 (`radiusLg`: MealCard, MealRow, feed tiles, info row, notes, nutrition, settings cards), 18 (`radiusMd`: drawer rows, dropdown rows, menu rows), 12 (`radiusSm`, unused by name).
Literals: 999 (all pills), 32 (recipe sheet top `RecipeModal.tsx:766-767`), 24 (sheets: actions, paywall, servings, cook-mode ingredients), 22 (dropdown/slot/spinner-info/menu sheets, spinner cards), 20 (checklist), 18 (rotd, shelves, match, library, stat tile, dialog), 16 (preview card, scan shortcut, collection mosaic, shopping card, My recipes input + Add button), 15 (checklist step), 14 (search field, filter button, day cell, plan cards, tiles, back chip 44), 12 (trending thumb, empty slot, pushed icon buttons 40, many inputs), 10 (plan thumb, brand mark, follow btn), 8 (profile grid), 6 (timer chip, savings pill), 4 (cover badge).
Proposed scale: `radius.xs 6`, `sm 12`, `md 14`, `lg 16`, `xl 18`, `2xl 22`, `3xl 24`, `sheet 32`, `pill 999` — plus exact odd values (8, 10, 15, 20) kept as named aliases where a component uses them.

### 3.4 Shadows

| Token | Colour | Opacity | Radius | Offset | Elevation | Where |
|---|---|---|---|---|---|---|
| `shadow.fab` | `#000` | 0.45 | 12 | 0, 8 | 8 | `Toolbar.tsx:259-263` |
| `shadow.toast` | `#000` | 0.35 | 14 | 0, 6 | 8 | `Toast.tsx:133-137` |
| `shadow.drawer` | `#000` | 0.18 | 24 | 6, 0 | 8 | `SideDrawer.tsx:272-276` |
| `shadow.sheet` | `#000` | 0.25 | 24 | 0, −8 | 12 | `RecipeActionsSheet.tsx:201`, `PaywallModal.tsx:297`, `ServingsAdjusterModal.tsx:98`, `CookModeModal.tsx:528-532`, `UserProfileModal.tsx:636-639` |
| `shadow.photoDisc` | `#000` | 0.18 | 4 | 0, 2 | — | `BrowseModal.tsx:1129-1132`, `FeedScreen.tsx:842-845`, slider thumb (+elev 2) |
| `shadow.libraryDisc` | `#000` | 0.25 | 8 | 0, 2 | 3 | `CookmarksModal.tsx:367-371` |
| `shadow.spinnerHero` | `#000` | 0.55 | 30 | 0, 30 | 10 | `SpinnerModal.tsx:863-867` |
| `shadow.spinnerPeek` | `#000` | 0.35 | 16 | 0, 12 | 4 | `SpinnerModal.tsx:967-971` |
| `shadow.checklist` | `#1B1813` | 0.06 light / 0.25 dark | 11 | 0, 6 | 3 | `FirstRunChecklist.tsx:174-178` |

Everything else is flat (borders, not shadows).

### 3.5 Borders and dividers

- Card border: `1` `border` (preview, MealCard, tiles, chips, plan cards, scan shortcuts, stat tiles).
- Section dividers: `1` `border` (plan slot blocks `CartModal.tsx:890-893`, staples row top/bottom `PantryModal.tsx:1278-1281`, suggestion rows, reasons, shopping rows).
- Hairline dividers: trending rows (top) `BrowseModal.tsx:1059`, drawer brand/profile rows, settings rows (bottom), rank rows, comments divider (mt 30 mb 18), credit row, inbox tab bar, sheet headers, cupboard browse tabs.
- Dashed: empty slot (1, `border`, r12) `CartModal.tsx:945-955`; create-post empty tile; cupboard `addChip` (unused).
- Underlines: Plan tab 1.5 pt ink, full label width, bottom −1 (`CartModal.tsx:796-803`); Inbox tab 2 pt ink, 60 % width, r1 (`InboxModal.tsx:444-450`); Cupboard category tab 1.5 pt in category `soft` colour (`PantryModal.tsx:748`).
- Gradient rule: cupboard group rule `LinearGradient [soft → transparent]`, hairline height, opacity 0.5 (`PantryModal.tsx:926-931`).
- Heavy rule: nutrition 3 pt ink, r1, mv 8 (`RecipeBody.tsx:577-582`).
- Step rule: 2 pt wide `accent`, r1, full step height, mr 4 (`RecipeBody.tsx:489-494`).

### 3.6 Chrome dimensions

| Item | Value | Source |
|---|---|---|
| Masthead | ph 20, pt 8, pb 10; content row 40 (icon buttons) → **58 pt** below the safe area | `Masthead.tsx:77-83,112-117` |
| Masthead menu icon | `menu-outline` 28, button 40 × 40, hitSlop 10 | `Masthead.tsx:45-46` |
| Masthead inbox icon | `paper-plane-outline` 24, button 40 × 40; badge absolute top 2 right 0 | `Masthead.tsx:55-57,118-122` |
| Masthead avatar | 36 circle, bg `bgSoft`, 1 `border`, ml 4; initial 14/700 ink | `Masthead.tsx:128-141` |
| Tab bar | absolute bottom; gradient height 110; row ph 12, pt 10, pb `4 + max(insets.bottom − 16, 8)` (= 22 on notched iPhones); buttons flex 1, pv 6, ph 4, gap 5; icon 24 | `Toolbar.tsx:41,92,184-216` |
| Tab bar visible height | ≈ 10 + 54 + 22 = **86 pt** | derived |
| Tab badge | minW 16, h 16, r8, ph 4, absolute top 0 right 8 | `Toolbar.tsx:222-233` |
| FAB | **56** circle, `ink` fill, 5 pt ring in `bg`, mh 4, mb 6, `alignSelf: flex-end`; icon `add` 26 in `bg` | `Toolbar.tsx:247-266` |
| Drawer width | `max(280, min(320, round(width × 0.86)))` → 320 on a 390 phone | `SideDrawer.tsx:73` |
| Toast position | absolute, bottom 110, centred, maxWidth 88 % | `Toast.tsx:118-139` |
| Recipe hero | height 280; sheet overlaps by 32 | `RecipeModal.tsx:735,768` |
| Bottom sheet bottom padding | `max(insets.bottom, initial insets, 16)` | `BottomSheet.tsx:107` |

---

## 4. Components

Each lists anatomy, values, states and light/dark notes. "Inverts" means it uses `ink` as a fill and `bg` as text, so it is black-on-white in light and cream-on-black in dark.

### 4.1 Masthead (app header) — `components/Masthead.tsx`

- **Anatomy:** row (ph 20, pt 8, pb 10). Left cluster (flex 1): menu button. Centre: wordmark "The Pantry" (`type.wordmark`, `numberOfLines 1`, `pointerEvents none`, ph 8). Right cluster (flex 1, justify end): inbox button with `Badge`, avatar tile.
- **Avatar:** photo (`expo-image`, fill) or the first letter of the user's name, uppercase.
- **States:** no pressed style on any control. Badge hidden at 0; shows "9+" above 9.
- **Where:** Feed (Home), Browse, Cupboard, Plan. Not on pushed screens.
- **Dark:** all tokens; avatar tile `bgSoft` = `#141414` with 10 % white border (`dark-11-browse`).

### 4.2 Bottom toolbar with centre FAB — `components/Toolbar.tsx`

- **Anatomy:** absolutely positioned container, `pointerEvents box-none`. Gradient fade behind. Row of 5: Feed (`home-outline`), Browse (`search-outline`), FAB (`add`), Cupboard (`grid-outline`), Plan (`calendar-outline`, badge = number of planned meals).
- **Button:** icon 24 + label (`type.label.tabBar`), tint `ink` when active, `inkMuted` otherwise; no fill/underline. Icons stay outline in both states.
- **FAB:** see §3.6. Accessibility label "Share a bite".
- **States:** pressed = `scale 0.96` on tabs and FAB (`Toolbar.tsx:109,154`). Keyboard open → translates down 180 over 180 ms (`:45-61`).
- **Where:** Browse, Cupboard, Plan, Spinner (Spinner shows Plan active ⚠ `SpinnerModal.tsx:314,516`), and HomeScreen/Feed.
- **Dark:** FAB is cream with a black `add` and black ring (`dark-11-browse`).

### 4.3 Side drawer — `screens/SideDrawer.tsx`

- **Container:** transparent native modal; backdrop `rgba(0,0,0,0.42)` fades in; panel from the left, width per §3.6, bg `card`, `shadow.drawer`, safe-area top + bottom.
- **Brand row:** ph 20, pv 18, gap 12, hairline bottom. Brand mark 36 × 36, r10, fill `ink`, serif "P" 20/700 in `bg`. Name serif 22/700/-0.4 ink.
- **Body:** ph 12, pt 12, pb 16. Sections mb 14; label `type.kicker.drawer` with ph 12, pv 8.
- **Sections and items (icon, 22 pt, ink):**
  - DISCOVER: Feed `home-outline`; Notifications `notifications-outline`; Messages `paper-plane-outline`; Browse `search-outline`; Cupboard `grid-outline`.
  - MY KITCHEN: Cookmarks `bookmark-outline` (badge = saved count); Collections `albums-outline` (count); My recipes `restaurant-outline` (count); Recently viewed `time-outline` (count); Kitchen stats `flame-outline`.
  - TOOLS: Spinner `sync-outline`; Plan `calendar-outline` (count).
  - Hairline divider (mh 12, mb 8), then "Settings & preferences" `settings-outline` (below the fold in the screenshot).
- **Nav row:** pv 12, ph 12, r18, gap 14; icon well 22 wide; label `type.row`; pressed bg `bgSoft`.
- **Row badge:** minW 22, h 22, ph 7, r11, fill `ink`, text `#FFFFFF` 11/800 — ⚠ invisible in dark.
- **Footer profile row:** ph 16, pv 14, gap 12, hairline top. Avatar 42 circle `bgSoft` + border, glyph 18/700 (initial, or full-width "＋" when signed out). Name 14/800/-0.2; sub 12/500 inkMuted ("Local profile" / email / "Set up your profile"). Chevron is the text glyph "›" 22/400 inkMuted.

### 4.4 Screen masthead pattern (title block)

Two variants.

**Tab-root title block** (Browse, Cupboard, Plan, Spinner): ph 20, pt 8, pb 18–24. Kicker (accent on Browse, muted on Cupboard/Plan/Spinner) → display title 38/700 serif → optional subtitle 14/20 maxW 320. Plan adds a title row with a 38 × 38 round share button (bg `bgSoft`, 1 `border`, `share-outline` 18) and a progress row (track h4 r2 `border`, fill `ink`; label "2 of 21 meals" 12/600 inkSoft, gap 12) (`CartModal.tsx:728-775`).

**Pushed-screen header** (Inbox, Settings, Recently viewed, Stats, My recipes, Filters, Meal picker): row ph 20, pt 12, pb 12–14, gap 12, `alignItems flex-start`. Back button 44 × 44 r14 (`bgSoft`, or `card` when the page bg is `bgSoft`), mt 4, `chevron-back` 24 (20 in Settings). Then kicker (11/800/3 accent) + title (30/700 serif, may wrap with `\n`). Optional right action (Inbox compose: 44 r14 ink fill, `create-outline` 22 in `bg`; Recents "Clear": pill ph 14 pv 9 `bgSoft`, 12/700/0.3).

**Library header** (Saved, Collections): top bar ph 18 pt/pb 4 with a 38 round back chip (`bgSoft` + border, `chevron-back` 18). Head block ph 22, pt 8, pb 18: 22 × 1 `inkSubtle` rule + kicker 10.5/700/2.5 → display 52/500 → italic serif amber count 15/600 + word 13.5 inkSoft (mt 12).

⚠ Back-button styles vary (44 r14, 40 r12, 38 round, 38 r12, 36 r12, 44 round card). Pick one for v2 only if Lachlan accepts a visible change.

### 4.5 Section header

`BrowseModal.tsx:546-568` / `PantryModal.tsx:878-900` / `CartModal.tsx:440-443`: row ph 20, pb 14, `alignItems flex-end`. Left: kicker (+ mb 4) and serif title 22/700. Optional right "See all →" 13/700 inkMuted pb 2 (defined, not shown on any current screen). Kicker colour is accent on Browse/Feed, inkMuted on Cupboard/Plan.

### 4.6 Recipe cards

**MealCard (grid, with bookmark)** `components/MealCard.tsx`: card flex 1, r24, 1 border, bg `card`, overflow hidden. Media 4:3; no photo → cuisine tint + `restaurant-outline` 56 inkMuted. Bookmark disc 32 r16, top/right 8, white 0.92, icon `bookmark`/`bookmark-outline` 18 (`accent` / `inkSoft`). Body ph 12, pt 10, pb 14, bg `card`: eyebrow (`type.eyebrow.mealCard`, mb 4) + title (`type.cardTitle.mealCard`, 2 lines). States: pressed opacity 0.92; hidden opacity 0.6 + scrim "HIDDEN" 11/800/2.

**Browse preview card** `BrowseModal.tsx:678-719,1100-1151`: r16, 1 border, `card`, mb 12. Photo 4:3 (bg `bgSoft`; fallback icon 32). Bookmark disc 28 r14, white 0.94, `shadow.photoDisc`, icon 15 (`#1A1A1A` / accent). Body ph 12 pt 10 pb 13: eyebrow 9.5/800/1.8 + serif 17/600 title. Pressed 0.94.

**Recipe of the day (hero)** `BrowseModal.tsx:612-641,952-980`: wrapper ph 20 pb 28. 16:9, r18, photo cover, scrim `[transparent, 0.78]@[0.4,1]`. Body absolute bottom, ph 18 pb 16: eyebrow 10.5/800/2 cuisine colour, mb 4; title 26/700 serif white, 2 lines. Pressed 0.94. ⚠ eyebrow sits directly on the photo and can be illegible (`light-11-browse`: "ASIAN" in `#B05060` over broccoli).

**Cook-by-mood shelf card** `BrowseModal.tsx:570-610,983-1024`: horizontal row ph 20 pb 28 gap 12. 260 wide, 4:3, r18, scrim `[transparent, 0.75]@[0.55,1]`. Body ph 14 pb 14: serif 19/700 white (2 lines) + "N recipes" 12/600 white 0.75. Pressed 0.92. Shelves: Cozy night in, Impress guests, Weekend project, Sunday cooking, Pantry staples, Under 30 minutes, Plant forward, Bake night (`BrowseModal.tsx:90-102`).

**Trending row** `BrowseModal.tsx:643-676,1054-1097`: row pv 14 gap 14, hairline top. "01" serif 32/700 inkMuted width 44; 64 thumb r12; text column: eyebrow 10/800/2, serif 17/600/-0.3 lh19 (2 lines), meta "@handle · 20m · ♥ 1.2k" 12/600 inkMuted. Skeleton: 18 square r4, 56 thumb r12, bars h11 r4 (80 % and 55 %), all `bgSoft`.

**Cupboard match card (ink rail card)** `PantryModal.tsx:993-1032,1319-1365`: 196 wide, bg `ink`, r18. Photo 1:1. Match pill absolute top/left 10: ph 8 pv 4 r999 `ink`, `checkmark` 11 + "43%" 12/800 in `bg`, gap 4. Body ph 14 pt 12 pb 14: eyebrow 9.5/800/1.8, serif 18/600 in `bg` (2 lines), meta "32m · 8 to buy" 12/600 in `bgSoft`. Inverts in dark (cream card, dark text — `dark-12b`).

**Plan suggestion card** `CartModal.tsx:678-708,990-1024`: 158 wide, `bgSoft`, 1 border, r14. Photo 4:3. Body ph 12 pt 10 pb 12: eyebrow 9.5/800/1.6, serif 15/600 lh18 (2 lines), "22m" 11/600 inkSoft.

**Plan slot meal card (row)** `CartModal.tsx:632-676,901-944`: row, `bgSoft`, 1 border, r14, padding 10, gap 12. Thumb 56 r10. Text: eyebrow 10/800/1.8, serif 16/600 title (1 line), meta "40m · Easy" 12/600 inkSoft mt 2. Clear button 32 circle (no fill), `close` 16 inkMuted.

**Library card (cookmark / collection recipe)** `CookmarksModal.tsx:158-205,341-410`: 47.5 %, `#F7F3EA`, r18. Image 1:1 on `#1A1815`. Saved disc 28 r14 `#F7F3EA`, `shadow.libraryDisc`, filled `bookmark` 14 `#1A1A1A` (tap = unsave). Body ph 13 pt 11 pb 13: eyebrow 9.5/800/1.6 UP, serif 17/600 lh18.5 `#0E0E0E` minH 38, foot row: `time-outline` 11 + "32m" 11/500 meta, 3 pt dot (mh 6), difficulty.

**Collection card (mosaic)** `CollectionsModal.tsx:339-376,561-599`: 48 %, transparent. Mosaic 1:1 r16 `#1A1815`, four 50 % cells (1 pt padding) with photos or empty. Body pt 10 ph 2: serif 16/600 lh18 name + "2 recipes" 11.5/600/0.2 inkMuted. Long-press opens delete.

**MealRow** `components/MealRow.tsx`: card row, `card`, r24, 1 border, pv 10 ph 12 gap 12. Bubble 44 r14 cuisine tint + `restaurant-outline` 22 inkMuted. Name 15/700/-0.1. Optional bookmark 20 (accent / inkSubtle); hidden toggle uses text glyphs "⊘"/"◯" 22; right action pill ph 12 pv 6 r999 `bgSoft`, 12/700/0.3 inkSoft (danger variant). Pressed bg `bgSoft`; hidden opacity 0.55 + line-through.

**Feed hero / tile** (social; out of v1 scope but recorded): hero 4:5 r24 with kicker "EDITOR'S PICK · EASY" 11/800/2.5 accent, serif 30/700 white, meta row; carousel dots 6 × 6 inkSubtle, active 18 wide accent (`FeedScreen.tsx:691-700`). Tile 1:1 photo, heart disc 30, body ph 10 pt 8 pb 10 gap 4, title 14/800 sans.

### 4.7 Chips

| Variant | Padding | Radius | Fill / border (inactive) | Active | Label | Source |
|---|---|---|---|---|---|---|
| `Chip` (filters) | pv 9 ph 16, minH 44 | 999 | `bg` / `border` | fill + border `activeBg ?? ink`; text `activeInk ?? #FFFFFF` ⚠ default white on cream in dark | 13/700/0.1 ink | `components/Chip.tsx:39-63` |
| Quick chip (Browse) | pv 9 ph 14, gap 6 | 999 | `bgSoft` / `border` | `ink` / `ink`, text `bg` | 13/700 | `BrowseModal.tsx:899-920` (emoji defined in data but not rendered) |
| Filter dropdown chip (Spinner, Feed) | pv 10 ph 16, gap 6 | 999 | `bgSoft` / `border` | `ink`, text + chevron `bg` | 14/700 + `chevron-down` 14 | `components/FilterDropdown.tsx:114-135` |
| Collection filter pill (Browse) | pl 12 pr 10 pv 7, gap 8, maxW 70 % | 999 | `ink` fill | — | 13/700/0.1 `bg` + `close` 14 | `BrowseModal.tsx:868-884` |
| Pantry selected ("jar") chip | pv 6 ph 9, gap 7, border 1 | 999 | category tint, border soft@45 % | pressed 0.85 | italic serif initial 16/500 (category bold, width 12) + name 13/500/0.1 `#2a2218` + `close` 11 bold@0.55 in a 16 box | `PantryModal.tsx:955-991,1216-1256` |
| Quick-add chip (Cupboard) | pl 12 pr 14 pv 8, gap 6 | 999 | transparent / `border` | pressed 0.7 | `add` 12 inkSoft@0.55 + 13/500 ink | `PantryModal.tsx:1488-1504` |
| Shopping peek chip | ph 10 pv 5 | 999 | `rgba(0,0,0,0.05)` | — | 11.5/600 `bg` | `CartModal.tsx:1060-1071` |
| Onboarding chip | ph 14 pv 10, border 1 | 999 | white 0.14 / white 0.18 | `#FFFFFF`, text ink | 14/700 white | `OnboardingModal.tsx:780-797` |
| Create-post tag | ph 12 pv 7, border 1 | 999 | transparent / `border` | `ink` + `checkmark` 12 | 12.5/600 inkSoft → `bg` 700 | CreatePostModal styles |
| HAVE pill | pl 5 pr 7 pv 3, gap 3, ml 4 | 999 | `ink` | — | `checkmark` 10 + "HAVE" 9/800/1 `bg` | `RecipeBody.tsx:444-460` |

### 4.8 Buttons

| Variant | Spec | Where |
|---|---|---|
| **Black pill (primary)** | fill `ink`, r999, label `bg`. Sizes: L pv 16 ph 20–22 (Spin again 16/700 + `refresh` 18, gap 10; Cook Mode Next 14/800/0.2 + `chevron-forward` 18; Paywall CTA 15/800/0.2 + `arrow-forward` 18); M pv 12–14 (Edit profile/Follow 14/800/0.3, flex 1; Servings Done; "Got it"; "Back to cooking") | `SpinnerModal.tsx:1025-1035`, `CookModeModal.tsx:499-518`, `UserProfileModal.tsx:489-501`, `PaywallModal` cta |
| **Cook Mode CTA** (black pill with icon disc) | row, pv 14 ph 16, gap 12, r999, fill `ink`, mb 24. Icon disc 30 circle `rgba(255,255,255,0.10)` with `flame-outline` 18 `bg`. Label serif 16/600/-0.2 `bg` "Start Cook Mode"; sub 11.5/600/0.2 `bg`@0.65 "Guided, one step at a time"; trailing `arrow-forward` 18. Pressed 0.9 | `RecipeModal.tsx:274-308,854-886` |
| **Amber** | fill `accent`, label `#FFFFFF` 800/0.5. My recipes Add/Import: r16, ph 22, stretch height; recipe fallback "+ Add a recipe": r999, ph 28 pv 14 | `CustomMealsModal.tsx:186-193`, `RecipeModal.tsx:1362-1368` |
| **Outlined** | 1 `border`, transparent, r999. "Cook this" pv 12 ph 22, 14/700 ink + `arrow-forward` 15; "New collection" pv 8 ph 14, `add` 16 inkSoft + 13/700 inkSoft; "Clear all" pv 6 ph 12, 12/700/0.4 | `SpinnerModal.tsx:1037-1048`, `CollectionsModal.tsx:473-488`, `CartModal.tsx:1164-1176` |
| **Soft (grey) pill** | fill `bgSoft`, r999. "Clear cooking history" pv 16, 13/700/0.3 danger; Recents "Clear" ph 14 pv 9; recipe "Cook" toggle pv 7 ph 10, `restaurant-outline` 18 + 12/700 ink, active fill `accent` + white `checkmark-circle` "Cooked"; Servings "Reset" (+1 border) | `StatsModal.tsx:287-294`, `RecipeModal.tsx:952-969` |
| **White on video (onboarding)** | fill `#FFFFFF`, r999, pv 16 ph 20, gap 10; label 15/800/0.3 ink + "→" glyph 16/800; disabled opacity 0.45 | `OnboardingModal.tsx:1026-1043` |
| **Settings card buttons** | fill `card`, r24, pv 14, gap 8, centred; "Redo welcome flow" 14/700 ink + `refresh-outline` 18; "Sign out"/"Delete account" 14/800 danger + `log-out-outline`/`trash-outline` 18 | `SettingsModal.tsx:668-689` |
| **Text / link** | "Restore purchases" 13/700 inkSoft underline; "Maybe later" 13/600 inkMuted; recipe "Search the web" 13/700/0.3 inkMuted; comment "Post" 14/800 ink (disabled 0.4) | `PaywallModal`, `RecipeModal.tsx:1093,1374` |
| **Round icon button** | recipe hero back/more: 44 circle, fill `card`, text glyphs "←" and "⋯" 20/700 ink | `RecipeModal.tsx:200-209,754-759` |
| **Dialog pair** | row gap 10; flex 1, pv 12, r999; Cancel `bgSoft` + border, 14/700 ink; Create `ink`, 14/700 `bg` | `CollectionsModal.tsx:665-670` |

States: most buttons use opacity on press (0.6–0.94, per component). None define a disabled style except onboarding (0.45), Cook Mode next (fill `bgSoft`), comment Post (0.4) and Spinner (actions just `disabled`).

### 4.9 Tabs and segmented controls

- **Segmented pill (Browse Recipes / People)** `BrowseModal.tsx:839-857`: track mh 20, mb 18, padding 4, `bgSoft`, r999. Tab flex 1, pv 11, r999. Active fill `ink`, label `bg` 15/800; inactive label inkMuted 15/700. Dark: active is cream with black label (`dark-11-browse`).
- **Settings segment** `SettingsModal.tsx:650-666`: same pattern, pv 9, label 13/700 inkSoft → `bg`.
- **Underline tabs, Plan (This week / Shopping list)** `CartModal.tsx:778-803`: strip ph 20, gap 22, 1 `border` bottom, mb 20. Tab pv 14. Label 13.5/700 inkSoft → ink. Active bar absolute bottom −1, 1.5 tall, full label width, ink. Left-aligned (not stretched).
- **Underline tabs, Inbox (Messages / Notifications)** `InboxModal.tsx:418-450`: bar ph 20, hairline bottom. Tabs flex 1, pt 10, centred. Label row gap 8, pb 10; label 14/700/0.2 inkMuted → ink; optional `Badge`. Underline 2 tall, 60 % of tab width, r1, transparent → ink.
- **Cupboard category tabs** `PantryModal.tsx:1621-1644`: horizontal scroll ph 20 pb 14 gap 18, hairline bottom. Tab pt 6 pb 12, mb −15 (so the active line sits on the hairline). Label 14/600 inkMuted → ink. Active underline 1.5 in the category `soft` colour.

### 4.10 Search field

`BrowseModal.tsx:787-826`: row ph 20 gap 10 mb 14. Field flex 1, h 46, `bgSoft`, r14, ph 14, 1 border; `search-outline` 18 inkMuted (mr 8); input 15 ink; placeholder "Recipes, ingredients, people…" inkMuted; clear `close-circle` 18 when non-empty. Filter button 46 × 46 r14, same fill/border, `options-outline` 22 ink; active (filters applied) fill `ink`, icon `bg`, count badge top/right 4, 18 tall r9 `accent` with 11/800 white.
Cupboard search is identical but full width (mh 20, mb 14), icon 17, input 14, placeholder "Search ingredients to add…" (`PantryModal.tsx:1507-1524`). Meal picker search: `card` fill, r16, text glyph "⌕" 18 as icon, input pv 12 15.

### 4.11 Week day strip (Plan)

`CartModal.tsx:353-390,806-858`: horizontal scroll ph 20 pb 22 gap 8. Cell 52 × 70, r14, 1 border, transparent, pt/pb 8, centred. Weekday "MON" 10/700/1.2 inkSoft (active: still inkSoft ⚠ low contrast on ink, `light-13-plan`). Date serif 18/700/-0.4 ink (active `bg`), mt 2. Dots row gap 3, mt 6: three 4 × 4 circles — filled `ink`, empty `border`; on the active cell filled `bg`, empty `inkMuted`. Active cell fill + border `ink` (cream in dark). Opens on today.

Below: day heading row (ph 20, pb 10, baseline) "Wednesday" serif 26/600 + " · Sep 30" serif 18/600 inkMuted.

### 4.12 Meal slot rows

`CartModal.tsx:401-435,883-960`: list mh 20 mb 28. Block pv 12; blocks after the first have 1 `border` top. Kicker (`type.kicker.slot`). Filled → Plan slot meal card (§4.6). Empty → dashed button: row centred, pv 14, r12, 1 dashed `border`, gap 6, `add` 16 inkSoft + "Add breakfast" 13/600 inkSoft; pressed 0.7. (Screenshot label looks larger/bolder than 13/600 because the web render scales; values are from code.)

### 4.13 Shopping list summary card (black)

`CartModal.tsx:475-498,1030-1071`: row, mh 20 mb 28, pv 14 ph 16, fill `ink`, r16. Left column (flex 1, mr 12): "SHOPPING LIST" 11/700/2.5 `bgSoft` mb 6; headline serif 19/600/-0.3 `bg` "46 items for 2 meals" mb 10; chip wrap gap 6 — first 5 items + "+N more". Right: `chevron-forward` 20 `bg`. Tap → Shopping list tab. Dark: cream card, dark text, chips visible (`dark-13b`).

**Shopping list tab** (`CartModal.tsx:502-609,1074-1189`): body padding 20. Head row (ph 4 pb 12): "46 ITEMS" 11/700/2 inkMuted; actions gap 8 — "By aisle" toggle (pv 6 ph 12 r999 1 border `bgSoft`, `file-tray-stacked-outline` 14 + 12/700/0.4; active `ink`/`bg`) and "Clear all" outline pill. List card `bgSoft`, r14, 1 border; rows pv 14 ph 16, 1 border between; label 14/500 ink; remove 28 circle `close` 16 inkMuted. Aisle sections mb 18 with header 11/800/2 **accent**. Restore link: centred row pv 14 mt 12, `refresh` 13 + 12/600 inkSoft. Empty: 14/20 inkSoft centred.

### 4.14 Stats cards

`StatsModal.tsx:212-285`: body ph 20 pb 48. Streak card fill `ink`, r24, pv 32, centred, mb 16: number serif 72/700/-2 lh76 `bg`; label 14/700/0.3 `bg`@0.85 "days cooking streak". Tile row gap 12 mb 28: tile flex 1 `card`, r18, 1 border, pv 18, centred; value serif 28/700/-0.6; label 11/700/0.3 inkMuted mt 4. Section title 16/800/-0.3 mb 12. Rank rows pv 12, hairline top, gap 14: number serif 18/700 inkMuted w22; label 15/600 ink; count "1×" 14/700 inkMuted.

### 4.15 Bottom sheet — `components/BottomSheet.tsx`

Not a native modal; an absolutely positioned view (z 999999, elevation 24) inside the caller's tree. Backdrop `rgba(0,0,0,0.5)` animated with the same progress; tap closes. Card absolute bottom, full width, bg `cardBackgroundColor ?? theme.bg`, bottom padding per §3.6, lifts with the keyboard. Callers style the visible sheet themselves; the common pattern is: top radius 22–24, pt 6–8, `shadow.sheet`, hairline top border, handle 40 × 4 r2 `inkSubtle` (mb 8–16) — or 44 × 5 r3 `border` on the recipe sheet handle.
Action-sheet rows (`RecipeActionsSheet.tsx`): title serif 16/600 centred with 1 border bottom; rows pv 14 ph 12 r12 gap 14, 32 icon disc `bgSoft` holding a **text glyph** 18 inkSoft, label 15/600; pressed bg `bgSoft`; Cancel 15/700 with 1 border top.
Dropdown sheet (`FilterDropdown.tsx`): native fade modal, sheet `card`, r22 top, ph 14; kicker title; rows pv 14 ph 12 r18, selected bg `bgSoft` + label 800 + `checkmark` 18 accent; "Done" button `bgSoft` r18 pv 14.

### 4.16 Toast — `components/Toast.tsx`

Global host in a transparent native modal. Pill: row, ph 16, pv 12, r999, fill `#F7F3EA`, gap 8, `shadow.toast`, maxW 88 %, bottom 110. Icon 18 `#0A0A0A`: `checkmark-circle` (default), `information-circle`, `heart`. Label `type.toast`, up to 4 lines. Auto-dismiss 2500 ms. Same cream in light and dark.

### 4.17 Empty state

See §2.2 "Empty states". Container: centred, ph 40 (A) / 32 (B, C), pv 56 (B) / 80 (C), pt 60 (D).

### 4.18 Recipe page — `screens/RecipeModal.tsx` + `components/RecipeBody.tsx`

1. **Hero band** h 280, bg = cuisine tint (visible only without a photo), photo cover, top scrim 110 tall. Safe-area nav row ph 20 pt 12: back "←" and more "⋯" 44 round `card` buttons (§4.8). No photo → centred `restaurant-outline` 64.
2. **Sheet** bg `bg`, top radii 32, mt −32. Handle 44 × 5 r3 `border`, mt 10 mb 4. Scroll body padding 24, pt 16.
3. **Title row**: serif 32/700 title; custom recipes get an "Edit" pill (ph 14 pv 8 r999 `accentSoft`, 13/800/0.3 accentDeep, mt 6).
4. **Byline** (mt 12 mb 16, gap 10): 32 avatar circle `bgSoft` + border, initial 13/700; "By" 11/600/0.3 inkMuted; name 14/800/-0.2 ("The Pantry").
5. **Action row** (gap 2, mb 6): Save (`bookmark-outline` 22 / filled `bookmark` accent) · Comment (`chatbubble-outline` 20) · Share (`paper-plane-outline` 20) — each pv/ph 6, gap 5, label 12/600 ink. Right-aligned "Cook" soft pill (§4.8).
6. **Info tiles** (`RecipeBody.tsx:363-397`): row `bgSoft`, r24, pv 14 ph 10, gap 8, mt 6 mb 24. Three tiles (flex 1, centred): icon 18 inkSoft (`time-outline`, `bar-chart-outline`, `people-outline`) → big value + unit (mt 6, gap 4) → uppercase label. Servings tile is tappable ("TAP TO ADJUST" / "TAP TO RESET"); adjusted = accent icon/value/label; pressed 0.6.
7. **Cook Mode CTA** (§4.8) when the recipe has steps.
8. **"Ingredients :"** heading; groups mb 8 with group title; rows pv 7 gap 12: 9 × 9 dot `orange` (tapped/checked → `accent`, text line-through inkSubtle); text 15/22; HAVE pill if in the cupboard; substitution line (ml 26, mt −2, mb 6) "↳ …" italic.
9. **"Directions :"** steps: row gap 14 mb 18 pl 2 — number 22/800 w22 centred; 2 pt accent rule; step text 15/23 inkSoft with inline timer chips.
10. **"Notes :"** card `bgSoft` r24 padding 16; each note row gap 10 mb 6: "·" 20/22 accent + text 14/21 inkSoft.
11. **"Pair with :"** (if any): hint 13/18 inkMuted (mt −8 mb 12); card `accentSoft` r24 p16; rows gap 12 mb 10 "+" 18/800 accentDeep + 14/21 ink.
12. **"Nutrition :"** heading row with `information-circle-outline` 18 inkMuted button (30 circle); kicker "Calculated per serving · 4 serves" 12/600/0.3 inkMuted (mt −8 mb 12); nutrition card `bgSoft` r24 ph 18 pv 14: calories row, 3 pt ink rule, rows pv 9 with hairline bottom (not on last), indented sub-rows.
13. **Comments**: hairline divider (mt 30 mb 18); heading "Comments · N" 16/800; hint 13 inkMuted; comment rows (32 avatar, "handle  2h" 12, text 14/19, optional 180 photo r12); composer (hairline top, pt 8): 32 avatar, input `bgSoft` r18 ph 14 pv 10 max h 100, `camera-outline` 20 inkSoft, "Post". Signed out: bordered `bgSoft` r18 box, 13/500 centred.
14. **Photo credit**: centred row, mt 28, pt 18, hairline top: "AI-generated photo" or "Photo by **Name** on **Unsplash**" 11/500 inkMuted, links 11/700 inkSoft underline.
15. Bottom spacer 32.
Fallback (no recipe): centred title, "NO RECIPE YET" 11/800/3 accent, body 14/21, amber "+ Add a recipe", "Search the web".

### 4.19 Spinner card (Surprise me)

See §7 Spinner. Hero card per §3.2 + `shadow.spinnerHero`; corner tag (top/left/right 18, gap 10): 24 × 1 amber rule + cuisine label 10/800/2.8 `#E8C891`. Label block absolute bottom ph 20 pb 22 pt 30: serif 30/700/-0.6 lh32 `#F7F3EA` (2 lines), meta row: `time-outline` 13 + "20m", "  ·  ", difficulty, "  ·  ", "@slug" — 13/600 white 0.85, dots white 0.55. Peeks: dimmed 0.55, rotated ±7° (±11° while spinning), offset ±22/14 (±30/18). Whole card is the spin trigger.

### 4.20 Cook Mode — `pro/cookMode/CookModeModal.tsx`

Full-screen slide-up, bg `bg`, safe area top + bottom, keeps screen awake.
- Header (ph 16, pt 4, pb 8, gap 12): close 38 r12 `bgSoft` `close` 22; centre "COOK MODE" 9.5/800/2.5 inkMuted + meal name serif 16/600 (maxW 220); ingredients button 36 r12 `bgSoft` `list-outline` 18; counter "3 / 9" 12/700 inkMuted tabular, minW 38, right-aligned.
- Progress: ph 20, pt 14, pb 4, gap 4; up to 12 segments, h 3, r999, `border` → `ink`.
- Body ph 24 pt 18, vertically centred scroll: numeral "03" serif italic 64/500 inkSubtle; "STEP" 11/800/3 inkMuted mb 22; step text serif 22/500/-0.2 lh 32 ink with timer chips. Swipe left/right (dx > 60) changes step.
- Footer (ph 16, pt 12, pb 8, gap 12): "Previous" text button (`chevron-back` 18 + 14/700; disabled colour inkSubtle); "Next step" black pill flex 1 (last step "Done").
- Ingredients sheet: BottomSheet; bg `bg`, r24 top, handle, head (ph 20 pb 14 hairline): "INGREDIENTS" 11/800/2.5 + serif 20/600 name; list max h 480, rows gap 10 pv 5: 5 pt accent dot (mt 9), 14/21 text, HAVE pill; "Back to cooking" black pill mh 16.
- Screenshot `light-27-cookmode` shows the recipe page, not Cook Mode (the capture didn't open it) — values here are code-only.

### 4.21 Onboarding — `screens/OnboardingModal.tsx`

Background: looping muted video `assets/welcome-bg.mp4` on `#000` (renders black in the web screenshots).
- **Welcome (step 0):** top scrim + bottom scrim. Top row (ph 20, pt 12, right-aligned): "Skip" pill pv 8 ph 14 r999 white 0.18, 13/700/0.3 white. Title block (flex 1, bottom-aligned, ph 24 pb 24): "THE PANTRY" 11/800/**4** white 0.9 mb 14; serif 44/700 "Tonight's dinner,\nsorted."; subtitle 16/24 white 0.85 maxW 340. Footer ph 24 pb 12: consent row (gap 10, pv 12, ph 4) — checkbox 22 × 22 r6, 1.5 border white 0.7 (checked: white fill + "✓" 14/900 ink); label 12/17 white 0.85 with underlined bold white links "Terms", "Privacy Policy". "Get started →" white pill (disabled 0.45 until ticked).
- **Quiz steps 1–4:** scrim `0.5→0.7→0.88`. Top bar (ph 20 pv 10 gap 14): progress track h4 r2 white 0.22, fill white (step/6); "Skip" 14/700 white 0.85. Body ph 24 pt 22 pb 28: kicker 11/800/3 white 0.85; title serif 34/700; subtitle 14/20 white 0.82. Tiles (gap 10): pv 16 ph 18, white 0.12, r24, 1 border white 0.16; active white fill, label ink, sub inkSoft; label 16/800/-0.2 white, sub 13/500 white 0.7. Intent tiles add a leading icon 22 (white → ink) and trailing `ellipse-outline`/`checkmark-circle` 22 (white 0.45 / accent). Chips per §4.7. Footer (hairline top white 0.18, ph 20 pv 12 gap 12): "Back" text 14/700 white 0.75 (minW 70), white "Continue →" pill ("See my dinners" on step 4).
  - Step 1 FIRST UP "What brings you here?" — intents: Tonight's dinner `restaurant-outline`, Plan my week `calendar-outline`, Use what I've got `basket-outline`, Find new recipes `sparkles-outline`, Cook with friends `people-outline` (`data/preferences.ts:18-23`).
  - Step 2 EATING STYLE "What do you eat?" (Omnivore/Pescatarian/Vegetarian/Vegan tiles) + ANYTHING TO AVOID? chips.
  - Step 3 CUISINES "What do you love eating?" chips.
  - Step 4 WEEKNIGHT TIME "How long do you have?" (Quick/A bit longer/I have time) + SKILL LEVEL tiles.
- **Reveal (step 5):** "YOUR MENU'S READY" / "Tonight,\nfor you"; three rows (padding 12, white 0.12, r24, border white 0.18, gap 14): 60 thumb r12, serif 17/700 white name, meta 13/600 white 0.7, `chevron-forward` 20 white 0.5; "Spin again" outline pill (border white 0.3); footer "Back" + "These look great →".
- **Notifications (step 6):** centred: 84 circle white 0.14 with `notifications-outline` 34 white; serif 32/700 "A nudge when\nit counts"; body 15/22 white 0.82; preview card white 0.92 r14 p14 with `notifications` 18 + "The Pantry" 13/800 + body 13/17 inkSoft. Footer column: white "Allow notifications →" pill, "Maybe later" 14/700 white 0.75.

### 4.22 Profile header — `screens/UserProfileModal.tsx`

Top bar ph 12 pv 10: 40 r12 `bgSoft` buttons (`chevron-back` 22; right `share-outline` 20 for self, `ellipsis-horizontal` 20 for others); centred "@handle" 15/800. Header (ph 28 pt 8 pb 24, centred, hairline bottom): avatar 88 circle `bgSoft` + border, glyph = **avatar emoji** (e.g. 🍳) or initial 36/700, mb 18; "RECIPES BY" 11/800/3 accent; name serif 32/700/-0.5; "@handle" 13/600 inkMuted mb 14; optional italic bio 14/20 inkSoft. Stats strip: `bgSoft` pill, pv 10 ph 18 gap 16; stat (minW 60) number 15/800 + label 10/700/1 inkMuted; 1 × 24 `border` dividers. Action row mt 20: "Edit profile" black pill (self) or Follow + "Message" soft pill. Posts: "THE COOKBOOK" kicker + serif 22/700 headline + 3-col grid. Empty: pattern D "Share your first dish".

---

## 5. Icons

**Library:** `@expo/vector-icons` **Ionicons** everywhere (outline variants for chrome; filled for active state such as `bookmark`, `heart`, `checkmark-circle`).

### 5.1 Ionicons by action

| Action | Icon | Size | Where |
|---|---|---|---|
| Open drawer | `menu-outline` | 28 | `Masthead.tsx:46` |
| Inbox / messages / share bite / send | `paper-plane-outline` | 24 / 20 / 16 | Masthead, drawer, recipe Share, profile Message |
| Tabs | `home-outline`, `search-outline`, `grid-outline`, `calendar-outline` | 24 | `Toolbar.tsx:97-127` |
| Create | `add` | 26 FAB; 16 slots/new; 18 unlock; 12 quick add | |
| Back | `chevron-back` | 18–24 | pushed screens, Cook Mode Previous |
| Forward / go | `chevron-forward`, `arrow-forward` | 16–20 / 15–18 | settings rows, shopping card, Cook Mode CTA, Cook this, Paywall |
| Close / remove | `close` | 11–22 | chips, slots, shopping rows, Cook Mode, collection pill |
| Clear search | `close-circle` | 17–18 | search fields |
| Filters | `options-outline` | 22 | Browse filter button; checklist step |
| Dropdown | `chevron-down` | 14 | FilterDropdown |
| Selected | `checkmark` | 10–18 | HAVE, match %, dropdown, tags |
| Save / saved | `bookmark-outline` / `bookmark` | 14–22 | cards, recipe action row, drawer |
| Comment | `chatbubble-outline` | 11–20 | recipe action row, feed tile |
| Cook toggle | `restaurant-outline` / `checkmark-circle` | 18 | recipe "Cook"/"Cooked"; also every no-photo placeholder (22–80) and "My recipes" |
| Cook Mode | `flame-outline` | 18 (36 empty) | recipe CTA, drawer "Kitchen stats", Cook Mode empty |
| Ingredients sheet | `list-outline` | 18 | Cook Mode |
| Info tiles | `time-outline`, `bar-chart-outline`, `people-outline` | 18 | recipe meta; `time-outline` 11–13 on card meta |
| Nutrition info / spinner info | `information-circle-outline` | 18–20 | |
| Plan share | `share-outline` | 18–20 | Plan title, own profile |
| Shopping aisle toggle | `file-tray-stacked-outline` | 14 | |
| Restore list / spin | `refresh` | 13–18 | shopping restore, Spin again (rotates 720°), reveal |
| Spinner hint | `hand-left-outline` | 13 | |
| Drawer | `notifications-outline`, `albums-outline`, `time-outline`, `sync-outline`, `settings-outline` | 22 | |
| Scan | `camera-outline`, `receipt-outline` | 22 | Cupboard shortcuts; camera 20 in comment composer |
| Compose DM | `create-outline` | 22 | Inbox |
| Toasts | `checkmark-circle`, `information-circle`, `heart` | 18 | |
| Settings rows | `color-palette-outline`, `contrast-outline`, `speedometer-outline`, `restaurant-outline`, `leaf-outline`, `globe-outline`, `time-outline`, `bar-chart-outline`, `refresh-outline`, `log-out-outline`, `trash-outline` | 18–20 | `SettingsModal.tsx:196-446` |
| Profile menu | `ellipsis-horizontal`, `ban-outline`, `flag-outline`, `checkmark-circle-outline` | 20–28 | |
| Checklist steps | `options-outline`, `dice-outline`, `heart-outline`, `person-outline` | 18 | `FirstRunChecklist.tsx:23-28` |
| Paywall benefits | `flame-outline`, `calendar-outline`, `sparkles-outline`, `shield-checkmark-outline`, `camera-outline`, `sunny-outline`, `scan-outline`, `paper-plane-outline`, `heart-outline`, `receipt-outline` | 14–16 | `data/pro.ts:41-104` |

### 5.2 Text glyphs and emoji used as icons (to replace with Ionicons later)

| Glyph | Meaning | Where | Suggested Ionicon |
|---|---|---|---|
| `←` | back (recipe hero) | `RecipeModal.tsx:201`; also `RecipeEditorModal.tsx:161`, `NotificationsModal.tsx:46`, `ThreadModal.tsx:79` | `arrow-back` |
| `⋯` | more (recipe hero) | `RecipeModal.tsx:205` | `ellipsis-horizontal` |
| `›` | drawer profile chevron | `SideDrawer.tsx:204` | `chevron-forward` |
| `＋` (full-width) | signed-out avatar | `SideDrawer.tsx:183`, `SettingsModal.tsx:176` | `add` |
| `→` | primary arrows | `OnboardingModal.tsx:252,296,621,675`; `FirstRunChecklist.tsx:116` ("START →"); "See all →" `BrowseModal.tsx:563`, `PantryModal.tsx:895`; `ResultDetailModal.tsx:73`; `RecommendedModal.tsx:78`; `PostDetailModal.tsx:314,325`; `ThreadModal.tsx:209`; `SendToSheet.tsx:194` | `arrow-forward` |
| `✓` | checkbox tick / timer done | `OnboardingModal.tsx:237`; `StepText.tsx:116` ("Done ✓"); `RecipeActionsSheet.tsx:138` | `checkmark` |
| `⏸` | timer paused | `StepText.tsx:113` | `pause` |
| `↳` | substitution | `RecipeBody.tsx:161`; `CookModeModal.tsx:317` | `return-down-forward-outline` |
| `·` | note bullet | `RecipeBody.tsx:188`; `RecipeEditorModal.tsx:314` | small dot view (keep) |
| `◷` | Add to plan | `RecipeActionsSheet.tsx:131` | `calendar-outline` |
| `+` / `✓` | grocery list toggle | `RecipeActionsSheet.tsx:138` | `add` / `checkmark` |
| `🔖` (emoji) | save | `RecipeActionsSheet.tsx:145` | `bookmark(-outline)` |
| `❏` | save to collection | `RecipeActionsSheet.tsx:153` | `albums-outline` |
| `↗` | share | `RecipeActionsSheet.tsx:160` | `share-outline` |
| `✉` | email/export | `RecipeActionsSheet.tsx:166` | `mail-outline` |
| `⌕` | search | `RecipeActionsSheet.tsx:172`; `MealPickerSheet.tsx:74`; `SendToSheet.tsx:124`; `ComposeMessageSheet.tsx:84` | `search-outline` |
| `✕` | close | `MealPickerSheet.tsx:65`; `SendToSheet.tsx:93`; `ComposeMessageSheet.tsx:75` | `close` |
| `+` (text) | add meal row | `MealPickerSheet.tsx:69` | `add` |
| `♥` | favourite / likes | `MealPickerSheet.tsx:112`; `BrowseModal.tsx:671` | `heart` |
| `⊘` / `◯` | hidden toggle | `MealRow.tsx:65` | `eye-off-outline` / `eye-outline` |
| `≤` | time options text | `SpinnerModal.tsx:58-61`, `FeedScreen.tsx:79-82`, `SettingsModal.tsx:287` | text (not an icon) |
| Emoji avatars 🍳 🥘 🍜 🥗 🍰 🌮 🍝 🥑 🍲 🧑‍🍳 🔥 🫕 | profile avatar | `ProfileSetupModal.tsx:28`; `ProfileModal.tsx:41`; shown in `UserProfileModal.tsx:178` (`light-23-profile`) | initial letter or photo |
| Quick-chip emoji 🍝 🥗 ⏱ 🌱 🤍 🥯 🌶 🍲 🌿 👨‍👩‍👧 🥞 | defined, **not rendered** | `BrowseModal.tsx:66-78` | none |
| `meal.emoji` / ingredient `emoji` | no-photo fallback in onboarding reveal, pantry tile (legacy) | `OnboardingModal.tsx:590`; `PantryModal.tsx:1609` | `restaurant-outline` |

---

## 6. Motion and haptics

| What | Animation | Source |
|---|---|---|
| Pushed screen (`ScreenModal`) | slide: translateY window height → 0 over **280 ms `Easing.out(cubic)`**; dismiss → height over **220 ms `Easing.in(cubic)`**; fade variant uses the same timings on opacity; `none` = 0 ms. Stacks by z-index. | `components/ScreenModal.tsx:71-137` |
| Tab roots | `animationType="none"`, kept mounted | `BrowseModal.tsx:500-508` etc. |
| Bottom sheet | enter 260 ms `out(cubic)`, exit 220 ms `in(cubic)`; card slides from window height **and** fades; backdrop opacity follows | `BottomSheet.tsx:118-137,180-231` |
| Drawer | panel translateX −W → 0 and backdrop 0 → 1, 220 ms, default easing (`Easing.inOut(ease)`); closes instantly (values reset) | `SideDrawer.tsx:79-102` |
| Toast | in: opacity 0 → 1 200 ms `out(quad)` + translateY 20 → 0 220 ms `out(cubic)`; out: both 200 ms linear; auto-hide 2500 ms | `Toast.tsx:20-72` |
| Toolbar | hides on keyboard: translateY 0 → 180, 180 ms (both ways) | `Toolbar.tsx:45-61` |
| Press feedback | `scale 0.96` on tabs/FAB; elsewhere opacity 0.6–0.95 | throughout |
| Spinner | spin icon rotates 0 → 720° over 600 ms `bezier(0.2,0.7,0.3,1)`; 9 ticks at `[55,55,60,70,85,110,145,195,260]` ms, each: translateX ±8, tilt ±2°, scale 0.97, 140 ms `out(quad)`; settle: tx/tilt → 0 over 220 ms `bezier(0.34,1.56,0.64,1)` while scale 1.04 (220 ms same curve) → 1 (200 ms `out(quad)`); peek drift 400 ms `bezier(0.2,0.7,0.3,1)`; tap hint opacity → 0.4 in 250 ms. Honours Reduce Motion (skips transforms). | `SpinnerModal.tsx:43-47,138-270` |
| Unused | `SpinButton` spring (press in `speed 40 bounciness 0` → 0.97; out `speed 30 bounciness 6`) and `Reel` (2800 ms `out(poly(5))`) are not imported anywhere | `components/SpinButton.tsx:18-23`, `components/Reel.tsx:12,44-48` |

**Haptics (native only):**
- Spinner result: `notificationAsync(Success)` (`SpinnerModal.tsx:265`).
- Timer finished: `notificationAsync(Success)`; web `navigator.vibrate([200,100,200])` (`StepText.tsx:89-95`).
- Cook Mode step change: `selectionAsync()` (`CookModeModal.tsx:93-97`).
- `SpinButton` (unused): `impactAsync(Heavy)` (`SpinButton.tsx:26`).

---

## 7. Per-screen layout notes

All tab roots: bg `bg`, safe-area top, Masthead, scroll with pb 160, Toolbar overlay. Pushed screens: own header, no Toolbar (except Spinner).

### Feed (Home) — `screens/HomeScreen.tsx:381-413`, `screens/FeedScreen.tsx`
Masthead → First-run checklist (only after onboarding, until dismissed/done; card mh 16 mt 10 mb 4 r20, progress ring 50/44, horizontal step cards) → Feed. Feed: filter dropdown bar (Cuisine, Time, Difficulty, Meal, Diet) → hero carousel (5 posts, paged, dots) → "TRENDING BITES / What's cooking?" → 2-col tiles. States: "Loading feed…", error (`light-10-feed`: "Couldn't load the feed / Check your connection and pull down to retry."), empty "Quiet round here". Social: out of scope for local-first v1.

### Browse — `screens/BrowseModal.tsx:246-449`
1. "BROWSE" / "Discover".
2. Search field + filter button.
3. Recipes | People segmented pill.
4. (Active collection pill + "N recipes" when a mood shelf is tapped.)
5. **TODAY / Recipe of the day** — 16:9 hero (daily deterministic pick).
6. **Quick chips** (no header): Pasta, Bowls, 30 min, Vegan, Comfort, Bake, Spicy, One-pot, In season, Family, Breakfast — toggles a filter.
7. **COLLECTIONS / Cook by mood** — 260 × 195 shelf cards.
8. **TRENDING THIS WEEK / What's hot** — 4 numbered rows (skeleton while loading; `light-11b` shows skeleton).
9. **ALL RECIPES / Browse by your pantry** — 2-col preview grid of 4 random recipes.
Searching or a mood filter replaces 5–9 with a 2-col results grid; empty "No meals match." (14 inkMuted, pv 40). People tab: rows (50 avatar, name 14/800, handle 12, bio 12, Follow pill r10 ink / soft).
⚠ The brief listed "browse by your pantry" and "all recipes" as two sections; in code they are one section ("ALL RECIPES" kicker, "Browse by your pantry" title).

### Cupboard — `screens/PantryModal.tsx:459-776`
1. "CUPBOARD" (muted) / "What do you have?" / subtitle.
2. Scan row: "Snap pantry — AI reads the shelf" (`camera-outline`) and "Scan receipt — Bulk add at once" (`receipt-outline`); icon well 36 r12 filled `border`. (Pro-gated, AI: out of scope for v1.)
3. YOUR CUPBOARD header: kicker + "6 ingredients · 5 categories" 11.5/500 + "CLEAR" 11.5/700/0.4 danger uppercase. ⚠ Both truncate at 390 wide ("YOUR CUPBOA…", "5 categ…" in `light-12`).
4. Category groups (gap 18): group head (name kicker, gradient rule, italic count) → wrap of jar chips (gap 6). Empty: italic serif 13 "Tap items below to start filling your cupboard."
5. QUICK ADDS kicker + horizontal quick-add chips (hidden when all present).
6. Ingredient search + inline suggestion rows (label 15/600, state "ADD"/"IN CUPBOARD" 12/700/1.5).
7. "Assume I have pantry staples" switch row (hairlines top/bottom, mh 20 mb 28, pv 16).
8. "0 RECIPES MATCH / You can make this tonight" + empty text (only if nothing matches).
9. "N FROM YOUR COOKMARKS / From your saved" — ink match cards.
10. "N PICKED FOR YOU / Suggested for you" — ink match cards.
11. "UNLOCK MORE / Add one thing" — 3 rows: italic numeral "01", "Add garlic" serif 18/600, "Unlocks N more recipes", 36 ink round `add`.
12. "BROWSE / Stock the cupboard" — category tabs (Proteins, Vegetables, Fruit, Sauces, Pantry, Dairy, Herbs; default Vegetables) + 3-col tiles (italic initial + name; selected = category tint/soft border, initial bold colour, name `#2a2218` 700).

### Plan — `screens/CartModal.tsx:311-609`
Title block with share button and "N of 21 meals" progress → underline tabs.
**This week:** week strip (Mon–Sun of the current week, opens on today) → "Wednesday · Sep 30" → Breakfast/Lunch/Dinner slots (card or dashed "+ Add …" which opens the meal picker sheet) → suggestions shelf ("SUGGESTED FOR THIS DAY / From your cupboard", or "POPULAR THIS WEEK / Crowd-pleasers to get you started" — `data/planSuggestions.ts:79-82`; tapping fills the first empty slot of the active day) → black shopping summary card.
**Shopping list:** see §4.13.
Meal picker (`screens/MealPickerSheet.tsx`): full-screen slide-up on `bgSoft`: 36 r12 `card` close ("✕"), "PLAN" kicker 11/800/3 accent, serif 24/700 "Add breakfast for Wednesday", search, rows (`card`, r18, pv/ph 10, mb 6, 40 thumb r12, name 15/700, sub 11/600/0.4 UP, "+" 24/700).

### Cookmarks / Saved — `screens/CookmarksModal.tsx`
Library header ("SAVED" / "Saved" / "4 items") → 2-col cream cards (recipes first, newest first; then saved bites). Empty pattern B "Nothing saved yet". Slide-up, safe area top + bottom, pb 40.

### Collections — `screens/CollectionsModal.tsx`
List view: "COLLECTIONS" / "Your shelves" / "1 collection" → outlined "+ New collection" (actions row ph 22 pt 18 pb 12) → 2-col mosaics (48 %). Detail view: "COLLECTION" / name / count → cream recipe cards. New-collection dialog: BottomSheet used as a centred dialog (padding 24): card `bg` r18 p20 border; serif 18/600 title; serif 16/500 input `bgSoft` r12 border; Cancel/Create pair. Screenshot `light-18`: mosaic with 2 photos and dark empty cells.

### My recipes — `screens/CustomMealsModal.tsx`
Page bg `bgSoft`. Header: 44 r14 `card` back + sans 28/800 "Your own\nmeals". Input row (ph 20, mt 18, mb 14, gap 8): input `card` r16 ph 16 pv 14 15 + amber "Add". "OR IMPORT FROM A LINK" 11/800/2 inkMuted. URL row + amber "Import" ("…" while busy). List of `MealRow`s (gap 10) with red "Remove". Empty: centred 14/20 inkMuted "Add your favourites above. They'll be included in spins." ⚠ This screen's typography (sans title, amber buttons) doesn't match the editorial style elsewhere.

### Recently viewed — `screens/FilteredMealsModal.tsx` (kind `recents`)
Pushed header ("RECENTS" / "Recently\nviewed" / "3 meals" 13/600 inkMuted) + "Clear" soft pill → 2-col `MealCard` grid (ph 20, gap 12). Empty pattern A.

### Kitchen stats — `screens/StatsModal.tsx`
Pushed header ("KITCHEN STATS" / "Your\ncooking") → streak card → 3 tiles (This week, Total cooks, Best streak) → "Top cuisines" and "Most cooked" rank lists (top 3) → "Clear cooking history" soft pill. Empty: "No cooks logged yet".

### Spinner (Surprise me) — `screens/SpinnerModal.tsx:352-525`
Header (ph 18, pt 8, pb 6): 38 round `bgSoft`+border back (`chevron-back` 18); centred counter "156 / 170" (serif 18/600 ink, "/" 16/400 inkSubtle, total 14/500 inkMuted; zero-padded to 2); 38 round info button. Title block (ph 20, pt 12, pb 22): "TONIGHT'S DINNER" / "Surprise *me*" / subtitle. Dropdown chips (Meal, Time, Pantry; ph 20 pb 28 gap 8). Stage (ph 28, pt 4, pb 36): peeks + hero. Tap hint (mt −16 mb 12): `hand-left-outline` 13 + "TAP CARD TO SPIN" 11/600/0.7 inkMuted ("SPINNING…"). "WHY THIS" kicker + reason rows (mh 20, pv 12, 1 border between; key 10.5/700/2.3 inkMuted width 78; value serif 13.5/500 lh19 inkSoft): PANTRY, TIME, FOR YOU. Inline actions (ph 22, pt 8, pb 24, gap 10): "Spin again" black pill + "Cook this →" outline. Toolbar (Plan active). Info sheet: native slide modal, bg `bg`, r22 top, ph 22; "ABOUT" / "How Surprise me works" serif 24/600; four rows (SPIN, FILTERS, WHY THIS, COOK THIS) with 86-wide kickers and serif 14/500 body; "Got it" black pill. Empty: pattern C "No dishes match."

### Settings — `screens/SettingsModal.tsx`
Page bg `bgSoft`. Pushed header ("SETTINGS" / "Preferences", back button `card`). Body ph 20 pb 60. Profile card (`card`, r24, p14, gap 14, mt 6): 52 avatar, name 16/800, sub 12/500, chevron. Sections (mt 22): label 11/800/2 inkMuted (ph 4, mb 8) + white card (r24, ph 14) of rows (pv 14 gap 12, hairline dividers; icon 20 ink; label 14/600; value 13/500 inkMuted; chevron 16). Order: APPEARANCE (Theme segment System/Light/Dark + helper; High contrast switch + helper), MEASUREMENTS (Units segment "Metric (g, ml, °C)" / "Imperial (oz, cups, °F)" + helper), COOKING (Diet, Avoid, Cuisines, Weeknight time, Skill level — each opens `PreferenceEditorSheet`), NOTIFICATIONS, PRIVACY (Private account, Crash reports, Export my data), PANTRY PRO (Status, Start/Manage), ABOUT (Version, Terms, Privacy). Then "Redo welcome flow", "Sign out" (signed in), "Delete account", footer "The Pantry · v1.0.0" 12 centred mt 18. No screenshot.

### Profile — `screens/UserProfileModal.tsx` (see §4.22)
`light-23-profile` and `light-24-avatar` are the same screen (own profile, emoji avatar, empty cookbook).

### Inbox / Activity — `screens/InboxModal.tsx`
Pushed header ("INBOX" / "Messages" or "Activity"; compose button on Messages) → underline tabs → list or empty (pattern A: "No messages yet", "All caught up"). Rows: ph 16 pv 12 gap 14, unread bg `bgSoft`, 52 avatar, name 15/800, preview 13/500 inkSoft (unread 700 ink), time 12/500. Notification rows: 44 avatar + 20 action pip (2 pt `bg` border), line 14/19, time 11/600, 44 thumb r8. Social: out of scope for v1.

### Create post (Share a bite) — `screens/CreatePostModal.tsx`
Header (ph 16, pt 10, pb 12, 1 border bottom): 40 r12 `bgSoft` close; centred "NEW BITE" 11/700/2.5 + serif 18/600 "Share a bite"; "Share" pill (ph 18 pv 9, `ink`; disabled `bgSoft` + inkMuted label). Body ph 20 pt 18 pb 80. Sections (label row mt 22 mb 10, 11/700/2.5 inkMuted, right counter 11/700/1.5): PHOTOS (112 × 132 tiles, dashed empty with `add` 26; COVER badge; × disc), helper 12/17; WHAT'S THE DISH? (serif 26/600 underline input lh34); CAPTION (`bgSoft` r12 border, minH 88); DETAILS (two stat cards: icon, serif 19/700 value + 10/700/1.8 label, 28 r8 −/+ steppers); DIFFICULTY (three flex chips pv 12 r12 `bgSoft`, active `ink`); INGREDIENTS / STEPS (numbered/bulleted inputs, "Add step" soft button); TAGS; recipe card; preview (ink card, 4:3 photo, eyebrow + serif 19/600 + meta). Social: out of scope for v1.

### Recipe page — see §4.18 (`light-26*`).

### Cook Mode — see §4.20.

### Onboarding — see §4.21 (`light-00-welcome`, `light-01-onb-1` identical: the capture never passed the consent step).

### Filters — `screens/FiltersModal.tsx`
Page bg `bgSoft`. Header 44 r14 `card` back + sans 28/800 "Refine your\nrotation". Body padding 24 pt 16: "N meals match" 14/500 inkMuted mb 24; sections (title 16/800/-0.3 mb 12) Cuisine, Diet, Meal type, Time, Difficulty, Cookware — each a wrap of `Chip`s (gap 8, mb 20) whose active colours come from the tint palettes (§1.2); italic hint 12/18; "Clear all filters" `card` pill pv 16, 13/700/0.3 ink.

### Paywall — `screens/PaywallModal.tsx`
BottomSheet; sheet `bg`, r24 top, handle, scroll max h 640 ph 20. Hero (pb 18 hairline): kicker row (feature icon 14 accent + 11/800/2.5 accent), serif 26/600/-0.5 lh32 title, 14/20 inkSoft body. "EVERYTHING YOU GET" 10/800/2.5 + benefit rows (icon 16 ink + 14/500, pv 6 gap 12). Plan tiles (row gap 8, pt 18): flex 1, pv 14 ph 10, r14, 1.5 border `border` (selected `ink` + bg `bgSoft`); label 11/800/1.2; savings pill `accent` r6 9/800 `bg`; price serif 20/600; cadence 11/600. CTA black pill "Start Pantry Pro →". "Restore purchases", terms 11/16, legal links row, "Maybe later". (Money/RevenueCat: ask Lachlan before touching.)

---

## 8. Discrepancies, bugs and open questions

### 8.1 Conflicts with v2 rules (need Lachlan's call)
1. **Fonts:** v1 = Georgia + system sans; D-016/CLAUDE.md = Newsreader + Manrope. They will not look identical (different x-height, width, weights). Options: (a) keep Newsreader/Manrope and match sizes/weights from this spec; (b) use Georgia/system for exact parity and amend D-016.
2. **Palette:** v1 is white `#FFFFFF`/`#0A0A0A` with amber `#C99155`; D-016 approved "Paper and Night" palettes and D-012 darkened the light accent to `#8E6232`. Exact parity means reverting to §1.1.
3. **Green:** v1 uses green in `mint` tints, cupboard Vegetables/Herbs, KOREAN/VEGAN/MIDDLE EASTERN eyebrows, checklist `#5C7D52`. The v2 token test forbids green.
4. **Emoji:** profile avatars, `RecipeActionsSheet` 🔖, onboarding reveal `meal.emoji` fallback (§5.2).
5. **Contrast:** v1 accent `#C99155` on white is 2.7:1 (fails 4.5:1), so every amber kicker and the amber "Add" button label fail the v2 contrast test; `inkMuted #6E6E6E` passes at 5.1:1.

### 8.2 Bugs in v1 (copying them would copy the bug)
1. Drawer count badges: white text on `ink` → invisible in dark (`SideDrawer.tsx:356,360`; `dark-14-drawer`).
2. `Chip` default active text `#FFFFFF` on `ink` → invisible in dark (`Chip.tsx:23,30`); Filters avoids it by passing tints.
3. Timer chip "running" white on `ink` → invisible in dark (`StepText.tsx:158-162`).
4. Cook Mode CTA icon disc `rgba(255,255,255,0.10)` vanishes on the cream dark-mode pill (`RecipeModal.tsx:870`).
5. Shopping summary chips `rgba(0,0,0,0.05)` are almost invisible on the black light-mode card (`CartModal.tsx:1064`).
6. Plan active-day weekday stays `inkSoft` on `ink` (low contrast) (`CartModal.tsx:837`).
7. All category tints (§1.2, §1.4) and library cream cards are light-only; the pastel chips glare on the dark page (`dark-12-cupboard`).
8. Toolbar gradient picks its colour by comparing `theme.bg` to the literal `'#FFFFFF'` (`Toolbar.tsx:75`), so high-contrast dark (`#000`) fades to `#0A0A0A`.
9. Recipe-of-the-day eyebrow sits on the photo without enough scrim (`light-11-browse`).
10. "YOUR CUPBOARD" kicker and meta truncate at 390 wide (`PantryModal.tsx:499-503`; `light-12`).
11. `MealCard` grids stretch an odd last card to full width (`light-20-recent`).
12. Spinner shows the Plan tab as active (`SpinnerModal.tsx:314,516`).
13. `StepText` timer chip padding/radius are set on a nested `Text`, which iOS ignores; the web screenshot shows a padded pill that iOS will not.

### 8.3 Code vs screenshot notes
- The brief expected an orange "CUPBOARD" kicker; code and screenshot use muted grey (`PantryModal.tsx:1091-1097`). Only Browse-family kickers and pushed-screen kickers are amber.
- Staples switch renders teal in the web export (RN-web default thumb); on iOS it follows the code (ink track, `bg` thumb).
- Georgia weights: 600 renders as bold; 500 as regular (screenshots agree).
- `light-27-cookmode` shows the recipe page (Cook Mode never opened). `light-01-onb-1` equals `light-00-welcome`. The welcome video is black on web. Feed screenshot is the error state; Browse trending is the loading skeleton. No screenshots exist for Settings, Filters, Paywall, Create post (only the top of it), Cook Mode, the Shopping list tab, onboarding steps 1–6, or bottom sheets.
- `light-23-profile` and `light-24-avatar` are identical.
- Two cuisine colour systems (§1.3).
- Unused components/styles: `SpinButton`, `Reel`, `borderSoft`, `radiusSm`/`radiusXl` by name, `orangeDeep`, `peach`, `yellow`, RecipeModal's duplicated body styles (`RecipeModal.tsx:839-1344`), quick-chip emoji, Cupboard `tile*`/`tabStrip`/`addChip`/`chipWrap` styles.

### 8.4 Out of v1 scope but specified above for completeness
Feed, Inbox, Create post, People tab, profile follows/messages (social), Snap pantry / Scan receipt (AI), Paywall (money). CLAUDE.md: "v1 is local-first: no accounts, no social, no AI scanning."
