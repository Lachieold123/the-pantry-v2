| migration | lines | first comment |
|---|---|---|
| migrations/20261006000000_households.sql | 160 | Households (D-039): a few people who share one kitchen — the week's plan, |
| migrations/20261006000100_household_rows_newest_wins.sql | 17 | A write that arrives late (a phone that was offline) must not overwrite a |
| migrations/20261006000200_accounts.sql | 93 | Accounts (D-043, docs/ACCOUNTS.md): Sign in with Apple or a 6-digit email |
| migrations/20261007011855_cooks_and_seed_kitchen.sql | 223 | Pulled from the remote project (supabase_migrations.schema_migrations) on |
| migrations/20261007014646_seed_kitchen_scheduler.sql | 38 | Pulled from the remote project (supabase_migrations.schema_migrations) on |
| migrations/20261008000000_household_lockdown.sql | 85 | Household lockdown (audit 8 October 2026, SEC-01, SEC-06, SEC-20, SEC-21). |
| migrations/20261008000100_rows_server_rules.sql | 135 | Row rules the server enforces (audit 8 October 2026, SEC-04, SEC-05, SEC-07, BUG-17, BUG-28). |
| migrations/20261008000200_invites.sql | 167 | Invite codes and members (audit 8 October 2026, SEC-08, SEC-15, SEC-16, D-045). |
| migrations/20261008000300_account_cleanup.sql | 69 | Deleting an account leaves nothing of you behind (audit 8 October 2026, SEC-13, SEC-14). |
| migrations/20261009000000_rows_received_at.sql | 79 | Pull only what changed (K-36). |
| migrations/20261009000100_realtime_private_broadcast.sql | 81 | Live rows over private Broadcast channels (K-32, SEC-06). |
| migrations/20261012000000_home_events.sql | 55 | Home engine, step 1: the interaction log (docs/HOME-ENGINE.md §6). |
| migrations/20261012000100_home_ranking.sql | 89 | Home engine, step 2: server-side signals and a first-stage ranker |
| migrations/20261017000000_seed_kitchen_retired.sql | 21 | The seed kitchen is retired (17 Oct 2026, Lachlan's Telegram msg 1498: no |
| migrations/_pending/20261021000000_seed_kitchen_off.sql | 24 | PENDING, NOT APPLIED. Lives in _pending/ so `supabase db push` never picks it up. |
