# Function and look audit — 30 September 2026

Every screen was shot in light and dark with realistic data and compared with v1's screenshots and spec. Every control was pressed in the web build, with the main journeys run end to end (plan → list → tick → cupboard; cook → stats; "not for us"). Maestro ran on the simulator but was blocked by Expo Go (see the end).

## Fixed today (commit f71bee4)

| Area | What was wrong | Now |
| --- | --- | --- |
| Shopping list | Unticking an item deleted it from the list (it stayed in the cupboard) | Unticking takes back only what the tick put in the cupboard |
| Shopping list | "Add 5 to list" and Cupboard "List" duplicated lines and never reached the cupboard when ticked | They keep the ingredient id: they merge with the plan's line and tick into the cupboard |
| Browse | Ignored diet and the avoid list (a vegetarian saw BBQ ribs) | Same hard rules as everywhere else |
| Search | "pasta" found 87 recipes (typo match on "paste") | Typos are forgiven only when nothing matches as typed |
| Counts | Tab badge, progress and list card disagreed | One meal count (filled slots) everywhere |
| Navigation | Back/close did nothing on a deep link or reload | Falls back to home |
| Cook Mode | Keep-awake could throw an error | Can't throw |
| Recipe page | Back and ⋯ floated over the ingredients when scrolled | Sheet stays below the photo and scrolls inside (v1) |
| Dark mode | Pastel cupboard jars glared; switch off-tracks, segmented tracks and grey-page back buttons were invisible | Dark jar colours; visible controls |
| Sheets | Two grab handles on iOS; heavy left-aligned titles | One handle; v1's centred title; kicker labels |
| Add to plan | "Ideas" was the catalogue A–Z; long title | "Add dinner for today"; ideas for this cook |
| Durations | "20 min" vs v1's "20m" | v1's "20m", "1h 30m"; tiles as number + unit |
| Spacing | Titles sat ~14pt low; big stacked gaps under them | v1's positions |
| Small | Past days faded; ticked collection struck through; clashing placeholder; empty shelf sheet; bare "3" kickers; spinner keys | All fixed |

## Fixed the same evening (second pass)

- **Library in v1's look:**
  - Cookmarks: library header and cream cards.
  - Collections: mosaics, the "New collection" dialog, and ⋯ rename/delete with undo.
  - Recently viewed: grid and Clear with undo.
  - Kitchen stats: streak card, tiles and top lists from the real cook log, and clear history with undo.
  - Dark variants of the cream cards.
- **Cook Mode in v1's look:**
  - Header with "COOK MODE", the meal name and "1 / 7".
  - Progress segments, the italic "01", 22pt step text and timer chips.
  - The ingredients bottom sheet with HAVE pills.
  - Previous as text, and the black Next pill.
- **Settings:** v1's grouped white cards in v1's order. Diet, avoid, cuisines and weeknight time open as sheets.
- **Filters:** v1's "Refine your rotation", a live "N meals match", cuisine first, pastel active chips and "Show N recipes".
- **Welcome:** v1's full-bleed photo page ("Tonight's dinner, sorted."). The quiz, reveal and reminder share the dark look. It uses a still from v1's video, because video needs a native module.
- **Cupboard:**
  - v1's stock tabs and tinted tiles.
  - Jar headings with the rule and italic count.
  - One row of quick adds.
  - "01" add-one-thing rows.
  - Aligned settings rows.
  - Return adds the top match.
- **Recipe cupboard card:**
  - The recipe's own wording ("courgette").
  - Counts that match the HAVE pills.
  - "✓ On your list" after adding.
  - Matching pills: "I have these" is new (see below).
- **Deep links:** a deep link now opens with the tabs underneath, so the menu dims a real screen and closing lands somewhere.
- **Sharing on the web:** copies the text when there's no share sheet.
- **Browse:** the Vegetarian chip is labelled Vegetarian.
- **Shopping list:**
  - Lime/lemon/orange juice becomes whole fruit.
  - Cinnamon sticks are no longer ground cinnamon (catalogue regenerated).
  - Litres and kilos finer than a quarter show as decimals.
- **Switches:** one shared switch control, with no teal thumb on the web.

## Still open

- **Needs Lachlan:**
  - the 13+/Terms/Privacy consent (there are no real terms yet);
  - the welcome video (needs expo-video, a native module);
  - the recipe card's new "I have these" action;
  - whether near-duplicate recipes that share a photo should get their own (chicken/beef gyudon, schnitzel ×3, beef curry/rendang, bibimbap/bulgogi bowl, chicken tagine/tagine, quesadillas).
- **Small:** editor polish (chip wall for cuisine, heading styles), import-from-link as a sheet, and ModalSheet needing a header slot (Cook Mode copies its shell).

## Needs the phone, not the web

Share sheets, link import, the Sunday reminder, haptics and VoiceOver state (web drops checked/selected) can only be checked on the phone.

## Maestro

The app now loads in the simulator: the runner has its own Expo, which never asks questions.

Every flow then stopped at the first tap. Expo Go 57 floats a gear button exactly over the welcome screen's Skip, so Maestro opened Expo's menu instead. The flows now turn that button off at the start (commit cbe2b54).

The same gear is on your phone. Drag it aside, or turn it off in Expo Go's menu under "Tools button".
