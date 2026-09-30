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

## Still to do (not started, by phase)

**Library screens (P6).** Cookmarks, Collections, Recently viewed and Kitchen stats still share one placeholder list layout. v1 has its own look for each:

- cream library cards and the "Saved" count header;
- 2×2 collection mosaics with a "New collection" pill;
- the streak card, tiles and top lists on Stats;
- the grid and Clear button on Recent.

**Cook Mode (P6).** v1's header ("COOK MODE" + meal name, list button, "1 / 7"), progress segments, the big italic "01" and 22pt step text, timer chips, and the ingredients bottom sheet.

**Settings and Filters (P6).**
- Settings: v1's white grouped cards and section order.
- Filters: v1's page, "N meals match", pastel active chips and cuisine first.

**Welcome (P7).** v1's full-bleed video page with bottom-aligned copy. The 13+/Terms/Privacy consent is needed again with social at launch.

**Cupboard polish.**
- "Stock the cupboard": v1's underline tabs and tinted tiles, not black tiles.
- Jar group heads with the rule and italic count.
- One-row quick adds.
- v1's "01" add-one-thing rows.
- Menu over a dimmed live screen.

**Recipe page.**
- The cupboard card should show the recipe's own ingredient names ("courgette", not "zucchini"), with counts that match the pills.
- Its two actions should match.

**Catalogue content** (via `recipe-fixes.json`).
- Near-duplicate recipes share photos (Schnitzel ×3, BBQ ribs ×2).
- The Pepperoni Pizza photo is wrong.
- Shopping merges that read oddly:
  - lime juice → "Lime, 1 tbsp + 1";
  - cinnamon stick → ground cinnamon;
  - "2⅛ L" stock.

**Small.**
- Enter in the cupboard search should add the top match.
- Restore undone items in their old place.
- Share should fall back to copying on the web.
- The Vegetarian chip opens "Plant forward".

## Needs the phone, not the web

Share sheets, link import, the Sunday reminder, haptics and VoiceOver state (web drops checked/selected) can only be checked on the phone.

## Maestro

The app now loads in the simulator: the runner has its own Expo, which never asks questions.

Every flow then stopped at the first tap. Expo Go 57 floats a gear button exactly over the welcome screen's Skip, so Maestro opened Expo's menu instead. The flows now turn that button off at the start (commit cbe2b54).

The same gear is on your phone. Drag it aside, or turn it off in Expo Go's menu under "Tools button".
