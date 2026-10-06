# Household: one kitchen, shared (D-039)

Lachlan asked on 6 October 2026 for OurGroceries' idea, grocery lists that sync between family members, built into The Pantry. He decided:

- The household shares the plan, the list and the cupboard.
- Sharing is free.
- People join with an invite link, without an account.

## What OurGroceries does

- **One household login.** Everyone signs in with the same email and password and sees the same lists. Lists sync within seconds and work offline.
- **Plain lists.** Items have a quantity, a note, a photo and a category. A "master list" remembers everything ever added, for autocomplete. There are store-specific lists and simple recipes.
- **Extras:** Siri, Alexa, Apple Watch, widgets, barcode scanning, a website, CSV export.
- **Money:** sharing is free and ads pay the bills. Removing ads costs about $1 a month or $20 for life.

## What The Pantry does differently

OurGroceries shares a list someone typed. The Pantry shares the kitchen the list is built from: the week's plan, the shopping list's ticks, extras and removals, and the cupboard. Both phones therefore work out the same "to buy", ticking milk at the shops puts it in everyone's cupboard, and What I have is right for everyone.

| Shared | Stays on your phone |
|---|---|
| Plan entries (any week) | Cookmarks, collections, hidden dishes |
| List ticks, extras, removals | Taste settings, units, theme |
| The cupboard (what's in it) | Shelf settings, "move ticked to cupboard" |
| Your own recipes, while the shared plan uses them | Cook history, shared dishes (plates) |
| | Pro (each person's own; Family Sharing on the App Store can cover a household) |

## How it works

- **No passwords.** Each phone signs in anonymously to Supabase the first time it shares. The sign-in lives on the phone.
- **Joining.** "Invite someone" makes an 8-character code, valid for two weeks, and sends a message with a `thepantry://join/CODE` link and the code itself. The other person taps the link, or enters the code in Settings → Household, and gives their name.
- **When you join,** the household's plan, list and cupboard come first. Anything of yours they don't have is added. The same meal planned on both phones (same recipe, day and meal) is kept once.
- **Sync** (`src/store/household.ts`):
  - The plan, list and cupboard stores stay the truth on each phone. A mirror of the household's rows sits beside them.
  - A change becomes a few rows. They are saved at once and sent when the network allows.
  - Rows from other phones arrive live through Supabase Realtime and are merged in. The newest change wins, and the database refuses a late write that's older than what it holds.
  - Offline, everything still works and catches up on reconnect, and every time the app comes to the front.
- **Leaving** keeps the plan, list and cupboard on that phone as they are and stops sharing. The last person out deletes the household.
- **Limits:** one household per phone, and up to 8 people.

## The backend

- **Supabase project:** `the-pantry` (`eozyhllkvajvrecojdxu`), in Sydney (ap-southeast-2), free plan. The migrations are in `supabase/migrations/`.
- **Tables:**
  - `households`, `household_members`, `household_invites`.
  - `household_rows`: one row per shared record. Its `kind` is one of plan, tick, removal, extra, cupboard or recipe. It also holds `key`, the JSON `data`, `deleted`, `updated_at` and `updated_by`.
- **Row-level security:** only members can read or write their household's rows. Invites are only made and used through the functions `create_household`, `create_invite`, `join_household` and `leave_household`.
- **Security advisor notes (intentional):**
  - The security-definer functions can be called by signed-in users; that's the API.
  - `household_invites` has no policies because only the functions touch it.
- **The publishable key** in `src/lib/backend.ts` is meant to ship in the app.

## Needs Lachlan

1. **Turn on anonymous sign-ins.** In the Supabase dashboard, go to Authentication → Sign In / Providers → "Allow anonymous sign-ins". Until then, Household says "Sharing isn't switched on yet." Consider turning on CAPTCHA protection there before launch.
2. **Update the privacy policy and App Privacy answers.** A household's plan, list, cupboard and names are stored on Supabase's servers in Sydney. `docs/launch/README.md` lists the changes.
3. **Free projects pause after about a week without use.** Before launch, move to Supabase Pro (US$25 a month), or keep it in use.
4. **Test on two phones:**
   - Start on one phone and join on the other.
   - Tick, add and remove on both, online and in flight mode, and check they agree within seconds.

## Later

- "Sign in with Apple", so a household survives a new phone. Today, someone on a new phone rejoins with a fresh invite.
- Universal links (`https://…/join/CODE`) that open the App Store when the app isn't installed. These need a website.
- "Sam ticked this" initials on the list, and a "Sam is shopping now" line.
