# Live project `eozyhllkvajvrecojdxu`, read-only, 20 Nov 2026 (lane 3)

`list_migrations`: 20261006000618 households, 20261006000720 household_rows_newest_wins,
20261007011855 cooks_and_seed_kitchen, 20261007014646 seed_kitchen_scheduler,
20261012094607 home_events, 20261012094611 home_ranking, 20261016204729 seed_kitchen_retired.
(The repo's `20261006000200_accounts` is not listed by name, but its objects exist: applied under another version or by hand.)

One SELECT over information_schema / pg_publication_tables:

- Tables (public): account_rows, cooks, follows, home_events, household_invites, household_members,
  household_rows, households, ingredient_extras, profiles, published_recipes.
  **Missing:** household_join_attempts (20261008000200).
- Functions (public): account_rows_keep_newest, cooks_count_follows, cooks_count_recipes, create_household,
  create_invite, delete_account, home_*, household_rows_keep_newest, is_member, join_household, leave_household.
  **Missing:** preview_invite, revoke_invites, remove_member, too_many_join_attempts, household_members_guard,
  households_guard, rows_within_quota, delete_stale_anonymous_users, rows_stamp_received,
  household_rows_since, account_rows_since, may_hear, rows_broadcast.
- Columns: household_rows / account_rows have `updated_by`; **no `received_at`**.
- Realtime publication supabase_realtime: account_rows, household_members, household_rows
  (so cloud/09's private broadcast is not live, and the member list is still published: SEC-06).
