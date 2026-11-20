> **Draft for Lachlan and a lawyer to review. Not legal advice.** Drafted by an AI (Claude) on 12 October 2026 (K-23) and **re-checked against the code on 20 November 2026** (branch `audit/deep-1120`, deep audit S2-6). Every factual sentence describes a **store build** (`INTERNAL_BUILD` false, `src/lib/build.ts`). Where the code alone can't settle something, or the wording is a business or legal choice, it's marked **DECIDE:**. Proof for each claim: `docs/audits/2026-11-20-deep-audit/FIX-DOCS.md`. Fill every [square-bracket placeholder], settle every DECIDE:, then delete this box, the to-do list, every "Note for Lachlan" and every DECIDE: line before publishing.

> **OWNER TO DO BEFORE SUBMITTING** (this policy is only true once these are done)
> 1. Apply the live database migrations (`supabase/APPLY-LIVE.md`, all steps). Sections 6 and 8 describe them: 48-hour one-person invite codes, member removal, and the fuller account deletion.
> 2. Make the Sign in with Apple key, set the four Apple secrets and deploy the `apple-token` and `delete-account` functions (`supabase/APPLY-LIVE.md` › Edge functions). Until then, keep the "token from Apple" sentence in 3C out.
> 3. Schedule the 30-day clean-up of unused anonymous users (pg_cron, K-24). Until it runs, delete that line in section 6.
> 4. Get a support email address and fill [contact email] everywhere.
> 5. Host this page (and the terms and a support page) on HTTPS and paste the URLs into `src/lib/legal.ts`. That is also what puts Pro on sale (section 3E).
> 6. Decide whether deleting an account should also delete the RevenueCat record (section 8). The text below says it stays, which is what the code does today.
> 7. Settle the minimum age (section 9) with the lawyer.
> 8. Check Supabase's log retention and backup period on your plan (sections 3F, 6), and move the project to a plan that doesn't pause.
> 9. Have a lawyer review it.

# The Pantry: Privacy Policy

**Last updated:** [date of publishing]
**Applies to:** The Pantry app for iPhone, version [2.0.0] and later

> DECIDE: platforms. `app.json` also configures Android and a web build. Say "for iPhone" only if iPhone is the only thing you ship at launch. Purchases run only on iPhone (`src/lib/purchases.ts:68`).

## The short version

- **You don't need an account.** Without one, your cupboard, plan, list, recipes and settings stay on your iPhone, and we don't collect them.
- **Every time the app opens on an iPhone, it connects to RevenueCat**, the service that runs The Pantry Pro subscriptions. RevenueCat gives your phone a random customer ID and checks whether you have Pro. It does this even if you never buy anything (section 3E).
- **If you share a kitchen (Household) or sign in with Apple,** we store what's needed to make that work on our servers, which are run by Supabase and located in **Sydney, Australia**.
- What we store is listed in section 3. It's used **only to run the app**: to sync your kitchen between phones and people, to back it up, and to know whether you have Pro.
- There are **no ads, no analytics and no tracking**. We don't sell or share your information with advertisers.
- You can **delete your account, or your household data, in the app** at any time (Settings, at the bottom). Deleting the app removes everything kept on the phone.

The rest of this policy explains this in more detail, as the Australian Privacy Principles (APPs) and Apple ask us to.

## 1. Who we are

The Pantry is made by [legal name of business or person], ABN [ABN], in [suburb, state], Australia ("we", "us"). You can reach us at [contact email].

We handle personal information in line with the *Privacy Act 1988* (Cth) and the Australian Privacy Principles.

> DECIDE: "we comply with" or "we follow". A business with annual turnover of $3 million or less is usually exempt from the Privacy Act. Ask the lawyer whether it applies to you, and so which wording is accurate. Following it either way is what Apple and users expect.

## 2. Three ways to use The Pantry

What we hold depends on how you use the app. You choose; the app works fully in all three.

| How you use it | What we hold on our servers (Supabase) | What RevenueCat holds |
| --- | --- | --- |
| **On your phone only** (the default) | Nothing. | A random customer ID for your phone, and any Pro purchase |
| **In a household, without an account** | A random ID for your phone, the name you give the household, and the household's shared kitchen (section 3B). | The same |
| **Signed in** (Sign in with Apple) | Your account details and everything personal you keep in the app (section 3C), plus the household's kitchen if you're in one. | Your account's user ID instead of the random one, and any Pro purchase |

## 3. What we collect, and why

### 3A. On your phone only

The app keeps your cupboard, plan, shopping list, preferences, saved recipes, your own recipes, cooking history and settings in its own private storage on your iPhone. None of it is sent to us.

Some things **always stay on your phone**, even if you sign in or join a household:

- your **plates** (photos of dishes you cooked, with their notes);
- the theme, high contrast and the Sunday reminder;
- the record the app keeps of which recipes it has shown you and which you opened, used to order Home's suggestions;
- whether you've seen the tour, and data the app brought across from the earlier version of The Pantry.

### 3B. Household (sharing a kitchen)

A household lets up to 8 people share one plan, shopping list and cupboard. You don't need an account. The first time you start or join one, the app quietly creates an **anonymous user**: a random ID for your phone on our servers, with no email or name attached to it.

To run the household we store:

| What | Why | Who can see it |
| --- | --- | --- |
| The anonymous user ID (or your account's user ID if you're signed in) | To know which household you're in and who made each change | Us; other members' phones use it behind the scenes |
| The **name you give** when you start or join (up to 40 characters) | So members know who's in the household | Everyone in the household |
| The household's name | To label it | Everyone in the household |
| The shared kitchen: plan entries, shopping list ticks, extras and removals, and the cupboard | To keep everyone's phone the same | Everyone in the household |
| **Your own recipes that the shared plan uses** (title, ingredients, method, notes) | So other members can shop for and cook them | Everyone in the household |
| Invite codes you make, and when they expire | To let the people you invite join | Anyone you give the code to can join with it |

Members can change anything in the shared kitchen. Only invite people you're happy to share it with.

### 3C. Account (signing in)

An account backs up your kitchen and puts it on any phone you sign in on. In this version you sign in with **Apple**. There are no passwords.

> Note for Lachlan: sign-in with an emailed code is built but switched off (`EMAIL_CODES_CONNECTED = false`, `src/lib/emailCodes.ts:9`), so a store build offers Apple only. When you switch email codes on, add back: "or with a 6-digit code sent to your email", the "Email codes" paragraph below, and the email provider in section 5.

We store:

| What | Where it comes from | Why |
| --- | --- | --- |
| Your **email address** | Apple gives it to us. If you choose Apple's "Hide My Email", we get a private relay address instead of your real one | To identify your account and to contact you about it if we need to |
| Your **name** | Apple gives it to us the first time you use Sign in with Apple, if you choose to share it | To show who's signed in |
| A **user ID** | Made by our sign-in service | To keep your information together |
| A **random ID for each phone** you sign in on | Made by the app | To sort out changes made on two phones at once |
| Everything personal you keep in the app: Cookmarks, collections, dishes you've hidden, your own recipes (including the web address a recipe was imported from), your 20 most recently viewed recipes, your cooking log (which recipe and when), your taste settings (diet, ingredients to avoid, favourite cuisines, weeknight time, how confident you are in the kitchen, and what you said you came to the app for), units, and shelf and list settings | You | To back them up and put them on your other phones |
| Your plan, shopping list and cupboard, when you're **not** in a household | You | As above. In a household, these are the household's instead (3B) |

> DECIDE: whether to let people change the name Apple gives. The app saves it once; there's no screen to edit it. If you add one, say so here.

**Your "ingredients to avoid" and diet.** These can say something about your health (an allergy) or your beliefs (avoiding pork or alcohol, for example). If you sign in, they're backed up with your other settings, and used only to steer the recipes we suggest to you. They're never shared with your household, and you can change or clear them in **Settings**. They're a convenience, **not an allergy filter**: always check ingredients yourself (see our Terms of Use).

> DECIDE (lawyer): whether the avoid list and diet are "sensitive information" (health information, or religious beliefs) under the Privacy Act, which would need your consent to collect. Options: (a) keep syncing them and rely on this notice plus the act of signing in; (b) add a one-line consent on the sign-in sheet; (c) stop syncing `diet` and `avoid` (a code change in `src/domain/sync/personal.ts`), so they never leave the phone. Recommendation: ask the lawyer; (c) is the safest if in doubt.

**Sign in with Apple.** Apple confirms who you are and gives us a sign-in token, your email (or relay address) and, the first time only, your name. We never see your Apple ID password. To let us end The Pantry's access to your Apple ID when you delete your account, we keep a token from Apple on our servers in a private table no app or person can read.

> DECIDE: keep the last sentence only once the `apple-token` and `delete-account` functions are deployed (to-do 2). The app already sends Apple's one-time code to `apple-token` at sign-in (`src/lib/account.ts:159`), but until the function is deployed nothing is stored, and deleting an account doesn't revoke Apple's access. Apple requires the revocation before submission.

### 3D. Other cooks' recipes

A store build doesn't show other cooks' recipes or profiles, so it doesn't read them from our servers.

> Note for Lachlan: if you turn the "From other cooks" screens on in a store build (`COMMUNITY_SHOWN`, `src/lib/build.ts:19`), every phone that opens Home will read the public recipe feed from Supabase, signed in or not. Then section 2's "Nothing" row and section 3F's "only in a household or signed in" stop being true, and this section needs a paragraph about it. Decide first how the AI cooks are presented (audit S2-7).

### 3E. The Pantry Pro (RevenueCat)

The Pantry Pro is an optional subscription sold through the App Store. We use **RevenueCat** to run it. Every time the app opens on an iPhone, it connects to RevenueCat, even if you never look at Pro. RevenueCat then holds:

| What | Why |
| --- | --- |
| A **customer ID**: a random one made by RevenueCat for your phone, or your account's user ID while you're signed in | To know whose purchase is whose, and to restore Pro on your other phones |
| Your **purchase history** for The Pantry Pro (which plan, when it started and renews, any trial), which RevenueCat gets from Apple | To know whether you have Pro |
| Technical details of each connection, such as your IP address, the app version and your iPhone's model and iOS version | To run and secure its service |

We don't receive your card or payment details: Apple handles payment. We don't give RevenueCat your name or email.

> Note for Lachlan: true to the code (`src/store/proSync.ts:58`, `src/lib/purchases.ts:81-93`, `logIn` at sign-in, `logOut` at sign-out; no attributes such as email are set). Pro goes on sale only once both legal links are filled in `src/lib/legal.ts` (`canSellPro`, line 24) and Apple returns the products. Before that, the paywall says "Pro isn't on sale yet", but RevenueCat still starts at every launch.

### 3F. Information every connection involves

When your phone talks to our servers (only in a household or signed in), our hosting provider's systems record technical details of the request, such as your **IP address**, the time, and the app's request. These logs are used to run and secure the service and are kept for a short time. RevenueCat keeps similar logs of its own connections (3E).

> DECIDE: confirm Supabase's log retention for your plan (it varies by plan) and state it, for example "up to [7] days". We don't use these logs for anything else.

### 3G. What we don't collect

We don't collect your phone number, location, contacts, payment card details, advertising identifier or usage analytics, and the app has no ads and no third-party analytics or crash-reporting tools. Your plates (dish photos) are never uploaded.

## 4. Permissions the app asks for

The app asks only when you first use the feature that needs it. You can say no, and change your mind at any time in your iPhone's **Settings › The Pantry**. If you say no, everything else still works.

- **Camera** and **Photos**: only when you choose to take or pick a photo of a dish you cooked. The photo is kept on your phone and isn't uploaded. With Photos, the app gets only the photos you pick.
- **Notifications**: for Cook Mode timers that finish while your phone is locked, and the optional Sunday planning reminder. These are scheduled on the phone itself; nothing comes from our servers.

## 5. Who else handles your information, and where

We use a small number of service providers to run the app. They handle your information only to provide their service to us.

| Provider | What they do | What they receive | Where |
| --- | --- | --- | --- |
| **Supabase, Inc.** | Hosts our database and sign-in service | Everything in sections 3B, 3C and 3F | Stored in Sydney, Australia (Amazon Web Services, ap-southeast-2). Supabase is a US company |
| **RevenueCat, Inc.** | Runs The Pantry Pro subscriptions | Everything in section 3E | [country where RevenueCat stores data]. RevenueCat is a US company |
| **Apple** | Sign in with Apple, the App Store, payments for Pro, and iOS | What you share when you use Sign in with Apple, and your purchases | Under [Apple's Privacy Policy](https://www.apple.com/legal/privacy/) |

**Overseas.** Your household and account data are **stored in Australia**. Supabase is based in the United States, and its staff or sub-processors may be able to access data from overseas to run and support the service. RevenueCat is based in the United States, and the customer ID and purchase history it holds may be stored there.

> DECIDE (lawyer): APP 8 (cross-border disclosure). Check Supabase's and RevenueCat's data processing terms and sub-processor lists, confirm where RevenueCat stores data, whether any access from the US or elsewhere counts as disclosure overseas, and name the countries.

**Apple** may also give us summary statistics (such as download numbers) and, if you've agreed in your iPhone's settings, crash reports that don't identify you.

**When you choose to send things:**

- **Sharing.** Sharing your list, plan or a recipe, or an invite to your household, opens your iPhone's share sheet. Where it goes is your choice, and that app's privacy policy applies.
- **Importing a recipe from a web link.** Your phone visits that page directly, as your browser would, so the website sees a normal visit (including your IP address). The page isn't sent to us. If you're signed in, the imported recipe and its web address are backed up with your other recipes.

We don't sell, rent or trade personal information, and we don't share it with advertisers or data brokers.

## 6. How long we keep it

- **Account information:** until you delete your account.
- **Household information:** while the household exists. When the last member leaves, the household and its shared kitchen are deleted.
- **Things you delete in the app** (a recipe, a Cookmark, a plan entry) are removed from our servers' copy too. We keep a small marker that it was deleted, without its contents, so your other phones remove it as well.
- **Invite codes** work for one person and expire after 48 hours. Any member can cancel unused ones.
- **Anonymous users** that haven't been used for 30 days and aren't in a household are deleted automatically.
- **RevenueCat records:** kept by RevenueCat under its own retention rules (section 8).
- **Server logs:** see section 3F.

> DECIDE: (1) The 48-hour, one-person codes and cancelling them come with migration `20261120000200_invites.sql`. Until it's applied the live project gives 14-day codes anyone can reuse (to-do 1). (2) The 30-day clean-up exists as a database function but isn't scheduled yet (to-do 3). Only publish that line once it runs. (3) Whether to delete accounts nobody has used for a long time. Not required; say nothing if you don't. (4) Supabase's backups: say how long a deleted account can remain in backups (for example "up to [7] days in encrypted backups") once you know your plan's backup period.

## 7. How we keep it safe

- Everything sent between the app and our servers, and between the app and RevenueCat, is encrypted in transit (HTTPS).
- Our database is locked down so each person can read and change only their own account data, and only members can read their household's kitchen. Invites can only be made and used through checked server functions.
- On your phone, the app's data is in its private storage, which other apps can't read, and is protected by your phone's passcode and Apple's device encryption.

> DECIDE: the second point is only true once the live migrations are applied (to-do 1; audit S2-1 found the household lockdown not yet live). Don't add "your sign-in is kept in the iPhone Keychain". It isn't yet (K-20: it's in the app's ordinary storage).

If a data breach is likely to cause serious harm, we'll tell the people affected and the Office of the Australian Information Commissioner (OAIC), as the Notifiable Data Breaches scheme requires.

> DECIDE (lawyer): the Notifiable Data Breaches scheme only binds organisations covered by the Privacy Act (see section 1). Keep this as a promise either way, or soften it.

If your iPhone backs up to iCloud or a computer, that backup includes the data on your phone. It's held by Apple or on your computer, under their settings, not by us.

## 8. Seeing, changing and deleting your information

**In the app.** Everything you've added is visible in the app, and you can edit or remove it where it appears. Change your diet, ingredients to avoid, cuisines and weeknight time in **Settings**.

**Leaving a household** (Settings › Sharing › Household): you stop sharing, and the plan, list and cupboard stay on your phone. Your membership and name are removed from the household. What you added to the shared kitchen stays with the household.

**Signing out** (Settings › Account): this phone stops syncing and its copy of your account is cleared. Your account and everything in it stay on our servers until you sign in again. The phone goes back to a new random RevenueCat customer ID.

**Deleting your account** (Settings, at the bottom › **Delete account**, then type DELETE): this permanently deletes your account, your profile, everything backed up in it and your sign-in, ends The Pantry's access to your Apple ID, and removes you from your household. If the household carries on without you, your own recipes are removed from it, your invites are cancelled, and your user ID is removed from plan and list entries you made (those entries stay, as part of the household's plan and list). It can't be undone.

**Deleting household data without an account** (Settings, at the bottom › **Delete my household data**): this deletes your phone's anonymous user and anything of yours on our servers, in the same way, and takes you out of the household. Your plan, list and cupboard stay on your phone.

**What deleting doesn't remove.**

- Your plates (dish photos) and any data brought across from the earlier version of The Pantry stay on the phone. To remove them, delete the app (press and hold the icon, then Remove App › Delete App).
- **RevenueCat's record** (your customer ID and any purchase history) isn't deleted when you delete your account. If you've ever bought Pro, Apple keeps its own record of the purchase too. You can ask us to delete the RevenueCat record at [contact email].
- Other phones signed in to the account stop backing up the next time they connect, and keep what's on them.

> DECIDE: (1) RevenueCat: either keep the paragraph above (true today: nothing in `delete_account` or the `delete-account` function calls RevenueCat), or add a RevenueCat delete-customer step to the `delete-account` function (needs a RevenueCat secret key; audit S2-5) and drop it. (2) "ends The Pantry's access to your Apple ID" and the household clean-up are true only once the functions are deployed and the migrations applied (to-dos 1 and 2). Today the app falls back to the live database's older `delete_account`, which doesn't remove your recipes from the household or clear your user ID from entries. (3) K-21: whether Delete account should also remove plates and the old app's data (needs expo-file-system for the photo files).

**Asking us.** You can ask us for a copy of the personal information we hold about you, or to correct it, at [contact email]. We'll confirm it's you (usually by replying from or to the email on the account) and respond within [30] days. There's no charge.

> DECIDE: an in-app "Export my data" isn't built. Email requests are fine under the APPs; decide whether you want to promise a format (for example a JSON file).

## 9. Children

The Pantry is a general cooking app and isn't directed at children. Cooking involves heat, knives and food-safety risks, so younger cooks should use it with an adult.

You must be at least [16] to create an account or start or join a household. The app doesn't ask your age. If we learn that an account or household member is under that age, we'll delete their information.

> DECIDE (lawyer): the minimum age, and whether a statement is enough or the app must ask (audit S2-16: nothing in the app asks today; if you choose an age gate, it goes on the sign-in and household start screens). Points to raise: (1) a store build has no public content: other cooks' screens are hidden, there's no posting, no messages and no way to find strangers; (2) Australia's social media minimum age (under 16, from 10 December 2025) is unlikely to cover a private, invite-only household with no public posting, but confirm, and re-ask before turning the community screens on (profiles with follower counts); (3) the OAIC's Children's Online Privacy Code, due by 10 December 2026, may apply to apps "likely to be accessed by children". Options: 13 (Apple's and Supabase's usual floor), 16, or 18.

## 10. Features not switched on yet

These appear in the code but aren't offered in this version and don't collect anything. We'll update this policy before any of them starts collecting information.

- **Scanning a receipt or a photo of your food** isn't shown in this version.
- **Signing in with an emailed code** isn't offered in this version.

> Note for Lachlan: when scanning goes live, add the AI provider, what it receives, and its country. When email codes go on, add the email provider (section 5). When Sentry is added (K-8), add crash data. When the community screens go on in store builds, see 3D. `docs/launch/README.md` lists each change.

## 11. Changes to this policy

If we change how the app handles information, we'll update this policy and the date at the top before the change reaches you. If the change is significant, we'll also tell you in the app before it applies. The current version is always at [privacy policy URL].

## 12. Questions and complaints

If you have a question or a complaint about privacy, email us at [contact email]. We'll reply within [30] days.

If you're not happy with our answer, you can complain to the Office of the Australian Information Commissioner: [oaic.gov.au](https://www.oaic.gov.au), phone 1300 363 992.
