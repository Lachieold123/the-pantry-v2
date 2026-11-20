# Applying the 20 Nov 2026 migrations to the live project

Project `the-pantry` (`eozyhllkvajvrecojdxu`). Written 20 Nov 2026 by the deep-audit backend fix (`docs/audits/2026-11-20-deep-audit/FIX-BACKEND.md`). **Nothing here has been run on the live project yet.** Lachlan says yes first.

Every function body, policy and grant these migrations replace was snapshotted from live on 20 Nov: `docs/audits/2026-11-20-deep-audit/evidence/FIX-BACKEND/before-functions.md` and `before-policies-grants.md`. The rollback SQL below comes from those snapshots.

## Why this is safe today

The live backend holds no real person's data: 0 households, 0 members, 0 invites, 0 household rows, 0 account rows, 0 profiles, 0 home events, 0 anonymous users. The 99 auth users are the seed cooks behind the feed. So every statement that changes data changes 0 rows. The feed tables (`cooks` 100, `published_recipes` 731, `follows` 2,066) are only read, never written.

The full set, in this order, passes on PGlite: `node --test supabase/tests/*.test.mjs` (34 tests; set `PGLITE` as `supabase/tests/harness.mjs` says). Run it again before you start.

## Before you start (5 minutes)

1. `git log --oneline -3` on the branch you apply from. The files in `supabase/migrations/` are the ones you apply. Don't edit them during the session.
2. Run the "baseline" check and save the answer:

   ```sql
   select (select count(*) from public.households) households, (select count(*) from public.household_members) members,
     (select count(*) from public.household_invites) invites, (select count(*) from public.household_rows) household_rows,
     (select count(*) from public.account_rows) account_rows, (select count(*) from public.profiles) profiles,
     (select count(*) from public.home_events) home_events, (select count(*) from auth.users where is_anonymous) anon_users,
     (select count(*) from public.cooks) cooks, (select count(*) from public.published_recipes) recipes, (select count(*) from public.follows) follows;
   ```

   Expected: the first eight are **0**; cooks 100, recipes 731, follows 2066 (or whatever they are today: write them down, they must not change). **If any of the first eight is not 0, stop**: someone is using Household or accounts, and the data-changing steps (2, 3, 4) need a fresh look.
3. Feed still works, before: open the app on a phone or the web build and see the For You rail load, or run
   `curl -s "https://eozyhllkvajvrecojdxu.supabase.co/rest/v1/cooks?select=id&limit=1" -H "apikey: <publishable key from src/lib/backend.ts>"` (one row back).

## Two ways to apply. Pick one and stay with it

**Route A, recommended: Supabase CLI with psql (the file versions stay as they are).** Plain `supabase db push` would also push `realtime_private_broadcast`, which must wait (step 13), so each file goes in on its own and is then recorded:

```sh
supabase link --project-ref eozyhllkvajvrecojdxu
supabase migration repair --status applied 20261006000800      # the accounts history row (see below)
supabase migration list                                         # every version up to 20261016204729 shows on both sides
# then, for each file in the table below, in order:
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/<file>.sql
supabase migration repair --status applied <version>
```

`$SUPABASE_DB_URL` is the session pooler connection string from Dashboard › Connect (the database password is in Lachlan's password manager; never paste it in chat or a file). When every step but 13 is in, `supabase migration list` shows only `20261120009900` as local-only. Step 13, later, is just `supabase db push` (it is then the only pending file).

**Route B: the Supabase MCP `apply_migration` (an agent session).** One call per file: `name` = the file name without the version and `.sql` (for example `household_lockdown`), `query` = the file's contents. `apply_migration` stamps **its own version** (the time of the call), not the file's. So when the session ends:

1. `list_migrations`, then `git mv` each applied file to the version live stamped (for example `20261120000000_household_lockdown.sql` → `20261121034512_household_lockdown.sql`).
2. Rename `…_realtime_private_broadcast.sql` to a version after the last stamped one, so it stays last (`supabase/tests/migrations.test.mjs` checks this).
3. The accounts row: MCP has no repair tool. Either run Route A's `supabase migration repair --status applied 20261006000800` once from a terminal, or, with Lachlan's yes for a write, `insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261006000800', 'accounts', '{}');`
4. Run the PGlite tests and commit the renames.

Either way, run `get_advisors` (security) after steps 1, 3 and 12, and both advisors at the end.

### The accounts history row

`20261006000800_accounts.sql` (it was `20261006000200`; moved so it sorts after `households`, which it calls) is applied live, with its tables, policies and v1 `delete_account`, but it isn't recorded in `supabase_migrations.schema_migrations`. Record it, don't run it: re-running fails on `relation "profiles" already exists`. The five other drifted files were renamed to the versions live recorded (`20261006000618`, `…000720`, `20261012094607`, `…094611`, `20261016204729`), so nothing else needs repair.

## The migrations, in order

"Changes data" means a statement that writes rows. Every such statement touches 0 rows today (baseline above). Roll back **in reverse order only**: later steps build on earlier ones (4 and 8 need 3's table; 5 renames triggers 2 made; 13 needs 5's column).

| # | File | Adds protection only, or changes data |
| --- | --- | --- |
| 1 | `20261120000000_household_lockdown` | protection only |
| 2 | `20261120000100_rows_server_rules` | protection, plus an UPDATE of rows stamped >5 min ahead (0 rows) |
| 3 | `20261120000200_invites` | protection and new functions, plus an UPDATE shortening invite expiry (0 invites) |
| 4 | `20261120000300_account_cleanup` | replaces `delete_account`; no data on apply |
| 5 | `20261120000400_rows_received_at` | new column filled on existing rows (0 rows) |
| 6 | `20261120000500_seed_kitchen_off` | protection only |
| 7 | `20261120000600_backup_rls` | protection only |
| 8 | `20261120000700_delete_account_home_events` | replaces `delete_account`; no data on apply |
| 9 | `20261120000800_home_events_no_direct_writes` | protection only |
| 10 | `20261120000900_least_privilege_grants` | protection only |
| 11 | `20261120001000_advisor_performance` | same rules reworded, two indexes |
| 12 | `20261120001100_apple_tokens` | new schema, table, two functions |
| 13 | `20261120009900_realtime_private_broadcast` | **apply last, later** (see step 13) |

### 1. `20261120000000_household_lockdown` (S2-1, SEC-01/06/20/21)

**Does:** members can change only their name (and households only theirs), guard triggers refuse any other change, anon loses every right on the household and account tables, joins to one household take turns, and the member list leaves Realtime.
**Pre-check:** `select count(*) from public.household_members;` → 0.
**Verify:**

```sql
select has_column_privilege('authenticated','public.household_members','household_id','UPDATE') as can_move,      -- false
       has_column_privilege('authenticated','public.household_members','display_name','UPDATE') as can_rename,   -- true
       (select count(*) from pg_trigger where tgname in ('household_members_guard','households_guard') and not tgisinternal) as guards,  -- 2
       exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='household_members') as members_published, -- false
       has_table_privilege('anon','public.household_rows','select') as anon_reads_rows;  -- false
```

**Rollback:**

```sql
alter publication supabase_realtime add table public.household_members;
drop trigger household_members_guard on public.household_members; drop function public.household_members_guard();
drop trigger households_guard on public.households; drop function public.households_guard();
grant all on public.households, public.household_members, public.household_invites, public.household_rows, public.profiles, public.account_rows to anon, authenticated;
grant execute on function public.household_rows_keep_newest() to public, anon, authenticated;
-- then re-create join_household exactly as in before-functions.md (it has no row lock).
```

### 2. `20261120000100_rows_server_rules` (S2-2, SEC-04/05/07)

**Does:** a row stamped far in the future is brought back to server time (on insert too), ties break the way the phones do, malformed rows are refused, anonymous users can't write account rows, and each account or household holds at most 50,000 rows.
**Pre-check:**

```sql
select (select count(*) from public.household_rows where updated_at > (extract(epoch from now())*1000)::bigint + 300000)
     + (select count(*) from public.account_rows where updated_at > (extract(epoch from now())*1000)::bigint + 300000) as future_rows; -- 0
```

**Verify:**

```sql
select (select count(*) from information_schema.triggers where trigger_name in ('household_rows_keep_newest','account_rows_keep_newest') and event_manipulation = 'INSERT') as clamp_on_insert, -- 2
       (select count(*) from pg_trigger where tgname in ('account_rows_quota','household_rows_quota')) as quotas,  -- 2
       (select count(*) from pg_constraint where conname in ('household_rows_shape','account_rows_shape')) as shapes, -- 2
       (select with_check from pg_policies where policyname = 'owners add their rows') like '%is_anonymous%' as anon_banned; -- true
```

**Rollback:**

```sql
drop trigger account_rows_quota on public.account_rows; drop trigger household_rows_quota on public.household_rows; drop function public.rows_within_quota();
alter table public.household_rows drop constraint household_rows_shape; alter table public.account_rows drop constraint account_rows_shape;
alter policy "owners add their rows" on public.account_rows with check (user_id = (select auth.uid()));
alter policy "owners change their rows" on public.account_rows using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger household_rows_keep_newest on public.household_rows; drop trigger account_rows_keep_newest on public.account_rows;
-- re-create both *_keep_newest functions exactly as in before-functions.md, then:
create trigger household_rows_keep_newest before update on public.household_rows for each row execute function public.household_rows_keep_newest();
create trigger account_rows_keep_newest before update on public.account_rows for each row execute function public.account_rows_keep_newest();
```

### 3. `20261120000200_invites` (SEC-08/15/16, DATA-1, S2-11)

**Does:** invite codes come from the cryptographic generator, each lets one person in and lasts 48 hours, 10 wrong codes an hour make a phone wait, and adds `preview_invite`, `revoke_invites` and `remove_member` (the Household buttons that fail today).
**Pre-check:** `select count(*) from public.household_invites;` → 0.
**Verify:**

```sql
select count(*) filter (where proname in ('preview_invite','revoke_invites','remove_member','too_many_join_attempts')) as new_functions, -- 4
       bool_and(not has_function_privilege('anon', p.oid, 'execute')) filter (where proname in ('preview_invite','revoke_invites','remove_member')) as anon_locked_out -- true
from pg_proc p where pronamespace = 'public'::regnamespace;
select pg_get_functiondef('public.create_invite()'::regprocedure) like '%gen_random_bytes%' as crypto_codes;  -- true
```

**Rollback** (roll back 8 and 4 first):

```sql
drop function public.preview_invite(text); drop function public.revoke_invites(); drop function public.remove_member(uuid);
drop function public.too_many_join_attempts(); drop table public.household_join_attempts;
alter table public.household_invites drop column used_by, drop column used_at, alter column expires_at set default now() + interval '14 days';
-- then re-create create_invite and join_household exactly as in before-functions.md.
```

### 4. `20261120000300_account_cleanup` (SEC-13/14, S2-5)

**Does:** deleting an account also takes your own shared recipes out of the household and your id off what you planned; adds `delete_stale_anonymous_users` (not scheduled).
**Pre-check:** none needed (no data changes on apply).
**Verify:** `select pg_get_functiondef('public.delete_account()'::regprocedure) like '%nobody%' as v2, has_function_privilege('authenticated','public.delete_stale_anonymous_users()','execute') as user_can_purge;` → `true`, `false`.
**Rollback:** re-create `delete_account` exactly as in before-functions.md (v1); `drop function public.delete_stale_anonymous_users();`

### 5. `20261120000400_rows_received_at` (K-36)

**Does:** the server stamps each row with its own clock when it takes it, so phones pull only what changed; adds `household_rows_since` and `account_rows_since`.
**Pre-check:** household_rows and account_rows counts (both 0).
**Verify:** `select count(*) from information_schema.columns where column_name = 'received_at' and table_name in ('household_rows','account_rows');` → 2; `select count(*) from pg_proc where proname in ('household_rows_since','account_rows_since');` → 2.
**Rollback** (roll back 13 first):

```sql
drop function public.household_rows_since(uuid, bigint, text, text, integer); drop function public.account_rows_since(uuid, bigint, text, text, integer);
drop trigger household_rows_stamp_received on public.household_rows; drop trigger account_rows_stamp_received on public.account_rows;
drop function public.rows_stamp_received();
drop index public.household_rows_received; drop index public.account_rows_received;
alter table public.household_rows drop column received_at; alter table public.account_rows drop column received_at;
```

### 6. `20261120000500_seed_kitchen_off` (S2-8)

**Does:** drops the `seed-kitchen` cron job if it's there (it isn't) and turns on row level security on the five `seed.*` tables.
**Pre-check:** `select count(*) from cron.job where jobname = 'seed-kitchen';` → 0.
**Verify:** `select count(*) from pg_class where relnamespace = 'seed'::regnamespace and relkind = 'r' and relrowsecurity;` → 5.
**Rollback:** `alter table seed.config disable row level security;` and the same for `seed.personas`, `seed.dishes`, `seed.usage`, `seed.runs`.

### 7. `20261120000600_backup_rls` (S2-8)

**Does:** row level security on the three `backup.*_20261017` tables (skipped where a table doesn't exist).
**Verify:** `select count(*) from pg_class where relnamespace = 'backup'::regnamespace and relkind = 'r' and relrowsecurity;` → 3.
**Rollback:** `alter table backup.published_recipes_20261017 disable row level security;` and the same for `backup.ingredient_extras_20261017`, `backup.cooks_20261017`.

### 8. `20261120000700_delete_account_home_events` (S2-5)

**Does:** deleting an account also deletes that person's Home events.
**Verify:** `select pg_get_functiondef('public.delete_account()'::regprocedure) like '%home_events%';` → true.
**Rollback:** run the `create or replace function public.delete_account()` block and its two grant lines from `20261120000300_account_cleanup.sql` again.

### 9. `20261120000800_home_events_no_direct_writes` (S2-2)

**Does:** signed-in users can no longer insert, change or delete `home_events` rows directly (the app keeps events on the phone and never uploads them); reading your own stays.
**Pre-check:** `select count(*) from public.home_events;` → 0.
**Verify:** `select has_table_privilege('authenticated','public.home_events','insert') as can_insert, has_table_privilege('authenticated','public.home_events','select') as can_read;` → `false`, `true`.
**Rollback:** `grant insert, update, delete, truncate, references, trigger on public.home_events to authenticated; grant usage on sequence public.home_events_id_seq to authenticated;` (When uploads ship, the undo is only the INSERT and sequence grants.)

### 10. `20261120000900_least_privilege_grants` (S2-15)

**Does:** anon and signed-in users can only read `cooks`, `published_recipes`, `follows` and `ingredient_extras` (no insert, update, delete or truncate), and can't insert households or members directly (the functions do that).
**Verify:**

```sql
select has_table_privilege('anon','public.follows','select') anon_reads,            -- true
       has_table_privilege('anon','public.follows','insert') anon_writes,           -- false
       has_table_privilege('authenticated','public.cooks','update') user_updates,   -- false
       has_table_privilege('anon','public.published_recipes','truncate') anon_truncates, -- false
       has_table_privilege('authenticated','public.households','insert') user_inserts_household; -- false
```

Then the feed check below.
**Rollback:** `grant all on public.cooks, public.published_recipes, public.follows, public.ingredient_extras to anon, authenticated; grant insert on public.households, public.household_members to authenticated;`

### 11. `20261120001000_advisor_performance` (S2-17)

**Does:** the three household policies call `auth.uid()` once per statement instead of once per row (same rules), and indexes the two unindexed foreign keys.
**Verify:** `select policyname, qual, with_check from pg_policies where policyname in ('members rename themselves','members add shared rows','members change shared rows');` → every `auth.uid()` appears as `( SELECT auth.uid() AS uid)`. `select count(*) from pg_indexes where indexname in ('household_invites_by_household','home_events_by_cook');` → 2. The performance advisor no longer lists `auth_rls_initplan` or `unindexed_foreign_keys` for these.
**Rollback:**

```sql
alter policy "members rename themselves" on public.household_members using (user_id = auth.uid()) with check (user_id = auth.uid());
alter policy "members add shared rows" on public.household_rows with check (public.is_member(household_id) and updated_by = auth.uid());
alter policy "members change shared rows" on public.household_rows using (public.is_member(household_id)) with check (public.is_member(household_id) and updated_by = auth.uid());
drop index public.household_invites_by_household; drop index public.home_events_by_cook;
```

### 12. `20261120001100_apple_tokens` (S2-4)

**Does:** a `private.apple_tokens` table (not served over the API) and two functions only the service role can run: `apple_token_save(uuid, text)` and `apple_token_take(uuid)`.
**Verify:**

```sql
select to_regclass('private.apple_tokens') is not null as table_made,  -- true
       has_function_privilege('authenticated','public.apple_token_take(uuid)','execute') as users_can_read,  -- false
       has_function_privilege('anon','public.apple_token_save(uuid,text)','execute') as anon_can_write,      -- false
       has_function_privilege('service_role','public.apple_token_take(uuid)','execute') as service_can_read; -- true
```

**Rollback:** `drop function public.apple_token_save(uuid, text); drop function public.apple_token_take(uuid); drop table private.apple_tokens; drop schema private;`

### 13. `20261120009900_realtime_private_broadcast` (K-32, SEC-06, DATA-3): APPLY LAST, ONLY AFTER A NEW BUILD'S LIVE UPDATES HAVE BEEN SEEN WORKING ON A PHONE

**Does:** household and account rows leave Postgres Changes (which leaks deleted rows' keys to any subscriber) and go out instead on private Broadcast topics (`household:<id>`, `account:<user id>`) that only members, or the account's owner, may join.
**Why it waits:** build 25 (the only installed build) listens through Postgres Changes only, so after this it gets no live rows. The branch's client tries the private channel first and falls back to Postgres Changes when refused (`src/lib/liveRows.ts`), but the private path has never been seen working on a device (DATA-3). So: install a new build from this branch, put two phones in one household, see a tick on one phone appear on the other, then apply this step, then repeat the tick test.
**Pre-check:** `select tablename from pg_publication_tables where pubname = 'supabase_realtime';` → `account_rows`, `household_rows` (household_members left in step 1).
**Verify:** the same query returns no rows; `select count(*) from pg_policies where schemaname = 'realtime' and policyname = 'members hear their household, owners their account';` → 1; `select count(*) from pg_trigger where tgname in ('household_rows_broadcast','account_rows_broadcast');` → 2. Then the two-phone tick test again.
**Then (owner, dashboard):** Project Settings › Realtime › turn off "Allow public access", so only private channels can be joined. After that, the Postgres Changes fallback no longer works, which is intended.
**Nothing else depends on it:** the app's only Realtime code is `src/lib/liveRows.ts` (household and account rows); no database function reads the publication; the feed doesn't use Realtime; the seed kitchen is retired. After this step the `supabase_realtime` publication is empty.
**Rollback:**

```sql
alter publication supabase_realtime add table public.household_rows, public.account_rows;
drop trigger household_rows_broadcast on public.household_rows; drop trigger account_rows_broadcast on public.account_rows;
drop function public.rows_broadcast();
drop policy "members hear their household, owners their account" on realtime.messages;
drop function public.may_hear(text);
```

And turn "Allow public access" back on if it was turned off.

## At the end

1. Baseline check again: the first eight still 0; cooks, recipes and follows unchanged.
2. Feed still works: `select has_table_privilege('anon','public.cooks','select'), has_table_privilege('anon','public.published_recipes','select'), has_table_privilege('anon','public.follows','select');` → all true; the curl above returns one row; the For You rail loads on a phone.
3. `get_advisors` security and performance. Expected gone: `rls_disabled_in_public`-style errors for `seed.*` and `backup.*`, `auth_rls_initplan` on the household policies, `unindexed_foreign_keys` for the two keys. Expected to stay until the owner acts: `auth_allow_anonymous_sign_ins` (by design), anything about pg_net or the leaked-password setting.
4. Commit the renames if you used Route B. Record the apply in `docs/KNOWN-ISSUES.md` (K-18, K-32, K-36) and `docs/DECISIONS.md`.
5. Tell Lachlan: build 25 must not use Household now (S2-10); test Household on a new build.

## Edge functions for Apple sign-in revocation (S2-4), owner

After step 12. The client half (sending the Apple authorization code, calling `delete-account`) isn't written yet; until it is, deploying these does no harm and changes nothing for the app.

1. Apple Developer › Certificates, Identifiers & Profiles › Keys › **+**. Tick "Sign in with Apple", configure it for the App ID `com.lachlanoldfield.thepantry`, save, and **download the .p8 once** (Apple won't show it again). Note the Key ID and your 10-character Team ID (top right of the developer site).
2. Supabase Dashboard › Edge Functions › Secrets, add four:
   - `APPLE_TEAM_ID`: the Team ID
   - `APPLE_KEY_ID`: the Key ID
   - `APPLE_PRIVATE_KEY`: the whole contents of the .p8 file, including the BEGIN and END lines
   - `APPLE_CLIENT_ID`: `com.lachlanoldfield.thepantry`
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` are provided automatically.)
3. From the repo: `supabase functions deploy apple-token delete-account --project-ref eozyhllkvajvrecojdxu`.
4. Check: `supabase functions list` shows both. A call without a sign-in, `curl -i -X POST https://eozyhllkvajvrecojdxu.supabase.co/functions/v1/delete-account -H "apikey: <publishable key>"`, answers 401.
5. Keep the .p8 in the password manager, never in the repo.
