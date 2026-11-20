// Rows from other phones as they're written (K-32, SEC-06).
//
// Each write is broadcast by the database to a private topic,
// `household:<id>` or `account:<user id>`, and Realtime lets a phone join
// only if the policy on realtime.messages says it may (members, the account's
// owner). Postgres Changes sent deleted rows' keys to any subscriber, so the
// row tables are no longer published to it.
//
// Until the migration is applied, joining the private topic is refused; this
// falls back to Postgres Changes, so live updates keep working either way.
// Remove the fallback once the migration is live.
import type { RealtimeChannel } from '@supabase/supabase-js';

import type { Row } from '@/domain/sync/types';
import { fromDb, type DbRow } from './pullRows';
import { supabase } from './supabase';

type Topic = { scope: 'household'; id: string } | { scope: 'account'; id: string };

const LEGACY: Record<Topic['scope'], { table: string; column: string }> = {
  household: { table: 'household_rows', column: 'household_id' },
  account: { table: 'account_rows', column: 'user_id' },
};

const REFUSED = /unauthori[sz]ed|permission/i;

const isRow = (v: unknown): v is DbRow => typeof v === 'object' && v !== null && 'kind' in v && 'key' in v;

/** Calls back with each row another phone writes in this scope. Returns a stop function. */
export function listenRows(topic: Topic, onRow: (row: Row) => void): () => void {
  let channel: RealtimeChannel | undefined;
  let stopped = false;
  const name = `${topic.scope}:${topic.id}`;

  const open = (next: RealtimeChannel) => {
    if (channel) void supabase().removeChannel(channel);
    channel = next;
  };

  const legacy = () => {
    const { table, column } = LEGACY[topic.scope];
    open(
      supabase()
        .channel(`${name}:changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter: `${column}=eq.${topic.id}` }, (payload) => {
          if (isRow(payload.new)) onRow(fromDb(payload.new));
        })
        .subscribe(),
    );
  };

  const join = () => {
    let joined = false;
    open(
      supabase()
        .channel(name, { config: { private: true } })
        .on('broadcast', { event: 'row' }, (message) => {
          if (isRow(message.payload)) onRow(fromDb(message.payload));
        })
        .subscribe((status, error) => {
          if (status === 'SUBSCRIBED') joined = true;
          // Refused (not a network blip, which the channel retries itself) before it ever
          // joined: the server has no policy for the topic yet.
          else if (status === 'CHANNEL_ERROR' && !joined && !stopped && REFUSED.test(error?.message ?? '')) legacy();
        }),
    );
  };

  // A private channel is authorised with the sign-in's token, so it's handed over first.
  void Promise.resolve(supabase().realtime.setAuth())
    .catch(() => undefined)
    .then(() => {
      if (!stopped) join();
    });

  return () => {
    stopped = true;
    if (channel) void supabase().removeChannel(channel);
    channel = undefined;
  };
}
