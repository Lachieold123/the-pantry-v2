# Release notes for testers and the owner

Kept by build. Newest first. Each entry says what a tester must know, not what changed in the code.

## Next build (from `audit/deep-1120`, not built yet)

Build 27 was tried on 23 November and failed at signing before it reached TestFlight (K-46): the first build with Sign in with Apple needs one run with Lachlan's Apple login.

**Household: don't use build 25 once the database migrations are applied.** (Audit S2-10, 20 November 2026.)

Build 25 (`38bef97`) was made before the D-048 database rules. Once the live migrations in `supabase/APPLY-LIVE.md` are applied, build 25's Household breaks in ways a tester won't see straight away:

- it stops seeing member changes live, and after the Realtime lock-down it gets no live rows at all;
- one bad row can stop its syncing for good, because it sends every row in one batch;
- a wrong invite code reads as a success with no household, and codes become single-use.

So: **test Household only on a new build made after the migrations are applied.** Build 25 is still fine for everything that doesn't touch Household (cupboard, plan, list, cooking). Nobody has used Household on build 25 (the live project had 0 households on 20 November), so no one loses anything.

What a tester sees in this build that's new: the other cooks' screens and the scan buttons are gone from store builds and from TestFlight builds made with the production profile (preview builds keep them); Pro says "not on sale yet" until the legal pages are published.
