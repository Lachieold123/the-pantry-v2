# The seed kitchen (D-044)

The house cooks who fill the feed before real people do. They're labelled, they cost a capped amount each month, and they never touch real users.

## The pieces

| Piece | Where | What it does |
| --- | --- | --- |
| Public tables | `supabase/migrations/20261007010000_cooks_and_seed_kitchen.sql` | `cooks`, `published_recipes`, `follows` and `ingredient_extras`, each with counts kept by the database. Anyone can read them. Only the service role writes, until P9 adds write policies for real people. |
| Private schema `seed` | same migration | `personas` (the briefs), `dishes` (the pipeline), `usage` (every paid call), `runs` (a 14-day log), `config` (settings), and the `seed.status` view. It isn't exposed through the API. |
| Clock | `supabase/migrations/20261007010100_seed_kitchen_scheduler.sql` | `seed.tick()` calls the function once. `seed.start()` and `seed.stop()` switch the every-minute pg_cron schedule on and off. |
| Edge function `seed-kitchen` | `supabase/functions/seed-kitchen/` | One tick does a bounded amount of each stage, then stops inside 110 seconds. |
| App rules, bundled | `_domain.js` and `_ingredients.js`, made by `npm run seed:bundle` | The same parser, validator and diet rules the app uses (one source of truth). Re-run the bundle and redeploy whenever `src/domain` or the ingredient database changes. |
| Personas | `scripts/seed/personas.json` | 99 house cooks plus `@thepantry`. |

## A dish's journey

```
planned ──write──► written ──check──► checked ──photo──► photographed ──publish──► published
   ▲                                │
   └──── sent back with feedback ───┘  (3 attempts, then failed)
```

1. **Menus.** Each cook's menu is planned a few dishes at a time, from their brief. Titles are unique across all cooks.
2. **Write.** Claude writes the recipe in the cook's voice, in Australian metric, using the ingredient database's names or declaring new ones.
3. **Check.** The app's parser, `validateRecipe` and `deriveDiets` run first, plus house rules: no °F or imperial units, sane counts, ovens at 300°C or below. Then an independent tester pass checks safety, quantities, missing ingredients and timings. Anything that fails goes back to Write with the reasons.
4. **Photo.** Up to 8 unused Pexels photos are shown to a vision check that answers "this one" or "none". The chosen photo is copied to `recipe-photos/house/<id>.jpg` with its credit. No photo is better than a wrong one.
5. **Publish.** Only while `publishing` is on. The first batch is released over `backlog_spread_days` (default 14) at real times, in each cook's daytime. After that, each cook keeps their `posts_per_week`.
6. **Follows.** Each house cook follows 6–35 others, weighted by shared cuisine and region, plus `@thepantry`. After that, a few new follows a day across the kitchen. Never real users.
7. **Ingredients.** New names are verified by a second check that never sees the first answer. A match makes them `verified`; a disagreement makes them `needs-review`, for Lachlan. Recipes claim diets only once every new ingredient they use is verified.

## Controls (SQL, as the project owner)

```sql
select * from seed.status;                                         -- stages, published count, spend
select at, summary from seed.runs order by id desc limit 5;        -- what the last ticks did
update seed.config set value = 'true'  where key = 'paused';       -- stop everything
update seed.config set value = 'true'  where key = 'publishing';   -- let recipes go public
update seed.config set value = '[]'    where key = 'only_cooks';   -- end the pilot: all cooks
update seed.config set value = '30'    where key = 'monthly_cap_usd';
select seed.stop();                                                -- remove the schedule
select id, name, groups, review_note from public.ingredient_extras where status = 'needs-review';
```

Settings in `seed.config`:
- `models`: the writer and checker models.
- `prices`: US$ per million tokens; used only for the cap.
- `per_tick`: how much each stage does in one tick.
- `pexels_per_hour`: the free tier allows 200.
- `backlog_spread_days`

## Keys

`ANTHROPIC_API_KEY` and `PEXELS_API_KEY` are edge-function secrets. Supabase → Edge Functions → Secrets. The vault is a fallback.

## Photos (7 October)

The first stock-photo matches were checked against Pexels' own descriptions, and about 1 in 3 showed the wrong dish (harira shown as dal, koeksisters as churros). Three changes followed:

- **Stricter matching.** The photo check now looks at Pexels' 350 px previews, not thumbnails. It also has to confirm that the photographer's description doesn't name a different dish. Only a photo that is plainly this dish is kept.
- **Re-check.** Every photo matched under the old rules was looked at again. Wrong ones were taken off, including on published recipes. After this, about 30% of finished recipes kept a stock photo.
- **AI photos where nothing fits** (Lachlan's call). These are made with Higgsfield (`gpt_image_2_5`, medium quality, 0.5 credits each). The URL is written to `photo.ai_url`, then `aiphotos.ts` copies the image into `recipe-photos/house/<id>-ai.png` and labels it "AI-generated photo" (D-029). A recipe can be published before its photo exists; the photo is added when it arrives.
  - The edge function can't call Higgsfield, so the images come from a Claude scheduled task, `pantry-ai-recipe-photos`. It runs daily at 7:51am Sydney time, makes at most 60 images a run, and has no notifications.
  - On 7 October, 344 AI photos were made, about 170 credits.

Photo states in `seed.dishes.photo`:
- `{id, path, credit, rechecked}`: a stock photo.
- `{none, want_ai}`: waiting for an AI photo.
- `{…, ai_url}`: the AI photo is made and about to be copied.
- `{ai, path, credit}`: the AI photo is stored.
- `rejected.id`: a stock photo judged wrong. It is never offered again.

## What it costs

Everything runs on Haiku 4.5. A finished recipe costs about 1.7 US cents: writing it, the tester pass, any ingredient check, and the photo check. Retries are included. The photo check sends Pexels' 280 × 200 thumbnails, about a tenth of the tokens the larger previews cost.

- **The pilot** (5 cooks, 55 recipes) cost about US$2.30, including the early runs while it was being tuned.
- **Budget:** at launch the account had US$15 of credit, so both caps are set to US$14. That gives roughly 650 more recipes, spread round-robin so all 100 cooks fill evenly: about 6 or 7 each.
- **The full backlog** (2,545 recipes across all cooks) needs about US$43 more.
- **After the backlog**, the cooks' rhythm (105 posts a week across the kitchen) costs about US$8 a month.
- **Running out of credit** marks nothing as failed. The function notices the API's credit error, stops paid work for 30 minutes, and tries again. Top up the account and it carries on by itself. Raise `monthly_cap_usd` and `first_run_cap_usd` to match.

### Cheaper by design

- When the writer uses an ingredient the database doesn't know ("spam", "banana leaves"), it isn't asked to rewrite the recipe. The checker declares the ingredient, and one cheap check gives it its groups. These rows are marked `auto: groups from one check`. A rewrite costs about ten times as much.
- An alias pointing at an id the database doesn't have is treated the same way: as a new ingredient.
- Menus are planned a few dishes at a time, only just ahead of the writing.
- Writing is paced to the photos (`per_tick.write` 2, `photo` 6). Pexels' free tier, about 190 searches an hour, is the bottleneck, so when the cap is reached no money has gone on written recipes still waiting for a photo.

## Not done yet (P9)

- The app's screens: feed, profile, the Pantry Kitchen badge and its explainer, and the photo credit on recipes.
- Merging `verified` and `approved` ingredient extras into the app's index, and showing their swap tips ("Can't find dalo? …").
- Reading `published_recipes` into the recipe page. The `recipe` column already holds the app's `Recipe` shape.
- The exit plan: when house cooks stop posting, and what happens to their recipes.
