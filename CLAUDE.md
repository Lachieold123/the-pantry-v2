# CLAUDE.md: The Pantry v2

You are building **The Pantry v2** with Lachlan, a solo founder with no coding background. He wants a calm, editorial cooking app that is **extremely neat inside, beautiful outside, and works every time**.

## Read first, every session

1. `docs/V1-PARITY-PLAN.md` (the current plan) and `docs/REBUILD-MAP.md` §1–5 and §8.
2. `docs/DECISIONS.md` (decision log) and `docs/KNOWN-ISSUES.md`.
3. `git log --oneline -15` to see where we are.

## What the app is (short version)

The cooking app for people who actually cook. The North Star journey:

1. Sunday: plan the week.
2. Get one tidy shopping list and send it to your partner.
3. Tuesday 6pm: "Tonight" or **Surprise me**, then **Cook** step by step.

There are three loops (Discover → Save, Plan → Shop, Cook → Remember), and every screen serves one. Full detail: `docs/PRODUCT.md`.

**Scope (D-025, D-026):** every feature of the original app, social included, on v2's foundations. The plan is `docs/V1-PARITY-PLAN.md`; the 141-item audit it must not repeat is `docs/audits/2026-09-30-original-app/`.

## Non-negotiable rules

- **Understand, then question, then build.** Write a short feature brief, list the edge cases and challenge the old app's logic before writing code. The old app is a reference, never a template. Don't port files wholesale.
- **No fake, no dead.** No simulated data. Every visible button works and is tested. Every state (loading, empty, error, full, long text) is designed.
- **One source of truth.** Derive rather than duplicate. The shopping list is calculated from the plan, never stored as a copy.
- **Design tokens only.** No colour, font-size or spacing literals outside `src/ui/tokens`. The look is v1's (D-025, `docs/design/V1-DESIGN-SPEC.md`): Georgia serif + system sans, white + amber, restrained motion. Screens never hard-code it; the redesign will change tokens only.
- **Neat code.**
  - TypeScript strict.
  - Files under 300 lines.
  - Pure logic lives in `src/domain` (no React, no packages: D-015), and routes stay thin.
  - Features don't import other features.
  - Comments explain *why*.
- **Recipe content changes go through `scripts/data/recipe-fixes.json`** and `npm run catalogue:convert`, never by hand-editing `src/data/catalogue/recipes.json` (D-014).
- **Small verified steps.** For each change: typecheck, lint, test, simulator, screenshots (light and dark), Maestro flow, then Lachlan tries it on his phone. Never batch unverified changes.
- **Push to GitHub at the end of every working session.** Check the push succeeded.

## Stop and ask Lachlan before

- Product or design decisions the map doesn't settle, or any scope change.
- Anything involving money, App Store Connect, RevenueCat, Supabase or EAS production.
- Deleting or migrating user data, adding a native dependency, or anything surprising.

Offer 2–3 options with a recommendation.

## How to talk to Lachlan

- Plain Australian English, direct and kind, no hedging.
- In execution mode, go one step at a time. Say what we're doing, why, and what success looks like.
- Define jargon the first time it appears.
- Show screenshots for every visible change.
- Push back when he's heading down the wrong path, early and clearly.

## Commands

```
npm start                            # Expo dev server (then open the development build on the phone)
npm run typecheck                    # tsc --noEmit
npm run lint                         # ESLint, including the map's structure rules
npm test                             # checks every test file has a runner, then node:test (*.test.ts, scripts/*.test.mts) and Jest (*.test.tsx)
npm run export:web                   # static web build (draft recipes shown), used for screenshots
npm run catalogue:convert -- <old>   # rebuild the catalogue from the old app at <old>
npm run catalogue:check-ingredients  # ingredient database coverage over the catalogue
VETTED_MIN=<n> npm run catalogue:check-vetted  # fails if fewer than n recipes are vetted; run before a production build
```

Routes live in `src/app/` (Expo Router, SDK 57 convention). Route files stay thin: they render a screen from `src/features/`.

(Keep this list accurate as scripts are added.)
