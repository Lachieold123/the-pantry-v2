# Cloud 03: parity phase P6, Library and cooking

**Branch:** `cloud/03-p6-library`, from `preview-2026-10-08` (dac1e37). Not merged anywhere.
**Date:** 12 October 2026, by Claude.

## What I found

Most of P6 was already done before this run. Commit f005af8 (30 September) moved the library, Kitchen stats and Cook Mode into v1's look. c01f33f rebuilt the spinner as v1's card deck (D-031). D-041 then merged the four library pages into one page with four tabs. I checked each P6 item against `docs/design/v1-reference/` and spec §4 and §7:

| Item | State before this run |
| --- | --- |
| Cookmarks (`light-17`) | Done: library head, cream cards, virtualised (REL-14) |
| Collections (`light-18`) | Done: "Your shelves" head, "+ New collection", mosaics, ⋯ rename/delete with undo |
| Recently viewed (`light-20`) | Done: grid, "Clear" with undo |
| Kitchen stats (`light-21`) | Done: streak card, three tiles, top cuisines, most cooked, "Clear cooking history" |
| Spinner (`light-22`) | Done: counter, info sheet, Meal/Time/Pantry chips, deck, Why this |
| Cook Mode (§4.20) | Done: header, progress segments, step numeral, ingredients sheet, Previous/Next |
| Drawer counts (§4.3) | Done |
| **My recipes (`light-19`)** | **Not in v1's layout:** "Write a recipe" and "Import from a link" buttons, and import opened a separate sheet |

## What this run changed

**My recipes now uses v1's layout:**
- an "Add a recipe…" field with an amber **Add** button;
- the "OR IMPORT FROM A LINK" kicker;
- a "Paste a recipe link…" field with an amber **Import** button;
- v1's quiet centred line when you have no recipes yet.

This also closes the open item "import-from-link as a sheet" from the 30 September look audit.

- **One deliberate difference from v1.** v1's Add saved only a name. In v2 your own recipes are real recipes: they scale, go on the shopping list, work in Cook Mode and come up in Surprise me. So **Add opens the editor with the name already filled in.** Pressing Add with the field empty opens a blank editor. Because the typed name counts as a change, Cancel asks before throwing it away.
- **Import works in place.** It reads the page right there and shows the same plain-words errors. It offers "Write it in by hand" when the page can't be reached or has no recipe, then opens the editor to check the recipe. Only an import that finds a recipe counts towards the free 5 a month (D-038), as before. The `/my-recipe/import` sheet still works for old links and uses the same code.
- **Code:**
  - the link-reading logic moved out of the sheet into `src/lib/useLinkImport.ts`;
  - the waiting import moved to `src/store/pendingImport.ts`, so both the Library tab and the editor can use it without one feature importing another;
  - there's a new `EntryRow` pattern (`src/ui/patterns/EntryRow.tsx`), built from tokens only;
  - the editor route takes `?title=`.
- **Tests:**
  - `MyRecipesTab.test.tsx` (5): the rows, Add with and without a name, a bad link, a page with no recipe, a found recipe being handed to the editor and counted;
  - `RecipeEditorScreen.test.tsx` (3): the starting name, Cancel asking first, an import winning over a name;
  - the web journey checks the new link field;
  - Maestro flow 11 is updated for the inline rows. It hasn't been run: there's no simulator in this environment.

## Results

- `npm run typecheck`: clean. `npm run lint`: clean.
- `npm test`: domain 331/331; components 33 suites, 117/117 (was 31 and 109).
- `npm run test:web`: 46/46, with the build exported using `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1`. Without that variable, the 4 Pro free-limit journeys fail, because they need an internal build. That's a test setup issue, not this change; it's worth noting in the README or the Playwright config.
- Screenshots: light (empty) and dark (with the bad-link error), from the web build, checked against `light-19`.

## Left for later (not done)

- **Cook Mode's ingredients sheet** still has its own copy of the sheet's outer shell, because ModalSheet has no slot for v1's left-aligned kicker-and-title header. I left it alone: a refactor I can't check on a phone isn't worth the risk to Cook Mode.
- **My recipes cards** are still v2's row cards, not v1's `MealRow` with a red "Remove". Delete stays in the editor, with undo.
- Phone check: the inline import on a real site, and the keyboard over the two fields.

## Needs Lachlan

- Confirm that "Add opens the editor with the name filled in" is right. The alternative is v1's behaviour: save a bare name as a draft to finish later.
- Nothing touched Supabase, money or native modules.
- The worktree started with a stray change: `docs/launch/APP-STORE-LISTING.md` against `app-store-listing.md`. It was only macOS's case-insensitive file system confusing two file names. The old file's contents are saved at `/tmp/p6-APP-STORE-LISTING.preexisting.md`, and nothing in the repo was lost.
