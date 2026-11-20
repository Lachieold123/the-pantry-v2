# The Pantry v2: deep audit and fixes, 20 November 2026

For Lachlan. Everything here is on the branch `audit/deep-1120` (pushed to GitHub). Nothing was merged into `main`, nothing was changed on the live database, no builds were made and no money was spent.

## The short version

- **The audit found 124 problems, 111 once the same problem seen twice is counted once.** Seven lanes looked at the repo, what each feature does, saving and sync, security and the server, the experience on every screen, speed and release readiness, and all 5,496 recipes.
- **78 are fixed and tested. 15 are part-fixed.** 8 more are written and proved on a test database but need the live server changed, which waits for your yes. 8 only you can do. 1 is left for later (linting the scripts) and 1 turned out not to be real.
- **Can it go to the App Store today? No.** The code is in much better shape, but five things stand in the way and all five need you: the live database apply, hosted legal pages, the Sign in with Apple key, a new build on your phone, and a call on the AI-persona cooks. The list is under "What needs you".
- **The biggest surprise:** `main` never had the 8 October audit fixes, the Home engine or any of the `cloud/*` work. They sat on branches that were never merged. This branch joins all of it, so treat it as the app from now on (`INTEGRATION.md`).

## The numbers

| Severity | Unique findings | What it means |
| --- | --- | --- |
| S1 Blocker | 10 | Stops a release, or hurts someone |
| S2 Loses people | 22 | A person would give up or lose work |
| S3 Annoying | 49 | Works, with friction |
| S4 Polish | 30 | Small |

| Status | Count |
| --- | --- |
| Fixed | 78 |
| Part-fixed (the rest is yours, or the server's) | 15 |
| Held (written and tested, waits on the live apply) | 8 |
| Owner only | 8 |
| Left for later | 1 |
| Not real | 1 |

Every finding with its status and commit is in `FINDINGS.md`. Each lane's evidence is in its own file (`L1` to `L7`), and each fixer's notes are in the `FIX-*.md` files.

## The ten blockers, and where each stands

| Blocker | Now |
| --- | --- |
| Pro could be sold with no privacy or terms links (App Review rejects this) | **Fixed.** Pro can only be sold once both links are filled in. |
| The live server is missing six security migrations (a migration is a scripted change to the database) | **Written, not applied.** 13-step runbook, waits on your yes. |
| A household member could take over another household on the live server | **Written, not applied.** First steps of the runbook. |
| The repo's migration files didn't match the live server's history, so the normal "push" command was unsafe | **Repo fixed.** Files are renamed to match; a test keeps them in order. |
| Deleting an account doesn't revoke Sign in with Apple (App Review requires it) | **Both halves written.** Needs your Apple key and a deploy. |
| The privacy policy, terms and review notes contradicted the code | **Rewritten** (34 claims checked, 17 corrected). Needs a lawyer and hosting. |
| No hosted privacy, terms or support page, and no contact in the app | **Yours.** The shortest path is in `FIX-DOCS.md`. |
| Wrong ingredient links hid allergens (33 links, for example a nut ingredient read as something else) | **Fixed** at the root. 24 ingredients added. |
| Wrong diet tags (a recipe tagged vegetarian or no-gluten that isn't) | **Fixed.** 17 recipes lost a wrong tag, 10 gained a right one. |
| Flat claims like "gluten-free" in recipe words that the ingredients didn't support | **Fixed.** 13 reworded, and a check now stops new ones. |

## What was fixed, by area

**Recipes (all 5,496).** The validator went from 935 failing recipes to none. The text check went from 99 problems to none. 607 recipes got written food-safety notes, 345 "Contains" notes were corrected from the ingredient lines, and 45 titles damaged by an old find-and-replace were repaired. Every one of these checks now blocks a bad change in CI (the automatic checks GitHub runs on each push).

**Saving and sync.** A phone whose sharing sign-in dies no longer quietly becomes a new person and loses the household. Signing out is refused while a change is still waiting to send, and leaving a household sends unsent changes first. Sync no longer stacks retry timers, and a recipe too big for the server is trimmed and says so in its notes instead of failing silently.

**Features.** Amount notes scale with servings, and tiny amounts never print as 0. The avoid list names any ingredient line it couldn't check instead of implying the recipe is safe. Leaving Cook Mode with timers running asks first, and Undo after finishing puts used-up cupboard items back. Step timers, search, plan links, the free limits, the Home ranking for confident cooks and gone recipes in counts are all corrected. Upcoming planned meals have a Cook button.

**Screens and words.** Store builds hide what isn't finished: the community screens with the AI-persona cooks, and the "Coming soon" scan tiles. Contrast now passes for switches, borders and chips. Plates are described as a private photo log. Timer chips read properly to VoiceOver. "Trial" is only said when a trial really exists.

**Speed.** A store build was bundling all 5,496 recipes to show 271. It now bundles only the 271: the web bundle of a store build went from 15.8 MB to 5.9 MB. Cupboard matching is worked out once per change and shared by every screen.

**Server (in the repo only).** Fixes for the household takeover, row quotas, read-only feed tables, account deletion clearing Home events, the private Apple token store and faster policies are all written as migrations, each with a pre-check, a verify query and rollback SQL, proved on a test database (34 tests).

**Tooling.** Lint no longer crashes after a browser test run. CI now runs every gate. The four out-of-step Expo packages are updated. The production build profile can't show draft recipes. The docs and project instructions name the commands that actually work.

**Launch documents.** Privacy policy, terms, App Privacy answers, review notes and the listing now describe what a store build really does. There is one listing file instead of two that clashed.

## What needs you, in order

1. **Say yes (or no) to the live database apply.** `supabase/APPLY-LIVE.md`, 13 steps, each reversible. I was not allowed to change the live server without you, and I didn't. The last step (private live updates) only goes on after a new build is seen working on two phones. `FIX-L7-LIVE.sql` (3 wrong diet tags and 150 safety notes on the live feed) is ready the same way.
2. **Make a new build and try the branch on your phone.** The last build on a phone is 25, from 6 October. Nothing from today has been on a device. Build 25 must not use Household once the database is changed (`docs/launch/RELEASE-NOTES.md`).
3. **Legal pages.** Host a privacy page, a terms page and a support page, get a support email, have a lawyer read the drafts, then paste the links into `src/lib/legal.ts`. That is also what puts Pro on sale.
4. **Sign in with Apple key.** Set the key and three other secrets, then deploy the two functions. Secrets first: a deployed delete function without them blocks account deletion.
5. **Supabase dashboard.** CAPTCHA, rate limits, a disk alert, a plan that doesn't pause, turning off public live updates after step 1, disabling `pg_net`. Storage is at about 940 MB of the plan's 1 GB.
6. **The AI-persona cooks.** 719 feed recipes sit under 99 invented cooks' names. Store builds hide them now. Label them, publish as the house kitchen, or keep them hidden. Then the 99 seed sign-ins, the backup tables and one leftover secret can be removed.
7. **RevenueCat and App Store Connect.** No trial is set up, so none is offered. One entitlement is unused. The App Privacy answers and age rating are drafted for you to enter. The minimum age is undecided, and the app never asks it.
8. **Decisions that need a native module.** Crash reporting (Sentry) and over-the-air updates. Today a crash is only written to the device log.
9. **Product calls.** A "Fill the week" button (planning a week takes about 15 taps), whether plates can be shared, whether more than the 271 reviewed recipes should ship, whether an optional animal ingredient costs a recipe its vegetarian tag, and whether plain stock counts as gluten (503 no-gluten recipes depend on it).
10. **Photos.** 120 photos from the old app have no credit, and 6 recipes point at missing image files (`FIX-L7-PHOTOS-TODO.csv`).
11. **Adopt this branch as `main` and tidy up.** 17 worktrees and many finished branches are listed in `REPO-TIDY.md`. Local `main` is still 212 commits ahead of GitHub.

The same list, with detail, is in `docs/KNOWN-ISSUES.md` (K-18, K-19, K-23, K-24 and K-38 to K-45).

## Calls I made for you

They are all in `docs/DECISIONS.md` under D-054, and each is easy to reverse. The ones you would notice: store builds hide unfinished screens (this replaces the earlier choice to show them); Pro is not sold without legal links; the app now says recipes were "drafted and checked with AI help, to our written standards. Not cook-tested yet" instead of "checked and edited by us", because the October review was done by AI to a written brief; a wrong diet tag comes off rather than the recipe being rewritten.

## What was not tested

- **Nothing ran on a phone.** No VoiceOver, Dynamic Type, notifications, camera, purchases or two-phone Household. Screens were checked on the web build at phone size, in light and dark.
- **The 26 Maestro flows** (the on-device test scripts) now point at the real app instead of Expo Go, but they have not been run, and their launcher script still needs rewriting.
- **The two server functions** are not type-checked (the tool for that isn't on this Mac) and not deployed.
- **The live server** was read, never written. The migrations are proved on a test database, not on the real one.
- **No purchase** was made, in the sandbox or for real. RevenueCat's own data collection was not checked against its documentation.
- **Journeys that sign in or join a household** were not run in the browser, because the web build talks to the live server.
- **One screenshot** (what Settings shows when a change is set aside) could not be taken; a component test covers it.
- **6 npm advisories remain** (3 high, 3 moderate, none critical). The one that matters, `decode-uri-component`, has no fix until Expo Router changes a dependency.

## Checks at the end

All run on the final state of the branch.

| Check | Result |
| --- | --- |
| Typecheck, lint, Prettier | Clean |
| Domain and script tests | 632 of 632 |
| Component tests | 294 of 294, 60 suites |
| Database rule tests (test database) | 34 of 34 |
| Browser journeys, light and dark, on a clean export | 58 of 58 |
| Recipe validator | 5,496 of 5,496 (4,514 warnings, none blocking) |
| Recipe text, ingredient and house-batch checks, feed check | All pass |
| Expo version check, production drafts flag check | Pass |

## Where things are

- This report, the findings list, the audit prompt and every lane and fixer file: `docs/audits/2026-11-20-deep-audit/`.
- The 141 audit screenshots and the fixers' before-and-after shots: `HQ/11-ThePantryV2/audits/2026-11-20/` (kept out of git for size).
- The live database runbook: `supabase/APPLY-LIVE.md`.
- Launch documents: `docs/launch/`.
