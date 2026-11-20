-- No direct writes to home_events until the app uploads events (deep audit 20 Nov 2026, S2-2).
-- Any signed-in user, anonymous included, could insert without limit and
-- fill the database. The app keeps events on the phone only
-- (src/store/homeEvents.ts), so nothing uses the insert today. Revoking it is
-- smaller and surer than a quota nobody needs yet; the upload design (batch
-- size, a quota, permanent users only) belongs with the upload feature.
-- Supabase's default grants had also given UPDATE, DELETE and TRUNCATE.
--
-- The policy "cooks add their own events" stays, so the undo when uploads ship is one line:
--   grant insert on public.home_events to authenticated; grant usage on sequence public.home_events_id_seq to authenticated;
-- Reading your own events (SELECT) and the ranking functions (security definer) are untouched.

revoke insert, update, delete, truncate, references, trigger on public.home_events from authenticated, anon;
revoke usage on sequence public.home_events_id_seq from authenticated, anon;
