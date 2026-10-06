# Accounts (D-043)

How people sign in, what an account keeps, and how it fits with Household (D-039)
and Pro (D-038). Decided by Lachlan on 6 October 2026:

- **Sign in with Apple, or a 6-digit code sent by email.** No passwords.
- **Only when it earns it.** Everything works without an account. One is
  offered when it gives you something: backing up, a second phone, social,
  or keeping Pro across devices.
- **An account keeps everything:** plan, list, cupboard, Cookmarks,
  collections, your recipes, recently viewed, cooking history and settings.
  A new phone signed in to the same account gets the same kitchen.

## The model in one picture

```
 Phone (the app's truth while open)       Supabase (Sydney, project the-pantry)
 ─────────────────────────────────        ───────────────────────────────────────
 Zustand stores: plan, cupboard,          auth.users            one per person (anonymous or permanent)
 saved, myRecipes, cookLog, prefs   ──►   profiles              display name; later a photo and handle
        │                                 account_rows          everything personal, newest wins
        │  rows (domain/sync/rows)  ──►   household_rows        the shared kitchen, if in a household
        ▼                                 households, members, invites  (D-039, unchanged)
 a mirror of each scope + pending rows
```

One **user** (Supabase `auth.users`) per person. Every phone that talks to the
backend has one: until you sign in it is **anonymous** (created quietly the
first time a backend feature is used, as Household already does). Signing in
**turns that same user into a permanent one** by linking Apple or an email to
it. The user id doesn't change, so a household you're already in, and anything
already synced, stays yours.

### Two sync scopes, one mechanism

The household sync already turns the kitchen into rows, merges them newest-wins
and rebuilds the stores. Accounts reuse that mechanism with a second scope.

| Scope | Table | What's in it | When it syncs |
| --- | --- | --- | --- |
| **Account** | `account_rows` (user_id, kind, key) | Bookmarks, collections, your recipes, recently viewed, cooking log, preferences, **and the kitchen (plan, ticks, removals, extras, cupboard) when you are not in a household** | Signed in permanently |
| **Household** | `household_rows` (household_id, kind, key) | The kitchen, plus members' own recipes the plan uses | In a household (anonymous or signed in) |

Each record lives in exactly one scope at a time, so there's one source of truth:

- In a household, the kitchen syncs with the household and the account keeps
  only personal things.
- Out of a household, the kitchen syncs with the account.
- Joining or leaving a household moves the kitchen between scopes using the
  existing bring-along rule (D-039): nothing is lost and nothing is doubled.

`src/domain/sync/rows.ts`, generalised from `domain/household/rows.ts`, does the
work: `canonicalRows`, `changedRows`, `mergeRows`, `fromRows`, plus a `scopeOf(kind,
inHousehold)` rule. It's pure, with no network or React. `src/store/sync.ts` runs
one engine per active scope (mirror, pending, flush, pull, realtime), and the
household code becomes a thin user of it.

## Signing in

`src/lib/account.ts` returns results, never throws, like `lib/household.ts`.

### Sign in with Apple (iPhone)

1. `expo-apple-authentication` gives an identity token.
2. **Anonymous user on this phone:** `auth.linkIdentity({ provider: 'apple', token })`.
   The same user becomes permanent.
3. **That Apple ID already has an account** (second phone, reinstall): linking
   fails with "identity already exists", so `auth.signInWithIdToken` switches to
   that account and we **merge** (below).
4. **No session at all:** `auth.signInWithIdToken`.
5. Apple gives a name only the first time. Save it to `profiles.display_name` then.

### Email code (anyone, including Android and the web)

1. Ask for the email, then send a 6-digit code:
   - **Anonymous user:** `auth.updateUser({ email })`, which sends an
     email-change code to verify the new address. Check it with
     `verifyOtp({ type: 'email_change' })`.
   - **Email already belongs to an account:** that fails, so use
     `signInWithOtp({ email, shouldCreateUser: false })` and
     `verifyOtp({ type: 'email' })`, then merge.
   - **No session:** `signInWithOtp({ email })` and `verifyOtp({ type: 'email' })`.
2. The code screen allows a resend after 60 seconds and explains a wrong or
   expired code in plain words.

### Merging when you sign in to an existing account

This happens when you switch from a fresh anonymous phone to an account that
already has rows:

- The **account's rows come first**.
- Anything on this phone the account doesn't have is **added**, using the
  bring-along rule (D-039). The same meal planned on both is kept once, and so
  is the same bookmark.
- Preferences: the account wins, except anything the account has never set.
- The old anonymous user is abandoned. Anonymous users older than 30 days with
  no household are cleaned up by a scheduled SQL job (later).

## Signing out and deleting

- **Sign out** stops sync and **clears this phone's copy**, back to a fresh
  install that skips the welcome. Everything is in the account, so nothing is
  lost. If rows are still waiting to send (offline), it says "Some changes
  haven't saved yet. Try again when you're online" and won't sign out. The
  household continues for the other members.
- **Delete account** is required by Apple for any app with sign-up. It asks
  for a typed confirmation, then calls the `delete_account()` RPC. That
  leaves any household, deletes `account_rows` and `profiles` (cascade), then
  the auth user, then clears the phone.

## Where it shows in the app

The app already has a profile row (the drawer's "Your kitchen · Local profile",
and the avatar, which opens Settings). The account makes those real:

- **Settings → Account**, the first section:
  - **Signed out:** "Back up your kitchen" with a line on what it does, then
    *Continue with Apple* (iPhone only) and *Continue with email*.
  - **Signed in:** name, email or "Signed in with Apple", "Backed up · just now",
    *Sign out*, then *Delete account* at the foot of Settings.
- **The drawer's profile row:** "Your kitchen · Local profile" becomes the
  name and "Backed up" once signed in. It opens Settings as before.
- **The moments it earns it** each offer the same sign-in sheet, once, and
  are never repeated after "Not now":
  - starting or joining a Household ("So you don't lose your household if
    you change phones");
  - after the 10th Cookmark or first own recipe ("Back up what you've saved");
  - before buying Pro (when purchases are connected).
- Social (P9) will require an account.

## Pro

The RevenueCat app user id will be the Supabase user id. A signed-in person
keeps Pro on every phone. Anonymous buyers can still restore through Apple.
Wiring this up waits for RevenueCat approval (D-038).

## Security

- Row-level security: `account_rows` and `profiles` are readable and writable
  only by their owner (`user_id = auth.uid()`). Households are unchanged.
- The newest-wins trigger on `account_rows` matches `household_rows`.
- `delete_account()` is `security definer`, acts only on `auth.uid()`, and
  calls `leave_household` first.
- Apple tokens and email codes never leave Supabase Auth. Nothing is stored
  in the app except the Supabase session, in the existing secure storage.

## Setup only Lachlan can do (dashboard)

1. **Authentication → Sign In / Providers:**
   - Turn on **Allow anonymous sign-ins** (still pending from D-039).
   - Turn on **Allow manual linking**, which is needed to turn an anonymous
     user into a permanent one.
2. **Authentication → Providers → Apple:** enable it. Under *Client IDs*, add
   `com.lachlanoldfield.thepantry`. Native sign-in needs nothing else.
3. **Authentication → Emails (templates):**
   - In *Magic link*, *Confirm signup* and *Change email address*, show the
     code: `Your code is {{ .Token }}`.
   - Set the email OTP length to 6.
4. **Custom email sender (before anyone but Lachlan tests):** Supabase's
   built-in sender only emails project members, a few an hour. Set up custom
   SMTP (for example Resend) under **Authentication → SMTP**.
5. **Apple Developer:** nothing by hand. `ios.usesAppleSignIn` makes EAS
   switch on the Sign in with Apple capability on the next build.

## Edge cases

- **Offline sign-in attempt:** "You're offline. Signing in needs the internet."
  Nothing changes.
- **Apple sign-in cancelled:** nothing changes and nothing is shown.
- **Apple's "Hide my email":** works. The relay address is the email shown.
- **An email that's typed wrong:** the code never arrives. *Change email* goes
  back to the email step.
- **Two phones edit while offline:** newest wins per record (D-039). Ticks and
  bookmarks are their own records, so they don't clobber each other.
- **Signed in on phone A, anonymous household on phone B, then B signs in to
  the same account:** B's household membership belonged to B's anonymous user.
  The merge carries B's kitchen into the account. B must rejoin the household,
  and the household page says so. (Rare. Accept for now and record it.)
- **Web preview:** no Apple button, email only.

## Not in this step

These come later: social profiles and handles, a profile photo, the
anonymous-user cleanup job, RevenueCat linking, and Google sign-in.
