# V1 parity plan

**Decided by Lachlan, 30 September 2026.** v2 keeps its foundations. It takes on v1's look and information architecture, and it gains every v1 feature, social included. None of the 141 audit findings (`docs/audits/2026-09-30-original-app/`) may come across.

- **The look:** visually indistinguishable from v1 for now. A redesign comes later, and it will be one change in the tokens, not in every screen.
- **The standard:** every v1 feature is rebuilt properly. Nothing is ported file-for-file.

This plan replaces map §§10–11 for the remaining work. The map's rules (§§1–5, §8) still hold, apart from the decisions below.

## What changes from the map

| Was (map / PRODUCT) | Now | Decision |
| --- | --- | --- |
| Palette approved in D-016; Newsreader and Manrope fonts | v1's palette (white, amber accent, pastel tints), Georgia serif and the system sans | D-025 |
| Tabs: Today · Recipes · Plan · Shop · Saved | v1's shell: header (menu · title · inbox · avatar); tabs Feed · Browse · + · Cupboard · Plan; side drawer | D-025 |
| v1 local-first, social later (PRODUCT §5) | Social at launch: accounts, feed, posts, likes, comments, follows, messages, notifications, moderation | D-026 |
| No accounts in v1 | Sign in with Apple, Google and email, via Supabase | D-026 |

## Where v2's screens land in v1's shell

| v2 today | v1 home for it |
| --- | --- |
| Today (tonight, coming up) | Plan tab, day view. Suggestions go to the Plan tab's suggestions and to Browse's recipe of the day. |
| Recipes (browse, search, filters) | Browse tab |
| Recipe page | Recipe page, restyled to v1 (hero image, overlapping sheet, action row, info tiles) |
| Plan and Shop | Plan tab: "This week" and "Shopping list" |
| Cupboard | Cupboard tab |
| Saved · Collections · Mine · Cooked | Drawer: Cookmarks (Saved) · Collections · My recipes · Recently viewed · Kitchen stats |
| Surprise me | Drawer › Spinner |
| Cook Mode | Cook Mode, restyled |
| Welcome and taste quiz | v1 onboarding flow |
| Settings | Drawer › Settings & preferences |

## Rules that stop the old problems coming back

Each rule names the audit findings it prevents. Lint or tests enforce them where possible.

1. **One navigation system (Expo Router).** Every screen is a route with a link. Nothing is "always mounted" (ARCH-1, QUAL-3, PERF-1, PERF-2).
2. **Small stores with selectors (Zustand), never one blob.** Each store is versioned and migrates. A failed load never overwrites saved data (ARCH-2, ARCH-6, ARCH-12, PERF-6, PERF-7, PERF-18).
3. **All server data goes through TanStack Query:**
    - a typed API module per resource, with cursor pagination and optimistic updates that roll back;
    - realtime for messages and notifications;
    - refresh when the app comes back to the foreground;
    - timeouts on every request.

    Covers ARCH-3, ARCH-8, PERF-14, SOC-25 and PERF-29.
4. **No fake data in any build.** Simulated content exists only in test fixtures. A missing server setting fails the build loudly and never falls back (ARCH-7, SOC-2, QUAL-1, SEC-15, PERF-26).
5. **The server enforces rules; the app only reflects them:**
    - Blocking works both ways in the database.
    - Counts are kept by the database.
    - Media URLs must point at our own storage.
    - Timestamps and author ids are set by the server.
    - Privileged functions use an empty search path.

    Covers SOC-1, SOC-5 to SOC-8, SOC-16, SEC-1, SEC-4 and SEC-7 to SEC-9.
6. **Moderation meets Apple guideline 1.2 before any social feature ships:**
    - a content filter;
    - reporting everywhere, messages included;
    - blocking everywhere;
    - reports reach a moderator, who can act within 24 hours;
    - real contact details and zero-tolerance terms.

    Covers SEC-2, SEC-3, SEC-14 and SOC-24.
7. **Design tokens only, and v1's look lives in them.** No literal colours, sizes or spacing in screens (QUAL-12, QUAL-13, QUAL-17).
8. **Icons from one set.** Emoji are kept for now only where v1 shows them to users, each one tokenised in a single file so the redesign removes them in one change (QUAL-15).
9. **Accessibility without changing the look:**
    - every control has a role and a label;
    - touch areas are at least 44 points;
    - text size is capped so it scales without breaking layouts;
    - Reduce Motion is respected.

    Contrast failures that would change v1's look are listed for the redesign, not quietly altered (QUAL-19 to QUAL-24).
10. **Every visible control has a testID and a Maestro flow**, and every screen is rendered in at least one component test (QUAL-30 to QUAL-32).
11. **Release safety:**
    - runtimeVersion follows a fingerprint policy;
    - source maps are uploaded;
    - crash reports carry releases and are scrubbed;
    - one error boundary per route;
    - no raw error text reaches users.

    Covers ARCH-5, ARCH-10, PERF-8, PERF-10, PERF-19 and QUAL-27.
12. **Lists are virtualised and paged; media is sized and paused off-screen** (PERF-3, PERF-4, PERF-5, PERF-17, PERF-20, SOC-9, SOC-27).

## Phases

Each phase ends the same way:
- typecheck, lint and tests pass;
- screenshots are compared side by side with v1 (`docs/design/v1-reference/`);
- Maestro flows pass once the simulator is available;
- the work is pushed.

| # | Phase | What's in it | Needs Lachlan |
| --- | --- | --- | --- |
| P1 | Design system | v1's colours, type, spacing, radii and shadows as tokens. Primitives restyled: buttons, chips, cards, tabs, inputs, sheets, toasts, empty states. Gallery updated. | No |
| P2 | Shell | Header, the five-tab bar with the centre "+" and badge, and the side drawer. Every v2 screen moved to its v1 home. | No |
| P3 | Browse and recipe page | Recipe of the day, quick chips, cook by mood, trending, browse by your pantry, all recipes, recommended, filters. The recipe page with the actions sheet, servings, nutrition and credits. | No |
| P4 | Plan and shopping list **(done 30 Sep, except M18)** | Week strip, day view, slots, suggestions, the shopping list tab, sharing, clearing. | No |
| P5 | Cupboard | Categories, quick adds, the staples toggle, matches from saved recipes, suggestions. | No |
| P6 | Library and cooking | Cookmarks, collections, my recipes and the editor, import, recently viewed, kitchen stats, the spinner, Cook Mode. | No |
| P7 | Onboarding | v1's flow: terms, what you came for, diet, avoid list, cuisines, time, skill, the reveal, the notification primer, the first-run checklist. | No |
| P8 | Backend and accounts | A fresh, audited Supabase schema, row-level security, storage, edge functions and moderation. Sign in with Apple, Google and email. Profiles and handles. | **Yes:** restore Supabase, the schema plan, new native modules |
| P9 | Social | Feed, create a post (photos and video), post detail, likes, comments, saves, follows, profiles, messages, notifications, push, report, block, send to. | Moderation contact and terms |
| P10 | Pro and AI | Paywall, RevenueCat, restore purchases; AI pantry and receipt scanning. | **Yes:** RevenueCat and App Store Connect |
| P11 | Launch readiness | The full Maestro suite, accessibility, Sentry, fingerprint updates, the privacy manifest, App Store assets, TestFlight. | Yes |

## New native modules parity needs (P8–P10)

Approved in principle by the 30 September request. Each is still listed here so it is added deliberately, one at a time:

- expo-image-picker and expo-image-manipulator (photos);
- expo-video (video posts);
- expo-apple-authentication and expo-auth-session (sign-in);
- expo-secure-store (keeping the session safe);
- @supabase/supabase-js and @tanstack/react-query (JavaScript only);
- @shopify/flash-list;
- @sentry/react-native;
- react-native-purchases.

## Parts of v1 held back until they can be real

| v1 part | Why it waits | When |
| --- | --- | --- |
| Header inbox, drawer Notifications and Messages | Nothing to show before accounts (D-027) | P9 |
| Browse "Trending this week" and the People tab | Need real activity from other cooks | P9 |
| Recipe comments | Need accounts and moderation | P9 |
| Recipe nutrition panel | v2's catalogue has no nutrition data, and v1's figures had no stated source. Needs a decision on a data source (for example, calculated from a food database) before it can be shown honestly | Ask Lachlan |
