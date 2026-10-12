// Screen state for the published-recipe reads in lib/published.ts: loading,
// error with a retry, and paging. Each answer is tagged with the request it
// belongs to, so one that arrives after a retry or a refresh started over is
// never shown as current.
import { useCallback, useEffect, useRef, useState } from 'react';

import { appendPage, type FeedCursor, type FeedItem } from '@/domain/published/published';
import { fetchFeedPage, type ReadProblem, type ReadResult } from './published';

export type Load<T> = { state: 'loading' } | { state: 'error'; problem: ReadProblem } | { state: 'ready'; value: T };

const LOADING = { state: 'loading' } as const;

/** One read of `key` (a module function, so it's stable), run on mount and again on `retry`. */
export function useRead<T>(read: (key: string) => Promise<ReadResult<T>>, key: string): Load<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<{ tag: string; load: Load<T> } | undefined>();
  const tag = `${key}#${attempt}`;
  useEffect(() => {
    let live = true;
    void read(key).then((r) => {
      if (live) setAnswer({ tag, load: r.ok ? { state: 'ready', value: r.value } : { state: 'error', problem: r.problem } });
    });
    return () => {
      live = false;
    };
  }, [read, key, tag]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...(answer?.tag === tag ? answer.load : LOADING), retry };
}

export type Feed = {
  items: FeedItem[];
  /** The first page is loading (or reloading after an error). */
  loading: boolean;
  /** A later page is loading. */
  loadingMore: boolean;
  /** Pulled to refresh: the shown recipes stay until the new first page arrives. */
  refreshing: boolean;
  problem: ReadProblem | undefined;
  /** There are older recipes still to load. */
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
};

type Pages = { tag: string; items: FeedItem[]; next: FeedCursor | undefined; problem?: ReadProblem | undefined };

/** The feed, newest first, a page at a time; `cookId` narrows it to one cook. */
export function useFeed(cookId?: string): Feed {
  const [restart, setRestart] = useState(0);
  const [pages, setPages] = useState<Pages | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const busy = useRef(false);
  const tag = `${cookId ?? 'all'}#${restart}`;

  useEffect(() => {
    let live = true;
    void fetchFeedPage(undefined, cookId).then((r) => {
      if (!live) return;
      setRefreshing(false);
      // A failed refresh keeps what was already on screen, with the problem beside it.
      setPages((shown) =>
        r.ok
          ? { tag, items: r.value.items, next: r.value.next }
          : { tag, items: shown?.items ?? [], next: shown?.next, problem: r.problem },
      );
    });
    return () => {
      live = false;
    };
  }, [cookId, tag]);

  const current = pages?.tag === tag ? pages : undefined;
  const next = current?.next;

  const loadMore = useCallback(() => {
    if (!next || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    setPages((s) => s && { ...s, problem: undefined });
    void fetchFeedPage(next, cookId).then((r) => {
      busy.current = false;
      setLoadingMore(false);
      setPages((s) => {
        if (!s || s.tag !== tag) return s;
        return r.ok ? { ...s, items: appendPage(s.items, r.value.items), next: r.value.next } : { ...s, problem: r.problem };
      });
    });
  }, [next, cookId, tag]);

  const shownCount = (current ?? pages)?.items.length ?? 0;
  const refresh = useCallback(() => {
    setRefreshing(shownCount > 0);
    setRestart((n) => n + 1);
  }, [shownCount]);

  return {
    items: current?.items ?? (refreshing ? (pages?.items ?? []) : []),
    loading: !current && !refreshing,
    loadingMore,
    refreshing,
    problem: current?.problem,
    hasMore: next !== undefined,
    loadMore,
    refresh,
  };
}
