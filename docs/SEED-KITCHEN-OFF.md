# Seed kitchen: the last step to off (prepared, NOT applied)

Nothing in this document has been run or deployed. Applying any of it is the owner's call.

## 1. Current state (from the repo, 21 Oct 2026)

- Retired 17 Oct 2026 (D-053; `supabase/migrations/20261017000000_seed_kitchen_retired.sql`). Nothing it made was deleted.
- `seed.config`: `paused = true`, `publishing = false`, spend caps `0`.
- `seed.start()` and `seed.tick()` raise "seed kitchen is retired"; execute is revoked from public, anon and authenticated.
- The cron job was reported unscheduled, but no migration in git does it (the retire migration does not call `seed.stop()`), so the pending SQL below unschedules it if it is still there.
- Edge function `seed-kitchen` is a stub that calls nothing and answers HTTP 410 (`supabase/functions/seed-kitchen/index.ts`). The old v8 source is kept in `supabase/functions/seed-kitchen-v8-retired/`. The stub already works as the guard (no key, no API call, no flag to flip), so I added nothing to it.
- Schema `seed` already has usage revoked from public, anon and authenticated (`20261007011855`, line 141). Its tables are `seed.config`, `seed.personas`, `seed.dishes`, `seed.usage`, `seed.runs`.
- Nothing in `src/` refers to `seed-kitchen` or `seed.*`.

## 2. The pending SQL

`supabase/migrations/_pending/20261021000000_seed_kitchen_off.sql` (in `_pending/`, so no tool applies it):

1. Unschedules the `seed-kitchen` cron job if one exists (no error if it does not).
2. Enables row level security, with no policies, on the five `seed.*` tables.

It deletes no rows, tables or functions. To apply: move the file up into `supabase/migrations/`, then run it through your normal migration route (a Supabase production change: ask first).

Check first, read-only: `select jobname, schedule, active from cron.job;` (expect no `seed-kitchen` row, or `active = false`).

## 3. Deleting the edge function (optional, last)

```
supabase functions delete seed-kitchen --project-ref eozyhllkvajvrecojdxu
```

What depends on it: only the `seed.tick()` pipeline, which already refuses to run, and the cron job (step 2). The app never calls it. The stub source stays in git as a record. A later `supabase functions deploy` of all functions would recreate the stub, which is harmless. The vault secret `seed_cron_secret` and the `pg_cron` / `pg_net` extensions are left alone; remove the secret by hand if you want it gone.

## 4. Rollback

- RLS: `alter table seed.<table> disable row level security;` for each of the five tables.
- Cron: `select cron.schedule('seed-kitchen', '* * * * *', 'select seed.tick()');`. It would still do nothing, because `seed.tick()` raises and the config is paused.
- Edge function: redeploy the stub with `supabase functions deploy seed-kitchen --project-ref eozyhllkvajvrecojdxu`. Truly restarting the old kitchen would also need `seed.start()` and `seed.tick()` restored from `20261007014646_seed_kitchen_scheduler.sql`, the config un-paused and the v8 source deployed from `seed-kitchen-v8-retired/`. That spends Anthropic API money and is not recommended.
