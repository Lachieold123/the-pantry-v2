# Launch documents

Drafted by Claude on 5 October 2026, redrafted on 12 October 2026 (K-23), and **re-checked against the code on 20 November 2026** (deep audit S2-6, REL2-9; proof in `docs/audits/2026-11-20-deep-audit/FIX-DOCS.md`). Every file now describes a **store build**: Sign in with Apple only (email codes off), households on Supabase in Sydney, RevenueCat started at every iPhone launch, Pro on sale once the legal links are filled, other cooks' screens and the scan buttons hidden. These are **drafts for Lachlan and a lawyer to review**; every point needing Lachlan's decision is marked **DECIDE:** (search for it), and each file starts with an **OWNER TO DO BEFORE SUBMITTING** list.

| File | What it is | Where it goes |
| --- | --- | --- |
| `privacy-policy.md` | Privacy policy (Privacy Act 1988 / APPs, and Apple), covering accounts, households and RevenueCat | Publish at your privacy URL. Paste the URL into App Store Connect and `src/lib/legal.ts` |
| `terms-of-use.md` | Terms of use, including food safety, allergy wording and Pro | Publish at your terms URL. Paste it into `src/lib/legal.ts` |
| `APP-STORE-LISTING.md` | The one listing file: every App Store Connect field, character counts, age rating, URLs, 6.9-inch shot list (the old lower-case `app-store-listing.md` was removed on 20 Nov) | Copy into App Store Connect |
| `app-store-privacy-and-review.md` | The App Privacy answers (the only copy), the shared-content age-rating answer and the App Review notes | Copy into App Store Connect |
| `PRIVACY.md` + `privacy-manifest.json` | What leaves the phone and when, and the iOS privacy manifest (already in `app.json`) | Reference |
| `RELEASE-NOTES.md` | What testers must know per build (build 25 and Household) | TestFlight "What to Test" |

## Blockers to sort before you submit

These aren't in the documents' scope, but you'll hit them, so here they are first.

1. ~~**A store build shows no recipes.**~~ Resolved 5 October (D-036): recipes that passed the editorial review ship as `reviewed` (271 on 20 November; the thousands of newer batch recipes are drafts and don't ship, audit REL2-13). None is cook-tested yet, so nothing may claim it is.
2. **The "Tested in The Pantry kitchen" label doesn't exist in the app yet.** The terms only mention cook-testing in a bracketed choice. Keep whichever sentence is true.
3. ~~**Settings has no Privacy policy or Terms rows.**~~ The rows now appear in Settings › About as soon as `src/lib/legal.ts` has the published URLs (REL-01). Hosting the pages is still yours (K-23).
4. **Screenshots are the wrong size.** The media pack is 1170 × 2532 (6.1-inch). The required 6.9-inch set is 1320 × 2868. See the listing's screenshot plan.
5. **Scope check.** Accounts, households and Pro are in this build, so the documents cover them. The community screens (other cooks, profiles, follows) are built but hidden in store builds (`COMMUNITY_SHOWN`); if you turn them on, the privacy policy (3D), the App Privacy answers and the age rating change, and the AI cooks need settling first (audit S2-7).
6. **The app name.** "The Pantry" alone is very likely taken on the App Store. Reserve "The Pantry: Cook What You Have" (30 characters) in App Store Connect early.

## Placeholders you must fill

Search each file for `[` to find them all.

| Placeholder | Where |
| --- | --- |
| `[legal name of business or person]` | Privacy §1, Terms §1, listing (copyright) |
| `[ABN]` | Privacy §1, Terms §1 |
| `[suburb, state]` | Privacy §1, Terms §1 |
| `[contact email]` | Privacy §1, §7, §10; Terms §1, §7, §13; App Review notes. A dedicated address (for example, hello@ your domain) is better than a personal one |
| `[date of publishing]` | Top of privacy and terms |
| `[2.0.0]` | Privacy header: confirm the first public version |
| `[privacy policy URL]` | Privacy §9, Terms §1, listing |
| `[terms URL]` | Listing |
| `[support URL]` | Terms §13, listing |
| `[marketing URL]` | Listing (optional; delete if none) |
| `[30]` (days to reply) | Privacy §10: change if you want a different promise |
| `[state or territory, e.g. New South Wales]` | Terms §12 |
| `[or, for a paid service, refunding what you paid]` | Terms §8: keep or delete when Pro launches |
| Cook-testing sentence `[Choose and keep one…]` | Terms §4 |
| `[year]` | Listing (copyright) |
| `[your name]`, `[phone number]` | App Review notes |

Then delete every **"Draft, not legal advice"** box and every **"Note for Lachlan"** before publishing.

## What to ask a lawyer to check

Take all three files. Ask specifically about:

1. **Whether the Privacy Act applies to you** (small businesses under $3M turnover are usually exempt), and so whether the policy should say "we comply with" or "we follow".
2. **The limitation of liability** (Terms §8): that it's worded to fit the Australian Consumer Law, so no clause is void or misleading. Section 64A of the ACL governs how far liability can be limited.
3. **The food safety and allergy section** (Terms §4): whether the warnings are prominent and strong enough, given the avoid list and the AI-drafted origin of the recipes.
4. **Recipe imports** (Terms §5): whether storing a copy of a third-party recipe on the user's phone for personal use raises any copyright concern.
5. **Pexels and AI-generated photos** (Terms §7): whether the credits and labels are enough.
6. **Governing law** and which business entity should own the app (sole trader, or a company).
7. **For later:** the social terms (moderation, user content licence), the minimum age for accounts (including Australia's under-16 social media rules), and the subscription terms.

## When a feature goes live, change these

| Feature | Privacy policy | Terms | App Store / App Privacy |
| --- | --- | --- | --- |
| ~~**Accounts** (Supabase)~~ Done 12 October (K-23 drafts) | Fill §5A; add the hosting provider and region to §5; rewrite "The short version"; §7 gains account deletion (Apple requires in-app account deletion); §8 gains the minimum age | §5: user content licence; §11: account suspension | App Privacy: Contact Info (email, name), Identifiers (user ID), linked to user, app functionality. Remove "No login needed" from the review notes and give Apple a demo account |
| **Social** (posts, comments, messages) | §5A covers who sees what; add moderation records | §6: zero-tolerance wording, report and block, 24-hour moderation, moderation contact | App Privacy: User Content (photos, other content, messages if stored). Age rating: user-generated content and messaging become Yes. Description gains sharing |
| ~~**Pro** (RevenueCat)~~ Done 20 November (FIX-DOCS) | 3E and section 5 name RevenueCat | Section 10 filled; settle section 9's refund wording | App Privacy: Purchase History and User ID ticked. Add the in-app purchases to the listing when they're on sale |
| **Community screens on in store builds** | 3D: the public feed is read at every Home open; settle the AI cooks first | Moderation and user-content wording if real people post | Age rating: re-answer user-generated content; App Privacy: recheck |
| **Email codes on** | 3C and section 5: add the email provider | Section 4: add "or with a code we email you" | No new type |
| ~~**Household** (Supabase, Sydney; D-039)~~ Done 12 October (K-23 drafts) | Say that a household's plan, list, cupboard and members' names are stored on Supabase servers in Sydney to sync between members; anonymous IDs; deleting = leaving the household | Shared-content wording (members see each other's names and edits) | App Privacy: User Content (other: plan, list, cupboard), Name, Identifiers (user ID); linked to the user, not used for tracking |
| **Scanning** (AI service, 3 free a month) | Fill §5B; add the camera/photos line to §3; add the AI provider and its country to §5 | §4: add that scan results must be checked before adding | App Privacy: User Content (photos), linked if tied to an account. Update `app.json`'s permission text if it changes. Remove "Coming soon" from the review notes. Don't say "AI-powered" in the listing |
| **Crash reporting** (Sentry, K-8) | Add to §4 and §5: what's sent (crash details, device model, iOS version), and that it's scrubbed of personal details | No change | App Privacy: Diagnostics (crash data, performance data), not linked to the user if no user ID is attached |
| **Over-the-air updates** (`expo-updates`) | One line in §4: the app checks Expo's servers for updates | No change | No change |
| **Nutrition panel** (D-028) | No change unless an AI service fills gaps server-side (then name it in §5) | §4: the panel is an estimate, a guide only, not medical or dietary advice | Age rating: still no medical information |
| **Data export or reset button** | §7: describe it | No change | No change |

Each time, update the "Last updated" date, and tell users in the app if the change is significant (both documents promise this).
