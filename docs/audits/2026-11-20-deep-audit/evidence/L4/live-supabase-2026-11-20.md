# Lane 4 evidence: live Supabase, read-only, 20 Nov 2026

Project `eozyhllkvajvrecojdxu` (ap-southeast-2, Postgres 17.11, ACTIVE_HEALTHY). Every query below was a single SELECT. Results trimmed. No key, token, password or email values were read or printed.

## E1. Applied migrations (`list_migrations`, and `supabase_migrations.schema_migrations`)

| live version | name | repo file |
| --- | --- | --- |
| 20261006000618 | households | 20261006000000_households.sql (version differs) |
| 20261006000720 | household_rows_newest_wins | 20261006000100_… (version differs) |
| 20261007011855 | cooks_and_seed_kitchen | same |
| 20261007014646 | seed_kitchen_scheduler | same |
| 20261012094607 | home_events | 20261012000000_… (version differs) |
| 20261012094611 | home_ranking | 20261012000100_… (version differs) |
| 20261016204729 | seed_kitchen_retired | 20261017000000_… (version differs) |

Not in history: `20261006000200_accounts` (but its tables, policies and v1 `delete_account` exist live, so it was run without being recorded), `20261008000000`..`0300`, `20261009000000`, `20261009000100`, `_pending/20261021000000_seed_kitchen_off`. All migrations recorded `created_by` = the owner's dashboard login.

## E2. Proof the 8 Oct and cloud/09 migrations are not applied

- Triggers on public tables (pg_trigger): only `account_rows_keep_newest` (BEFORE UPDATE), `household_rows_keep_newest` (BEFORE UPDATE), `follows_count`, `published_recipes_count`. No `household_members_guard`, `households_guard`, `*_quota`, `*_stamp_received`, `*_broadcast`.
- Check constraints (pg_constraint): no `household_rows_shape` / `account_rows_shape`.
- Functions (pg_proc, public): no `preview_invite`, `revoke_invites`, `remove_member`, `too_many_join_attempts`, `delete_stale_anonymous_users`, `household_rows_since`, `account_rows_since`, `may_hear`, `rows_broadcast`. `delete_account` body has no `nobody` clean-up (v1, 285 chars). `create_invite` is the `random()` version.
- `pg_publication_tables` for `supabase_realtime`: `public.account_rows`, `public.household_members`, `public.household_rows`.
- `pg_policies` on `realtime.messages`: none. On `storage.objects`: none.

## E3. Policies (pg_policies, public)

account_rows: insert/update/select `user_id = (select auth.uid())` (no is_anonymous check). household_members: UPDATE "members rename themselves" `using (user_id = auth.uid()) with check (user_id = auth.uid())`; SELECT `is_member(household_id)`. household_rows: insert/update/select `is_member(household_id)`, writes also `updated_by = auth.uid()`. households: select/update `is_member(id)`. home_events: insert own (time window), select own. cooks, follows: select `true` for anon+authenticated. published_recipes: select `status='published'`. ingredient_extras: select status in (verified, approved). profiles: owner only. household_invites: RLS on, no policies.

## E4. Table grants (information_schema.role_table_grants, public)

Every public table grants anon AND authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE (household_members included, so UPDATE covers every column). Exception: home_events, which anon has nothing on.

## E5. Schema usage

`has_schema_privilege` USAGE: seed = false, backup = false, cron = false, vault = false for anon and authenticated. public, storage, graphql_public, net = true. pg_graphql is not installed.
net: anon and authenticated can SELECT `net._http_response` (360 rows, newest 2026-10-12) and EXECUTE `net.http_get/http_post/...`.

## E6. Functions (public, seed)

All SECURITY DEFINER functions have `search_path=""`. Executable by authenticated: create_household, create_invite, delete_account, home_also_engaged, home_candidates, home_popularity, is_member, join_household, leave_household. Executable by anon: only `household_rows_keep_newest()` (a trigger function, cannot be called over RPC). seed.start/stop/tick: nobody. Owner of delete_account = postgres, which has DELETE on auth.users (SEC-22 answered).

## E7. auth.users (counts only)

total 99; app_metadata.seed=true 99; is_anonymous 0; with email 99 (all on `seed.thepantry.invalid`); email confirmed 99; with a password hash 99 (99 distinct hashes); banned 0; ever signed in 0; all created 2026-10-07. auth.sessions 0, refresh_tokens 0. So build 25 has never created a user: no household, no account exists live.

## E8. Content

cooks: 99 kind=person (48 ai-portrait, 21 ai-logo, 30 food-photo avatars) + 1 official; 4 bios mention AI/fictional. published_recipes: 719 published (all `review = 'auto-checked'`, 418 with `photo_source = 'ai'`), 12 not published. follows 2,066. ingredient_extras 225 visible. households, members, invites, rows, profiles, account_rows, home_events: 0 rows.

## E9. Seed kitchen, cron, vault, storage

seed.config: paused=true, publishing=false, monthly_cap_usd=0, first_run_cap_usd=0. cron.job: 0 rows (seed-kitchen already unscheduled). pg_cron 1.6.4 and pg_net 0.20.4 installed. vault.secrets: 1 secret named `seed_cron_secret` (value not read). Buckets: `recipe-photos` public, 5 MB, jpeg/png/webp, 880 objects; `avatars` public, 8 MB, 99 objects. Total objects 940 MB. Database 30 MB.

## E10. Edge Functions

Deployed: only `seed-kitchen` v9, verify_jwt true, body is a 410 "retired" stub with no env reads. `apple-token` and `delete-account` are not deployed. No deployed code reads `ANTHROPIC_API_KEY` (secret names cannot be listed with these tools).

## E11. Advisors

Security: rls_enabled_no_policy (household_invites, intended); 9 x authenticated SECURITY DEFINER executable (intended RPCs); `auth_allow_anonymous_sign_ins` on 7 tables (so anonymous sign-ins are ON); leaked password protection off. list_tables advisory: RLS disabled on seed.config/personas/dishes/usage/runs and backup.published_recipes_20261017 / ingredient_extras_20261017 / cooks_20261017.
Performance: auth_rls_initplan on household_members "members rename themselves" and household_rows add/change; unindexed FKs home_events.cook_id, household_invites.household_id, seed.dishes x2; backup tables have no primary key.

## Queries (abbreviated)

```sql
select rolname, rolconfig from pg_roles where rolname in ('authenticator','anon','authenticated','service_role');
select n.nspname, r.rolname, has_schema_privilege(r.rolname, n.nspname, 'USAGE') from pg_namespace n cross join (values ('anon'),('authenticated')) r(rolname) where n.nspname in (...);
select schemaname||'.'||tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname in ('public','storage','realtime');
select table_name, grantee, string_agg(privilege_type, ',') from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') group by 1,2;
select id, public, file_size_limit, allowed_mime_types, (select count(*) from storage.objects o where o.bucket_id=b.id) from storage.buckets b;
select count(*), count(*) filter (where raw_app_meta_data->>'seed'='true'), count(*) filter (where is_anonymous), ... from auth.users;
select pubname, schemaname||'.'||tablename from pg_publication_tables;
select ..., p.prosecdef, p.proconfig, has_function_privilege('anon', p.oid, 'EXECUTE'), has_function_privilege('authenticated', p.oid, 'EXECUTE') from pg_proc p ... where nspname in ('public','seed','backup');
select c.relname, t.tgname, pg_get_triggerdef(t.oid) from pg_trigger t ... where nspname='public' and not tgisinternal;
select c.relname, k.conname, k.contype, left(pg_get_constraintdef(k.oid),120) from pg_constraint k ... where contype in ('c','u');
select version, name, created_by, array_length(statements,1), position('account_rows' in ...) from supabase_migrations.schema_migrations;
select proname, md5(prosrc), length(prosrc), position('nobody' in prosrc)>0 from pg_proc where proname in (...);
select conrelid::regclass, conname, confrelid::regclass, confdeltype from pg_constraint where contype='f' and connamespace='public'::regnamespace;
select (select count(*) from cron.job), (select string_agg(name, ',') from vault.secrets), ... ;
select split_part(email,'@',2), count(*), count(*) filter (where email_confirmed_at is not null), ... from auth.users group by 1;
select kind, avatar_kind, count(*), ... from public.cooks group by 1,2;
select pg_size_pretty(pg_database_size(current_database())), (select pg_size_pretty(sum((metadata->>'size')::bigint)) from storage.objects);
select extname, nspname, extversion from pg_extension ...;
select proname, pg_get_userbyid(proowner), has_table_privilege(pg_get_userbyid(proowner), 'auth.users', 'DELETE') from pg_proc where proname in ('delete_account','leave_household');
```
