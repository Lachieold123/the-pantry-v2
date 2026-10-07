-- Cooks, follows and published recipes: the public side of social (D-026),
-- started early so the house cooks (D-044, docs/SEED-KITCHEN.md) have
-- somewhere real to post. P9 adds likes, comments, saves, reports, blocks and
-- the write policies for real users; this migration only lets everyone read.
--
-- Additive only: profiles, account_rows and the household tables are untouched.
--
-- A cook is anyone with a public presence. Real people get one when they make
-- a public profile (kind 'person', tied to their auth user). House cooks
-- (kind 'house') and The Pantry's own account (kind 'official') have no auth
-- user, so nobody can sign in as one, and the badge comes from the data.

create table public.cooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  kind text not null check (kind in ('person', 'house', 'official')),
  handle text not null unique check (handle ~ '^[a-z0-9_.]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (char_length(bio) <= 280),
  home_region text check (char_length(home_region) <= 60),
  -- Path inside the `avatars` bucket. Media always lives in our own storage (parity rule 5).
  avatar_path text check (avatar_path is null or avatar_path ~ '^[a-z0-9/_.-]{1,200}$'),
  -- So the app can label an AI-made portrait or logo, as it labels AI photos (D-029).
  avatar_kind text check (avatar_kind in ('photo', 'ai-portrait', 'ai-logo', 'food-photo', 'initials')),
  avatar_credit text check (char_length(avatar_credit) <= 120),
  -- Kept by the database, never by the app (parity rule 5).
  recipe_count integer not null default 0,
  follower_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now(),
  -- Exactly the real people have an auth user.
  constraint cooks_person_has_user check ((kind = 'person') = (user_id is not null))
);

create table public.published_recipes (
  id uuid primary key default gen_random_uuid(),
  cook_id uuid not null references public.cooks (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  title text not null check (char_length(title) between 1 and 80),
  -- Copies of fields inside `recipe`, kept for filtering and sorting in SQL.
  cuisine text not null check (cuisine ~ '^[a-z-]{2,30}$'),
  region text check (char_length(region) <= 40),
  meal_types text[] not null check (cardinality(meal_types) between 1 and 4),
  diets text[] not null default '{}',
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  total_minutes integer not null check (total_minutes between 1 and 4320),
  -- The app's Recipe shape (src/domain/recipes/types.ts), checked by its own validateRecipe.
  recipe jsonb not null check (pg_column_size(recipe) < 65536),
  -- The cook's words when they posted it.
  caption text check (char_length(caption) <= 600),
  photo_path text check (photo_path is null or photo_path ~ '^[a-z0-9/_.-]{1,200}$'),
  photo_credit text check (char_length(photo_credit) <= 120),
  photo_source text check (photo_source in ('pexels', 'user', 'ai')),
  photo_source_id text check (char_length(photo_source_id) <= 60),
  photo_width integer,
  photo_height integer,
  -- How it was checked: 'auto-checked' (house cooks' recipes, docs/SEED-KITCHEN.md),
  -- 'vetted' (Lachlan cooked it), 'user' (a real person's own recipe).
  review text not null check (review in ('auto-checked', 'vetted', 'user')),
  -- True while a line uses an ingredient whose groups aren't confirmed yet, so
  -- no diet is claimed (diets stays empty) until they are.
  diets_pending boolean not null default false,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (cook_id, slug)
);
create index published_recipes_feed on public.published_recipes (published_at desc) where status = 'published';
create index published_recipes_by_cook on public.published_recipes (cook_id, published_at desc);
create index published_recipes_cuisine on public.published_recipes (cuisine) where status = 'published';
-- One stock photo, one recipe: no near-duplicate photos across the feed (audit QUAL-18).
create unique index published_recipes_one_photo on public.published_recipes (photo_source, photo_source_id)
  where photo_source_id is not null;

create table public.follows (
  follower_id uuid not null references public.cooks (id) on delete cascade,
  followee_id uuid not null references public.cooks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);
create index follows_followers on public.follows (followee_id, created_at desc);

-- Ingredients the bundled database (src/data/ingredients) doesn't know yet:
-- dishes from everywhere use their own names (gochugaru, jeera, dalo).
--   kind 'alias': another name for something the database has (jeera → cumin seeds).
--   kind 'new':   a new ingredient, with its groups (diets, avoid list) and,
--                 where it's hard to find, a swap from the database and a tip.
-- A second, independent check confirms the groups ('verified'); a disagreement
-- waits for Lachlan ('needs-review'). Only verified or approved rows count for
-- diets, and the app will merge them into its ingredient index in P9.
create table public.ingredient_extras (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 60),
  kind text not null check (kind in ('alias', 'new')),
  alias_of text check (char_length(alias_of) <= 60),
  name text not null check (char_length(name) between 1 and 60),
  aliases text[] not null default '{}',
  aisle text,
  groups text[] not null default '{}',
  swap_id text check (char_length(swap_id) <= 60),
  swap_tip text check (char_length(swap_tip) <= 240),
  status text not null default 'proposed' check (status in ('proposed', 'verified', 'needs-review', 'approved', 'rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  constraint ingredient_extras_alias_target check ((kind = 'alias') = (alias_of is not null))
);

-- Counts kept by the database.
create function public.cooks_count_recipes() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.status = 'published' then
    update public.cooks set recipe_count = recipe_count + 1 where id = new.cook_id
      and (tg_op = 'INSERT' or old.status <> 'published');
  end if;
  if tg_op in ('DELETE', 'UPDATE') and old.status = 'published' then
    update public.cooks set recipe_count = greatest(recipe_count - 1, 0) where id = old.cook_id
      and (tg_op = 'DELETE' or new.status <> 'published');
  end if;
  return null;
end;
$$;
create trigger published_recipes_count after insert or update of status or delete on public.published_recipes
  for each row execute function public.cooks_count_recipes();

create function public.cooks_count_follows() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.cooks set following_count = following_count + 1 where id = new.follower_id;
    update public.cooks set follower_count = follower_count + 1 where id = new.followee_id;
  elsif tg_op = 'DELETE' then
    update public.cooks set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update public.cooks set follower_count = greatest(follower_count - 1, 0) where id = old.followee_id;
  end if;
  return null;
end;
$$;
create trigger follows_count after insert or delete on public.follows
  for each row execute function public.cooks_count_follows();

revoke all on function public.cooks_count_recipes() from public, anon, authenticated;
revoke all on function public.cooks_count_follows() from public, anon, authenticated;

-- Everyone can read; nobody writes through the API yet. The house cooks are
-- written by the seed-kitchen function with the service role, and P9 adds the
-- write policies for real people (with moderation, parity rule 6).
alter table public.cooks enable row level security;
alter table public.published_recipes enable row level security;
alter table public.follows enable row level security;
alter table public.ingredient_extras enable row level security;

create policy "anyone reads cooks" on public.cooks for select to anon, authenticated using (true);
create policy "anyone reads published recipes" on public.published_recipes for select to anon, authenticated
  using (status = 'published');
create policy "anyone reads follows" on public.follows for select to anon, authenticated using (true);
create policy "anyone reads confirmed ingredient extras" on public.ingredient_extras for select to anon, authenticated
  using (status in ('verified', 'approved'));

-- Public buckets: photos are served by URL. Uploads only with the service role for now.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('recipe-photos', 'recipe-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ─── The seed kitchen's workings (docs/SEED-KITCHEN.md) ───────────────────
-- A private schema: not exposed through the API, read and written only by
-- the seed-kitchen function over its direct database connection.

create schema seed;
revoke all on schema seed from public, anon, authenticated;

create table seed.config (
  key text primary key,
  value jsonb not null
);

-- One per house cook: who they are and how often they post.
create table seed.personas (
  cook_id uuid primary key references public.cooks (id) on delete cascade,
  brief jsonb not null,
  -- How many recipes the first run gives them.
  backlog_target integer not null check (backlog_target between 0 and 200),
  -- After that: their posting rhythm.
  posts_per_week numeric(4, 2) not null default 1 check (posts_per_week between 0 and 21),
  timezone text not null default 'Australia/Sydney',
  active boolean not null default true,
  -- Where the avatar comes from before it's copied into storage.
  avatar_source_url text,
  avatar_photo_query text,
  next_post_at timestamptz,
  created_at timestamptz not null default now()
);

-- The menu: one row per dish a house cook will post, moving through the stages.
create table seed.dishes (
  id uuid primary key default gen_random_uuid(),
  cook_id uuid not null references public.cooks (id) on delete cascade,
  title text not null,
  cuisine text not null,
  region text,
  meal_type text not null,
  angle text,
  stage text not null default 'planned'
    check (stage in ('planned', 'written', 'checked', 'photographed', 'published', 'failed')),
  attempts integer not null default 0,
  feedback text,
  draft jsonb,
  recipe jsonb,
  photo jsonb,
  published_id uuid references public.published_recipes (id) on delete set null,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One dish name across all house cooks, so the feed never shows two of the same.
create unique index dishes_one_title on seed.dishes (lower(title)) where stage <> 'failed';
create index dishes_stage on seed.dishes (stage, created_at);

-- Every paid call, for the monthly cap and the spend report.
create table seed.usage (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  purpose text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  usd numeric(10, 5) not null default 0
);
create index usage_at on seed.usage (at);

create table seed.runs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  ms integer,
  summary jsonb
);

insert into seed.config (key, value) values
  ('paused', 'false'),
  ('monthly_cap_usd', '60'),
  ('first_run_cap_usd', '200'),
  ('models', '{"writer": "claude-sonnet-5-5", "checker": "claude-haiku-4-5-20251001"}'),
  -- US$ per million tokens. Check against current pricing; only used for the cap.
  ('prices', '{"claude-sonnet-5-5": {"in": 3, "out": 15}, "claude-haiku-4-5-20251001": {"in": 1, "out": 5}}'),
  ('per_tick', '{"write": 4, "photo": 4, "menus": 2, "avatars": 4, "publish": 40}'),
  ('pexels_per_hour', '180'),
  -- Only these cooks are worked on while set (the pilot). Empty list = everyone.
  ('only_cooks', '[]');

-- At a glance: where the pipeline is and what it has cost.
create view seed.status as
select
  (select jsonb_object_agg(stage, n) from (select stage, count(*) n from seed.dishes group by stage) s) as stages,
  (select count(*) from public.cooks where kind in ('house', 'official')) as house_cooks,
  (select count(*) from public.published_recipes p join public.cooks c on c.id = p.cook_id
     where c.kind in ('house', 'official')) as published,
  (select coalesce(sum(usd), 0) from seed.usage
     where at >= date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney') as usd_this_month,
  (select coalesce(sum(usd), 0) from seed.usage) as usd_all_time;
