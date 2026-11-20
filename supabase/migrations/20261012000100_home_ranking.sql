-- Home engine, step 2: server-side signals and a first-stage ranker
-- (docs/HOME-ENGINE.md §7). NOT APPLIED to the live project: Lachlan applies
-- it after review, after 20261012000000_home_events.sql.
--
-- The phone already ranks with the same rules (src/domain/home-engine), but it
-- only knows its own events. These functions add what needs everyone's:
-- - home_popularity: decayed engagement per recipe (saves, cooks, likes, opens);
-- - home_also_engaged: "cooks who saved this also saved", with at least 3
--   cooks behind every pair so no one person's taste can be read off it;
-- - home_candidates: stage 1 on the server (followed cooks, popular, fresh)
--   with a simple score, for the Edge Function or the app to re-rank.
-- All return totals only. They're security definer because the events table
-- only lets each cook read their own rows.

create function public.home_popularity(half_life_hours numeric default 96)
returns table (recipe_id uuid, score numeric)
language sql stable security definer set search_path = ''
as $$
  select e.recipe_id,
         sum(case e.type when 'open' then 0.2 when 'like' then 1 when 'save' then 2 when 'cook' then 3 else 0 end
             * power(0.5, extract(epoch from (now() - e.at)) / 3600 / greatest(half_life_hours, 1)))::numeric as score
  from public.home_events e
  join public.published_recipes p on p.id = e.recipe_id and p.status = 'published'
  where e.type in ('open', 'like', 'save', 'cook') and e.at > now() - interval '60 days'
  group by e.recipe_id;
$$;

create function public.home_also_engaged(liked uuid[], max_rows integer default 60)
returns table (recipe_id uuid, via uuid, together integer)
language sql stable security definer set search_path = ''
as $$
  with mine as (select unnest(liked[1:30]) as id),
       pairs as (
         select a.recipe_id as via, b.recipe_id, count(distinct a.viewer_id) as together
         from public.home_events a
         join public.home_events b on b.viewer_id = a.viewer_id and b.recipe_id <> a.recipe_id
         where a.recipe_id in (select id from mine)
           and a.type in ('save', 'cook', 'like') and b.type in ('save', 'cook', 'like')
           and a.viewer_id <> (select auth.uid())
         group by a.recipe_id, b.recipe_id
       )
  select p.recipe_id, p.via, p.together::integer
  from pairs p
  join public.published_recipes r on r.id = p.recipe_id and r.status = 'published'
  where p.together >= 3 and p.recipe_id not in (select id from mine)
  order by p.together desc
  limit least(greatest(max_rows, 1), 200);
$$;

-- Stage 1 for the signed-in cook: their followed cooks' recipes, popular ones
-- and fresh ones, scored with the engine's default weights (config.ts) for
-- follow, popularity, freshness. Hidden recipes and their own posts are left out.
create function public.home_candidates(max_rows integer default 200)
returns table (recipe_id uuid, cook_id uuid, followed boolean, popularity numeric, freshness numeric, score numeric)
language sql stable security definer set search_path = ''
as $$
  with me as (select c.id as cook_id from public.cooks c where c.user_id = (select auth.uid()) limit 1),
       follows as (
         select f.followee_id from public.follows f where f.follower_id = (select cook_id from me)
       ),
       hidden as (
         select e.recipe_id from public.home_events e where e.viewer_id = (select auth.uid()) and e.type = 'hide'
       ),
       pop as (select * from public.home_popularity(96)),
       top_pop as (select max(score) as m from pop)
  select r.id,
         r.cook_id,
         r.cook_id in (select followee_id from follows) as followed,
         coalesce(ln(1 + p.score) / nullif(ln(1 + (select m from top_pop)), 0), 0)::numeric as popularity,
         power(0.5, extract(epoch from (now() - r.published_at)) / 3600 / 72)::numeric as freshness,
         (0.45 * (r.cook_id in (select followee_id from follows))::int
          + 0.8 * coalesce(ln(1 + p.score) / nullif(ln(1 + (select m from top_pop)), 0), 0)
          + 0.15 * power(0.5, extract(epoch from (now() - r.published_at)) / 3600 / 72))::numeric as score
  from public.published_recipes r
  left join pop p on p.recipe_id = r.id
  where r.status = 'published'
    and r.id not in (select recipe_id from hidden where recipe_id is not null)
    and r.cook_id is distinct from (select cook_id from me)
  order by score desc, r.published_at desc
  limit least(greatest(max_rows, 1), 1000);
$$;

revoke all on function public.home_popularity(numeric) from public, anon;
revoke all on function public.home_also_engaged(uuid[], integer) from public, anon;
revoke all on function public.home_candidates(integer) from public, anon;
grant execute on function public.home_popularity(numeric) to authenticated;
grant execute on function public.home_also_engaged(uuid[], integer) to authenticated;
grant execute on function public.home_candidates(integer) to authenticated;
