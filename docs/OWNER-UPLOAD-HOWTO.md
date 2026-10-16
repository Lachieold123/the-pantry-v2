# Upload the feed fixes yourself (17 Oct 2026)

This pushes the cleaned recipe content (506 rows) and the 127 new recipes to the live feed.
It only updates and inserts; it never deletes. Running it twice is safe: anything already done is skipped.

## 1. Copy the key
Supabase dashboard > project **the-pantry** > Project Settings > API Keys > `service_role` > Reveal > Copy.
Don't paste it anywhere except the Terminal prompt in step 3.

## 2. Run the command
Open Terminal, paste this, press Enter:

    cd ~/Developer/the-pantry-v2-main && npx tsx scripts/owner-upload-feed.mts

## 3. Paste the key
At `Paste the service_role key, then press Enter (it will not show):` paste the key (nothing appears on screen, that's normal) and press Enter.

## What success looks like
- Backup check lines, then `Published before: ...`
- Progress lines like `updates: 50/506 checked (...)`, then `inserts: N inserted, M already in the feed`
- A result block: published after should be about before + 127 (less any already inserted), and `Errors: 0`, ending in `All done. Nothing was deleted.`

If it shows errors, it lists each row and carries on past them. Send Claude the result block (never the key). It's safe to run again.

Check only, no connection: add `--dry-run` to the end of the command.

## Afterwards (optional, extra safe)
Rotate the key: same API Keys page > `service_role` > roll/regenerate. Nothing on this Mac stores it, so nothing else needs changing.
