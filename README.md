# The Pantry

The cooking app for people who actually cook: plan the week on Sunday, shop once, and know what's for dinner on Tuesday night.

This is v2, a ground-up rebuild. The plan is in [`docs/V1-PARITY-PLAN.md`](docs/V1-PARITY-PLAN.md) and [`docs/REBUILD-MAP.md`](docs/REBUILD-MAP.md), what the app does is in [`docs/PRODUCT.md`](docs/PRODUCT.md), and every decision is logged in [`docs/DECISIONS.md`](docs/DECISIONS.md). Open problems are in [`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md).

## What's in the repo

| Folder | What it holds |
|---|---|
| `src/app/` | Routes (Expo Router). Thin: each renders a screen from `src/features/`. |
| `src/features/` | One folder per feature: its screens and their parts. |
| `src/ui/` | The design system: tokens (colours, type, spacing, motion; tested for contrast), theme, primitives and patterns. |
| `src/store/` | Saved state (Zustand, persisted to the phone). |
| `src/domain/` | The app's logic in plain TypeScript (recipes, plan, shopping list, cupboard, Home ranking, sync). No packages, fully tested. |
| `src/data/` | The ingredient database and the recipe catalogue (generated; don't edit by hand). |
| `assets/recipes/` | Recipe photos. |
| `scripts/` | Catalogue conversion and checks, house recipe batches (`scripts/data/`), the feed upload, and maintenance tools. |
| `supabase/` | Database migrations, edge functions and the database tests (run on PGlite). `supabase/APPLY-LIVE.md` is the live-apply guide. |
| `e2e/web/` | Journey tests on the web build (Playwright). |
| `.maestro/` | Release checks for an iPhone (Maestro, in the development build). |
| `.github/` | CI (`workflows/ci.yml`) and its small check scripts. |
| `docs/` | Plan, product, decisions, known issues, launch material and audit reports. |

## Running it

Needs Node 22 (`.nvmrc`). The app uses native modules, so Expo Go cannot run it: use the development build.

```
npm install
npm start          # then open the development build on your phone or simulator
npm run typecheck
npm run lint
npm test
```

The full list of commands, including the catalogue and database checks, is in [`CLAUDE.md`](CLAUDE.md).
