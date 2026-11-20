# Backend fix (20 Nov 2026)

Branch `audit/deep-1120`. Scope: `supabase/**`. **No change was made to the live project.** Live was read with single SELECTs and `list_migrations` only. The apply is one session from `supabase/APPLY-LIVE.md`, once Lachlan says yes.

## Result

- `supabase/migrations/` now matches live history, and the pending and new files are in apply order after everything live has.
- 6 new migrations and 2 new test files. **PGlite tests: 23/23 before, 34/34 after** (`node --test supabase/tests/*.test.mjs`). The new security tests fail when run against the migrations before mine (`UPTO=20261120000599`: 6 of 8 fail), so they check the fixes, not the setup.
- Every verification SELECT in the runbook was run on PGlite and gave the expected answer. Every rollback block was run in reverse order (13 to 1) on PGlite without error and put the publication back to today's live state.
- Commits: `c9d61e5` (history match), `e7ec90b` (new migrations, tests, edge functions), `7ec12aa` (runbook and live snapshots), plus this report.

## Per finding

| ID | What was done | Commit |
| --- | --- | --- |
| S2-3 / DATA-2 | Five applied files renamed to the versions live records: `20261006000618_households`, `…000720_household_rows_newest_wins`, `20261012094607_home_events`, `…094611_home_ranking`, `20261016204729_seed_kitchen_retired`. `accounts` (applied, not recorded) moved to `20261006000800` so it sorts after `households`, which it calls; the runbook records it with `supabase migration repair --status applied 20261006000800`. Pending files renumbered `20261120000000` (lockdown) to `…0400` (received_at), `_pending/seed_kitchen_off` moved in as `…0500`, `realtime_private_broadcast` last as `20261120009900`. The new order exposed one bug: `seed_kitchen_off` failed wherever `cron.job` doesn't exist (plpgsql plans a whole `and`); fixed with a nested `if`. | `c9d61e5` |
| Guard | `supabase/tests/migrations.test.mjs`: fails on a duplicate version, a badly named file, anything in `_pending`, or if `realtime_private_broadcast` is not last. | `e7ec90b` |
| S2-1 | Ready: `20261120000000_household_lockdown` (unchanged, renamed). Runbook step 1 verifies `has_column_privilege('authenticated','public.household_members','household_id','UPDATE')` is false, both guard triggers exist, `household_members` is out of the publication. | `c9d61e5` |
| S2-2 | `20261120000800_home_events_no_direct_writes`: revokes INSERT, UPDATE, DELETE, TRUNCATE on `home_events` (and the sequence) from `authenticated`. Picked over a quota because the app never uploads events (`src/store/homeEvents.ts:3`): nothing to size a quota against, and the upload feature should set its own rules (permanent users only, batch size). The insert policy stays, so the undo is one line, written in the file. The `account_rows`/`household_rows` quotas are in step 2 (`rows_server_rules`). CAPTCHA and rate limits remain owner steps. | `e7ec90b` |
| S2-4 (server) | `20261120001100_apple_tokens`: `private.apple_tokens` (RLS on, no grants), `public.apple_token_save(uuid, text)` and `public.apple_token_take(uuid)`, security definer, revoked from `public, anon, authenticated`, granted to `service_role` only. `take` only reads: if Apple can't be reached the deletion stops and can be retried; the row goes with the auth user by cascade. `apple-token` and `delete-account` now call `admin.rpc(...)`; `_shared/apple.ts` setup steps updated. Tested: service role saves, replaces and reads; users and anon are refused; the token goes when the account is deleted. Deno type-check not run (no Deno here). | `e7ec90b` |
| S2-5 | `20261120000700_delete_account_home_events`: `delete_account` (the v2 body from `account_cleanup`) also deletes the caller's `home_events`. Tested. The RevenueCat customer is still not deleted (needs a secret key and a function step: owner decision). | `e7ec90b` |
| S2-8 | `20261120000600_backup_rls`: RLS on the three `backup.*_20261017` tables, skipped where a table is missing (PGlite). The `seed.*` half is step 6. Tested both paths. | `e7ec90b` |
| S2-15 | `20261120000900_least_privilege_grants`: anon and authenticated keep only SELECT on `cooks`, `published_recipes`, `follows`, `ingredient_extras`; authenticated can no longer insert `households`/`household_members` directly (only the definer functions do). Read first: the app only selects these tables (`src/lib/homeFeedReads.ts`, `src/lib/published.ts`); Follow and Unfollow are phone-only events, so nothing writes `follows`. Tested reads still work for anon and users, writes and TRUNCATE fail, the service role still writes. **pg_net is not in the migration:** live shows the `net` schema and functions granted by `supabase_admin` (and to PUBLIC), and `postgres` is not a member of `supabase_admin`, so a revoke from a migration would silently do nothing. Nothing calls pg_net (no function outside `net` mentions `net.http` except Supabase's own re-grant hook; `cron.job` is empty). So it's an owner step: disable the extension. | `e7ec90b` |
| S2-17 | `20261120001000_advisor_performance`: the three household policies use `(select auth.uid())`; indexes `household_invites_by_household` and `home_events_by_cook`. Tested; renaming yourself still works. | `e7ec90b` |
| DATA-1 | Every missing server fix is ready in order (steps 1 to 5 and 13). Runbook pre-checks require the user tables to be 0 before any data-changing step. | `c9d61e5` |
| DATA-3 | `realtime_private_broadcast` is last by version and marked in the runbook "apply last, only after a new build's live updates have been seen working on a phone", with the two-phone tick test before and after, then the owner turns off Realtime public access. Nothing else uses Realtime: the app's only channel code is `src/lib/liveRows.ts`. Still unproven on a device. | `7ec12aa` |
| Runbook | `supabase/APPLY-LIVE.md`: per step, what it does, protection vs data, pre-check, verify SELECT with expected answers, rollback SQL from the live snapshots (`evidence/FIX-BACKEND/before-functions.md`, `before-policies-grants.md`). Two routes: CLI with psql then `migration repair` per file (recommended: keeps versions and lets step 13 wait), or MCP `apply_migration` (which stamps its own versions, so the files are renamed afterwards). Feed checks before and after, advisors at the end, Apple deploy steps. | `7ec12aa` |

## What waits on the live apply

All 13 steps. Until then the live project has none of: the household lockdown (S2-1), the quotas and anonymous ban (S2-2), crypto single-use codes and the three missing RPCs (DATA-1), v2/v3 `delete_account` (S2-5), `received_at`, RLS on `seed.*` and `backup.*` (S2-8), the narrowed grants (S2-15), the advisor fixes (S2-17), the Apple token store (S2-4), private Broadcast (DATA-3).

## Only the owner can do these

1. **Say yes to the apply**, then one session runs `supabase/APPLY-LIVE.md` steps 1 to 12. Step 13 only after a new build's live updates work on two phones.
2. **Turn off Realtime public access** after step 13: Dashboard › Project Settings › Realtime › "Allow public access" off.
3. **Ban the 99 seed users** (S2-9): Auth admin API, `ban_duration: '876000h'` for each `@seed.thepantry.invalid` user. The feed reads `cooks`, not auth, so it keeps working. Undo: `ban_duration: 'none'`.
4. **Backup tables:** once the feed is settled, drop `backup.published_recipes_20261017`, `backup.ingredient_extras_20261017`, `backup.cooks_20261017` (604 old recipes, 100 old cooks). This deletes data, so it's yours to decide.
5. **Vault secret:** delete `seed_cron_secret` (Dashboard › Integrations › Vault). Nothing uses it; `cron.job` is empty.
6. **pg_net:** Dashboard › Database › Extensions › `pg_net` › disable. Nothing uses it. It also removes `net._http_response` (360 old seed-kitchen responses).
7. **Auth (K-24):** turn on CAPTCHA for sign-ups and anonymous sign-ins (Auth › Attack Protection), set the rate limits (Auth › Rate Limits: anonymous sign-ins, email OTP, token refresh), keep OTP expiry at 600 s, set custom SMTP.
8. **Disk alert:** Dashboard › Settings › Usage/Billing alerts at 80% of the database disk (and check Storage, at 940 MB of a likely 1 GB Free limit, S2-14).
9. **Schedule the anonymous clean-up** after step 4: `select cron.schedule('delete-stale-anonymous-users', '17 3 * * *', 'select public.delete_stale_anonymous_users()');` (a write, so it's your yes).
10. **Apple key and function deploy** (S2-4): APPLY-LIVE.md › "Edge functions": make the Sign in with Apple key (.p8), set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_CLIENT_ID`, then `supabase functions deploy apple-token delete-account`. Also delete the unused `ANTHROPIC_API_KEY` function secret and revoke that key at Anthropic.

## K-items whose status should change (for the coordinator to edit)

- **K-18**: files renamed to `20261120000000`..`0300`; still not applied; apply plan in `supabase/APPLY-LIVE.md`.
- **K-36**: file is `20261120000400_rows_received_at.sql`; not applied.
- **K-32**: file is `20261120009900_realtime_private_broadcast.sql`; applied last, after a device test (DATA-3).
- **K-19**: server half done (`20261120001100_apple_tokens`, functions call `rpc`); waits on the apply, the Apple key, deploy and the client half.
- **K-24**: unchanged (dashboard), plus the pg_net and disk-alert steps above. The `home_events` part of SEC-07 is closed in the repo by step 9.
- **K-33**: `delete_stale_anonymous_users` still waits on step 4 plus the cron schedule.
- Old file names are still quoted in `docs/HOUSEHOLD.md`, `docs/SEED-KITCHEN-OFF.md`, `docs/KNOWN-ISSUES.md` (K-18, K-32, K-36) and `docs/DECISIONS.md` (D-048). I don't own those files.

## Client impact (read-only)

**Before the apply (today):** `revoke_invites`, `remove_member` and `preview_invite` don't exist. `src/lib/household.ts:73` (a working-tree change, not mine, not yet committed) maps PostgREST's `PGRST202` to `not-available`, so Cancel codes and Remove answer "That isn't available yet", and the join preview doesn't load while the join itself still works. A wrong code throws `invite-not-found`, which `problemFrom` maps. `*_rows_since` are missing, so `pullRows` falls back to a full pull. The private channel is refused (no `realtime.messages` policy), so `liveRows` falls back to Postgres Changes.

**After steps 1 to 12:** nothing in the branch's app needs to change. A wrong code returns null, which `joinHousehold` turns into `invite-not-found`. A refused row (23514) is set aside (`src/store/sync.ts`). The app writes no `home_events`, `follows`, `cooks` or `households` rows directly, so the new revokes don't touch it. `delete_account` is still the RPC the app calls (`src/lib/account.ts:207`). Build 25 must not use Household after the apply (S2-10).

**After step 13 plus public access off:** live rows come only over the private channel. Build 25 gets none.

## Notes for the app fixer

1. `src/lib/account.ts:132-160`: after Apple sign-in, POST `{ authorizationCode: credential.authorizationCode }` to the `apple-token` function. Without it the token store stays empty and deletion can't revoke (S2-4, K-19).
2. `src/lib/account.ts:207`: once the functions are deployed, delete through the `delete-account` function (it revokes Apple, then runs the same RPC as the user). Keep the RPC as the fallback when the function answers 404, so the app works before the deploy.
3. `src/lib/household.ts:73`: your `not-available` mapping is uncommitted in the working tree. `remove_member`'s `use-leave` and `not-a-member` errors fall through to `failed`; fine, or map them.
4. `src/features/household/words.ts:7` (DATA-13): the "one person, two days" wording becomes true only after step 3.
5. `src/store/homeEvents.ts:3`: when uploads ship, the server needs `grant insert on public.home_events to authenticated; grant usage on sequence public.home_events_id_seq to authenticated;` in a new migration, ideally with a per-user ceiling and permanent users only.
