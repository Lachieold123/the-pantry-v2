-- Home engine, step 1: the interaction log (docs/HOME-ENGINE.md §6).
-- NOT APPLIED to the live project: Lachlan applies it after review.
--
-- One row per thing a signed-in cook did with a published recipe or a cook:
-- shown on Home (impression), opened, read for N seconds (dwell), saved,
-- unsaved, cooked, liked, followed, unfollowed, hidden. The app keeps the same
-- events on the phone today (store/homeEvents.ts) and would upload them in
-- batches once this exists.
--
-- Privacy: a cook can write and read only their own events. Nobody reads
-- anyone else's rows; the ranking functions (next migration) only ever return
-- totals, never who did what. Rows older than 180 days are deleted by
-- home_events_tidy(), which a daily cron can call.

create table public.home_events (
  id bigint generated always as identity primary key,
  viewer_id uuid not null default auth.uid(),
  type text not null check (type in ('impression', 'open', 'dwell', 'save', 'unsave', 'cook', 'like', 'follow', 'unfollow', 'hide')),
  recipe_id uuid references public.published_recipes (id) on delete cascade,
  cook_id uuid references public.cooks (id) on delete cascade,
  seconds integer check (seconds is null or (seconds >= 0 and seconds <= 1800)),
  surface text check (surface is null or length(surface) <= 32),
  at timestamptz not null default now(),
  -- Follows name a cook; everything else names a recipe.
  check ((type in ('follow', 'unfollow') and cook_id is not null) or (type not in ('follow', 'unfollow') and recipe_id is not null)),
  check (type = 'dwell' or seconds is null)
);

create index home_events_by_viewer on public.home_events (viewer_id, at desc);
create index home_events_by_recipe on public.home_events (recipe_id, at desc) where recipe_id is not null;
create index home_events_engaged on public.home_events (recipe_id, viewer_id) where type in ('save', 'cook', 'like');

alter table public.home_events enable row level security;
revoke all on public.home_events from public, anon;
grant select, insert on public.home_events to authenticated;
grant usage on sequence public.home_events_id_seq to authenticated;

create policy "cooks add their own events" on public.home_events
  for insert to authenticated
  with check (viewer_id = (select auth.uid()) and at <= now() + interval '5 minutes' and at > now() - interval '30 days');

create policy "cooks read their own events" on public.home_events
  for select to authenticated
  using (viewer_id = (select auth.uid()));

-- No update or delete policies: the log is append-only for cooks.

create function public.home_events_tidy() returns integer
language sql security definer set search_path = ''
as $$
  with gone as (delete from public.home_events where at < now() - interval '180 days' returning 1)
  select count(*)::integer from gone;
$$;
revoke all on function public.home_events_tidy() from public, anon, authenticated;
