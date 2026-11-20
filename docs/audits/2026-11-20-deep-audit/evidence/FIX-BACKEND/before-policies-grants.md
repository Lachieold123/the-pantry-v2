# Live policies, grants, publication and triggers before the apply (20 Nov 2026)

Project `eozyhllkvajvrecojdxu`, single read-only SELECTs over `pg_policies`, `information_schema.role_table_grants`, `information_schema.column_privileges`, `pg_publication_tables`, `information_schema.triggers`, `pg_class`, `pg_namespace`, `pg_extension`, `pg_indexes`, `pg_constraint`.

## Migration history (`list_migrations`)

`20261006000618 households`, `20261006000720 household_rows_newest_wins`, `20261007011855 cooks_and_seed_kitchen`, `20261007014646 seed_kitchen_scheduler`, `20261012094607 home_events`, `20261012094611 home_ranking`, `20261016204729 seed_kitchen_retired`. `accounts` is applied (its tables exist) but not recorded.

## Row counts

households 0, household_members 0, household_invites 0, household_rows 0, account_rows 0, profiles 0, home_events 0, auth.users 99 (0 anonymous), cooks 100, published_recipes 731, follows 2066. `net._http_response` 360. `cron.job` 0. Vault secret: `seed_cron_secret`.

## Publication `supabase_realtime`

`public.account_rows`, `public.household_members`, `public.household_rows`.

## Triggers (public)

| Table | Trigger | When |
| --- | --- | --- |
| account_rows | account_rows_keep_newest | BEFORE UPDATE |
| household_rows | household_rows_keep_newest | BEFORE UPDATE |
| follows | follows_count | AFTER INSERT/DELETE |
| published_recipes | published_recipes_count | AFTER INSERT/UPDATE/DELETE |

## Row level security

On: every `public` table. Off: `seed.config, seed.personas, seed.dishes, seed.usage, seed.runs`, `backup.published_recipes_20261017, backup.ingredient_extras_20261017, backup.cooks_20261017`. No `private` schema. `realtime.messages`: 0 policies.

## Policies

| Table | Policy | Cmd | Roles | Using | Check |
| --- | --- | --- | --- | --- | --- |
| account_rows | owners add their rows | INSERT | authenticated | | `user_id = (select auth.uid())` |
| account_rows | owners change their rows | UPDATE | authenticated | `user_id = (select auth.uid())` | `user_id = (select auth.uid())` |
| account_rows | owners read their rows | SELECT | authenticated | `user_id = (select auth.uid())` | |
| cooks | anyone reads cooks | SELECT | anon, authenticated | `true` | |
| follows | anyone reads follows | SELECT | anon, authenticated | `true` | |
| home_events | cooks add their own events | INSERT | authenticated | | `viewer_id = (select auth.uid()) and at <= now() + 5 min and at > now() - 30 days` |
| home_events | cooks read their own events | SELECT | authenticated | `viewer_id = (select auth.uid())` | |
| household_members | members rename themselves | UPDATE | authenticated | `user_id = auth.uid()` | `user_id = auth.uid()` |
| household_members | members see each other | SELECT | authenticated | `is_member(household_id)` | |
| household_rows | members add shared rows | INSERT | authenticated | | `is_member(household_id) AND updated_by = auth.uid()` |
| household_rows | members change shared rows | UPDATE | authenticated | `is_member(household_id)` | `is_member(household_id) AND updated_by = auth.uid()` |
| household_rows | members read shared rows | SELECT | authenticated | `is_member(household_id)` | |
| households | members read their household | SELECT | authenticated | `is_member(id)` | |
| households | members rename their household | UPDATE | authenticated | `is_member(id)` | `is_member(id)` |
| ingredient_extras | anyone reads confirmed ingredient extras | SELECT | anon, authenticated | `status in ('verified','approved')` | |
| profiles | owners add / change / read their profile | INSERT / UPDATE / SELECT | authenticated | `user_id = (select auth.uid())` | same |
| published_recipes | anyone reads published recipes | SELECT | anon, authenticated | `status = 'published'` | |

## Table grants

`anon` AND `authenticated` hold **DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE** on every one of: account_rows, cooks, follows, household_invites, household_members, household_rows, households, ingredient_extras, profiles, published_recipes. `home_events`: `authenticated` holds all seven; `anon` none. Column UPDATE for `authenticated`: every column of `households` and `household_members` (including `household_members.household_id`).

## pg_net and schemas

- `pg_net` 0.20.4, owner `supabase_admin`, schema `extensions`. `net` schema ACL: `supabase_admin=UC, PUBLIC=U, supabase_functions_admin=U, postgres=U, anon=U, authenticated=U, service_role=U` (all granted by supabase_admin). `net.http_*` functions: default ACL (PUBLIC execute). `net._http_response`, `net.http_request_queue`: PUBLIC all. The only function that mentions `net.http` outside `net` is `extensions.grant_pg_net_access` (Supabase's re-grant hook). `postgres` is not a member of `supabase_admin`, so a migration can't revoke these.
- `backup`, `seed`: `postgres=UC` only.

## Indexes and foreign keys checked for S2-17

`household_invites`: only the primary key (code); FK `household_id → households ON DELETE CASCADE` unindexed. `home_events`: by_viewer, by_recipe, engaged, pkey; FK `cook_id → cooks ON DELETE CASCADE` unindexed.
