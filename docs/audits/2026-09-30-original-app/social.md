# Social layer audit: correctness and robustness

Scope: `/home/claude/old-audit` (old Pantry app, Expo SDK 54, Supabase). Files read: every migration in `supabase/migrations/`, the seeds and seed scripts, `src/social/*`, the social screens, `src/data/media.ts`, `src/data/compressMedia.ts`, `src/lib/handle.ts`, `src/lib/queryClient.ts`, `src/push/pushClient.ts`, `eas.json`, `.gitignore`, and the handover docs.

Baseline facts that shape every finding:
- Production has migrations 0001–0012, 0011a, 0014 and 0016 applied. 0013 is not applied (`docs/HANDOVER-REBUILD-2026-09-28.md:115-117`).
- The cloud backend is selected only when `EXPO_PUBLIC_SUPABASE_ENABLED=1` (`src/social/feedApi.ts:233-250`). Otherwise the app runs a local in-memory backend seeded with simulated users.
- The social hooks do not use TanStack Query. It is installed and a client is configured (`src/lib/queryClient.ts:14-25`), but every social read is a hand-rolled `useEffect` + `useState` (`src/social/useFeed.ts`).
- There is no Realtime subscription and no polling anywhere in the client. A grep for `.channel(`, `postgres_changes`, `refetchInterval` or `setInterval` finds nothing social. The "event bus" (`src/social/events.ts`) only fires for the device's own writes.

"Needs live DB" means the claim follows from the migrations but must be checked against production. The production database was paused at handover.

---

## Critical

### SOC-1 · Blocking doesn't hide the blocked person from the blocker (cloud mode)
- Severity: Critical
- Where: `supabase/migrations/0002_moderation_storage.sql:322-345`; `0003_phase2.sql:233-237`; `src/social/supabaseFeedAPI.ts:574-595` (getFeed), `:851-871` (getComments), `:765-797` (searchUsers), `:741-763` (followers/following); `src/social/notifications.ts:183-219`; `0001_initial_schema.sql:562-565` (follows insert); `src/social/useFeed.ts:722-736`
- What's wrong: The RLS policies hide the blocker's content from the blocked user, but not the reverse. The migration comments say the other direction is "handled client-side in the FeedAPI" (0002:322-326, 0003:233-237). Only `getConversations` does this (supabaseFeedAPI.ts:1054-1085). `getFeed`, `getComments`, `searchUsers`, `getFollowers`, `getPostsByUser` and `fetchCloudNotifications` never read `blocks`. The follows INSERT policy isn't block-aware, so a blocked user can still follow the blocker, which also creates a `follow` notification through `notify_on_follow` (0001:424-440). Blocking doesn't remove existing follow edges. `useBlockedState` refreshes on `subscribeViewerChanges` (useFeed.ts:732), which only fires in local mode, so after a block the profile still shows "Block" rather than "Unblock".
- Why it matters: The block dialog promises "You won't see their bites or hear from them" (PostMenuSheet.tsx:86-88, UserProfileModal.tsx:106). In cloud mode the blocker keeps seeing the blocked person's bites, comments and follow notifications. That breaks the promise to a harassment victim and is an App Review 1.2 rejection risk.
- Fix: Add a `security definer stable` helper `public.is_blocked_between(a uuid, b uuid)`, indexed on `blocks(blocker_id, blocked_id)` and `blocks(blocked_id, blocker_id)`. Use it in both directions in the SELECT policies on bites, comments, bite_images and profiles (excluding self), follows and notifications, and in the INSERT policies on follows and comments. Add an `after insert on blocks` trigger that deletes follows both ways and pending notifications between the pair. On the client, invalidate the feed, comments and profile queries after block or unblock.
- Effort: M

### SOC-2 · Fake or demo content can reach real users
- Severity: Critical
- Where: `src/screens/BrowseModal.tsx:196-206`, `:210-213`; `src/social/localFeedApi.ts:99-145`; `src/social/notifications.ts:49-109`; `.gitignore:34`; `eas.json:31-42`; `.env:1-3`; `supabase/seeds/0001_simulated_users_and_bites.sql`; `scripts/seedCloud.mjs:1-30`; `scripts/seedFullCatalogAsBites.mjs:1-25`
- What's wrong: There are three paths.
  1. BrowseModal's People list always reads `SIMULATED_USERS`, even in cloud mode (BrowseModal.tsx:198). Real users can see and tap fake accounts ("Sarah Chen, 2,840 followers") whose ids (`u-sarah`) aren't UUIDs, so their profiles load empty.
  2. Production builds take their environment from the EAS `production` environment. `.env` is gitignored and there is no `.easignore`, so it isn't uploaded. If the EAS environment lacks the three `EXPO_PUBLIC_SUPABASE_*` variables, the store build silently runs the local backend. That backend injects 50 fabricated "my posts" with fake like counts into the user's own profile (localFeedApi.ts:99-145) and synthesises fake follow, like and comment notifications (notifications.ts:49-109).
  3. There is one Supabase project (`.env:1`), and the seed SQL and scripts insert about 10 fake auth users, 60 to 285 bites, comments and a follow graph into whichever project the key points at. `seedCloud.mjs` also makes "every bot follow YOU" and sends DMs.
- Why it matters: Fake accounts presented as real people, and fake engagement on a user's own profile, are the most damaging kind of embarrassment. This is also an App Store 2.3.1 issue (misleading).
- Fix: Delete `simulatedData.ts` and the local social backend from production code (keep them as test fixtures only). Replace the BrowseModal list with `searchUsers`. Fail closed at startup: if the build is production and Supabase isn't configured, hide the social tabs rather than falling back. Run seeds only against a separate dev project, and add a guard in the scripts that refuses a production project ref. **Needs live DB:** `select count(*) from auth.users where email like 'sim+%@thepantry.test'` and a count of bites where `media_url !~ '^https?://'`. **Needs EAS:** `eas env:list production`.
- Effort: S

### SOC-3 · Direct messages don't behave like a messaging product
- Severity: Critical
- Where: `src/social/useFeed.ts:572-617`; `src/social/events.ts:489-547`; `src/social/supabaseFeedAPI.ts:1128-1142` (getMessages), `:1046-1087` (getConversations); `src/screens/InboxModal.tsx:210-227`; `src/screens/ThreadModal.tsx:43-45`
- What's wrong:
  1. Messages from the other person never arrive live. `useMessages` and `useConversations` refetch only on `dm:sent` and `conversation:created`, which are this device's own events. There is no Realtime subscription, no polling and no refetch when the app comes back to the foreground. The handover says Realtime is enabled on the server, but nothing uses it.
  2. `getMessages` fetches the thread oldest-first with `.limit(500)`. Once a conversation passes 500 messages, the newest ones are never shown, including any the user sends. The inbox preview uses `messages[messages.length-1]` from the same query (InboxModal.tsx:213), so it freezes too.
  3. `getConversations` never prefetches the other participant's profile, and rows render through the sync cache `getAuthorSync(otherId)`. Anyone not already cached from the feed shows as "Unknown" (InboxModal.tsx:212, 227; ThreadModal.tsx:45, 91-92).
- Why it matters: Someone can sit in a chat and never see the reply. Long chats stop updating completely.
- Fix: Page messages with a keyset on `(created_at, id)` DESC and render newest-first in an inverted list. Subscribe to Realtime `postgres_changes` on `dm_messages` filtered by `thread_id`, and on `dm_threads` for the inbox. Refetch when the app returns to the foreground. Return the other participant's profile embedded in the thread query (a PostgREST embed or an RPC).
- Effort: M

---

## High

### SOC-4 · Message requests and unread counts are dead; anyone can DM anyone
- Severity: High
- Where: `0001_initial_schema.sql:276-290`; `0003_phase2.sql:362-378`; `src/social/supabaseFeedAPI.ts:293-305`, `:1114-1121`; `src/screens/ComposeMessageSheet.tsx:28-29, 48`; `src/screens/InboxModal.tsx:55-58`
- What's wrong: Threads default to `status='pending'`, and nothing in the client ever sets `accepted`. A grep for `'accepted'` finds only the column list. `get_unread_total()` counts only `t.status = 'accepted'` (0003:376), so the inbox badge is always 0 in cloud mode. Per-thread `unreadCount` is hard-coded to 0 (supabaseFeedAPI.ts:303), so row badges never show. Every DM notification is typed `dm_request`. No Requests folder UI exists, so the schema's spam gate is never used. ComposeMessageSheet creates a thread with no message, so an empty "…" conversation appears in the recipient's inbox.
- Why it matters: Users never see that they have messages, and strangers can land in anyone's main inbox.
- Fix: Decide the policy (for example, mutual follows go straight to the inbox and everyone else goes to Requests). Set `status` in a `before insert` trigger on `dm_threads` using the follow graph. Add an `accept_thread(thread_id)` RPC that only the recipient can call. Compute per-thread unread in one RPC (`inbox_page`) that returns thread, other profile, last message and unread count. Create the thread lazily on the first message.
- Effort: M

### SOC-5 · A DM participant can rewrite the thread's participants or accept their own request
- Severity: High
- Where: `0001_initial_schema.sql:763-773`; `0010_performance_rls_initplan_and_fk_indexes.sql:69`
- What's wrong: `dm_threads_update_participant` only checks that the caller is still a participant after the update. Participant A can `update dm_threads set participant_b_id = <C>` (keeping the ordering check) or set `status='accepted'` on their own request. The update policy isn't block-aware (the insert policy is, 0003:284-293). Once the thread is re-pointed, C can read every message B sent to A, because message visibility is derived from the thread.
- Why it matters: This is a privacy leak of third-party messages and a way around blocks.
- Fix: Revoke UPDATE on `dm_threads` from `authenticated`. Do status changes only through `accept_thread()` (security definer, recipient only), and bump `last_message_at` only from the trigger. Add a `before update` trigger that makes the participant columns immutable. **Needs live DB:** `select * from pg_policies where tablename='dm_threads'`.
- Effort: S

### SOC-6 · Follower count is double-counted on profiles
- Severity: High
- Where: `src/screens/UserProfileModal.tsx:100`, `:194`
- What's wrong: `followerDisplay = followerCount + (following ? 1 : 0)`. In cloud mode `followerCount` comes from `profiles.followers_count`, which the follows trigger already includes the viewer in (0008:38-69). Every profile you follow shows one more follower than it has. Following or unfollowing moves the number by two once the live profile refetches.
- Why it matters: The count is visibly wrong on every profile the user cares about.
- Fix: Show the server count only. For optimistic feedback, apply a delta from the difference between the optimistic and server-confirmed follow state, then replace it with the value the RPC returns.
- Effort: S

### SOC-7 · Column grants on `profiles` contradict each other: counts forgeable, or renames broken
- Severity: High
- Where: `0006_restore_grants.sql:25`; `0011_lock_profile_counts_and_dm_message_columns.sql:32-38`; `0011a_fix_profile_counts_table_grant.sql:1-58`; `0016_allow_handle_change.sql:18-19`; `src/social/supabaseFeedAPI.ts:707-718`
- What's wrong: 0006 grants table-level `ALL` to `authenticated`. In Postgres, revoking a column privilege while the table-level privilege exists has no effect, so 0011's `revoke update (followers_count, following_count)` was very likely a no-op. That leaves users able to set their own follower count. 0011a is a self-described reconstruction and doesn't match production for certain. If production did revoke table-level UPDATE, the column grant (`display_name, bio, avatar_url, location, updated_at`) excludes `handle`. In that case every profile save fails with 42501, because `updateMyProfile` always sends `handle` (ProfileSetupModal.tsx:184-190), despite 0016.
- Why it matters: Either counts can be forged or nobody can save a profile. Only production can say which.
- Fix: **Needs live DB:** `select has_table_privilege('authenticated','public.profiles','UPDATE'), has_column_privilege('authenticated','public.profiles','followers_count','UPDATE'), has_column_privilege('authenticated','public.profiles','handle','UPDATE')`. In the rebuild, revoke table-level UPDATE and grant column UPDATE on `(handle, display_name, bio, avatar_url, location)` only. Better still, route profile edits through an `update_profile()` RPC that validates the handle and rate-limits renames.
- Effort: S

### SOC-8 · Like and comment counts shown on posts are fabricated
- Severity: High
- Where: `src/social/supabaseFeedAPI.ts:233-238`; `src/screens/FeedScreen.tsx:336, 384, 521, 581, 584`; `src/screens/PostDetailModal.tsx:195, 291`; `src/screens/BrowseModal.tsx:210-213`
- What's wrong: `mapBiteToPost` hard-codes `likeCount: 0, commentCount: 0`. The UI still renders `likeCount + (liked ? 1 : 0)`, so every post shows "0" or "1 like" depending only on whether the viewer liked it. Every tile shows 0 comments even when there are comments. BrowseModal's "Trending" sorts on `likeCount`, which is all zeros, so the order is arbitrary. The schema's brand rule says there are no public counters (0001:10-11, supabaseFeedAPI.ts:63-67), so the UI and the data model disagree.
- Why it matters: Every post appears to have no engagement, and a post with 40 comments shows "0".
- Fix: Make a product decision (stop and ask Lachlan). Either remove counts from the UI entirely, which is the brand intent, or add counters kept by triggers (`like_count` and `comment_count` on bites, updated with `update ... set x = x ± 1` in the same transaction; row-level locking makes this race-free) and render them honestly. Don't label a random order "Trending".
- Effort: S (remove) / M (counters)

### SOC-9 · The feed is the newest 200 posts, shuffled; everything older is unreachable
- Severity: High
- Where: `src/social/supabaseFeedAPI.ts:574-595`; `src/social/useFeed.ts:47-64, 152-198`; `src/social/feedCursor.ts:1-69` (written, unused); `src/screens/FeedScreen.tsx:249-313`
- What's wrong: `getFeed` does `order created_at desc limit 200`, and `useFeed` then applies a seeded Fisher-Yates shuffle plus keyword re-ranking. There's no `onEndReached` or pagination, so post 201 and beyond can never be seen. Ordering has no id tiebreaker, and the shuffle means a new post from someone you follow lands at a random position. The order also changes on every cold launch. The index `bites_created_idx` (0001:145) has no `id` column for keyset paging.
- Why it matters: The feed will "lose" posts as soon as there are more than 200, and it doesn't feel chronological or trustworthy.
- Fix: Keyset pagination on `(created_at desc, id desc)` with an index on `bites(created_at desc, id desc)`. Use `useInfiniteQuery` with `feedCursor.ts`, dedupe pages by id, and on refresh reset to page 1. Drop the shuffle, or apply it inside a page only. If ranking is wanted later, use a server RPC with a stable `(score, id)` cursor over a snapshot.
- Effort: M

### SOC-10 · Video posts fail to upload
- Severity: High
- Where: `0002_moderation_storage.sql:363-368`; `src/social/supabaseFeedAPI.ts:419-439`, `:1234`; `src/screens/CreatePostModal.tsx:209-215, 238-243`; `src/data/compressMedia.ts:121-123`
- What's wrong: The composer allows `MediaTypeOptions.All` with 60-second videos. `uploadToBucket` uploads video to `bite-images` with `contentType: 'video/mp4'`, but that bucket's `allowed_mime_types` list is image-only and its size limit is 8 MB. A 60-second iPhone clip at quality 0.7 is typically tens of MB, and it isn't transcoded. `.mov` files are also mislabelled as mp4. The whole file is read into JS memory with `fetch().arrayBuffer()`. Video detection is by file extension only, so a URI without an extension goes through the image manipulator and fails.
- Why it matters: A user can pick a video and never post it. They then see a raw error: "SupabaseFeedAPI/createPost: upload to bite-images failed: …".
- Fix: For v1, remove video from the picker (`MediaTypeOptions.Images`). If video is in scope later, create a separate `bite-videos` bucket (mp4/mov, limit about 50 MB), use resumable TUS upload from the file URI (no base64 or arrayBuffer), transcode on device or server to 720p H.264, generate a poster frame, and detect the type from the picker's `asset.type` rather than the extension. **Needs live DB:** `select id, allowed_mime_types, file_size_limit from storage.buckets`.
- Effort: S (remove) / L (support properly)

### SOC-11 · Multi-photo posts lose every photo after the first when read back
- Severity: High
- Where: `src/social/supabaseFeedAPI.ts:222, 350, 1276-1292`; `0003_phase2.sql:112-128`
- What's wrong: `createPost` writes all photos to `bite_images`, and a failure there only logs a warning. No read path ever selects `bite_images`. `BITE_COLS` has no embed, and `mapBiteToPost` returns `imageRefs: [b.media_url]`. The carousel UI (FeedScreen.tsx:540) never gets more than one image from the cloud.
- Why it matters: Users upload five photos and everyone, including themselves after a reload, sees one.
- Fix: Select `bite_images(url, position, width, height)` as an embed ordered by position, and map it to `imageRefs`. Write the bite and its images in one RPC transaction (`create_bite(payload jsonb)`) so they succeed or fail together.
- Effort: S

### SOC-12 · Push notifications are never sent, and taps don't deep-link
- Severity: High
- Where: `src/push/pushClient.ts:1-8, 84-98`; `src/screens/SettingsModal.tsx:85-104`; `supabase/functions/` (only `ai-proxy` and `delete-account`); `src/screens/PostMenuSheet.tsx:52-66, 157-158`
- What's wrong: Tokens are stored in `push_tokens`, but no Edge Function, database webhook or worker sends anything, so the Settings "Push" toggle does nothing. When fetching the token fails, the code returns `{status:'granted', token:''}`. When permission is already granted the toggle returns early and never re-registers the token, for example after signing into a different account. Tokens aren't removed on sign-out, so a shared device would receive another account's notifications once delivery exists. There's no `addNotificationResponseReceivedListener` or deep-link routing (a grep for `Linking` or `getInitialURL` finds nothing). "Copy link" is a dead button that only closes the sheet, and Share sends only the meal name with no link.
- Why it matters: This is a visible setting that does nothing, and a dead button, which is against the "no dead buttons" rule.
- Fix: Add a `notifications` insert webhook to an Edge Function that batches Expo Push sends, handles `DeviceNotRegistered` by deleting the token, and respects per-type preferences. Register or refresh the token on every sign-in and delete it on sign-out. Put `{type, bite_id, comment_id, thread_id}` in the push payload and route it through Expo Router links (`thepantry://bite/<id>`), plus universal links for shares. Remove "Copy link" until real links exist.
- Effort: M

### SOC-13 · Notifications are never marked read, go stale, get crowded out and aren't deduplicated
- Severity: High
- Where: `src/social/notifications.ts:183-219, 229-254`; `src/screens/NotificationsModal.tsx:93-108`; `0001_initial_schema.sql:424-511`
- What's wrong:
  - Nothing ever updates `read_at` (no client write), so the unread dot never clears.
  - `useNotifications` fetches once per `viewerId` and doesn't refresh on open or on foreground.
  - It fetches the latest 100 rows, then filters out `dm` and `dm_request`. `notify_on_dm` inserts one row per message, so a busy chat pushes all follow and comment activity out of the window and the Activity list shows empty.
  - `notify_on_follow` fires on every insert, so follow, unfollow, follow produces repeated notifications (a spam vector). None of the triggers check blocks.
  - Tapping a comment notification opens the post only if it's already in the local sync cache (`getPostSync`), otherwise it does nothing, and it never scrolls to the comment.
  - Comment rows have no preview text.
- Why it matters: The badge is permanently lit, the list is empty or stale, and taps do nothing.
- Fix: Filter by type on the server (`.in('type', ['follow','comment'])`) and paginate with a keyset. Add `mark_notifications_read(before timestamptz)`. Dedupe with a unique partial index on `(recipient_id, actor_id, type)` for follows plus `on conflict do update set created_at = now(), read_at = null`. Don't create per-message DM notifications, since unread DMs come from the thread cursor. Skip notification inserts when the pair is blocked. Resolve the target with `getPost(id)` on tap and pass the `comment_id` through.
- Effort: M

---

## Medium

### SOC-14 · Creating a post isn't atomic or idempotent: orphaned files, possible duplicates, no progress
- Severity: Medium
- Where: `src/social/supabaseFeedAPI.ts:1213-1294`; `src/screens/CreatePostModal.tsx:274-311`
- What's wrong: Images upload one after another, then the bite is inserted, then `bite_images`. If the insert fails, or the user retries after a timeout, the uploaded objects are never deleted, and a retry uploads them all again under new UUIDs. There's no client-generated post id or idempotency key, so a request that succeeded on the server but timed out on the client and is then retried creates a duplicate post. There's no progress indicator or cancel option; "Sharing…" is the only feedback. Raw internal errors reach the user through `Alert.alert(... message)`.
- Why it matters: Duplicate posts, a growing storage bill, and a frozen-looking composer on slow connections.
- Fix: Generate the `bite_id` (UUIDv7) on the client when the composer opens. Upload to `bite-images/<uid>/<bite_id>/<n>.jpg` with `upsert: true`, so retries overwrite rather than duplicate. Call `create_bite(id, …)` with `on conflict (id) do nothing`. Show per-image progress (TUS or XHR `onprogress`) with a cancel button. Run a nightly cleanup of objects with no bite row older than 24 hours. Map errors to plain-English copy.
- Effort: M

### SOC-15 · DM history can be edited or destroyed, including by deleting a post
- Severity: Medium
- Where: `0001_initial_schema.sql:776-782, 813-820`; `0011_lock_profile_counts_and_dm_message_columns.sql:42-64`; `0007_dm_shared_post_cascade.sql:17-39`
- What's wrong: Either participant can hard-delete a thread, which cascades and deletes every message for both people. This contradicts the stated "soft-deleted only… keeps abuse-report trail" (0001:819-820). The sender can still UPDATE `body` and `shared_post_id` on sent messages, because 0011 locks only `thread_id`, `sender_id` and `created_at`. 0007 makes deleting a bite cascade-delete every DM that shared it, including messages that also contained text, which destroys other people's conversations.
- Why it matters: A harasser can edit or erase evidence before a report, and deleting a post removes other people's messages.
- Fix: Replace thread DELETE with a per-user `dm_thread_hidden(user_id, thread_id)` record. Allow only `deleted_at` changes on messages (column grant). Make `shared_post_id` `on delete set null` and relax the content check to `body is not null or shared_post_id is not null or deleted_at is not null`, then render "Post no longer available".
- Effort: S

### SOC-16 · Clients can set timestamps and move comments onto other posts
- Severity: Medium
- Where: `0001_initial_schema.sql:581-595, 606-624`; `0003_phase2.sql:321-340`
- What's wrong: `created_at` has a default but is writable, so a client can insert a bite with `created_at='2099-01-01'` and pin it to the top of every chronological feed and profile. The same applies to comments and DM messages on insert. `comments_update_self` lets the author change `bite_id`, which moves a comment onto a post that has comments disabled or whose author has blocked them, because the update check doesn't repeat the insert policy's conditions.
- Why it matters: This is feed manipulation and a way around blocks and disabled comments.
- Fix: Revoke INSERT and UPDATE on `created_at` and `updated_at`, or use a `before insert` trigger that forces `new.created_at := now()`. Make `bite_id`, `author_id` and `created_at` immutable on comments with a trigger, or grant UPDATE on `(body)` only.
- Effort: S

### SOC-17 · Like, save and follow toggles aren't idempotent, can race, and fail silently
- Severity: Medium
- Where: `src/social/supabaseFeedAPI.ts:952-978, 1437-1470`; `src/social/useFeed.ts:411-427, 446-466, 514-528`
- What's wrong: The API sends "toggle" (delete, and insert if nothing was deleted) instead of the state the user wants. Two quick taps send two toggles. Depending on ordering, the server and UI end in different states, or the second insert hits a primary-key violation, which rolls the UI back to a stale snapshot. Like and follow failures are only logged, and the user is told nothing. Other instances (feed tile and detail view) sync only on success.
- Why it matters: Hearts and follows flicker or end up wrong on flaky connections.
- Fix: Use `setLike(postId, liked: boolean)` implemented as an upsert with `ignoreDuplicates` or a delete, so the call is idempotent. Debounce taps or serialise them per key. Use TanStack `useMutation` with `onMutate` snapshot and rollback, and `onSettled` invalidation. Show a toast on failure.
- Effort: S

### SOC-18 · Feed and post error or empty states are dead ends
- Severity: Medium
- Where: `src/screens/FeedScreen.tsx:173-199`; `src/social/useFeed.ts:234-243`
- What's wrong: The error and empty states are plain `View`s outside the `FlatList`, so the copy "pull down to retry" is false because there's no RefreshControl and no Retry button. The empty copy "Follow some cooks to fill this up" is wrong because the feed is global, not based on who you follow. `usePost` has no catch, so a network error or deleted post leaves an unhandled rejection and a permanent blank.
- Why it matters: A single outage leaves users stuck on a screen they can't recover from.
- Fix: Render the states as `ListEmptyComponent` inside the refreshable list, and add a Retry button. Write accurate copy. Give every query an error state (this falls out of `useQuery`).
- Effort: S

### SOC-19 · Input limits disagree with the database; failed DMs lose the draft
- Severity: Medium
- Where: `src/screens/CreatePostModal.tsx:434, 446`; `src/screens/PostDetailModal.tsx:388`; `src/screens/ThreadModal.tsx:56-67`, `maxLength={4000}`; `supabaseFeedAPI.ts:336-341`
- What's wrong: The caption field allows 2,200 characters, but the database limit is 140. The title allows 100 against a limit of 80, comments 2,000 against 600, and DMs 4,000 against 1,000. Users type a long caption and only find out when they tap Share. ThreadModal clears the draft before sending and has no catch, so a failed or over-length message is lost and becomes an unhandled rejection. `markConversationRead` has no catch either (ThreadModal.tsx:52).
- Why it matters: This is lost user writing, which is one of the most irritating failures an app can have.
- Fix: Take limits from one shared constants module that also generates the SQL checks, set `maxLength` to match, and show a counter near the limit. Keep the draft until the send succeeds and show a failed-to-send bubble with retry.
- Effort: S

### SOC-20 · Thread and inbox rendering: wrong scroll position, and N+1 queries
- Severity: Medium
- Where: `src/screens/ThreadModal.tsx:97-121`; `src/screens/InboxModal.tsx:210-218`
- What's wrong: A thread renders every message in a non-virtualised `ScrollView` with no scroll to the end, so it opens at the oldest message. Each inbox row calls `useMessages(conversation.id)`, which fetches up to 500 messages per row just to show a preview. That's up to 100 threads × 500 rows on every inbox open.
- Why it matters: The inbox is slow and data-heavy, and chats open at the wrong end.
- Fix: Use an inverted `FlatList` with pagination for threads. Return the last-message preview from the inbox RPC (SOC-4).
- Effort: S

### SOC-21 · Follower and following lists are unbounded and unordered
- Severity: Medium
- Where: `src/social/supabaseFeedAPI.ts:741-763, 555-568`
- What's wrong: The code fetches every follower id, then `.in('id', allIds)` in a single GET. With a few hundred followers the URL passes PostgREST or gateway length limits and the request fails. There's no ordering or pagination.
- Why it matters: Popular accounts' follower lists break.
- Fix: Use one embedded query (`follows.select('created_at, profile:profiles!follower_id(...)')`) ordered by `created_at desc, follower_id` with a keyset and infinite scroll.
- Effort: S

### SOC-22 · Deletes can quietly do nothing, and files are left behind
- Severity: Medium
- Where: `src/social/supabaseFeedAPI.ts:980-989, 1296-1308`; `src/screens/ProfileSetupModal.tsx:176-183`; `0002_moderation_storage.sql:363-368`
- What's wrong: `deletePost` and `deleteComment` treat zero affected rows as success, so the UI reports success when RLS blocked the delete. Deleting a bite never removes its storage objects, and the buckets are public, so the photo stays reachable at its URL indefinitely. Every avatar change uploads a new object and never deletes the old one.
- Why it matters: This is a privacy issue ("I deleted it but the link still works") plus storage growth.
- Fix: Use `.delete().eq(...).select('id')` and throw when the result is empty. Clean up storage from an `after delete on bites` trigger through an Edge Function (or a queue table) that removes `bite-images/<uid>/<bite_id>/*`. Use a fixed avatar path (`avatars/<uid>/avatar.jpg`, `upsert: true`) with a cache-busting version in the URL.
- Effort: M

### SOC-23 · Handle rules are too loose
- Severity: Medium
- Where: `src/lib/handle.ts:40-55`; `0001_initial_schema.sql:74`; `0016_allow_handle_change.sql:10-14`; `src/social/supabaseFeedAPI.ts:682-697`; `0003_phase2.sql:399-444`
- What's wrong: There's no reserved-word list (admin, support, pantry, thepantry, official, and so on), no rename rate limit, and no hold period, so a handle freed by a rename can be taken immediately by someone impersonating that person. `isHandleAvailable` runs `.neq('id', viewerId)`; when the viewer id is still `'local-user'` that raises a uuid error and the check fails open (ProfileSetupModal.tsx:156-160). `handle_new_user` retries only on `unique_violation`, so a metadata handle that breaks the format check aborts signup.
- Why it matters: This invites impersonation and squatting, which Instagram-class apps defend against deliberately.
- Fix: Add a `reserved_handles` table checked in the RPC. Record `handle_changed_at` and allow one change per 14 days. Keep a `handle_history` table that holds old handles for 14–30 days. Normalise and validate the metadata handle in the trigger and fall back to `user_xxxx` on any invalid input.
- Effort: S

### SOC-24 · Reporting is brittle and has no moderation loop
- Severity: Medium
- Where: `src/screens/PostMenuSheet.tsx:69-80`; `src/screens/PostDetailModal.tsx:99-111`; `0002_moderation_storage.sql:56-74`; `0003_phase2.sql:216-220`
- What's wrong: Reporting the same target twice hits the unique constraint. PostMenuSheet doesn't catch the error (unhandled rejection, no confirmation). PostDetailModal swallows every error and still says "Thanks", even when the report failed. Reports store only `target_id`, with no content snapshot and no FK, so once the author deletes the content there's nothing to review. There's no reviewer tooling, no alert to the moderator and no automatic hiding at a threshold. Comment and profile reporting exist, but DM messages can't be reported.
- Why it matters: App Review 1.2 expects reports to be acted on promptly, and a report that silently fails counts against that.
- Fix: Use an `upsert ... ignoreDuplicates` and treat it as success. Snapshot the content (`target_snapshot jsonb`) with a trigger. Add `'message'` as a target kind. Notify the moderator (email or Slack webhook) on insert. Hide content automatically for review after N distinct reporters.
- Effort: M

### SOC-25 · The data layer has no cache, no offline awareness, and shows raw errors
- Severity: Medium
- Where: `src/social/useFeed.ts` (all hooks); `src/lib/queryClient.ts:32-34`; `supabaseFeedAPI.ts:514-522` and every `throw new Error('SupabaseFeedAPI/...')`
- What's wrong: TanStack Query is configured but unused. Every modal open refetches from scratch, with no dedupe or retry. Comments reset to `null` on each refresh (useFeed.ts:359), which flashes a spinner. There's no network detection. Errors reach users as internal strings such as "SupabaseFeedAPI/createPost: new row violates row-level security policy". Author names depend on a module-level sync cache that falls back to "@unknown" (FeedScreen.tsx:373, 573).
- Why it matters: The app feels slow, flickers, and shows technical errors.
- Fix: Use one query-key factory with `useQuery`, `useInfiniteQuery` and `useMutation`. Wire `onlineManager` with `expo-network`. Use an error mapper from Postgres or PostgREST codes to plain copy. Embed author profiles in the query instead of using a side cache.
- Effort: M

### SOC-26 · Image pipeline: double re-encoding and no resized versions
- Severity: Medium
- Where: `src/data/compressMedia.ts:53-94, 99-113`; `src/social/supabaseFeedAPI.ts:445-449`
- What's wrong: Photos are compressed at JPEG quality 0.7, then re-encoded again at 0.9 during upload. That's a second lossy pass that makes the file bigger. If compression fails the original is used, so a 12 MP HEIC can be re-encoded at full resolution and exceed the 8 MB bucket limit. Grid tiles and avatars download the full 1,080 px image, with no transformed renditions and no width or height stored (`bite_images.width/height` is never written). Avatars are resized on width only with no square crop.
- Why it matters: Feeds are slow and data-heavy on mobile, and layouts shift while images load.
- Fix: Compress once, then upload the file directly (as a file-URI upload, not base64). Store width, height and a blurhash. Serve tiles through Supabase image transforms (`?width=400`) or pre-generated 320/640/1080 renditions. Crop avatars to a square on the client.
- Effort: M

---

## Low

### SOC-27 · Comments are capped at the oldest 500 with no paging
- Severity: Low
- Where: `src/social/supabaseFeedAPI.ts:861-866`; `src/screens/PostDetailModal.tsx:144-151`
- What's wrong: Comments are fetched oldest-first with `.limit(500)`. Past 500, new comments, including the user's own just-posted one, never appear, even though the code scrolls to the end.
- Why it matters: It won't show at launch scale, but it breaks silently once a post gets popular.
- Fix: Use keyset pagination and optimistic insertion of the user's own comment.
- Effort: S

### SOC-28 · The draft ranked feed is wrong as written
- Severity: Low
- Where: `0013_feed_ranking_v1.sql:18-75`
- What's wrong: It runs as SECURITY INVOKER, so the `bite_likes` and `bite_bookmarks` counts obey RLS that only returns the viewer's own rows. Engagement is therefore effectively the viewer's own likes. `p_viewer` is caller-supplied instead of `auth.uid()`. A float score recomputed with `now()` on every call makes the `(score, id)` cursor unstable between pages, so posts repeat or get skipped.
- Why it matters: Applying it as-is would produce a feed that looks ranked but isn't, and that pages badly.
- Fix: Don't apply it. If ranking comes back, use denormalised counters, `auth.uid()`, and a snapshot timestamp passed with the cursor.
- Effort: M

### SOC-29 · Deleting an account erases the other person's copy of shared conversations
- Severity: Low
- Where: `0001_initial_schema.sql:280-281, 306`
- What's wrong: `dm_threads` participant FKs cascade, so when one person deletes their account, the other person loses the whole conversation.
- Why it matters: It's surprising for the person left behind, and it destroys abuse evidence.
- Fix: Point to a tombstone "Deleted user" profile, or set the column to null and render "Deleted account". Keep messages for the remaining participant.
- Effort: S

### SOC-30 · Docs drift and a loose search filter
- Severity: Low
- Where: `docs/HANDOVER-REBUILD-2026-09-28.md:109-110` vs `0016_allow_handle_change.sql:18-19`; `src/social/supabaseFeedAPI.ts:778-786`
- What's wrong: The handover says handles are locked by a trigger, but 0016 dropped it. `searchUsers` strips only `%` and `,`. It doesn't escape `_` (an ILIKE wildcard) or `(` and `)`, which can break the `.or()` filter. There's no trigram index, so search is a sequential scan.
- Why it matters: The docs mislead the rebuild, and search degrades as the user count grows.
- Fix: Correct the doc. Use an RPC `search_profiles(q)` with a `pg_trgm` GIN index on `handle` and `display_name` and proper escaping.
- Effort: S

---

## Target design for the social layer

**Principles.** The server enforces every rule: RLS plus narrow RPCs for anything multi-step. The client never sends a "toggle"; it sends the state it wants. Every list paginates with a keyset. Every write is idempotent through a client-generated id. The schema is the single source for limits.

**Schema essentials.**
- `profiles(id pk→auth.users, handle citext unique check format, handle_changed_at, display_name ≤50, bio ≤160, avatar_path, created_at)`. Counters (`followers_count`, `following_count`, `bites_count`) are updated only by triggers. Column grants allow `display_name, bio, avatar_path`. Handle changes go through `set_handle()`, which checks reserved words, a 14-day cooldown and `handle_history`.
- `bites(id uuid pk supplied by the client, author_id, caption ≤ N, recipe jsonb with size check, comments_enabled, created_at default now() enforced by trigger, deleted_at)`, with index `(created_at desc, id desc)` and `(author_id, created_at desc, id desc)`. `bite_media(bite_id, position, kind photo|video, path, width, height, blurhash, duration_ms)` with PK `(bite_id, position)`.
- `likes(user_id, bite_id)` and `saves(user_id, bite_id)` with PK plus a `bite_id` index. `comments(id, bite_id, author_id, body, created_at, deleted_at)` with index `(bite_id, created_at, id)`. If counts are ever shown, `bites.like_count` and `comment_count` are maintained by triggers.
- `follows(follower_id, following_id)` with PK and a reverse index. `blocks(blocker_id, blocked_id)` with PK and a reverse index. `is_blocked_between(a, b)` (security definer, stable) is used in every SELECT and INSERT policy in both directions. An after-insert trigger on blocks removes follows and notifications between the pair.
- `dm_threads(id, a, b, status pending|accepted, last_message_at, last_message_preview)`, with participants immutable, no client UPDATE or DELETE, and status set in a before-insert trigger from the follow graph. `dm_messages(id client uuid, thread_id, sender_id, body, shared_bite_id on delete set null, created_at, deleted_at)` with index `(thread_id, created_at desc, id desc)`. Only `deleted_at` is updatable. Add `dm_reads(thread_id, user_id, last_read_at)` and `dm_hidden(user_id, thread_id)`.
- `notifications(id, recipient_id, actor_id, type follow|comment|mention, bite_id, comment_id, created_at, read_at)`, with dedupe on `(recipient_id, actor_id, type, bite_id)` through upsert and index `(recipient_id, created_at desc, id desc)`. DMs don't create notification rows.
- `reports(id, reporter_id, target_kind incl. message, target_id, target_snapshot jsonb, reason, status, created_at)`, unique per reporter and target, with a webhook to the moderator and auto-hide after N reports.

**Query layer.** Keep `src/domain` pure (cursor codec, limits, error mapping). One `socialApi` module does typed Supabase calls. The RPCs are `feed_page(cursor)`, `profile_page(user, cursor)`, `inbox_page(cursor)` (thread, other profile, preview, unread), `thread_page(thread, cursor)`, `create_bite(payload)` (transactional), `set_like(bite, bool)`, `set_follow(user, bool)`, `send_message(id, thread|recipient, body, shared_bite)` (creates the thread lazily), `accept_thread`, `mark_thread_read`, `mark_notifications_read`, `search_profiles(q)`. Each page returns rows with the author profile embedded, so there's no sync user cache. Page size is 20 to 30, and the cursor is `(created_at, id)`.

**Cache and optimistic patterns (TanStack Query).**
- There's one key factory: `['feed']`, `['bite', id]`, `['profile', id]`, `['profilePosts', id]`, `['comments', biteId]`, `['inbox']`, `['thread', id]`, `['notifications']`, `['unread']`.
- Feeds, comments, threads and notifications use `useInfiniteQuery`, deduplicated by id across pages. Pull-to-refresh refetches page 1.
- Mutations use `onMutate`, which cancels queries, snapshots, and patches every cache holding the entity (feed pages, detail, profile). `onError` restores the snapshot and shows a toast. `onSettled` invalidates the narrow keys.
- New posts, comments and messages are inserted optimistically with their client uuid and a pending state. Failed items show "Tap to retry" and never lose text.
- Blocking removes the author's content from every cached page right away.
- Realtime channels cover `dm_messages` (per open thread), the viewer's `dm_threads`, and `notifications` (recipient = me). Each event writes directly into the cache.
- `focusManager` and `onlineManager` trigger a refetch on foreground and reconnect. Show an offline banner, and queue writes only for likes and saves.

**Media pipeline.** Pick with `asset.type` → compress once on the device (photos 1,440 px long edge, JPEG 0.8, EXIF stripped; video transcoded to 720p H.264, or no video in v1) → capture width, height and blurhash → upload the file directly to `bite-media/<uid>/<bite_id>/<pos>.<ext>` with `upsert: true` (resumable TUS for anything over 6 MB), showing progress and allowing cancel → call `create_bite` with paths. Serve through image transforms or renditions at 320, 640 and 1,080 px, using `expo-image` with a blurhash placeholder and cache policy. Add a nightly orphan sweep and a storage purge on bite or account delete. Add a moderation hook such as an image-safety API on insert, before the image is shown publicly.

**Notifications.**
- Rows are generated only by database triggers, deduplicated, and block-aware. There are no rows for DMs, since unread comes from `dm_reads`.
- Delivery works like this: an `after insert` webhook calls the `push` Edge Function, which loads `push_tokens`, checks the recipient's per-type preferences and quiet hours, collapses bursts (for example, "3 people followed you"), sends through the Expo Push API, and deletes dead tokens.
- DM pushes come from a `dm_messages` insert webhook, skipped when the recipient has the thread open. Presence can come later.
- Tokens are registered on sign-in and on app start, and deleted on sign-out.
- The payload carries a typed route (`thepantry://bite/<id>?comment=<cid>`, `thepantry://thread/<id>`, `thepantry://u/<handle>`). One handler serves cold start, background and foreground taps. The same routes serve as universal links for "Share" and "Copy link".
- Opening the Activity screen calls `mark_notifications_read(now())`, and the badge is derived from the `['unread']` query.
