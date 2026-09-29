# Security, privacy and backend-correctness audit: The Pantry (old app)

Source audited: read-only copy at `/home/claude/old-audit` (Expo SDK 54, Supabase, RevenueCat, OpenAI proxy, Sentry). Date: 2026-09-30.
Method: static review of every migration (0001–0016), both edge functions, the client data layer, auth, push, purchases, config, docs and scripts. **No live database was queried.** Wherever prod state could differ from the repo, the finding says so.

Secrets are redacted to their first 4 characters.

**Important context:** several fixes that `docs/AUDIT-FIXES-2026-06-10.md` records as committed are **not in this snapshot**. Examples are #2 (blocked-user filtering on feed, comments and search) and #20 (RevenueCat erasure in delete-account, plus `supabase/config.toml`). The source you ship from may not be the source the docs describe. Treat every "fixed" claim in the docs as unverified until someone confirms it against the branch that actually builds.

Counts: **Critical 0 · High 5 · Medium 10 · Low 10**

---

### SEC-1 · Blocking does not hide the blocked user's content from the blocker
- Severity: High
- Where: `supabase/migrations/0002_moderation_storage.sql:322-345`, `supabase/migrations/0003_phase2.sql:233-237`, `src/social/supabaseFeedAPI.ts:574-595` (getFeed), `:851-870` (getComments), `:765-797` (searchUsers), `src/social/notifications.ts:186-194`
- What's wrong: RLS only hides the **blocker's** content from the **blocked** user. The comment at 0002:322-326 says the other direction ("hide B from A") "is enforced in the FeedAPI". It isn't. `getFeed`, `getComments`, `getPostsByUser`, `searchUsers` and the cloud notifications query never read `blocks`. Only `getConversations` filters by blocks (`supabaseFeedAPI.ts:1055-1085`). `grep fetchBlockedIds` finds nothing, even though AUDIT-FIXES #2 says it was added. Meanwhile the confirmation copy promises "You won't see their bites or hear from them in messages" (`src/screens/PostMenuSheet.tsx:88`, `UserProfileModal.tsx:106`).
- Why it matters: a harassed user blocks someone and keeps seeing that person's posts, comments on their own posts, and follow/comment notifications. App Review tests block during 1.2 review, and a block that visibly does nothing is a common rejection. It also breaks the promise the UI makes.
- Fix: enforce both directions in RLS. Add `or exists(select 1 from blocks where blocker_id = (select auth.uid()) and blocked_id = bites.author_id)` to the NOT-EXISTS in the `bites`, `comments`, `bite_images` and `profiles` (except self) SELECT policies, and filter `notifications` where `actor_id` is blocked. Doing it in the DB removes the need for client-side subtraction. Add a two-account test.
- Effort: M

### SEC-2 · No way to report or block from a DM, and a harasser can erase the evidence
- Severity: High
- Where: `supabase/migrations/0002_moderation_storage.sql:61` (`target_kind in ('bite','profile','comment')`), `src/screens/ThreadModal.tsx` (no report/block affordance; only close, open author, send, open shared post at :78-178), `supabase/migrations/0001_initial_schema.sql:775-782` (`dm_threads_delete_participant`), `0001:303-305` (messages cascade on thread delete)
- What's wrong: messages can't be reported (`reports.target_kind` has no `message` or `thread`), and ThreadModal has no report or block control. Either participant can hard-DELETE the thread, which cascades and deletes every message for **both** people. That contradicts the design note at 0001:819-820 ("Keeps abuse-report trail intact").
- Why it matters: DMs are the highest-abuse surface. The recipient has no in-context way to report, and the sender can wipe the conversation before anyone reviews it. Apple 1.2 requires a way to report offensive content wherever users can receive it.
- Fix: add `'message'` to `target_kind` and a Report + Block action in ThreadModal and InboxModal rows. Replace the thread DELETE policy with a per-user "hide" (a `dm_thread_hidden(user_id, thread_id)` table) so one party can't destroy the other's copy. Snapshot the reported content into `reports` (e.g. a `content_snapshot jsonb`) at report time.
- Effort: M

### SEC-3 · Reports go nowhere: no moderation alert, tooling or real contact (can't meet 24h action)
- Severity: High
- Where: `supabase/migrations/0002_moderation_storage.sql:49-69, 230-241` (insert-only table, "moderation tooling (service-role) reads"), `supabase/functions/` (only `ai-proxy` and `delete-account`), `legal/TERMS.md:361` (`legal@thepantry.app _(replace with real contact)_`), `legal/PRIVACY.md:26` (same placeholder)
- What's wrong: reports are written to a table nobody is told about. There is no webhook, email, edge function, admin screen, "banned" flag, or content-removal path other than the Supabase dashboard. The published contact addresses are placeholders. `docs/APP-REVIEW-AUDIT.md:60,90` lists this as open.
- Why it matters: App Review 1.2 expects the developer to act on reports (Apple's guidance is to remove content and eject offenders within 24 hours) and to publish contact information. As it stands, a report of illegal content could sit unseen indefinitely.
- Fix: add a DB webhook or trigger on `reports` insert that emails or pushes to a monitored inbox. Add a `profiles.suspended_at` column that RLS respects on insert policies. Document a runbook for removing content with the service role. Replace both placeholder emails with a monitored address before submission.
- Effort: M

### SEC-4 · Posts, avatars and comment images accept any URL and can be swapped after publishing
- Severity: High
- Where: `supabase/migrations/0001_initial_schema.sql:118` (`media_url text not null`, no constraint), `:68` (`avatar_url text`), `0003_phase2.sql:73-79` (`image_ref` ≤1024 chars, any value), `0003:112-125` (`bite_images.url` any value), `0001:586-590` (`bites_update_self`, no column restriction), `src/data/resolveImage.ts:23,34` (renders any `https:`/`http:`/`file:`/`data:` ref), `src/social/supabaseFeedAPI.ts:418` (`uploadToBucket` passes `https?:` refs straight through)
- What's wrong: a user can call the REST API directly and set `media_url`, `avatar_url`, `image_ref` or `bite_images.url` to any external URL. `bites_update_self` also lets the author change `media_url`, `caption`, `created_at` and every other column after posting. The app never updates bites, so this policy is unnecessary surface.
- Why it matters: (a) Bait-and-switch: post a clean image, pass review or a report check, then point `media_url` at explicit content, which bypasses the bucket MIME and size limits and any future image moderation. (b) Every viewer's device fetches the attacker's server, so they can log IPs and timing. (c) Setting `created_at` far in the future pins a post to the top of the chronological feed permanently.
- Fix: add CHECK constraints requiring `media_url`, `avatar_url`, `image_ref` and `bite_images.url` to start with `https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/` followed by the author's uid (or store only the storage path and build the URL client-side). Drop `bites_update_self`, or column-grant it to `caption, meal_name, comments_enabled` only. Default `created_at` and revoke UPDATE on it.
- Effort: M

### SEC-5 · SQL seed creates confirmed accounts with a known dictionary password (confirm whether it ran on prod)
- Severity: High (if applied to prod; otherwise Low)
- Where: `supabase/seeds/0001_simulated_users_and_bites.sql:29-33` (claims "no one knows the plaintext"), `:50-66` (`crypt('plac…', gen_salt('bf'))`, `email_confirmed_at = now()`, emails `sim+…@thepantry.test`); `scripts/seedFullCatalogAsBites.mjs:1-25` depends on these users existing
- What's wrong: the seed's password is a literal, guessable word, not random, and the accounts are pre-confirmed. `seedFullCatalogAsBites.mjs` fans ~285 bites across these accounts, which suggests the seed was run against the cloud project. (`scripts/seedCloud.mjs:360` correctly uses `randomUUID()`.)
- Why it matters: anyone who reads the repo, or guesses, can sign in as "Sarah Chen" and the other nine accounts, then post, DM and comment as them. Seeded fake users in the production feed also break the app's own "No fake" rule and risk App Review 2.3 or 5.x issues.
- Fix: **needs the live DB.** Run `select id, email from auth.users where id::text like '11111111-%'`. If rows exist, run the cleanup block (`:271-274`) or at least rotate the passwords, and revoke their sessions. Change the seed to `crypt(gen_random_uuid()::text, …)` and add a guard so it can't run against prod.
- Effort: S

### SEC-6 · The DM request folder isn't implemented; any participant can rewrite a thread
- Severity: Medium
- Where: `supabase/migrations/0001_initial_schema.sql:276-290` (status 'pending'/'accepted'), `:763-773` / `0010:69` (`dm_threads_update_participant`, no column limits, no block check), `0003:284-293` (insert doesn't restrict `status`), `src/social/supabaseFeedAPI.ts:1089-1126` (`ensureConversation` never sets or reads status), `0003:362-378` (`get_unread_total` counts only `status='accepted'`)
- What's wrong: every thread stays `pending` forever, so `get_unread_total()` always returns 0 in the cloud and every DM notification is typed `dm_request`. Strangers' messages land straight in the inbox. At the DB level, the initiator can insert with `status='accepted'`, or later UPDATE `status`, `accepted_at`, `last_message_at` (to pin a thread to the top) and even `participant_b_id` (the WITH CHECK only requires the caller to stay a participant). The UPDATE policy has no block check. Message INSERT does still check blocks, so a blocked user can't actually deliver.
- Why it matters: unsolicited-DM protection is client-assumed and not enforced. The unread badge is broken.
- Fix: make `status`, `accepted_at` and the participant columns immutable to clients (trigger or column grants). Add a SECURITY DEFINER `accept_thread(thread_id)` that only the non-initiator can call (store `initiator_id`). Force `status='pending'` on insert unless the users are mutual followers (computed in a trigger). Add a Requests view in the client.
- Effort: M

### SEC-7 · Comment authors can move their comments onto any bite, including blockers' posts and posts with comments off
- Severity: Medium
- Where: `supabase/migrations/0001_initial_schema.sql:620-624` / `0010:59` (`comments_update_self`: using/check only `author_id`)
- What's wrong: the UPDATE WITH CHECK doesn't repeat the INSERT policy's `comments_enabled` check or any block check, so `bite_id` (and `created_at`, `rating`, `image_ref`) are mutable. The FK check ignores RLS, so a blocked user who kept an old bite UUID can re-home a comment onto the blocker's post. The client never edits comments (no `.update` on comments in `supabaseFeedAPI.ts`).
- Why it matters: it bypasses both the per-post comment toggle and blocks. A comment's content can also be edited after it's been reported (see SEC-8).
- Fix: drop `comments_update_self`, since editing isn't a feature. If editing is wanted later, allow updates to `body` only through a column grant and a trigger that locks `bite_id` and `created_at`.
- Effort: S

### SEC-8 · DM senders can silently edit or un-delete messages, and "deleted" messages stay readable
- Severity: Medium
- Where: `supabase/migrations/0011_lock_profile_counts_and_dm_message_columns.sql:42-64` (locks only `thread_id`, `sender_id`, `created_at`), `0001:813-817` (`dm_messages_update_sender`), `0003:307-319` (SELECT doesn't filter `deleted_at`), `src/social/supabaseFeedAPI.ts:1137` (client-side `.is('deleted_at', null)` only)
- What's wrong: previous finding L1 is only **partly fixed**. `body`, `shared_post_id` and `deleted_at` are still client-mutable, so a sender can rewrite a threatening message after it's reported, or un-delete it. Soft-deleted rows stay fully readable by the other participant through the API, because only the client hides them.
- Why it matters: this undermines the evidence trail and makes "delete message" a false promise to the user.
- Fix: extend the trigger so the only permitted change is `deleted_at` going from null to now(). On soft-delete, null the `body` into an audit table readable only by the service role. Add `deleted_at is null` to the SELECT policy.
- Effort: S

### SEC-9 · Blocked users can still follow the blocker and trigger notifications; nothing throttles follow spam
- Severity: Medium
- Where: `supabase/migrations/0001_initial_schema.sql:562-565` (`follows_insert_self`, no block check), `0001:424-440` (`notify_on_follow` fires on every insert), `0001:557-560` (follow graph readable by everyone, including blocked users)
- What's wrong: blocking doesn't remove existing follows or stop new ones. Every follow insert creates a notification with no dedupe, so a follow/unfollow loop floods any user's notifications.
- Why it matters: harassment keeps working after a block, and notifications are the channel the blocker can't escape.
- Fix: add a NOT EXISTS block check (both directions) to `follows_insert_self`. Add an AFTER INSERT trigger on `blocks` that deletes follows in both directions. Dedupe `notify_on_follow` (skip if the same actor/recipient/type was notified within 24h).
- Effort: S

### SEC-10 · Deleting a post or comment leaves its photos publicly fetchable
- Severity: Medium
- Where: `src/social/supabaseFeedAPI.ts:1296-1310` (`deletePost` deletes the row only), `:980-989` (`deleteComment`), `supabase/migrations/0002_moderation_storage.sql:363-368` (all three buckets `public: true`)
- What's wrong: storage objects are only purged on full account deletion (`supabase/functions/delete-account/index.ts:373-386`). Deleting one post, one comment or replacing an avatar leaves the old file at its public URL permanently.
- Why it matters: a user who deletes a photo they regret, such as one showing their home or kids, reasonably expects it gone. It stays reachable by anyone who saved the link. That's a privacy and GDPR-erasure gap.
- Fix: add an AFTER DELETE trigger on `bites`, `bite_images` and `comments` (and a BEFORE UPDATE of `avatar_url` on profiles) that enqueues the storage path for deletion, handled by an edge function or `storage.delete_object` with the service role. Alternatively, delete from storage client-side before the row.
- Effort: M

### SEC-11 · Account deletion misses Apple token revocation and RevenueCat erasure (documented fix is absent)
- Severity: Medium
- Where: `supabase/functions/delete-account/index.ts:344-395` (storage purge plus `auth.admin.deleteUser` only), `docs/AUDIT-FIXES-2026-06-10.md:23` (claims "delete-account RC subscriber DELETE; config.toml verify_jwt"; neither exists in this copy, and there's no `supabase/config.toml`), `src/auth/socialLogin.ts:75-102` (Sign in with Apple offered)
- What's wrong: (a) Apple requires apps that offer Sign in with Apple to revoke the user's Apple token through `appleid.apple.com/auth/revoke` when the account is deleted. Nothing does this, and Supabase doesn't do it automatically. (b) The RevenueCat subscriber record, keyed by the Supabase uid, is never deleted. (c) Deletion cascades also delete every report the user filed (`reports.reporter_id … on delete cascade`, 0002:58) and all their DMs, so an abuser can escape review by deleting their account. (d) There's no recent-auth check: one stolen JWT is enough for an irreversible delete.
- Why it matters: Apple has rejected apps for missing SIWA revocation under 5.1.1(v). RevenueCat retention is a privacy-policy mismatch.
- Fix: capture the Apple `authorizationCode` at sign-in and store the refresh token server-side, then revoke it in delete-account. Call `DELETE https://api.revenuecat.com/v1/subscribers/{uid}`. Before deleting, copy the user's reported content or reports into a service-role-only retention table. Commit `supabase/config.toml` with `verify_jwt = true` for both functions. Optionally require a fresh sign-in (check the `iat` claim is within 5 minutes).
- Effort: M

### SEC-12 · Repo migrations don't reproduce prod; replaying them re-opens previously fixed holes
- Severity: Medium
- Where: `supabase/migrations/0006_restore_grants.sql:25-36` (`grant all on all tables … to anon, authenticated` plus default privileges), `0011_…:32-38` (column-level REVOKE), `0011a_fix_profile_counts_table_grant.sql:4-12` ("RECONSTRUCTED — NO ORIGINAL FILE EXISTS"), `0009:64-80` (`rls_auto_enable` "created out-of-band"), `docs/HANDOVER-REBUILD-2026-09-28.md:117` ("realtime enabled", not in any migration)
- What's wrong: in Postgres, a column-level REVOKE has **no effect** while a table-level UPDATE grant exists. 0006 granted table-level ALL and nothing in the repo revokes it, so replaying 0001→0016 leaves `followers_count` and `following_count` client-writable (previous L2 comes back). The reconstructed 0011a also omits `handle` from the column grant, which would conflict with 0016's handle-rename feature if the grant were effective. `docs/AUDIT-SECURITY-SOCIAL-2026-06-10.md` says prod has "no table-level UPDATE grant" and handle in the column list, so prod appears to differ from the repo. 0006 also leaves anon with TRUNCATE, TRIGGER and REFERENCES on every table and default ALL on future tables. The RLS-auto-enable safety net that mitigates this isn't in source.
- Why it matters: any rebuild, branch DB or disaster recovery from these files silently produces a less secure database. It also means this audit can't vouch for prod.
- Fix: dump prod (`supabase db dump --schema public,storage` plus `pg_policies` and grants) and commit it as the baseline. In the new app, start from explicit least-privilege grants: `revoke all on all tables in schema public from anon`; grant `authenticated` only what each table needs; no table-level UPDATE where column grants are intended. Commit the event trigger and realtime publication SQL. **Needs the live DB** to confirm current grants (`select grantee, privilege_type from information_schema.role_table_grants where table_name='profiles'`).
- Effort: M

### SEC-13 · Push tokens survive sign-out and "notifications off", contradicting the privacy policy
- Severity: Medium
- Where: `src/auth/signOutEverywhere.ts:19-33` (no push_tokens delete), `src/screens/SettingsModal.tsx:85-87` (toggle off returns early, no delete), `src/push/pushClient.ts:147-173` (the in-code comment accepts that stale rows under the previous user remain), `legal/PRIVACY.md:60` ("can be removed by toggling notifications off")
- What's wrong: tokens are keyed `(user_id, token)`. After user A signs out and B signs in on the same phone, A's row still points at that device. No delivery worker exists yet (`supabase/functions/README.md:567-570`), so nothing is sent today. Once one ships, A's DM previews go to B's device. Turning notifications off doesn't remove the token either, despite the policy saying it does.
- Why it matters: this is a cross-account notification leak waiting to happen, and there's a misstatement in the privacy policy right now.
- Fix: delete `push_tokens where token = <this device>` on sign-out and on toggle-off. On register, delete any row with the same token under another user (needs a SECURITY DEFINER `claim_push_token(token)`). Make `token` unique on its own.
- Effort: S

### SEC-14 · No objectionable-content filtering or impersonation controls
- Severity: Medium
- Where: `src/lib/handle.ts:25-33` (format only), `supabase/migrations/0016_allow_handle_change.sql:10-19` (renames allowed, no rate limit or reserved list), `src/social/supabaseFeedAPI.ts:1213-1294` (no text or image screening before insert)
- What's wrong: captions, comments, DMs, display names, bios and images go live without any filter. Handles like `thepantry`, `support`, `admin` or `apple` are claimable. Unlimited renames free up old handles for squatters to impersonate.
- Why it matters: App Review 1.2 explicitly asks for "a method for filtering objectionable material from being posted". Report-and-block alone is often not enough for approval, and impersonating an official account is a common scam vector.
- Fix: add a reserved-handle list (DB CHECK or trigger) and a rename cooldown (e.g. `handle_changed_at`, 30 days). Add a server-side text filter (a profanity/slur list trigger, or the OpenAI moderation endpoint through an edge function) on bites, comments, DMs and profiles. Optionally run image moderation on upload through a storage webhook.
- Effort: M

### SEC-15 · Production may ship fabricated social activity if the cloud flag isn't set
- Severity: Medium (needs EAS confirmation)
- Where: `src/social/feedApi.ts:237-245` (falls back to the local API unless `EXPO_PUBLIC_SUPABASE_ENABLED === '1'`), `src/social/notifications.ts:1-12, 45-60` (local mode synthesises notifications from `SIMULATED_USERS`), `eas.json` production profile (sets only the RevenueCat key and Sentry flag; Supabase vars come from the EAS "production" environment, which isn't visible here)
- What's wrong: if the EAS production environment is missing `EXPO_PUBLIC_SUPABASE_ENABLED=1` (or the URL or key), the shipped app shows a simulated feed, followers and notifications from fake people.
- Why it matters: App Review can treat fake social activity as misleading (2.3, 5.6), and it contradicts the privacy disclosures.
- Fix: run `eas env:list --environment production` and confirm the three vars. Better: in release builds, fail loudly or hide social when cloud config is missing, rather than simulating.
- Effort: S

### SEC-16 · Unbounded profile and post fields in the DB
- Severity: Low
- Where: `supabase/migrations/0001_initial_schema.sql:66-69` (`display_name` has no max, `location` and `avatar_url` unbounded), `0004_bite_recipe.sql:31-32` (`recipe jsonb` unbounded), `0001:122-123` (`recipe_ref`, `recipe_source` unbounded), `0002:115-122` (`push_tokens.token` unbounded)
- What's wrong: previous finding L5 is only **partly fixed**. The 50-character display-name cap (`src/lib/auth.ts:42`) and other caps exist only in the client, and a direct API call can store megabytes.
- Why it matters: storage and egress abuse, UI breakage for every viewer, and possible bloat in the ranked feed or search.
- Fix: add CHECKs (`length(display_name) <= 50`, `location <= 80`, `pg_column_size(recipe) <= 32768`, URL columns <= 1024, `token <= 256`).
- Effort: S

### SEC-17 · AI proxy: minor cost-abuse and information-leak gaps
- Severity: Low
- Where: `supabase/functions/ai-proxy/index.ts:105` (RevenueCat REST call on every request, before body parsing and before any rate limit), `:203, :213` (echoes OpenAI error text to the client), `:282-288` (`Access-Control-Allow-Origin: *`), `:125-130` (free-form client prompt)
- What's wrong: previous finding H1 **is fixed**: Pro entitlement is checked fail-closed and there's a 50/day cap through `bump_ai_usage` (0012). Remaining gaps: any free account can script unlimited calls that each hit the RevenueCat API, which could get you rate-limited by RevenueCat and deny real Pro users with 503s. Upstream error bodies can leak internals. The prompt is fully client-controlled, so a Pro user gets general-purpose GPT-4o (bounded by the cap).
- Why it matters: small cost and availability risk, and small information leak.
- Fix: cache the entitlement per uid for about 5 minutes (a KV or DB table updated by a RevenueCat webhook is better). Count denied attempts too. Return a generic error message. Build the prompt server-side from a `task` enum (`pantry_scan`, `receipt_scan`) instead of accepting raw prompts.
- Effort: S

### SEC-18 · Google sign-in still has no nonce, and leaked-password protection is still off
- Severity: Low
- Where: `src/auth/socialLogin.ts:136-178` (no nonce on the Google path), `docs/HANDOVER-REBUILD-2026-09-28.md:243` ("[ ] Supabase: turn on leaked-password protection")
- What's wrong: previous finding L4 is fixed for Apple (`:81-90`) but deferred for Google. L6 (HaveIBeenPwned check) is still an open dashboard toggle according to the latest handover.
- Why it matters: weaker replay protection, and users can pick breached passwords.
- Fix: pass a nonce through `Google.useAuthRequest({ extraParams: { nonce } })` and on to `signInWithIdToken`. Turn on leaked-password protection, confirm "Confirm email" is on, and set auth rate limits in the dashboard (**needs dashboard**).
- Effort: S

### SEC-19 · Sentry scrubber misses messages, breadcrumb URLs and transactions
- Severity: Low
- Where: `src/lib/sentry.ts:55-56, 100-111`
- What's wrong: `scrubPii` redacts only denylisted **keys** in `extra`, `contexts` and breadcrumb `data`. It doesn't touch `event.message`, exception values (e.g. `supabaseFeedAPI.ts:434-437` puts local file URIs in error text) or breadcrumb `data.url`. Supabase REST URLs include search terms (`handle.ilike.%<query>%`) and uids. `beforeSendTransaction` isn't scrubbed at all. Sending is on by default (`:25`) before the stored opt-out loads. Note: no DSN is currently set (`docs/HANDOVER-REBUILD-2026-09-28.md:75`), so nothing is sent today.
- Why it matters: search queries and user ids could reach a third party, which the privacy policy says doesn't happen for content.
- Fix: strip query strings from breadcrumb URLs, run messages through a regex scrubber (emails, JWTs, file paths), scrub transactions too, and start `sendingEnabled = false` until the preference loads.
- Effort: S

### SEC-20 · SECURITY DEFINER functions use `search_path = public` instead of an empty path
- Severity: Low
- Where: `0001:368-373, 424-429, 445-450, 475-480`, `0003:362-367, 399-404`, `0008:38-43`, `0012:31-36`
- What's wrong: every SECURITY DEFINER function pins `search_path = public`. This is **not exploitable today**: all table references are schema-qualified, and `authenticated` can't create objects in `public` by default (**needs live DB** to confirm `CREATE` isn't granted on schema public). It still isn't the hardened form, because `pg_temp` is implicitly searched first for relations.
- Why it matters: this is defence in depth against a future unqualified reference.
- Fix: use `set search_path = ''` in the new app and fully qualify everything, including `auth.uid()`.
- Effort: S

### SEC-21 · Draft `ranked_feed` trusts the caller-supplied viewer id and miscounts under RLS
- Severity: Low (not applied in prod, per `docs/HANDOVER-REBUILD-2026-09-28.md:118`)
- Where: `supabase/migrations/0013_feed_ranking_v1.sql:18-23, 43-45, 51-53`
- What's wrong: `p_viewer` is a parameter instead of `auth.uid()`. Because the function is SECURITY INVOKER, the like and bookmark counts only see the **caller's own** rows (both tables are owner-only RLS), so the "engagement" score is really the viewer's own likes.
- Why it matters: it's broken, and it's a pattern that shouldn't be copied into v2.
- Fix: don't apply it. If ranking is ever needed, use trigger-maintained counters and derive the viewer from `auth.uid()`.
- Effort: S

### SEC-22 · Sign-out leaves the previous user's local data on the device
- Severity: Low
- Where: `src/store/useStore.ts:690-697` (`signOutProfile` clears only profile and entitlement), `src/screens/HomeScreen.tsx:676-684`
- What's wrong: previous finding M2 (RevenueCat logout) **is fixed** through `signOutEverywhere`. But the plan, cart, pantry, cook log and local social cache (`wipeLocalSocialCache` runs only on account delete, `supabaseFeedAPI.ts:1424`) persist in AsyncStorage for the next person on a shared device. There's also no user-facing "sign out of all devices" (`signOut({allDevices:true})` is only used on delete, `useStore.ts:718`).
- Why it matters: minor privacy leak on shared devices, and no response option after a lost phone.
- Fix: on sign-out, wipe user-scoped slices (keep only device preferences). Add "Sign out everywhere" in Settings, which calls `scope:'global'`.
- Effort: S

### SEC-23 · Video posts can't upload (bucket rejects video/mp4), yet the app requests the microphone
- Severity: Low (backend correctness)
- Where: `supabase/migrations/0002_moderation_storage.sql:366` (`bite-images` allows images only), `src/social/supabaseFeedAPI.ts:424-427` (uploads `video/mp4` to `bite-images`), `app.json` (microphone and RECORD_AUDIO permissions)
- What's wrong: if the prod bucket matches the migration (**needs live check**), every video bite fails at upload, and the app still asks for microphone permission.
- Why it matters: a broken feature plus a permission the app can't justify. App Review 5.1.1 asks that permissions requested are actually used.
- Fix: either add a `bite-videos` bucket (size-limited, `video/mp4`) or remove video and the microphone permissions.
- Effort: S

### SEC-24 · Privacy manifest and policy inaccuracies
- Severity: Low
- Where: `app.json` `ios.privacyManifests` (no `NSPrivacyAccessedAPITypes`), `legal/PRIVACY.md:53-55` (says cooking preferences, plan, cart and pantry are "Synced to Supabase if signed in"; there are no such tables), `:26` placeholder email, `:60` (see SEC-13)
- What's wrong: the required-reason API declarations (UserDefaults via AsyncStorage/SecureStore, file timestamps, system boot time) aren't declared in app.json. Expo SDK 54 pods mostly ship their own manifests, but App Store Connect has issued ITMS-91053 warnings for Expo apps that override `privacyManifests` without them (**confirm on the next upload**). The policy also overstates what's synced. The collected-data list otherwise matches the code (email, name, user id, photos, UGC, DMs, purchases, device id, diagnostics).
- Why it matters: App Store Connect warnings or rejection, and a privacy policy that doesn't match reality.
- Fix: add `NSPrivacyAccessedAPITypes` (CA92.1 UserDefaults, C617.1 file timestamp, 35F9.1 boot time as applicable). Correct the sync table in PRIVACY.md, and replace the placeholder contact.
- Effort: S

### SEC-25 · Committed publishable keys and project identifiers (informational)
- Severity: Low
- Where: `eas.json` (`EXPO_PUBLIC_REVENUECAT_IOS_KEY`: `appl…` production and `test…` development), `.env:1-4` (gitignored; Supabase URL `https://bxeb…`, anon JWT `eyJh…` with `role: anon`), `docs/security-fixes/ai-proxy-entitlement-and-ratelimit.md:11` (project ref)
- What's wrong: a broad grep (JWTs, `sk-`, `sk_`, `sb_secret_`, `AIza`, `ghp_`, Sentry DSNs) found **no service-role, OpenAI, RevenueCat secret or other server secrets** anywhere, including `scripts/` and `docs/`. The previous M3 fix is confirmed: the service-role key is gone from `.env` (the comment at `.env:6-15` remains). What's committed are publishable keys, which are designed to ship. The RevenueCat `test…` key is a Test Store key; if a build carrying it leaked to users, purchases wouldn't be real.
- Why it matters: low. Publishable keys are public by design, and security rests on RLS and server checks. Whether the service-role key was ever pasted outside the laptop can't be verified from source.
- Fix: keep keys in EAS environments rather than `eas.json`. Rotate the service-role key once before launch as cheap insurance (dashboard, then update function secrets).
- Effort: S

---

## Previously reported issues: verification against this code

| ID (source doc) | Claim | Status in this snapshot | Evidence |
|---|---|---|---|
| H1 (SECURITY-AUDIT-2026-06-09) | ai-proxy lacked Pro check and rate limit | **Fixed** | `ai-proxy/index.ts:102-111, 147-161`; `0012` |
| H2 | Forgeable persisted `isPro` | **Fixed** (iOS prod with RC key) | `useStore.ts:66-83` (`revenueCatKeyConfigured`); `devToggleProMode` blocked outside `__DEV__` (`:829`) |
| M1 | Session in AsyncStorage | **Fixed** | `src/lib/supabase.ts:89`, `secureSessionStorage.ts` (Keychain, A/B atomic write) |
| M2 | RevenueCat not logged out on sign-out | **Fixed** | `src/auth/signOutEverywhere.ts:19-33`; wired at `HomeScreen.tsx:681`, `ProfileModal.tsx:111` |
| M3 | Service-role key in `.env` | **Fixed** (rotation unverifiable) | `.env` has no such key |
| L1 | DM thread_id/sender_id mutable | **Partly fixed**: body/deleted_at/shared_post_id still mutable | `0011:42-64` → SEC-8 |
| L2 | Follower counts user-writable | **Unverifiable / broken in repo**: column REVOKE is ineffective against 0006's table grant; prod reportedly OK | SEC-12 |
| L3 | Google userinfo call | **Fixed** | `socialLogin.ts:160-174` |
| L4 | No sign-in nonce | **Fixed for Apple, open for Google** | SEC-18 |
| L5 | No length caps | **Partly fixed** (client caps; several DB columns unbounded) | SEC-16 |
| L6 | Leaked-password protection off | **Open** (dashboard) | HANDOVER-REBUILD:243 |
| I1 | comment-images public | Accepted; still public | 0002:367 |
| I2 | Direct-OpenAI path | **Fixed** | `src/pro/ai/client.ts:42-51` |
| I5 | Sentry PII | **Partly fixed** | SEC-19 |
| AUDIT-FIXES #1 | Storage purge on delete | **Fixed** | `delete-account/index.ts:373-438` |
| AUDIT-FIXES #2 | Blocked users filtered from feed/comments/search | **NOT present** | SEC-1 |
| AUDIT-FIXES #14 | Quota bumped after validation | **Fixed** | `ai-proxy/index.ts:142-161` |
| AUDIT-FIXES #17 | Default EXECUTE footgun | **Fixed for routines** (tables still default-granted to anon) | `0014`; SEC-12 |
| AUDIT-FIXES #20 | RC erasure + config.toml verify_jwt | **NOT present** | SEC-11 |
| APP-REVIEW-AUDIT (d) | Comment reporting | **Fixed** | `PostDetailModal.tsx:106`; `supabaseFeedAPI.ts:1327-1340` |
| APP-REVIEW-AUDIT (d) | Contact email placeholder | **Open** | `legal/TERMS.md:361` |
| SECURITY-AUDIT "no inbound deep links" | — | **Still true** (no `getInitialURL` or `addEventListener('url')`; `detectSessionInUrl:false`) | `supabase.ts:100` |

## RLS coverage matrix (from migrations; prod needs `pg_policies` confirmation)

| Table | RLS | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|---|---|---|---|---|---|
| profiles | on | all auth, minus profiles that blocked you | none (trigger) | self (column grants unclear, SEC-12) | none | handle renames unrestricted (SEC-14) |
| follows | on | `true` | self | none | self | no block check (SEC-9) |
| bites | on | minus blockers | self | self, all columns (SEC-4) | self | reverse block missing (SEC-1) |
| bite_images | on | via parent | author | none | author | url unconstrained (SEC-4) |
| comments | on | minus blockers | self + comments_enabled | self, all columns (SEC-7) | self or bite author | |
| collections / collection_items / recipe_bookmarks / bite_bookmarks / bite_likes | on | self | self | self (collections) | self | OK |
| dm_threads | on | participants, block-aware | participant, no block | participant, any column (SEC-6) | either participant (SEC-2) | |
| dm_messages | on | participants, block-aware, **incl. deleted** | sender + block-aware | sender, body mutable (SEC-8) | none | |
| dm_thread_reads | on | self | self (no participation check, harmless) | self | none | |
| notifications | on | recipient | none (triggers) | recipient | recipient | blocked actors not filtered |
| reports | on | none | self | none | none | no `message` kind (SEC-2) |
| blocks | on | self | self | none | self | OK |
| push_tokens | on | self | self | self | self | stale rows (SEC-13) |
| ai_usage | on | none | none | none | none | service role only; OK |
| storage (3 buckets) | public read | public | own `{uid}/` folder, MIME + size limits | own folder | own folder | no quota, orphaned files (SEC-10) |

No `using (true)` policy exists except `follows` SELECT, which is intentional. No path was found for reading another user's DMs, bookmarks, likes, blocks, reports or push tokens, or for writing as another user (all INSERT policies bind the author column to `auth.uid()`).

---

## App Store UGC & privacy checklist

| Requirement | Status | Evidence |
|---|---|---|
| 1.2: Method to filter objectionable material before it's posted | **Missing** | No text or image filter anywhere (SEC-14) |
| 1.2: Mechanism to report offensive content | **Partly** | Posts (`PostMenuSheet.tsx:69-77`), comments (`PostDetailModal.tsx:106`), profiles (`UserProfileModal.tsx:116-122`); **no DM or message reporting** (SEC-2) |
| 1.2: Ability to block abusive users | **Partly** | Block exists in UI and DB, but the blocker still sees the blocked user's posts, comments and notifications, and the blocked user can still follow (SEC-1, SEC-9); no block in DM thread |
| 1.2: Timely response to reports (24h) | **Missing** | Reports aren't routed to anyone; no tooling or suspension flag (SEC-3) |
| 1.2: Published contact information | **Missing** | Placeholder emails in `legal/TERMS.md:361`, `legal/PRIVACY.md:26` |
| 1.2: Users agree to terms (EULA) with zero tolerance for objectionable content | **Partly** | Onboarding checkbox "I'm 13+ and agree to the Terms" (`OnboardingModal.tsx:229-249`), browsewrap on sign-in (`SignInScreen.tsx:430`); Terms §5 lists prohibited content but has no explicit "no tolerance / immediate removal" statement, and consent isn't recorded server-side |
| 5.1.1(v): In-app account deletion | **Met (with gaps)** | Settings → Delete, calls the `delete-account` edge function first and wipes locally only on success (`HomeScreen.tsx:685-727`); deletes storage and auth user (cascade). Gaps: no SIWA token revocation, no RevenueCat erasure (SEC-11) |
| 4.8: Sign in with Apple offered alongside Google | **Met** | `socialLogin.ts:75-102` with nonce; provisioning-profile capability issue noted for local builds (`docs/HANDOVER-REBUILD-2026-09-28.md:170`) |
| Sign-out / session security | **Partly** | Keychain session storage, PKCE, RevenueCat logout; no "sign out all devices" UI, push tokens and local data persist (SEC-13, SEC-22) |
| Privacy manifest matches data collected | **Partly** | Collected types match the code; `NSPrivacyAccessedAPITypes` missing (SEC-24) |
| Privacy policy accurate | **Partly** | Overstates sync scope and misstates push-token removal (SEC-13, SEC-24); OpenAI, Sentry and RevenueCat processors are disclosed |
| Third-party AI disclosure (5.1.2) | **Met** | `legal/PRIVACY.md:58, 115-123`; proxy sends no user identifiers (`ai-proxy/index.ts:182-196`) |
| Permissions used and justified (5.1.1) | **Partly** | Camera and photos used; microphone requested but video upload can't succeed (SEC-23) |
| No fabricated or misleading content | **Needs confirmation** | Simulated social in local mode (SEC-15); seeded sim users possibly in prod (SEC-5) |
| Deep-link / URL handling | **Met** | No inbound handler; outbound links are constants or `encodeURIComponent`'d |
| Secrets not in bundle | **Met** | Only publishable keys (SEC-25) |

## Needs live-database or dashboard confirmation
1. `auth.users` rows for seed ids `11111111-…` (SEC-5).
2. `information_schema.role_table_grants` / `column_privileges` on `profiles`; `has_table_privilege('authenticated','public.profiles','UPDATE')` (SEC-12).
3. `pg_policies` dump vs this matrix; `storage.buckets` MIME lists (SEC-23).
4. Whether `authenticated` has CREATE on schema `public` (SEC-20).
5. Auth settings: leaked-password protection, email confirmation, rate limits (SEC-18).
6. EAS production env vars (SEC-15); whether the deployed edge functions match this source (`supabase functions download`).
