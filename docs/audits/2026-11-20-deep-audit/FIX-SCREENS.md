# Screens fixer: report (20 Nov 2026)

Branch `audit/deep-1120`. I fixed 21 findings in full or in part. Nothing was pushed.

Screenshots are full size, light and dark, at 390 x 844, in `HQ/11-ThePantryV2/audits/2026-11-20/fix-screens/` (not in git), with contact sheets in `sheets/`. They were taken from a store-like web export served on :4416, with every `supabase.co` request aborted. The scripts are in `tools/FIX-SCREENS/`.

## Findings

| Finding | Status | Commit | What changed | Proof |
|---|---|---|---|---|
| REL2-2 / F-5 | fixed | edf79cf | Pro isn't offered for sale until both the privacy and terms links exist (`canSellPro`). `usePurchasesReady` checks it, so free limits never apply when nobody can buy. | PaywallScreen, LegalRows and ProSection tests. Shot `REL2-2-pro`. |
| REL2-1 / UX-2 | fixed | 7f324c4 | Store builds hide the other-cooks surfaces: the feed, recipe and cook routes answer not-found, and Home and the menu leave them out. Internal builds reach the feed from a menu row. | `src/buildKinds.test.tsx` (16). Shots `REL2-1-feed`, `UX-1-menu`. |
| REL2-8 / UX-6 | fixed | 7f324c4 | The scan tiles and `/cupboard/scan` are hidden until scanning is connected (`SCAN_WAYS_SHOWN`). | Same test. Shot `REL2-8-cupboard-scan`. |
| REPO-13 | part-fixed | 7f324c4 | One build flag (`INTERNAL_BUILD`) now gates the Home viewer and the Pro testing switches. | `src/lib/build.test.tsx`. The EAS check on the production profile is left to the owner. |
| PERF-3 | fixed | 54d4779 | ActionSheet and Drawer clear their timers on unmount. Settings' tour timer is meant to outlive Settings, because `dismissTo('/')` unmounts it and the tour starts on Home, so I left it alone. | Shell and ui tests. |
| UX-3 | fixed | 68573c3 | Control edges reach 3:1 through the new `controlEdge` token on text fields, search and steppers. | `tokens.test.ts` "control edges (3:1)". |
| UX-9 | fixed | 68573c3 | `inkSubtle` and the light `accent` now reach 3:1 (see the token table below). | `tokens.test.ts`. |
| UX-12 | fixed | 68573c3 | Jar and library colours reach 3:1 on both the background and the card. | `tokens.test.ts`. Shot `UX-12-cupboard-stocked`. |
| UX-10 | part-fixed | 68573c3 | Meta text on photos uses `onPhotoMuted`, and the unselected video icon uses `videoSub`. The welcome quiz's top scrim depends on its fixed photo, so I left it. | Shot `UX-10-home-stocked`. |
| UX-1 | fixed | cc9c396 | Plates say what they are: "Add a plate", Save, "Only you can see your plates." Nothing promises sharing. | `PostScreen.test`. Shots `UX-1-post`, `UX-1-menu`. |
| UX-5 | fixed | cc9c396 | Home's other-cooks section says "What they're cooking" with "Ready now" and "Nearly there". Plan keeps "Picked for you". | `HomeForYou.test`. |
| UX-14 | fixed | cc9c396 | The Cupboard subtitle says "what you have" once. | Shot `UX-14-cupboard-empty`. |
| UX-15 | fixed | cc9c396 | The cookable list uses "Ready now" and "Nearly there", and rows in Ready now drop the repeated "Ready to cook". | Shot `UX-15-cupboard-cookable`. |
| UX-16 | fixed | cc9c396 | There is one offline line across the app, and a curly apostrophe in "We couldn't find that recipe". | `CommunityFeed.test`. Shot `UX-16-recipe-missing`. |
| UX-11 | fixed | 2086fe4 | A missing collection shows one empty state with a back chip, with no "Not found · 0 recipes" header. | `CollectionScreen.test`. Shot `UX-11-collection-missing`. |
| F-10 | part-fixed | 2086fe4 | Display half: the Plan badge leaves out recipes that no longer exist, using the logic fixer's `entriesWithRecipes`. A collection holding only removed recipes says it's empty. | `useCounts.test`, `CollectionScreen.test`. Shot `F-10-plan-loaded` (badge 2, lunch "no longer available"). |
| UX-13 | fixed | df7dcfb | The checklist waits until the tour has been seen and closed. The tour's first stop now says "Fill your cupboard and this shows what you can cook now." | `FirstRunChecklist.test`. Shots `UX-13-home-tour`, `UX-13-home-checklist`. |
| UX-17 | fixed | df7dcfb | The checklist's count ring is one accessible element. | Code. |
| UX-18 | fixed | 66c8af2 | The "What I have" badge caps at 99+, and the spoken label keeps the real number. | `PantrySwitch.test`. |
| REL2-12 | part-fixed | 85b6a6e | Try again already worked. A root crash is now written to the device log. Crash reporting stays with the owner (K-8). | Code. |
| DATA-5 | part-fixed | 397c22a | Display half: Settings → Account names each set-aside item, for example "One of your recipes: 'Nan's lasagne'". It reads the existing account and household `setAside` state. | `AccountSection.test`. A screenshot isn't possible offline: a seeded account lapses as soon as the server is blocked. |

Extra fix: a5c2525 moved `buildKinds.test.tsx` out of `src/app`. Expo Router was bundling it into the web export as a route, `jest.mock` calls and all.

Left for someone else: the recipe editor's length cap that matches the row limit (FIX-DATA asked for it). It belongs to the editor feature, which is the logic fixer's area.

## Decisions taken

- Pro goes on sale only once both legal links are filled. Until then, nothing is limited.
- Store builds hide the other-cooks surfaces and the scan tiles, and internal builds keep them. How to present the AI cooks stays with the owner.
- Plates are a private photo log, and the words say so. Whether plates can be shared with other people is the owner's call.
- Home uses "Ready now" and "Nearly there", the same words as the Cupboard. "Picked for you" stays with Plan.
- The checklist is held back while the tour still has to run. A person who restarts the tour from Settings won't see the checklist until the tour ends.
- The badge shows 99+. The spoken label keeps the exact count.
- Set-aside items are named by their title or name where they have one, otherwise by their kind (for example "A planned meal").

## Tokens changed

| Token | Old | New | Ratio before → after |
|---|---|---|---|
| light `inkSubtle` | #BCBCBC | #939393 | 1.90 → 3.03 |
| dark `inkSubtle` | #48484A | #626263 | 2.02 / 2.17 → 3.02 / 3.25 (card / bg) |
| light `accent` | #C99155 | #BF8A51 | 2.74 → 3.0 |
| `controlEdge` (new) | none | light rgba(0,0,0,0.42), dark rgba(255,255,255,0.34), high contrast = `border` | 3.04 / 3.01 light, 3.02 / 3.11 dark |
| dark `raisedEdge` | 0.22 | 0.36 | 1.83 → 3.05 |
| light `LIBRARY.count` | #A0712F | #9B6E2E | 4.29 → 4.50 |
| dark `LIBRARY.wellIcon` | #6A6258 | #736B62 | 2.63 → 3.0 |
| light jar soft: vegetables, fruit, sauces, pantry, dairy, herbs, other | 63AB74, B7933F, CF8358, BD8F41, AE9740, 7AA761, CA874E | 5EA26E, B18E3D, CC8157, B88B3F, A9923E, 759F5D, C6844C | 2.76–2.98 → 3.06–3.09 |
| dark jar soft: proteins, sauces, other | 7A4238, 7C4F33, 7A5536 | 88564D, 845A3F, 7F5C3E | 2.34–2.79 → 3.06–3.08 on card |

## Lines outside my area (one each)

- `src/store/pro.ts`: the `usePurchasesReady` guard.
- `src/store/proSync.test.tsx`: sets the legal links.
- `src/lib/published.ts`: the offline line.
- `src/features/recipe/RecipeScreen.tsx`: the apostrophe.
- `.maestro/03-shell-navigation.yaml` and `.maestro/18-share-a-dish.yaml`: the plate title.

## Notes from the screenshots

- The Plan Cook icon (d9830f5) looks right in light and dark. It sits beside the remove button on planned meals.
- Gotcha: `expo export` reused Metro's cached transforms from an earlier export that had `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1`, so the "store" export came out internal. Re-export with `--clear` whenever that variable changes. Earlier web-export evidence may have the same problem.

## K-items that should change status

- K-25 / REL-06: done. Store builds hide the unfinished surfaces.
- K-37: done. Contrast reaches 3:1 for UI and 4.5:1 for text.
- K-8: still open (crash reporting).

## For the owner

- Publish the privacy and terms pages, then fill `LEGAL_URLS`.
- Decide how to show the AI cooks.
- Decide whether plates can be shared with other people.
- Crash reporting needs a Sentry account and a native module.
- Check that the EAS production profile never sets `EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1`.

## Final checks

- `npm run typecheck`: clean.
- `npm run lint`: clean.
- `npm test`: domain and token tests 623/623, Jest 294/294 in 60 suites.
- After the test move: `src/buildKinds.test.tsx` 16/16, and lint is clean on it.
