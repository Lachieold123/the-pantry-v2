# V1 parity plan

**Decided by Lachlan, 30 September 2026.** v2 keeps its foundations. It takes on v1's look and information architecture, and it gains every v1 feature, social included. None of the 141 audit findings (`docs/audits/2026-09-30-original-app/`) may come across. The table at the end of this plan traces every v1 security (SEC) and social (SOC) finding to the rule or phase that closes it.

- **The look:** visually indistinguishable from v1 for now. A redesign comes later, and it will be one change in the tokens, not in every screen.
- **The standard:** every v1 feature is rebuilt properly. Nothing is ported file-for-file.

This plan replaces map §§3, 6, 9, 10 and 11, parts of §§7 and 8, and PRODUCT §§1 and 5 for the remaining work. Each of those sections carries a "superseded" note. The map's rules (§§1, 2, 4, 5 and the rest of §8) still hold, apart from the decisions below and the open ones listed next.

## Open decisions for Lachlan

These came out of the 30 September deep audit (`claude/v2-deep-audit-2026-09-30.md` in the Project). Each is a product call, so nothing is built for it until Lachlan answers. Answers go into `DECISIONS.md` as the next D-number, and the matching "Needs Lachlan" line in the phase is ticked.

| # | Question | Options | Audit's recommendation | Needed by |
| --- | --- | --- | --- | --- |
| O-1 | **Local data once accounts arrive** (F115). The library, plan, cupboard and cook log live only on the phone. What happens to them on sign-in, sign-out and on a shared phone? | (A) They stay on the phone, and sign-out never wipes them. (B) Sign-out wipes them, as v1's SEC-22 fix says; that deletes data the server doesn't have. (C) Sync them to the account; a much bigger build. | **A**, tested with two accounts on one phone. | Before P8 |
| O-2 | **Which Supabase project** (F116). The plan says both "restore Supabase" and "a fresh, audited schema". The old project has seed accounts and table-wide grants (v1 SEC-5, SEC-12). | (A) A new production project and a separate dev project. The old one is only backed up. (B) Reuse the old project, but purge the seed users and their content, rotate the keys and revoke the grants *before* it's restored. Either way, record what happens to v1's server data. | **A** | Before P8 |
| O-3 | **Australia's under-16 social media law** (F121). v2 has a feed, likes and messages for an Australian audience; v1 had a 13+ checkbox. Whether the law applies is uncertain. | Get a short legal opinion first, then: (A) 16+ with age assurance, if in scope; (B) gate social at 16+ or 18+ with a matching App Store age rating; (C) narrow social at launch, for example no messages. | A legal opinion before P8's sign-up is designed. No option picked without it. | Before P8 |
| O-4 | **Video posts at launch** (F124). P9 promises video, but there's no pipeline, which is how v1's video failed (SOC-10, SEC-23). | (A) Photos only at launch; video later. (B) Video at launch, with the pipeline in P9 built first. | **A** | Before P9 |
| O-5 | **Counts and feed order** (F126). The map's brand rules (§2) say no public counts on the home screen, no infinite scroll and no algorithmic feed. D-026 brings likes and a feed, and D-027 makes the Feed the home screen. | (A) Keep the map's rules: no counts on Feed cards, a chronological feed of people you follow that ends ("You're all caught up"). (B) v1's way: counts on cards and an endless feed. (C) Counts on the post and profile only, with the Feed as in (A). | None given. Record the answer as a D-number. | Before P9 |
| O-6 | **What "planning next week" means for the Pro gate** (F212). D-003 makes next week Pro. Weeks start on Monday (D-009), so on Sunday the week you're planning *is* next week, and free users would hit the paywall at step 1 of the North Star. | (A) Free covers "the week you're planning": this week, or next week from Sunday on. (B) Keep D-003 as written. (C) Drop the next-week gate. | **A**, as `plannableFreeWeek(today)` in `src/domain/plan/week.ts` with Sunday tests. It also closes PRODUCT §4.6's Sunday question. | Before P10 builds the gate (the audit says before P4 closes) |
| O-7 | **Lock-out rule for free limits** (F213). Imported v1 users can already have more than 3 collections, and a lapsed Pro user can too. | (A) No retroactive lock-out: keep everything readable and usable, and block only *new* creation over the limit. (B) Hide or freeze what's over the limit until they upgrade. | **A**, added to D-003. | Before P10 |
| O-8 | **Message policy** (F119, v1 SOC-4). Who can message whom, who lands in Requests, and whether v1's private-account switch comes back. | (A) Anyone can message; people you don't follow land in Requests until you accept. (B) Only people who follow each other can message. (C) No messages at launch (fits O-3's option C). And separately: keep or drop the private account. | None given; ask Lachlan. | Before P9 |

## What changes from the map

| Was (map / PRODUCT) | Now | Decision |
| --- | --- | --- |
| Palette approved in D-016; Newsreader and Manrope fonts | v1's palette (white, amber accent, pastel tints), Georgia serif and the system sans | D-025 |
| Tabs: Today · Recipes · Plan · Shop · Saved | v1's shell: header (menu · title · inbox · avatar); tabs Feed · Browse · + · Cupboard · Plan; side drawer | D-025 |
| v1 local-first, social later (PRODUCT §5) | Social at launch: accounts, feed, posts, likes, comments, follows, messages, notifications, moderation | D-026 |
| No accounts in v1 | Sign in with Apple, Google and email, via Supabase | D-026 |
| AI cupboard and receipt scanning later, Pro only (map §3, PRODUCT §5) | Scanning at launch. Every account gets 3 free scans a month; Pro is unlimited within a daily cap | D-030 |
| Cupboard after Plan | Cupboard first: P5 was rebuilt before P4 | D-030 |
| Nutrition only with 70% coverage, never AI (map §7) | Calculated on the phone from the ingredient database; AI fills only the lines it can't match | D-028 |
| RevenueCat with anonymous ids; Pro state stored so it survives restarts (map §7, §8) | The Supabase user id is the RevenueCat id, and the entitlement is read from RevenueCat, never stored by the app | This plan, P10 |

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

    Covers SOC-1, SOC-5 to SOC-8, SOC-16, SEC-1, SEC-4 and SEC-7 to SEC-9. The rest of the backend hardening is a P8 checklist.
6. **Moderation meets Apple guideline 1.2 before any social feature ships:**
    - a content filter for text, and an automated check on every uploaded image (and video, if O-4 allows it) before it goes public;
    - reporting everywhere, messages included;
    - blocking everywhere, and a blocked-accounts list in Settings with unblock;
    - reports reach a moderator, who can act within 24 hours;
    - moderator tools to remove content and to suspend or ban an account, with a log of every action;
    - reported posts, comments and messages are kept as evidence even when the author deletes them or their account, for a period the privacy policy states;
    - a message request policy (**Needs Lachlan:** O-8);
    - real contact details and zero-tolerance terms.

    Covers SEC-2, SEC-3, SEC-6, SEC-14, SOC-4 and SOC-24.
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
13. **AI runs only on our server, and only for fixed jobs.** This covers scanning (D-030) and the nutrition gap-fill (D-028).
    - The model's API key lives only in a server function. The app never holds it.
    - The app sends a `task` from a fixed list (shelf photo, receipt, nutrition gap) and the server builds the prompt. The app never sends a prompt.
    - The server checks a per-account quota (3 free scans a month; Pro unlimited within about 15 a day) against the cached entitlement, and a global daily spending cap stops all AI calls when reached.
    - Photos are resized and stripped of EXIF data (including location) on the phone before upload.
    - Results are read into ingredient ids and always go through a review screen before anything is saved. Errors reaching the app are generic, and the function only accepts calls from the app.
    - **Consent (App Store guideline 5.1.2(i)):** before the first photo goes to a third-party AI, a one-time screen names the provider and what is sent, with a clear yes or no. The answer is stored and can be changed in Settings. The privacy policy names the provider.
    - The model and provider are chosen by testing (D-030), and the key and server come to Lachlan for approval.

    Covers SEC-17.

## Phases

Each phase ends the same way:
- typecheck, lint and tests pass;
- screenshots are compared side by side with v1 (`docs/design/v1-reference/`);
- Maestro flows pass once the simulator is available;
- the work is pushed.

P5 was built before P4 (D-030). The phases keep their numbers so references in the audit and in commits stay valid; the table lists them in build order.

| # | Phase | What's in it | Needs Lachlan |
| --- | --- | --- | --- |
| P1 | Design system **(built)** | v1's colours, type, spacing, radii and shadows as tokens. Primitives restyled: buttons, chips, cards, tabs, inputs, sheets, toasts, empty states. Gallery updated. | No |
| P2 | Shell **(built)** | Header, the five-tab bar with the centre "+" and badge, and the side drawer. Every v2 screen moved to its v1 home. | No |
| P3 | Browse and recipe page **(built, except nutrition)** | Recipe of the day, quick chips, cook by mood, trending, browse by your pantry, all recipes, recommended, filters. The recipe page with the actions sheet, servings and credits. The nutrition panel was left out when P3 closed; it's now its own block below (D-028). | No |
| P5 | Cupboard **(rebuilt 30 Sep, D-030)** | To `docs/audits/2026-09-30-v2-check/cupboard-brief.md`: one shared "what can I cook" engine with **Ready tonight** and **Need 1–2**, category jars, quick adds, the stocking grid, "Add one thing", "Add a list", the "Always in my kitchen" shelf, and matches on the Feed, in Browse, on recipes and in Plan. Photo and receipt scanning are in launch scope (D-030) but need P8's server, so they're built in P10 on "Add a list"'s review screen. | No |
| P4 | Plan and shopping list **(done 30 Sep, except M18)** | Week strip, day view, slots, suggestions, the shopping list tab, sharing, clearing. | O-6, before the Pro gate is built |
| P6 | Library and cooking | Cookmarks, collections, my recipes and the editor, import, recently viewed, kitchen stats, the spinner, Cook Mode. Settings content (checklist below). | No |
| P7 | Onboarding | v1's flow: terms, what you came for, diet, avoid list, cuisines, time, skill, the reveal, the notification primer, the first-run checklist. | No, but the terms must exist first (checklist below) |
| P8 | Backend and accounts | A fresh, audited Supabase schema, row-level security, storage, edge functions and moderation. Sign in with Apple, Google and email. Profiles and handles. The account lifecycle and backend hardening (checklists below). | **Yes:** O-1, O-2, O-3, the schema plan, new native modules |
| P9 | Social | Feed, create a post (photos, and video only if O-4 says so), post detail, likes, comments, saves, follows, profiles, messages, notifications, push, report, block, send to. | Moderation contact and terms; O-4, O-5, O-8 |
| P10 | Pro and AI | Paywall, RevenueCat, restore purchases; AI pantry and receipt scanning (free for every account, within D-030's quota); the nutrition gap-fill. | **Yes:** RevenueCat and App Store Connect; O-6, O-7; the AI model and key |
| P11 | Launch readiness | The full Maestro suite, accessibility, Sentry, fingerprint updates, the privacy manifest, App Store assets, TestFlight. Legal and privacy checks (checklist below). | Yes |

### Nutrition (D-028)

Replaces the old "Ask Lachlan" row. Nutrition was listed in P3 but not built (K-5).

- [ ] **P3 follow-up, next up (MISSING-FEATURES M12):** each ingredient in the database gets values per 100 g and typical weights, from Food Standards Australia New Zealand's food composition data (AFCD) where it covers the food.
- [ ] The recipe page shows a per-serving panel calculated on the phone from the matched lines, with the disclaimer (estimates from the ingredient list, a guide only, not medical or dietary advice) and how many lines were left out.
- [ ] Recipes people post (P9) use the same calculator.
- [ ] **P10:** AI fills only the lines the calculator can't match or weigh, server side, under rule 13.
- [ ] **P10:** the Pro split follows D-003 ("full nutrition detail" is Pro).

### P6 checklist: Settings content

- [ ] Settings rebuilt as v1's grouped cards (M1).
- [ ] Terms and Privacy links that open real pages (hosted in P7).
- [ ] "Export my data": a file the person can save, covering every saved store (plan, library, my recipes, cupboard, cook log, preferences). Extended in P8 to include account data.
- [ ] A switch to turn crash reports off.

### P7 checklist: terms before consent

- [ ] The terms of use and privacy policy are drafted, hosted at working URLs and versioned *before* the consent screen ships. v1 asked people to accept terms that didn't exist (SEC-3).
- [ ] The consent step records the accepted version (`termsAcceptedVersion`). People who skip the welcome because they were onboarded already (including imported testers) see the terms once when the version is new.

### P8 checklist: backend and accounts

- [ ] **Needs Lachlan:** O-1 (local data), O-2 (Supabase project), O-3 (under-16 law).
- [ ] **Environments:** separate dev and production projects. Seed scripts refuse to run against production. If O-2 reuses the old project, the purge, key rotation and grant revocation happen before it's restored.

**Account lifecycle**
- [ ] One auth store, fed by Supabase's `onAuthStateChange`, is the only source of "who is signed in".
- [ ] One awaited `signOut()` and one `deleteAccount()` use case, each with a test. Sign-out stops realtime, clears the query cache, deletes this phone's push token (P9), logs out of RevenueCat (P10), applies O-1's local-data rule and keeps the old-app import marker (F214). Tested with two accounts on one phone.
- [ ] "Sign out everywhere" (SEC-22).
- [ ] In-app account deletion (App Store guideline 5.1.1(v)). The delete function requires a recent sign-in and verifies the caller's token (`verify_jwt`). It revokes the Apple sign-in token, deletes the RevenueCat customer, purges the person's storage files, keeps reported content as evidence (rule 6) and turns their side of each conversation into a tombstone, so the other person keeps the messages (SEC-11, SOC-29).
- [ ] Forgot password, and an email-confirmation link that opens the app and finishes sign-in.
- [ ] Auth hardening: a nonce on Google sign-in, leaked-password protection on, email confirmation required, rate limits on sign-in and sign-up (SEC-18).
- [ ] Sign-up records the accepted terms version on the server. If it's missing or older than the current terms, the terms are shown before the person continues (F215).
- [ ] **Needs Lachlan (O-3):** the age rule at sign-up, from the legal opinion.

**Backend hardening**
- [ ] Every table has row-level security, and grants are default-deny: nothing is granted table-wide, columns are granted one by one (SEC-12, SOC-7).
- [ ] Storage buckets have policies: people write only to their own folder, with allowed file types and size limits.
- [ ] Deleting a post, comment or avatar purges its files: an after-delete trigger queues the paths and a server function removes them (SEC-10, SOC-22).
- [ ] A delete that removes nothing is an error, not a silent success (SOC-22).
- [ ] Text limits live in one module in `src/domain`, which drives both the app's `maxLength` and the database's length checks (SEC-16, SOC-19).
- [ ] Creating anything is idempotent: the app makes the id, and a retry can't duplicate it (SOC-14).
- [ ] Rate limits on follows, comments, messages and reports (SEC-9).
- [ ] Schema changes go only through Supabase CLI migrations in the repo, so production can be rebuilt from the repo (SEC-12).
- [ ] **Done when:** every v1 SEC and SOC finding is closed as the traceability table below says, each with a test or a checked item.

### P9 checklist: social

- [ ] **Needs Lachlan:** O-4 (video), O-5 (counts and feed order), O-8 (message policy and private accounts), and the moderation contact and terms.
- [ ] People accept the community (UGC) terms before their first post; the accepted version is stored on the server (F117, F215).
- [ ] Posts are created by one server call that writes the post and all its photos together, with the app-made id from P8 (SOC-11, SOC-14).
- [ ] Messages: an inbox page and an accept-request call, with unread counts worked out by the server (SOC-4). A message that fails to send keeps its draft (SOC-19). Report and block from inside a thread (rule 6).
- [ ] Profile search through one server call that escapes the search text and uses a fuzzy index (SOC-30).
- [ ] Delete your own comment.

**Notifications**
- [ ] A phone's push token is registered after sign-in and belongs to one account at a time; registering it moves it from any previous account.
- [ ] The token is deleted on sign-out and when notifications are turned off (SEC-13).
- [ ] The server actually sends pushes (v1 stored tokens but never sent one), and every tap opens the right screen (SOC-12).
- [ ] Notifications are marked read, duplicates are merged, and messages don't create a notification row each (the inbox counts them). A notification whose post was deleted opens a calm "no longer available" state (SOC-13).
- [ ] Preferences: a master switch, then likes, comments, follows and messages (M6). They're stored on the server so it respects them.
- [ ] One shared permission primer for the Sunday reminder, Cook timers and social, asked when it's useful, never at launch.

**Video (only if O-4 chooses video at launch)**
- [ ] A video bucket that accepts only the allowed types (MP4 and QuickTime) up to a stated size and length.
- [ ] Resumable uploads with progress; the file type comes from the picked file, not a guess.
- [ ] A poster image for every video, and playback sized per rule 12.
- [ ] No microphone permission unless the app itself records (SEC-23).
- [ ] Video goes through rule 6's automated check like photos (SOC-10).

### P10 checklist: Pro and AI

- [ ] **Needs Lachlan:** O-6 (next-week gate) and O-7 (lock-out rule); RevenueCat and App Store Connect; the AI model and key.
- [ ] The Supabase user id is the RevenueCat app user id. `logIn` and `logOut` happen inside P8's session use case. Tested: a purchase, then sign-in on a second phone; two accounts on one phone; restore.
- [ ] The entitlement is read from the RevenueCat SDK and never stored by the app (this supersedes map §7's `Entitlement` and §8's "Pro survives restarts").
- [ ] A RevenueCat webhook fills an `entitlements` table, which the server uses for its checks, including the scan quota.
- [ ] The paywall meets App Store guideline 3.1.2: the subscription's name, length and price per period, that it renews automatically, and links to the terms and privacy policy that load. It lists only what Pro really does.
- [ ] Settings shows Pro status and a "Manage subscription" link (M9).
- [ ] When Pro lapses, everything stays readable; only new creation over the free limits is gated (O-7).
- [ ] The next-week gate is built as O-6 decides, in `src/domain/plan/week.ts`, with Sunday tests.
- [ ] Scanning (D-030): shelf photo and receipt, through rule 13, landing on "Add a list"'s review screen. 3 free scans a month for every account; Pro unlimited within about 15 a day, enforced by the server.

### P11 checklist: legal and privacy

- [ ] The privacy policy matches what the app really does: accounts, posts and messages, photos sent to the AI provider (named), crash reports and purchases.
- [ ] App Privacy answers in App Store Connect are checked against the data flows that actually ship (SEC-24).
- [ ] The privacy manifest lists the required-reason APIs the app uses.
- [ ] The age-rating questionnaire is re-answered for posts and messages, in line with O-3.

## New native modules parity needs (P8–P10)

Approved in principle by the 30 September request. Each is still listed here so it is added deliberately, one at a time:

- expo-image-picker and expo-image-manipulator (photos);
- expo-video (video posts, only if O-4 chooses video);
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
| Recipe nutrition panel | Decided (D-028): calculated on the phone, AI only for the gaps | P3 follow-up; AI gap-fill in P10 (see "Nutrition" above) |

## v1 security and social findings: where each is closed

Every SEC and SOC finding from `docs/audits/2026-09-30-original-app/` (`security.md`, `social.md`), and the rule or phase checklist that closes it. P8 isn't done until each row is.

| v1 | What went wrong in v1 | Closed by |
| --- | --- | --- |
| SEC-1 | Blocking didn't hide the blocked person from the blocker | Rule 5 |
| SEC-2 | No report or block in messages; evidence could be erased | Rule 6 (reporting everywhere, evidence kept) |
| SEC-3 | Reports went nowhere; no real contact | Rule 6; P7 terms before consent |
| SEC-4 | Media URLs unchecked; posts editable after publishing | Rule 5 |
| SEC-5 | Seed accounts on the old backend | O-2; P8 environments |
| SEC-6 | No message requests; threads rewritable | Rules 5 and 6; O-8; P9 messages |
| SEC-7 | Comments movable to other posts | Rule 5 |
| SEC-8 | Message senders could edit or un-delete | Rule 5 |
| SEC-9 | Blocked people could still follow; no throttling | Rule 5; P8 rate limits |
| SEC-10 | Deleted post and comment photos stayed public | P8 storage purge |
| SEC-11 | Deletion missed Apple token revocation and RevenueCat | P8 account deletion |
| SEC-12 | Repo migrations didn't reproduce production | P8 default-deny grants, CLI migrations |
| SEC-13 | Push tokens survived sign-out and "off" | P9 notifications |
| SEC-14 | No content filter or impersonation controls | Rule 6; P8 handles |
| SEC-15 | Production could ship fake activity | Rule 4 |
| SEC-16 | Unbounded text fields in the database | P8 shared limits module |
| SEC-17 | AI proxy cost and information leaks | Rule 13 |
| SEC-18 | Google sign-in without a nonce; leaked-password protection off | P8 auth hardening |
| SEC-19 | Crash-report scrubbing gaps | Rule 11 |
| SEC-20 | Privileged functions with a loose search path | Rule 5 |
| SEC-21 | Draft ranked feed trusted the caller's id | Rules 5 and 12; O-5 |
| SEC-22 | Sign-out left the previous user's data | P8 sign-out use case; O-1 |
| SEC-23 | Video couldn't upload; microphone requested | O-4; P9 video |
| SEC-24 | Privacy manifest and policy inaccurate | P11 legal and privacy |
| SEC-25 | Keys committed to the repo | Already prevented: no keys in the repo; `.env` is ignored |
| SOC-1 | One-way blocking | Rule 5 |
| SOC-2 | Fake or demo content reached users | Rule 4; D-027; O-2 |
| SOC-3 | Messages didn't behave like messages | Rules 3 and 12 |
| SOC-4 | Message requests and unread counts dead | Rule 6; O-8; P9 messages |
| SOC-5 | A participant could rewrite a thread | Rule 5 |
| SOC-6 | Follower count double-counted | Rule 5 |
| SOC-7 | Contradictory profile column grants | Rule 5; P8 default-deny grants |
| SOC-8 | Fabricated like and comment counts | Rule 5 |
| SOC-9 | Feed was the newest 200, shuffled | Rules 3 and 12; O-5 |
| SOC-10 | Video posts failed to upload | O-4; P9 video |
| SOC-11 | Multi-photo posts lost photos | P9 single post-creation call |
| SOC-12 | Push never sent; taps didn't open anything | P9 notifications; rule 1 |
| SOC-13 | Notifications never marked read, not deduplicated | P9 notifications |
| SOC-14 | Post creation not atomic or idempotent | P8 idempotent create; P9 post creation |
| SOC-15 | Message history editable or destroyable | Rules 5 and 6 |
| SOC-16 | Clients set timestamps | Rule 5 |
| SOC-17 | Toggles raced and failed silently | Rule 3 |
| SOC-18 | Dead-end error and empty states | Rule 3; CLAUDE.md "every state is designed" |
| SOC-19 | App and database limits disagreed; failed messages lost the draft | P8 shared limits module; P9 messages |
| SOC-20 | Threads opened at the oldest message; slow inbox | Rules 3 and 12 |
| SOC-21 | Follower lists unbounded | Rule 3 |
| SOC-22 | Deletes quietly did nothing; files left behind | P8 storage purge and delete checks |
| SOC-23 | Handle rules too loose | Rule 6; P8 handles |
| SOC-24 | No moderation loop | Rule 6 |
| SOC-25 | No cache, no offline awareness, raw errors | Rules 3 and 11 |
| SOC-26 | Images re-encoded twice, no resized versions | Rule 12 |
| SOC-27 | Comments capped at the oldest 500 | Rule 12 |
| SOC-28 | Draft ranked feed wrong | Rules 5 and 12; O-5 |
| SOC-29 | Deleting an account erased the other person's conversation | P8 account deletion (tombstones) |
| SOC-30 | Loose profile search | P9 profile search |
