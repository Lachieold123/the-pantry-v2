# Lane 4: security, privacy and the backend (20 Nov 2026)

Branch `audit/deep-1120` at `8bbbacd`. Live Supabase read with single SELECTs and catalog reads only. Evidence: `evidence/L4/live-supabase-2026-11-20.md` (E1 to E11 below refer to it).

## Summary

**Counts:** S1 4 · S2 4 · S3 7 · S4 2 (17 findings).

**The live backend holds no real person's data today.** `auth.users` has only the 99 seed cooks; 0 anonymous users, 0 sessions, 0 households, 0 account rows (E7, E8). Build 25 never created a user, and it never reads the feed (its `src/lib` at `38bef97` has no feed code). So every hole below can be closed now without anyone noticing, and nothing has leaked yet.

**The five worst, in plain words**

1. **S2-1.** The household safety rules from 8 Oct were never switched on. Anyone with the app's public key can sign in anonymously and move themselves into any household whose id they learn. The server hands out those ids to anyone listening when a member leaves. Nobody uses households yet; the day someone does, a stranger can read and change their plan, list and recipes.
2. **S2-6.** The privacy and App Review drafts describe a different app. They say RevenueCat isn't installed, nothing leaves the phone unless you share or sign in, Pro isn't on sale, and there are "no feeds". The code starts RevenueCat and reads the server on every launch, sells Pro, and has a community feed.
3. **S2-7.** The feed shows 99 AI personas as real cooks (48 AI portraits, 2,066 follows between them, 719 recipes) with no AI label. The terms say every recipe was "reviewed and edited by us", but all 719 are only `auto-checked`. That is a misleading-conduct risk under Australian Consumer Law, and App Review could reject it.
4. **S2-2.** The server has no limits. Any anonymous script can create users and write 64 KB rows into `account_rows` without end, enough to fill the database and take the app's feed offline.
5. **S2-3.** The repo's migration history doesn't match the live one. Six files carry different version numbers from what's applied, and `accounts` was applied without being recorded. A plain `supabase db push` would try to re-run the 6 Oct migrations and fail halfway. The apply plan is in S2-3.

**Coverage:** 27 of 33 lane-4 inventory items checked (82%). The six not checked can only be read in the Supabase dashboard (see "Not tested").

## Index

| ID | Sev | Fix | Conf | Title | Where |
| --- | --- | --- | --- | --- | --- |
| S2-1 | S1 Blocker | live | CONFIRMED | Household takeover chain still open live (SEC-01 + SEC-06) | `household_members` policy + grants, `supabase_realtime` publication |
| S2-2 | S2 Loses people | live + owner | CONFIRMED | No quotas: anonymous users can fill the database (SEC-07, K-24) | `account_rows`, `home_events`, `household_rows` policies; auth settings |
| S2-3 | S1 Blocker | live | CONFIRMED | Migration history drift; `db push` unsafe; apply plan | `supabase/migrations` vs `supabase_migrations.schema_migrations` |
| S2-4 | S1 Blocker | owner + auto | LIKELY | Apple token revocation not deployed, and the scaffold can't work as written | `supabase/functions/apple-token`, `delete-account`, `_shared/apple.ts` |
| S2-5 | S2 Loses people | live + auto | CONFIRMED | Live `delete_account` is the old one; neither version deletes `home_events` or the RevenueCat customer | live `public.delete_account`, `20261008000300`, `20261012000000` |
| S2-6 | S1 Blocker | owner + auto | CONFIRMED | Privacy policy, App Privacy answers and review notes contradict the code | `docs/launch/*`, `src/store/proSync.ts:58`, `src/lib/homeFeedReads.ts:25` |
| S2-7 | S2 Loses people | owner | CONFIRMED | 99 AI personas shown as real cooks; "reviewed by us" claim untrue for the feed | `public.cooks`, `public.published_recipes`, `terms-of-use.md:57` |
| S2-8 | S3 Annoying | live | CONFIRMED | `seed.*` and `backup.*` have RLS off (not reachable today) plus a leftover vault secret | seed/backup schemas, `vault.secrets` |
| S2-9 | S3 Annoying | live | LEAD | 99 seed auth users are confirmed, have passwords and aren't banned | `auth.users` (seed) |
| S2-10 | S2 Loses people | auto | CONFIRMED | Build 25 would break on some pending migrations if it ever used Household | `git show 38bef97:src/lib/household.ts` |
| S2-11 | S3 Annoying | auto | LIKELY | Branch's Household "Remove member", "Cancel codes" and the invite preview call RPCs that don't exist live | `src/lib/household.ts:71-83` |
| S2-12 | S3 Annoying | auto | LIKELY | Link import reads a whole chunked page into memory before the size check | `src/lib/fetchPage.ts:30-33` |
| S2-13 | S3 Annoying | auto | LEAD | Imported recipe text has no length cap; a row over 64 KB is set aside silently | `src/domain/recipes/importLink.ts:154-155` |
| S2-14 | S3 Annoying | owner | LEAD | Storage is at 940 MB, near the Free plan's 1 GB | `storage.objects` |
| S2-15 | S4 Polish | live | CONFIRMED | Broad default grants (TRUNCATE/DELETE/UPDATE to anon) on feed tables; pg_net callable by anon | `role_table_grants`, `net.*` |
| S2-16 | S3 Annoying | owner | LIKELY | Age minimum (16) is promised but never asked; social-media minimum-age law not assessed | `privacy-policy.md:189` |
| S2-17 | S4 Polish | live | CONFIRMED | Advisor performance warnings on household policies and two foreign keys | `household_members`, `household_rows`, `household_invites` |

## Findings

### S2-1 · S1 · live · CONFIRMED · Household takeover chain still open live

**What a stranger can do today with the public key.** Anonymous sign-ins are on: the advisor's `auth_allow_anonymous_sign_ins` lint fires on 7 tables (E11). So any script can get an `authenticated` token. Then:

1. Subscribe to Realtime Postgres Changes on `public.household_members`. It is still in `supabase_realtime` (E2), and deletes send the row's primary key, including `household_id`, to every subscriber whatever RLS says (SEC-06).
2. Call `create_household`, so the attacker has a member row of their own.
3. PATCH `/rest/v1/household_members?user_id=eq.<me>` with `{"household_id": "<victim id>"}`. The live policy "members rename themselves" checks only `user_id = auth.uid()` (E3), and `authenticated` has UPDATE on every column (E4). The row moves into the victim's household, skipping the invite and the 8-person cap.
4. `is_member` is now true, so the attacker can read and write every `household_rows` row: plan, ticks, cupboard, the household's own recipes.

Today there are 0 households, so nobody is exposed yet. The first real household would be.

**Fix:** apply `20261008000000_household_lockdown.sql`. It is protective only: column-level UPDATE (`display_name` / `name` only), guard triggers, explicit revokes, a locked `join_household`, and dropping `household_members` from the publication. It changes no data. Undo: `grant update on household_members, households to authenticated`, drop the two guard triggers and functions, `alter publication supabase_realtime add table public.household_members`. Then apply `20261009000100` (S2-3) so row deletes stop going out too.

**Test that would have caught it:** `supabase/tests/rules.test.mjs` already covers SEC-01 on PGlite. Add one live check to the release list: `select has_column_privilege('authenticated','public.household_members','household_id','UPDATE')` must be false. Old ID: SEC-01, SEC-06, K-18, K-32.

### S2-2 · S2 · live + owner · CONFIRMED · No quotas: anonymous users can fill the database

**What a stranger can do today:** create anonymous users (limited only by Supabase's per-IP sign-up rate), then upsert `account_rows` without limit. The live insert policy is only `user_id = auth.uid()`, with no `is_anonymous` check (E3), and the only size rule is 64 KB per row. A thousand-row upsert is about 64 MB. `home_events` also takes unlimited inserts from any authenticated user, and `household_rows` takes them inside the attacker's own households. A full disk puts the project into read-only mode, and the feed, sign-in and sync stop for everyone.

**Fix (live):** apply `20261008000100_rows_server_rules.sql`. It blocks anonymous users from `account_rows` and adds a 50,000-row ceiling per account and per household. That does not limit the number of households one script can create, so the owner should also turn on CAPTCHA for anonymous sign-ins and email OTP, set the auth rate limits, and add a disk alert (all K-24, dashboard only). Optional extra (auto, new migration): a per-user ceiling on `home_events` inserts, or revoke INSERT on `home_events` from `authenticated` until the app uploads events (it doesn't today: `src/store/homeEvents.ts:3`). Old ID: SEC-07, SEC-11, K-24.

### S2-3 · S1 · live · CONFIRMED · Migration history drift, and the exact apply plan

**Evidence (E1):** live versions differ from the repo file names for households (`20261006000618` vs `20261006000000`), newest_wins (`…000720` vs `…000100`), home_events (`20261012094607` vs `20261012000000`), home_ranking (`…094611` vs `…000100`) and seed_kitchen_retired (`20261016204729` vs `20261017000000`). `20261006000200_accounts` is live (its tables, policies and v1 `delete_account` exist) but isn't in the history. A plain `supabase db push` therefore sees six "new" migrations that are really applied, and fails on `relation "households" already exists`. A rule from INTEGRATION.md also applies: the two cloud/09 files are dated before migrations already applied, so `db push` refuses them without `--include-all`.

**What applying changes, migration by migration** (all tables involved hold 0 rows live, so every data-changing statement is a no-op today):

| Order | File | Purely additive or protective | Changes or deletes data | Undo |
| --- | --- | --- | --- | --- |
| 1 | `20261008000000_household_lockdown` | everything (grants, guard triggers, revokes, `join_household` with a row lock, drops `household_members` from the publication) | nothing | re-grant UPDATE, drop triggers, re-add to the publication |
| 2 | `20261008000100_rows_server_rules` | new clock-clamp and tie-break triggers (now on insert too), NOT VALID shape checks, anonymous ban on `account_rows`, quota triggers | **UPDATE** of rows stamped >5 min in the future (0 rows today) | drop the checks, quota triggers and function; recreate the old BEFORE UPDATE triggers from `20261006000100`/`000200`; `alter policy` back |
| 3 | `20261008000200_invites` | new columns, `household_join_attempts`, `preview_invite`, `revoke_invites`, `remove_member`, crypto codes | **UPDATE** shortens existing invite expiry to 48 h (0 invites today); codes become single-use; a wrong code returns null instead of an error | drop the new functions, table and columns; restore `create_invite`/`join_household` from `20261006000000` |
| 4 | `20261008000300_account_cleanup` | `delete_stale_anonymous_users` (unscheduled) | replaces `delete_account` so it removes more on future calls; nothing on apply | restore the v1 `delete_account` from `20261006000200` |
| 5 | `20261009000000_rows_received_at` | `received_at` columns (default now), stamp trigger, indexes, `*_rows_since` RPCs | fills `received_at` on existing rows (0 today) | drop triggers, functions, indexes and columns |
| 6 | `20261009000100_realtime_private_broadcast` | `may_hear`, the `realtime.messages` policy, broadcast triggers | **removes** `household_rows` and `account_rows` from `supabase_realtime`, so Postgres Changes stops for them | `alter publication supabase_realtime add table …` for both; drop the triggers, policy and functions |
| 7 | `_pending/20261021000000_seed_kitchen_off` | `cron.unschedule` only if the job exists (it doesn't), RLS on the 5 `seed.*` tables | nothing | `alter table … disable row level security` |

Dependencies: 4 needs 3 (`household_join_attempts`, `used_by`); 6 needs 5 (`received_at`); 5's trigger names assume 2's triggers. Nothing in 1 to 6 depends on the 12 Oct or 17 Oct migrations, so applying them after those is safe.

**How to apply (live, by the fixer):** don't use plain `db push`. Either (a) apply files 1 to 7 in the order above with the MCP `apply_migration` (names kept, one call each, run `get_advisors` after each), or (b) first run `supabase migration repair --status applied 20261006000000 20261006000100 20261006000200 20261012000000 20261012000100 20261017000000`, rename the six pending files to `20261120000000`..`0500` in the same order (and move the `_pending` file in as `…0600`), then `db push`. Option (a) leaves the repo names out of step with history again; option (b) fixes the drift for good. **Recommended: (b)**, then rename the repo's six drifted files to the live versions (auto) so the two match.

**Who it affects:** the branch's client works before and after each step: it falls back on `PGRST202` (`src/lib/pullRows.ts:43`), falls back to Postgres Changes when the private channel is refused (`src/lib/liveRows.ts:63`), and sets aside check violations (`src/store/sync.ts:125`). For build 25, see S2-10. After step 6 the owner must turn off Realtime "Allow public access" in the dashboard (K-32). Old ID: K-18, K-32, K-36, INTEGRATION.md finding 2.

### S2-4 · S1 · owner + auto · LIKELY · Apple token revocation not deployed, and the scaffold can't work as written

Deleting an account doesn't revoke Sign in with Apple. Apple guideline 5.1.1(v) requires it, so this blocks App Review. `list_edge_functions` shows only `seed-kitchen` deployed (E10), and the app calls the `delete_account` RPC directly (`src/lib/account.ts:207`). A second problem is in the scaffold itself: both functions use `admin.schema('private').from('apple_tokens')` (`apple-token/index.ts:16`, `delete-account/index.ts:16`). supabase-js reaches tables through PostgREST, which serves only the exposed schemas (`public`, `graphql_public` by default). So the calls would fail with "schema must be one of …". Exposing `private` to fix that would also open it to anon's REST endpoint.

**Fix (auto):** keep the table in `private` and reach it through two `security definer` functions in `public` (`apple_token_save(uuid, text)`, `apple_token_take(uuid)`). Revoke them from `public, anon, authenticated` and grant them to `service_role` only. Call them with `admin.rpc(...)`. Add a test to `supabase/tests`. **Owner:** create the Sign in with Apple key (.p8), set the 4 secrets, deploy. Also: `continueWithApple` sends `credential.authorizationCode` nowhere yet (`src/lib/account.ts:132-160`), so the client half is still to write. Old ID: SEC-03, REL-04, K-19.

### S2-5 · S2 · live + auto · CONFIRMED · Live account deletion is the old version and leaves data

The live `delete_account` is v1 (E2: no `nobody` clean-up). A deleted member's own recipes and user id stay in the household (SEC-13), against what `privacy-policy.md:171-173` promises. Applying migration 4 fixes that. Two gaps remain in both versions:

- `home_events.viewer_id` has no foreign key to `auth.users` (pg_constraint: only `recipe_id` and `cook_id` cascade), and neither function deletes from it. The events would outlive the account. No harm today: the app doesn't upload events yet. Fix (auto): add `delete from public.home_events where viewer_id = me;` to `delete_account` in a new migration, or an FK with `on delete cascade`.
- The RevenueCat customer (created on every iPhone launch, `src/store/proSync.ts:58-61`) isn't deleted. Fix (owner + auto): a delete-account Edge Function step calling RevenueCat's delete-customer API with a secret key, or say in the policy that it stays with RevenueCat.

Old ID: SEC-13, SEC-12/K-21 (local data, still open).

### S2-6 · S1 · owner + auto · CONFIRMED · Legal drafts contradict the code

| Draft says | Code does |
| --- | --- |
| `app-store-privacy-and-review.md:23`: Purchases "No … RevenueCat isn't installed, `PURCHASES_CONNECTED = false`" | `react-native-purchases` 10.11 is installed. `startPurchases()` configures RevenueCat at every iPhone launch (`src/features/app/useAppReady.ts:45`, `src/store/proSync.ts:58`), creating a customer record. `PURCHASES_CONNECTED` no longer exists (D-052). `PRIVACY.md:55` already says so; the App Privacy answers don't. |
| `privacy-policy.md:12, 34, 98`: on your phone only, "Nothing" is held on our servers; your phone talks to our servers "only in a household or signed in" | Home's For You rail reads `published_recipes`, `cooks` and `follows` from Supabase for every user, signed in or not (`src/lib/homeFeedReads.ts:25-35`, `src/features/feed/HomeForYou.tsx`), so every launch sends the IP address to Supabase and the app to RevenueCat. |
| `privacy-policy.md:198`, `terms-of-use.md:27`: "Pro … isn't on sale yet. No purchase information is collected." | D-052: the paywall sells as soon as Apple returns products (INTEGRATION.md finding 1). |
| `app-store-privacy-and-review.md:113`: "there are no public profiles, feeds, comments" | Community feed, cook profiles (`src/app/cooks/[id].tsx`), follower counts. The age-rating answer (section 2) assumes the same. |
| `terms-of-use.md:57`: recipes "reviewed and edited by us before they're published" | All 719 feed recipes are `review = 'auto-checked'` (E8). |

**Fix:** auto: rewrite those lines to match the code (name Supabase for the feed reads and RevenueCat in sections 3, 5 and 10; tick Purchases > Purchase History and Identifiers > User ID for RevenueCat; correct the review notes and the age-rating basis; limit the "reviewed" sentence to the bundled catalogue). Owner: the lawyer review the drafts already ask for, and the hosted URLs for `LEGAL_URLS`. Old ID: SEC-02, REL-01, REL-02, REL-24, K-23.

### S2-7 · S2 · owner · CONFIRMED · AI personas presented as real cooks

`public.cooks` holds 99 rows with `kind = 'person'`, 48 with AI portraits and 21 with AI logos. 2,066 follows exist only between them, and they publish 719 recipes, 418 with AI photos (E8). Only 4 bios hint that they aren't real. The feed UI has no AI label for cooks: `src/features/feed` mentions AI only on the test-build ranking line (`HomeForYou.tsx:45`). Photos are labelled (D-029), cooks aren't. A cook would reasonably think these are real people and real follower counts: misleading-conduct risk (ACL s18), and App Review 5.6 / 2.3.1 trouble.

**Before a public launch, the owner decides one of:** (a) label every persona in the UI ("AI cook" chip on cards, profile and recipe header) and call follower numbers "sample"; (b) change `kind` to `house` for all 99 and show them as The Pantry's test kitchen; (c) hide the feed until real cooks exist. Whichever he picks, the auto part is the chip or the kind change. Also: all 719 are `auto-checked` only, and lane 7 owns whether they're safe to cook.

### S2-8 · S3 · live · CONFIRMED · `seed.*` and `backup.*` have RLS off

The advisor rates these as "critical, fully exposed" (E11). They aren't reachable today: `anon` and `authenticated` have no USAGE on `seed` or `backup` (E5), so PostgREST can't read them even if those schemas were exposed. That leaves a single lock. **Fix:** apply `_pending/20261021000000_seed_kitchen_off.sql` (S2-3 step 7), plus the same for the three backup tables in a new migration: `alter table backup.published_recipes_20261017 enable row level security;` and the same for `ingredient_extras_20261017` and `cooks_20261017`. Undo: disable RLS. Owner: once the feed is settled, drop the `backup` tables (they keep 604 old recipes and 100 old cook rows), and delete the vault secret `seed_cron_secret` (unused, since `cron.job` is empty). Nothing in build 25 or the branch reads either schema.

### S2-9 · S3 · live · LEAD · Seed auth users can sign in

All 99 seed users have a confirmed email on `seed.thepantry.invalid`, a password hash and no ban (E7). The creation script isn't in the repo or its history (`git log -S thepantry.invalid` finds nothing), so password strength can't be checked. If one leaked or was weak, someone could sign in as an AI cook. Calling `delete_account` as that user would then cascade-delete the cook and its recipes (`cooks_user_id_fkey` and `published_recipes_cook_id_fkey` are ON DELETE CASCADE). **Fix (live, owner approves):** ban the 99 users through the Auth admin API (`ban_duration: '876000h'`). Undo: `ban_duration: 'none'`. It doesn't affect the feed, which reads `cooks` and not auth.

### S2-10 · S2 · auto · CONFIRMED · Build 25 vs the pending migrations

Build 25 (`38bef97`) touches Supabase only for Household: anonymous sign-in, the four RPCs, `household_rows` select/upsert, and Postgres Changes on `household_rows` and `household_members`. It has never been used (0 users). If the owner does use Household on build 25 after the migrations:

- Step 1 drops `household_members` from the publication, so build 25 stops seeing member changes live.
- Step 2: build 25 upserts every row in one batch and doesn't set aside a check violation (`git show 38bef97:src/lib/household.ts:118-139`), so one malformed row blocks its sync for good.
- Step 3: a wrong code makes `join_household` return null, which build 25's `rpc()` passes on as success with a null household id. Codes become single-use.
- Step 6, plus turning off public Realtime access: build 25 gets no live rows at all.

**Fix (auto, docs):** in the release notes, say "build 25 must not use Household once the D-048 migrations are applied; test Household on a new build". No change to build 25 is possible.

### S2-11 · S3 · auto · LIKELY · Branch Household calls RPCs missing live

`revoke_invites`, `remove_member` and `preview_invite` (`src/lib/household.ts:71-83`) don't exist until S2-3 step 3. Until then the Remove and Cancel codes buttons fail with a generic error. The invite preview never loads: `inviteFor` returns not-ok, so `JoinScreen` leaves the preview undefined and the join still works. Fix: apply step 3, or map `PGRST202` to a plain "not available yet" message, as `pullRows.isMissingFunction` does.

### S2-12 · S3 · auto · LIKELY · Link import size cap applies after the whole page is read

`fetchPage` checks `content-length` and then calls `response.text()` (`src/lib/fetchPage.ts:30-33`). A chunked reply with no length header (common) is read in full before the 5 MB check, so a hostile or huge link can push the app's memory up and get it killed. The check also counts UTF-16 characters, not bytes. Fix: read `response.body` with a reader and stop at `MAX_PAGE_BYTES`. On React Native, where `body` may be missing, fall back to `text()`. Test: a mocked stream of 6 MB with no length must return `too-big`. Old ID: SEC-18 (partly fixed).

### S2-13 · S3 · auto · LEAD · No length cap on imported ingredients and method

`extractRecipe` caps the title (80) and summary (120) but not `ingredientsText` or `methodText` (`importLink.ts:154-155`). A page with an enormous JSON-LD recipe produces a row over 64 KB. The server refuses it (`household_rows_size`, `account_rows_size`, `23514`), and the branch sets it aside with only a console warning (`src/store/sync.ts:125`). The recipe then never syncs and the cook isn't told. Fix: cap both fields (say 20,000 characters, with a note in the editor), and say in the UI when a row is set aside. Lane 3 owns the set-aside behaviour.

### S2-14 · S3 · owner · LEAD · Storage near the Free plan limit

`storage.objects` totals 940 MB (880 recipe photos, 99 avatars) (E9). If the project is on the Free plan (1 GB storage), one more batch of photos stops uploads. The plan can't be read with these tools. Owner: check the plan in Billing. Auto option: re-encode the feed photos as WebP, as K-30 did for the bundled ones (lane 6).

### S2-15 · S4 · live · CONFIRMED · Broad default grants

`anon` and `authenticated` hold INSERT, UPDATE, DELETE and TRUNCATE on `cooks`, `published_recipes`, `follows` and `ingredient_extras` (E4). RLS blocks the first three over REST, and PostgREST has no TRUNCATE, so this can't be used today. One mistaken permissive policy, though, would make the feed writable. `net.http_post`/`http_get` and `net._http_response` (360 old seed-kitchen responses) are open to anon (E5). The `net` schema isn't exposed by default, but the exposed-schema list can only be confirmed in the dashboard. **Fix (live, new migration):** `revoke insert, update, delete, truncate, references, trigger on public.cooks, public.published_recipes, public.follows, public.ingredient_extras from anon, authenticated;` and `revoke usage on schema net from anon, authenticated;`. Check first that nothing calls pg_net as those roles: `cron.job` is empty and the seed kitchen is retired. Undo: re-grant. Build 25 and the branch only SELECT these tables. Old ID: SEC-20 (fixed in the migration for household tables only).

### S2-16 · S3 · owner · LIKELY · Age minimum promised but not asked

`privacy-policy.md:189` says you must be at least [16] to create an account or start a household. Nothing in the app asks, and the drafts leave it open. Owner/lawyer: settle the age and whether a feed of profiles with follower counts brings the app under the social-media minimum-age rules (Online Safety Act 2021 amendments); users can't post or follow today, which helps. If an age gate is chosen, it goes on the account and household start screens (auto).

### S2-17 · S4 · live · CONFIRMED · Advisor performance warnings

`auth_rls_initplan` fires on "members rename themselves" and on the household_rows add and change policies (bare `auth.uid()`). FKs `household_invites.household_id` and `home_events.cook_id` have no index (E11). Fix: wrap the calls as `(select auth.uid())` in a new migration, after S2-3 step 1 (which keeps these policies), and add the two indexes. Purely additive.

## Carry-over (8 Oct SEC IDs and K-items in this lane)

| ID | State today | How checked |
| --- | --- | --- |
| SEC-01 | still open live (fix written) | S2-1, E3/E4 |
| SEC-02 / K-23 | still open; drafts now contradict the code | S2-6 |
| SEC-03 / K-19 | still open; scaffold has a schema bug | S2-4 |
| SEC-04 | still open live (client half done) | no clamp trigger live, E2 |
| SEC-05 | still open live (client half done) | no shape checks, E2 |
| SEC-06 / K-32 | still open live (member list and row deletes both published) | E2 |
| SEC-07 | still open live | S2-2 |
| SEC-08 | still open live (`random()` codes, 14 days, reusable) | E2 |
| SEC-09 / K-22 | still open: no nonce. Needs `expo-crypto` (native, not installed); owner approves the module | `src/lib/account.ts:132`, package.json |
| SEC-10 / K-20 | still open: session in AsyncStorage (`src/lib/supabase.ts:14`). Needs `expo-secure-store` (native); owner approves | code |
| SEC-11 / K-24 | still open: CAPTCHA, SMTP, OTP expiry and rate limits are dashboard only. Partly progressed: pg_cron is now installed (E9), so `delete_stale_anonymous_users` can be scheduled once step 4 is applied: `select cron.schedule('delete-stale-anonymous-users','17 3 * * *','select public.delete_stale_anonymous_users()')` | E9 |
| SEC-12 / K-21 | still open (owner decision) | not re-tested |
| SEC-13 | still open live | S2-5 |
| SEC-14 / K-33 | still open; clean-up not applied, not scheduled | E2 |
| SEC-15, SEC-16 | still open live (functions missing); custom-scheme links still K-26 | S2-11 |
| SEC-17 | no longer applies as written: `npm ls` shows `decode-uri-component@0.2.2` (the fixed line); lane 1's `npm audit` is the source of truth | npm ls |
| SEC-18 | partly fixed | S2-12 |
| SEC-19 | still fixed: no service or secret keys in the tree, git history (`git log --all -G` for `sb_secret_`, `sk-ant-api`, HS256 JWTs, private keys) or `dist/`. Bundle holds the Supabase publishable key (`src/lib/backend.ts:5`) and the RevenueCat public iOS key (`src/lib/purchases.ts:36`), both meant to ship | grep |
| SEC-20 | still open live for household tables; feed tables S2-15 | E4 |
| SEC-21 | still open live | E2 |
| SEC-22 | answered: `delete_account` is owned by `postgres`, which has DELETE on `auth.users` | E6 |
| SEC-23 / K-35 | still open (needs a native build) | not testable |
| SEC-25 / K-34 | still open: `.maestro/25-household.yaml`, `26-account.yaml` would write to production. **Lanes 2 and 5: don't run household or account journeys against the web build, which uses the live project** | ls .maestro |
| K-18 | still open | S2-3 |
| K-26 | still open (owner: a domain) | — |
| K-29 | still open: `eas.json` production has no `EXPO_PUBLIC_SHOW_DRAFT_RECIPES`, and `src/app/dev/home-viewer.tsx` only reads public data, so the risk is low | eas.json |
| K-36 | written, not applied | S2-3 step 5 |
| `ANTHROPIC_API_KEY` | no deployed function reads it (only the 410 stub is live). Owner: delete the secret in Edge Functions › Secrets and revoke the key at Anthropic | E10 |

## Coverage

Inventory (33): deep links (join, my-recipe/edit, pro, browse, library, dev routes), link import (normalise, fetch cap, JSON-LD, source link scheme check), share text, URL opening (6 call sites), secrets in tree/history/dist, logs (11 `console.warn`, no PII), session storage, Apple nonce, deletion (RPC, Edge Function scaffold), notifications (fixed generic text; timer text is the recipe step), server-side input limits (all check constraints read), migrations vs live, RLS per table (17 public tables plus seed/backup/net/storage/realtime), every policy read as anon, a stranger, a member and a removed member, SECURITY DEFINER functions and search_path, grants, RPCs callable by anon, Realtime publication and `realtime.messages` policies, storage buckets and policies, Edge Functions, `get_advisors` (both), seed accounts, AI cook content, backup schema, vault, cron, privacy policy, terms, App Privacy answers, privacy manifest, permission strings, account-deletion completeness. 27 of 33 checked.

## Not tested, and why

- **Auth settings** (anonymous sign-ins inferred from the advisor; OTP expiry, rate limits, CAPTCHA, SMTP provider, manual linking, Apple provider): dashboard only, no read tool.
- **Realtime "Allow public access"** and **PostgREST exposed schemas**: dashboard only.
- **Edge Function secret names**: no list tool. Only checked which deployed code reads them.
- **RevenueCat customer data**: not opened; this lane's question was the privacy docs, which the code answers.
- **Seed account passwords**: never read or tested (and must not be).
- **Anything on a phone**: Keychain or AsyncStorage contents, lock-screen notification look, the privacy manifest after prebuild.
