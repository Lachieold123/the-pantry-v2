> **Draft for Lachlan and a lawyer to review. Not legal advice.** Drafted by an AI (Claude) on 12 October 2026 from the code on the `preview-2026-10-08` branch (K-23). It replaces the 5 October draft, which described an app with no accounts and no server. Every factual claim was checked against the code; where the code alone can't settle something, or the wording is a business or legal choice, it's marked **DECIDE:**. Fill every [square-bracket placeholder], settle every DECIDE:, then delete this box, every "Note for Lachlan" and every DECIDE: line before publishing.

# The Pantry: Privacy Policy

**Last updated:** [date of publishing]
**Applies to:** The Pantry app for iPhone, version [2.0.0] and later

> DECIDE: platforms. `app.json` also configures Android and a web build. Say "for iPhone" only if iPhone is the only thing you ship at launch.

## The short version

- **You don't need an account.** Without one, everything you put into The Pantry stays on your iPhone, and we don't collect it.
- **If you share a kitchen (Household) or sign in (Sign in with Apple, or a code sent to your email),** we store what's needed to make that work on our servers, which are run by Supabase and located in **Sydney, Australia**.
- What we store is listed in section 3. It's used **only to run those features**: to sync your kitchen between phones and people, and to back it up.
- There are **no ads, no analytics and no tracking**. We don't sell or share your information with advertisers.
- You can **delete your account, or your household data, in the app** at any time (Settings, at the bottom). Deleting the app removes everything kept on the phone.

The rest of this policy explains this in more detail, as the Australian Privacy Principles (APPs) and Apple ask us to.

## 1. Who we are

The Pantry is made by [legal name of business or person], ABN [ABN], in [suburb, state], Australia ("we", "us"). You can reach us at [contact email].

We handle personal information in line with the *Privacy Act 1988* (Cth) and the Australian Privacy Principles.

> DECIDE: "we comply with" or "we follow". A business with annual turnover of $3 million or less is usually exempt from the Privacy Act. Ask the lawyer whether it applies to you, and so which wording is accurate. Following it either way is what Apple and users expect.

## 2. Three ways to use The Pantry

What we hold depends on how you use the app. You choose; the app works fully in all three.

| How you use it | What we hold on our servers |
| --- | --- |
| **On your phone only** (the default) | Nothing. |
| **In a household, without an account** | A random ID for your phone, the name you give the household, and the household's shared kitchen (section 3B). |
| **Signed in** (Sign in with Apple, or an email code) | Your account details and everything personal you keep in the app (section 3C), plus the household's kitchen if you're in one. |

## 3. What we collect, and why

### 3A. On your phone only

The app keeps your cupboard, plan, shopping list, preferences, saved recipes, your own recipes, cooking history and settings in its own private storage on your iPhone. None of it is sent to us.

Some things **always stay on your phone**, even if you sign in or join a household:

- your **plates** (photos of dishes you cooked, with their notes);
- the theme, high contrast and the Sunday reminder;
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

An account backs up your kitchen and puts it on any phone you sign in on. You can sign in with **Apple** or with a **6-digit code sent to your email**. There are no passwords.

We store:

| What | Where it comes from | Why |
| --- | --- | --- |
| Your **email address** | You type it, or Apple gives it to us. If you choose Apple's "Hide My Email", we get a private relay address instead of your real one | To sign you in (the code is sent there) and to contact you about your account if we need to |
| Your **name** | Apple gives it to us the first time you use Sign in with Apple, if you choose to share it | To show who's signed in |
| A **user ID** | Made by our sign-in service | To keep your information together |
| A **random ID for each phone** you sign in on | Made by the app | To sort out changes made on two phones at once |
| Everything personal you keep in the app: Cookmarks, collections, dishes you've hidden, your own recipes (including the web address a recipe was imported from), your 20 most recently viewed recipes, your cooking log (which recipe and when), your taste settings (diet, ingredients to avoid, favourite cuisines, weeknight time), units, and shelf settings | You | To back them up and put them on your other phones |
| Your plan, shopping list and cupboard, when you're **not** in a household | You | As above. In a household, these are the household's instead (3B) |

> DECIDE: whether to let people change the name Apple gives. The app saves it once; there's no screen to edit it. If you add one, say so here.

**Your "ingredients to avoid" and diet.** These can say something about your health (an allergy) or your beliefs (avoiding pork or alcohol, for example). If you sign in, they're backed up with your other settings, and used only to steer the recipes we suggest to you. They're never shared with your household, and you can change or clear them in **Settings**. They're a convenience, **not an allergy filter**: always check ingredients yourself (see our Terms of Use).

> DECIDE (lawyer): whether the avoid list and diet are "sensitive information" (health information, or religious beliefs) under the Privacy Act, which would need your consent to collect. Options: (a) keep syncing them and rely on this notice plus the act of signing in; (b) add a one-line consent on the sign-in sheet; (c) stop syncing `diet` and `avoid` (a code change in `src/domain/sync/personal.ts`), so they never leave the phone. Recommendation: ask the lawyer; (c) is the safest if in doubt.

**Sign in with Apple.** Apple confirms who you are and gives us a sign-in token, your email (or relay address) and, the first time only, your name. We never see your Apple ID password.

> DECIDE: only keep the next sentence once the Apple revocation functions are deployed (K-19, required by Apple before submission): "To let us end The Pantry's access to your Apple ID when you delete your account, we keep a token from Apple on our servers in a private table no app or person can read."

**Email codes.** When you ask for a code, our sign-in service sends an email to your address with a 6-digit code. The code works once and expires.

> DECIDE: which service sends the emails. Supabase's built-in sender can't be used for real users (K-24); the plan is custom SMTP such as Resend. Name the provider and its country in section 5. Also confirm the code lifetime you set (K-24 suggests 10 minutes) if you want to state it.

### 3D. Information every connection to our servers involves

When your phone talks to our servers (only in a household or signed in), our hosting provider's systems record technical details of the request, such as your **IP address**, the time, and the app's request. These logs are used to run and secure the service and are kept for a short time.

> DECIDE: confirm Supabase's log retention for your plan (it varies by plan) and state it, for example "up to [7] days". We don't use these logs for anything else.

### 3E. What we don't collect

We don't collect your phone number, location, contacts, payment details, advertising identifier or usage analytics, and the app has no ads and no third-party analytics or crash-reporting tools. Your plates (dish photos) are never uploaded.

## 4. Permissions the app asks for

The app asks only when you first use the feature that needs it. You can say no, and change your mind at any time in your iPhone's **Settings › The Pantry**. If you say no, everything else still works.

- **Camera** and **Photos**: only when you choose to take or pick a photo of a dish you cooked. The photo is kept on your phone and isn't uploaded. With Photos, the app gets only the photos you pick.
- **Notifications**: for Cook Mode timers that finish while your phone is locked, and the optional Sunday planning reminder. These are scheduled on the phone itself; nothing comes from our servers.

## 5. Who else handles your information, and where

We use a small number of service providers to run the app. They handle your information only to provide their service to us.

| Provider | What they do | What they receive | Where |
| --- | --- | --- | --- |
| **Supabase, Inc.** | Hosts our database and sign-in service | Everything in sections 3B to 3D | Stored in Sydney, Australia (Amazon Web Services, ap-southeast-2). Supabase is a US company |
| **Apple** | Sign in with Apple, the App Store, and iOS | What you share when you use Sign in with Apple | Under [Apple's Privacy Policy](https://www.apple.com/legal/privacy/) |
| **[email provider]** | Sends sign-in code emails | Your email address and the code | [country] |

**Overseas.** Your household and account data are **stored in Australia**. Supabase is based in the United States, and its staff or sub-processors may be able to access data from overseas to run and support the service.

> DECIDE (lawyer): APP 8 (cross-border disclosure). Check Supabase's data processing terms and sub-processor list, confirm whether any access from the US or elsewhere counts as disclosure overseas, and name the countries. Same for the email provider.

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

> DECIDE: the 48-hour, one-person codes come with migration `20261008000200_invites.sql` (K-18, D-048). Until it's applied the live project gives 14-day codes anyone can reuse. Apply it before publishing, or say 14 days.
- **Anonymous users** that haven't been used for 30 days and aren't in a household are deleted automatically.
- **Server logs:** see section 3D.

> DECIDE: (1) The 30-day clean-up exists as a database function but isn't scheduled yet (K-24: pg_cron). Only publish that line once it runs. (2) Whether to delete accounts nobody has used for a long time (for example two years, after an email warning). Not required; say nothing if you don't. (3) Supabase's backups: say how long a deleted account can remain in backups (for example "up to [7] days in encrypted backups") once you know your plan's backup period.

## 7. How we keep it safe

- Everything sent between the app and our servers is encrypted in transit (HTTPS).
- Our database is locked down so each person can read and change only their own account data, and only members can read their household's kitchen. Invites can only be made and used through checked server functions.
- On your phone, the app's data is in its private storage, which other apps can't read, and is protected by your phone's passcode and Apple's device encryption.

> DECIDE: don't add "your sign-in is kept in the iPhone Keychain". It isn't yet (K-20, it's in the app's ordinary storage). If you approve `expo-secure-store` and that's fixed, you may add it.

If a data breach is likely to cause serious harm, we'll tell the people affected and the Office of the Australian Information Commissioner (OAIC), as the Notifiable Data Breaches scheme requires.

> DECIDE (lawyer): the Notifiable Data Breaches scheme only binds organisations covered by the Privacy Act (see section 1). Keep this as a promise either way, or soften it.

If your iPhone backs up to iCloud or a computer, that backup includes the data on your phone. It's held by Apple or on your computer, under their settings, not by us.

## 8. Seeing, changing and deleting your information

**In the app.** Everything you've added is visible in the app, and you can edit or remove it where it appears. Change your diet, ingredients to avoid, cuisines and weeknight time in **Settings**.

**Leaving a household** (Settings › Sharing › Household): you stop sharing, and the plan, list and cupboard stay on your phone. Your membership and name are removed from the household. What you added to the shared kitchen stays with the household.

**Signing out** (Settings › Account): this phone stops syncing and its copy of your account is cleared. Your account and everything in it stay on our servers until you sign in again.

**Deleting your account** (Settings, at the bottom › **Delete account**, then type DELETE): this permanently deletes your account, your profile, everything backed up in it and your sign-in, and removes you from your household. If the household carries on without you, your own recipes are removed from it, your invites are cancelled, and your user ID is removed from plan and list entries you made (those entries stay, as part of the household's plan and list). It can't be undone.

**Deleting household data without an account** (Settings, at the bottom › **Delete my household data**): this deletes your phone's anonymous user and anything of yours on our servers, in the same way, and takes you out of the household. Your plan, list and cupboard stay on your phone.

**What stays on your phone after deleting.** Your plates (dish photos) and any data brought across from the earlier version of The Pantry stay on the phone. To remove them, delete the app (press and hold the icon, then Remove App › Delete App).

> DECIDE: K-21. Either (a) change the app so Delete account also removes plates and the old app's data (needs expo-file-system for the photo files), then drop this paragraph; or (b) keep this paragraph as the honest description. Also note the known gap: another phone signed in to the same account stays signed in until it next refreshes its sign-in. Consider adding "Other phones signed in to the account are signed out the next time they connect."

> DECIDE: until migration `20261008000300_account_cleanup.sql` is applied to the live project (K-18), deleting doesn't yet remove your recipes from the household or clear your user ID from entries. Apply it before publishing this section, or reword it.

**Asking us.** You can ask us for a copy of the personal information we hold about you, or to correct it, at [contact email]. We'll confirm it's you (usually by replying from or to the email on the account) and respond within [30] days. There's no charge.

> DECIDE: an in-app "Export my data" isn't built. Email requests are fine under the APPs; decide whether you want to promise a format (for example a JSON file).

## 9. Children

The Pantry is a general cooking app and isn't directed at children. Cooking involves heat, knives and food-safety risks, so younger cooks should use it with an adult.

You must be at least [16] to create an account or start a household. If we learn that an account or household member is under that age, we'll delete their information.

> DECIDE (lawyer): the minimum age, and whether you need to check it. Points to raise: (1) Apple's age rating (see the App Privacy answers file) assumes no public content; (2) Australia's social media minimum age (under 16, from 10 December 2025) is unlikely to cover a private, invite-only household with no public posting, but confirm; (3) the OAIC's Children's Online Privacy Code, due by 10 December 2026, may apply to apps "likely to be accessed by children". Options: 13 (Apple's and Supabase's usual floor), 16, or 18. Recommendation: 16 for accounts and households for now; revisit before social (P9).

## 10. Features not switched on yet

These appear in the app but don't collect anything yet. We'll update this policy before any of them starts collecting information.

- **Scanning a receipt or a photo of your food** shows "Coming soon" and sends nothing.
- **The Pantry Pro** says it isn't on sale yet. No purchase information is collected.

> Note for Lachlan: when Pro goes on sale, add RevenueCat (purchase history and an app user ID, which will be the Supabase user ID for signed-in people: docs/PRO.md) to sections 3 and 5. When scanning goes live, add the AI provider, what it receives, and its country. When Sentry is added (K-8), add crash data. docs/launch/README.md lists each change.

## 11. Changes to this policy

If we change how the app handles information, we'll update this policy and the date at the top before the change reaches you. If the change is significant, we'll also tell you in the app before it applies. The current version is always at [privacy policy URL].

## 12. Questions and complaints

If you have a question or a complaint about privacy, email us at [contact email]. We'll reply within [30] days.

If you're not happy with our answer, you can complain to the Office of the Australian Information Commissioner: [oaic.gov.au](https://www.oaic.gov.au), phone 1300 363 992.
