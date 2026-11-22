# Release notes for testers and the owner

Kept by build. Newest first. Each entry says what a tester must know, not what changed in the code.

## Build 28 (23 November 2026, `a00cf1a`, from `audit/deep-1120`): sent to TestFlight

Made with the production profile, before the live database migrations. Build 27 failed at signing the same morning because the signing profile had no Sign in with Apple; Lachlan logged in to Apple for build 28, which remade the profile, so later builds can run unattended again.

**Household: don't use build 25 once the database migrations are applied.** (Audit S2-10, 20 November 2026.)

Build 25 (`38bef97`) was made before the D-048 database rules. Once the live migrations in `supabase/APPLY-LIVE.md` are applied, build 25's Household breaks in ways a tester won't see straight away:

- it stops seeing member changes live, and after the Realtime lock-down it gets no live rows at all;
- one bad row can stop its syncing for good, because it sends every row in one batch;
- a wrong invite code reads as a success with no household, and codes become single-use.

So: **test Household on build 28 or later, never on build 25.** Until the migrations are applied, build 28's Cancel codes and Remove answer "That isn't available yet" and the join preview doesn't load; joining still works. Build 25 is still fine for everything that doesn't touch Household (cupboard, plan, list, cooking). Nobody has used Household on build 25 (the live project had 0 households on 20 November), so no one loses anything.

What a tester sees in this build that's new: the other cooks' screens and the scan buttons are gone from store builds and from TestFlight builds made with the production profile (preview builds keep them); Pro says "not on sale yet" until the legal pages are published.
