# Feed verify (17 Oct 2026 upload)

The upload (565 updates, 127 inserts to `public.published_recipes`) was never checked byte for byte. This is the offline check, plus the read-only way to compare it with the live table. Nothing here writes anywhere.

## 1. Check the payloads and SQL chunks (no network)

```
npm run feed:verify
```

It reads `docs/backups/feed-payloads-2026-10-17/` and checks:

- 565 full updates, 506 compact updates (59 rows had no field changes, so no chunk), 127 inserts.
- Every compact update is in exactly one of the applied chunks (`u01`-`u03` plus `s01`-`s28`) and exactly one of `u01`-`u17`; every insert slug is in exactly one `i*` chunk; each chunk row equals its payload row; no chunk row is unknown.
- No blank `Food safety:` note anywhere (payloads or chunks).
- No vegetarian or vegan row with parmesan, pecorino or gelatin in its ingredient lines (honey too for vegan).
- Prints an md5 of `recipe->steps` per row (canonical JSON: sorted keys, compact), so key order and spacing in Postgres cannot cause a false mismatch.

Exit code is 1 if anything fails.

## 2. Compare with the live rows (read-only)

Print the export queries (they list the exact ids and slugs, in pages of 150 ids):

```
npm run feed:verify -- --sql
```

Each page is a plain `SELECT`, shaped like:

```sql
select id, slug, recipe->'steps' as steps
from public.published_recipes
where id in ('<uuid>', ...) or slug in ('<insert slug>', ...)
order by id;
```

Run it against project `eozyhllkvajvrecojdxu` only, with the SQL editor (Supabase dashboard) or a Supabase MCP `execute_sql` session. It has to stay a SELECT: do not add `update`, `insert` or `delete`.

Save each page's result as JSON (the editor's "Download as JSON" or the MCP result array; NDJSON also works), then:

```
npm run feed:verify -- page1.json page2.json page3.json page4.json
```

The report says how many rows match, and lists:

- **MISSING**: in the payload, not live (an update id or insert slug that never landed).
- **MISMATCHED**: live steps differ from the payload (the update did not apply, or was changed since).
- **EXTRA**: a live row in the export that is not in the payload (only possible if the query was edited).

Updates match on `id`; inserts match on `slug` (their ids are generated on insert). Rows with `recipe` as a full object are fine too; the script takes `recipe.steps`.

## Notes

- Steps only: notes and diets are covered by the payload checks above, not by the live diff.
- Expected steps for an update row are the compact row's `steps` when it has them, otherwise the full row's `recipe.steps`.
