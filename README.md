# The Pantry

The cooking app for people who actually cook: plan the week on Sunday, shop once, and know what's for dinner on Tuesday night.

This is v2, a ground-up rebuild. The plan is in [`docs/REBUILD-MAP.md`](docs/REBUILD-MAP.md), what the app does is in [`docs/PRODUCT.md`](docs/PRODUCT.md), and every decision is logged in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## What's here so far

| Folder | What it holds |
|---|---|
| `src/domain/` | The app's logic in plain TypeScript: ingredients and units, recipes and diets, the week plan, the shopping list, the cupboard, Surprise me and Cook Mode. No packages, fully tested. |
| `src/ui/tokens/` | Design tokens: colours for each theme, type, spacing and motion. Tested for contrast. |
| `src/data/` | The ingredient database and the converted recipe catalogue (generated; don't edit by hand). |
| `assets/recipes/` | Recipe photos. |
| `scripts/` | The catalogue converter, its hand-fix and tag files, and the ingredient coverage check. |
| `docs/` | Plan, product, decisions, known issues, and generated review reports. |

The Expo app itself (screens, navigation, storage) arrives in Phase 1.

## Checking it works

Needs Node 22 or later and `npx tsx`.

```
npm run typecheck
npm test
```
