-- Live rows over private Broadcast channels (K-32, SEC-06).
-- NOT APPLIED to the live project: Lachlan applies it after review, and
-- turns off Realtime's "Allow public access" (docs/HOUSEHOLD.md, Needs Lachlan).
--
-- Rows reached other phones through Realtime's Postgres Changes, which checks
-- row security for inserts and updates but sends the primary key of a deleted
-- row (household id or user id, kind and key) to anyone subscribed to the
-- table. Now:
--
-- - The two row tables leave the `supabase_realtime` publication, so Postgres
--   Changes sends nothing about them, deletes included.
-- - A trigger broadcasts each insert and update to a private topic:
--   `household:<household id>` or `account:<user id>`. Hard deletes (an
--   account deleted, a household's last member leaving) are never broadcast.
-- - Realtime Authorization: a private channel is joined only if this policy
--   on realtime.messages lets the user read its topic. Members hear their
--   household; a permanent user hears their own account. Nobody may send on
--   these topics (no insert policy), so a phone can't fake another's row.
--
-- A row that misses its broadcast (offline, a dropped socket) still arrives
-- with the next pull, which asks for everything received since the last one.

-- Who may join a private topic. Security definer, so it can read the member
-- list whatever that table's own policies say; it answers only for the caller.
create function public.may_hear(p_topic text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_topic like 'household:%' then exists (
      select 1 from public.household_members m
      where m.user_id = auth.uid() and 'household:' || m.household_id::text = p_topic
    )
    when p_topic like 'account:%' then auth.uid() is not null
      and p_topic = 'account:' || auth.uid()::text
      and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    else false
  end;
$$;
revoke all on function public.may_hear(text) from public, anon;
grant execute on function public.may_hear(text) to authenticated;

create policy "members hear their household, owners their account" on realtime.messages
  for select to authenticated
  using (realtime.messages.extension = 'broadcast' and (select public.may_hear((select realtime.topic()))));

-- The row as the phones read it, without the owner column (it's in the topic).
-- Security definer: the broadcast is the server's, not the writer's, so the
-- writer needs no right to send on the topic.
create function public.rows_broadcast() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare topic text;
begin
  if tg_table_name = 'household_rows' then
    topic := 'household:' || new.household_id::text;
  else
    topic := 'account:' || new.user_id::text;
  end if;
  perform realtime.send(
    jsonb_build_object(
      'kind', new.kind, 'key', new.key, 'data', new.data, 'deleted', new.deleted,
      'updated_at', new.updated_at, 'updated_by', new.updated_by, 'received_at', new.received_at
    ),
    'row', topic, true
  );
  return null;
end;
$$;
revoke all on function public.rows_broadcast() from public, anon, authenticated;

-- After-triggers fire only for a write that landed (newest-wins refused nothing).
create trigger household_rows_broadcast
  after insert or update on public.household_rows
  for each row execute function public.rows_broadcast();
create trigger account_rows_broadcast
  after insert or update on public.account_rows
  for each row execute function public.rows_broadcast();

alter publication supabase_realtime drop table public.household_rows;
alter publication supabase_realtime drop table public.account_rows;
