-- Sign in with Apple refresh tokens, for revoking on account deletion
-- (deep audit 20 Nov 2026, S2-4; SEC-03, Apple guideline 5.1.1(v)).
--
-- The token stays in `private`, which PostgREST doesn't serve, so the edge
-- functions reach it through two security definer functions in `public` that
-- only the service role may run (supabase/functions/apple-token, delete-account).
-- Exposing `private` instead would have opened it to anon's REST endpoint.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.apple_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null check (char_length(refresh_token) between 1 and 4096),
  updated_at timestamptz not null default now()
);
alter table private.apple_tokens enable row level security;
revoke all on private.apple_tokens from public, anon, authenticated;

-- Keep (or replace) the user's token. Called by apple-token after Apple swaps the code.
create function public.apple_token_save(p_user uuid, p_token text) returns void
language sql security definer set search_path = ''
as $$
  insert into private.apple_tokens (user_id, refresh_token) values (p_user, p_token)
  on conflict (user_id) do update set refresh_token = excluded.refresh_token, updated_at = now();
$$;

-- The user's token, or null. Read-only on purpose: if Apple can't be reached
-- the deletion stops and can be retried with the token still there. The row
-- goes with the auth user (on delete cascade) once delete_account runs.
create function public.apple_token_take(p_user uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select refresh_token from private.apple_tokens where user_id = p_user;
$$;

revoke all on function public.apple_token_save(uuid, text) from public, anon, authenticated;
revoke all on function public.apple_token_take(uuid) from public, anon, authenticated;
grant execute on function public.apple_token_save(uuid, text) to service_role;
grant execute on function public.apple_token_take(uuid) to service_role;
