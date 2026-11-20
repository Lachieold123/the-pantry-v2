> **Draft for Lachlan and a lawyer to review. Not legal advice.** Drafted by an AI (Claude) on 12 October 2026 from the code on the `preview-2026-10-08` branch (K-23). It replaces the 5 October draft, which described an app with no accounts and no server. Points that need Lachlan's decision are marked **DECIDE:**. Fill every [square-bracket placeholder], settle every DECIDE:, then delete this box, every "Note for Lachlan" and every DECIDE: line before publishing.
>
> **Re-checked against the code on 20 November 2026** (branch `audit/deep-1120`, deep audit S2-6 and S2-7). Every factual sentence now describes a store build. Proof: `docs/audits/2026-11-20-deep-audit/FIX-DOCS.md`.

> **OWNER TO DO BEFORE SUBMITTING**
> 1. Host these terms, the privacy policy and a support page on HTTPS and paste the URLs into `src/lib/legal.ts`. Filling the privacy and terms links is what puts Pro on sale, so section 10 applies from that build on.
> 2. Check in App Store Connect whether either Pro product has an introductory offer (free trial). Section 10 covers both cases; the listing must not promise a trial unless there is one.
> 3. Apply the live database migrations (`supabase/APPLY-LIVE.md`). Section 4's 48-hour one-person codes and section 7's member removal depend on them.
> 4. Settle the minimum age with the lawyer (section 4; it must match the privacy policy, section 9).
> 5. Get a support email address and fill [contact email].
> 6. Have a lawyer review it, especially sections 5, 9 and 10.

# The Pantry: Terms of Use

**Last updated:** [date of publishing]

Thanks for using The Pantry. These terms explain what you can expect from us and what we ask of you. We've kept them as plain as we can.

## 1. Who we are, and agreeing to these terms

The Pantry is made by [legal name of business or person], ABN [ABN], [suburb, state], Australia ("we", "us"). Contact: [contact email].

By downloading or using The Pantry, you agree to these terms and to our Privacy Policy at [privacy policy URL]. If you don't agree, please don't use the app.

## 2. Apple's terms

You get The Pantry from Apple's App Store, so Apple's [Licensed Application End User License Agreement](https://www.apple.com/legal/internet-services/itunes/dev/stdeula/) (the "Apple EULA") also applies. These terms add to the Apple EULA. If the two conflict, the Apple EULA wins to the extent of the conflict.

As the Apple EULA says: these terms are between you and us, not Apple. We, not Apple, are responsible for the app and its content, its maintenance and support, and any claims about it. Apple and its subsidiaries can enforce these terms against you as third-party beneficiaries.

## 3. Your licence to use the app

We give you a personal, non-exclusive, non-transferable licence to use The Pantry on Apple devices you own or control, for your own non-commercial cooking, planning and shopping, in line with the Apple EULA's usage rules.

Please don't copy, resell, reverse-engineer or redistribute the app or its recipes and photos, except as the law allows.

The Pantry is free to use. The Pantry Pro is an optional subscription; section 10 explains it.

## 4. Accounts and households

You don't need an account to use The Pantry. Two optional features use our servers:

- **An account** backs up your kitchen and puts it on any phone you sign in on. You sign in with Apple.
- **A household** lets up to 8 people share one plan, shopping list and cupboard. You join with an invite, with or without an account.

If you use either:

- **Age.** You must be at least [16] to create an account or start or join a household.
- **Keep your Apple ID safe.** Anyone who can use your Apple ID can sign in to your account.
- **One person per account.** To share with family, use a household rather than sharing an account.
- **Give a name you're happy for your household to see.** It must not pretend to be someone else, or be offensive.
- **Only invite people you know.** Whoever uses your invite code first can join while it's valid (48 hours). Every member can see and change the shared plan, list and cupboard, and see the recipes of yours that the shared plan uses.
- **Signing out and deleting.** You can sign out, leave a household, or delete your account in **Settings** at any time. Deleting is permanent; the Privacy Policy explains exactly what's deleted and what stays with the household.

> DECIDE: the minimum age (13, 16 or 18). It must match the Privacy Policy, section 9. The app doesn't ask anyone's age (audit S2-16); ask the lawyer whether a statement is enough. The "48 hours" above is true only once migration `20261120000200_invites.sql` is applied; until then live codes last 14 days and anyone can reuse them (to-do 3). Note for Lachlan: email codes are built but switched off (`src/lib/emailCodes.ts:9`); when you switch them on, add "or with a code we email you" and "your email or" back.

## 5. Recipes, food safety and your health

Our recipes have been written and checked with care, and some carry food-safety notes (for example about raw egg, raw fish or cooking temperatures). But we can't see your kitchen, your ingredients or your oven. So, please:

- **Allergies and intolerances: always check the ingredients and the labels yourself.** The "Ingredients to avoid" setting steers suggestions away from ingredients you choose. It is a convenience, **not an allergy filter**. It works from our ingredient list and can miss things, such as an allergen hiding inside a packaged sauce, stock or spice mix, or traces from shared equipment. Diet labels (such as vegetarian) describe the ingredient list, not a guarantee. In a household, each person's avoid list is their own: the shared plan doesn't check anyone else's.
- **Cook food safely.** Cook meat, poultry, seafood and eggs until they're safe to eat. For example, chicken and minced meat should reach 75°C in the centre. Use a thermometer if you're unsure. Ovens, hobs and appliances vary, so cooking times are a guide. Follow the food-safety advice of [Food Standards Australia New Zealand](https://www.foodstandards.gov.au) and your appliance's instructions.
- **Take extra care if you're pregnant, cooking for babies, young children or older people, or if someone has a weakened immune system.** Some foods (such as raw or soft-cooked egg, raw fish, soft cheeses and rare meat) carry more risk for these groups.
- **Kitchens have hazards.** Take care with knives, hot oil, steam and hot surfaces, and supervise children.
- **This isn't medical, dietary or nutritional advice.** The Pantry is a cooking app. If you have a medical condition, an allergy or special dietary needs, follow the advice of your doctor or an accredited practising dietitian.

**How the recipes are made.** The recipes built into The Pantry were first drafted with the help of AI writing tools. Before release, each one was read line by line against our written standards and edited, with the help of AI tools, and we settled the questions that review raised. None of them has been cook-tested yet. Recipes you write or import yourself are yours, and we don't check them.

> DECIDE (lawyer): this sentence replaces "reviewed and edited by us before they're published" (audit S2-6, S2-7). What's true: a store build shows only the 271 recipes marked `reviewed` (`src/domain/recipes/provenance.ts:7`); the October 2026 review of them was done by AI agents working to a written brief (`docs/reports/recipe-review-2026-10.md`), with your calls on the open questions (D-036); none is cook-tested; 68 of them still lack some house food-safety cues (audit FOOD-4, being fixed). If you read and approved each one yourself, say so instead. The 719 recipes under the 99 AI cooks on the server were only machine-checked (`auto-checked`); they're hidden in store builds, and this sentence must not cover them if those screens are ever turned on. The in-app wording ("checked and edited by us", `src/domain/recipes/labels.ts:144` and `:151`) says the same as the old sentence; make it match whatever you keep here.

## 6. What you add to the app

You can write your own recipes, import recipes from web links, keep photos of dishes you've cooked ("plates"), and, in a household, add to a shared plan, list and cupboard.

- **You own what you create.** We claim no ownership of it.
- **Our licence to it.** If you sign in or join a household, you give us a non-exclusive, royalty-free licence to store, copy and show what you add, **only so we can run the app for you**: to back it up, put it on your other phones, and show it to the members of your household where the app shares it. This licence ends when you delete the content or your account, except for copies the household keeps under the Privacy Policy (for example, plan entries you made).
- **Plates stay on your phone.** They're never uploaded or shown to anyone else.
- **Imported recipes.** A recipe you import from a website is saved for your own personal use. Its words may belong to the website or its author. Please don't republish it as your own. If the shared plan uses it, your household can see it too.
- **Sharing.** When you share a recipe, list, plan or invite through your phone's share sheet, you're responsible for where you send it.

> DECIDE (lawyer): whether showing an imported recipe to household members (up to 8 people) raises any copyright concern, and whether the licence wording above is enough for household sharing.

## 7. Acceptable use

Please don't:

- use the app in a way that breaks the law or anyone else's rights;
- put anything in a shared household, including your name or the household's name, that is abusive, harassing, hateful or sexually explicit;
- try to break, overload, hack or get around how the app or our servers work, including making accounts, households or invites automatically, or trying to read anyone else's data;
- copy our recipes, photos or design in bulk, or use them commercially, without our permission.

If someone in your household is behaving badly, you can leave the household at any time in **Settings › Sharing › Household**, and tell us at [contact email].

Any member can also remove another member from the household.

> DECIDE: member removal and 48-hour single-use codes (D-048) only work once the live migrations are applied (`supabase/APPLY-LIVE.md`; audit S2-11: `remove_member` and `revoke_invites` don't exist live yet). Apply them before publishing, or delete the line above and change "48 hours" to "14 days" in section 4.

## 8. Our content, and photo credits

The app, its design, its name and logo, and its recipe text belong to us or our licensors and are protected by copyright and other laws.

**Photos.**

- Many recipe photos are from [Pexels](https://www.pexels.com), used under the Pexels licence.
- Many house recipe photos are from [Wikimedia Commons](https://commons.wikimedia.org), used under the free licence shown for each one.
- Each of these photos credits its source on the recipe page.
- Some recipe photos were generated with AI. They're labelled "AI-generated photo" on the recipe page. They show the kind of dish to expect, not exactly how yours will look.

> DECIDE: K-17 / D-045. Wikimedia Commons licences such as CC BY-SA ask for the author, the licence and a link. The credits in the app are plain text today. Before launch, either link each credit (or a credits page) to the source and licence, or get the lawyer to confirm plain text is enough.

If you think something in the app infringes your rights, email [contact email] and we'll look into it promptly.

## 9. The app is provided "as is", and Australian Consumer Law

We work hard to make The Pantry useful and reliable, but we can't promise it will always be available or error-free, that syncing between phones will always be instant, or that every recipe will turn out exactly as you hope. Keep anything that matters to you somewhere else too.

**Your rights under the Australian Consumer Law aren't affected.** Nothing in these terms excludes, restricts or changes any consumer guarantee, right or remedy you have under the *Competition and Consumer Act 2010* (Cth), including the Australian Consumer Law, or any other law that can't be excluded.

Subject to that:

- we don't give any other promises or warranties about the app beyond those in these terms and those the law requires;
- where the law lets us limit our liability for failing to meet a consumer guarantee, our liability is limited to supplying the service again or paying the cost of having it supplied again [or, for a paid service, refunding what you paid];
- we're not liable for loss that is indirect, or that we couldn't reasonably have foreseen, or that comes from you not following the food-safety and allergy advice in section 5.

Nothing in these terms limits liability for death or personal injury caused by our negligence, or for fraud, where the law doesn't allow it.

> DECIDE (lawyer): the limitation of liability wording against section 64A of the ACL, now that the app holds people's data on a server.

> DECIDE: hosting. The Supabase project is on the free plan, which pauses after about a week without use (docs/HOUSEHOLD.md). Move to a paid plan before launch, or households and sign-in will stop working without warning.

## 10. The Pantry Pro

Pro is an optional subscription, monthly or yearly, sold through the App Store at the price shown in the app before you buy.

- **Payment** is charged to your Apple Account when you confirm the purchase.
- **It renews automatically** unless you turn off auto-renew at least 24 hours before the end of the current period. Manage or cancel it in your Apple Account's subscription settings.
- **Free trials.** If the app offers you a free trial, it says so on the button before you buy. You're charged when the trial ends unless you cancel at least 24 hours before. The app only offers a trial your Apple Account can still have.
- **Refunds** are handled by Apple under its policies, and your rights under the Australian Consumer Law aren't affected.
- **What Pro adds.** Everything else in the app is free, including planning the week you're shopping for. Pro adds planning next week as well, and no limits on collections (free: 3), your own recipes (free: 10) and recipes imported from web links (free: 5 a month).
- **If Pro ends,** nothing you made is taken away. You keep every collection and recipe; you just can't add more past the free limits.
- **Restoring.** If you change phones, tap Restore purchases on the Pro screen.

> DECIDE (lawyer): this section replaces the bracketed draft. It's true to the code: limits in `src/domain/pro/pro.ts:15-19` and `PRO_BENEFITS` (line 81); trial wording only when the store product has a free introductory offer and Apple says the buyer is eligible (`src/domain/pro/purchase.ts:76-89`); Restore on the paywall (`BuyPanel.tsx`). Check "If Pro ends" against what the app does with existing items over the limit (the code limits adding, not keeping). Apple requires the title, length and price of the subscription, and links to these terms and the privacy policy, on the paywall itself: the app shows them only once `LEGAL_URLS` is filled (`src/lib/legal.ts`). Settle section 9's refund wording at the same time.

## 11. Changes to the app and these terms

We'll keep improving The Pantry, which means features may change, be added or be removed. If we change these terms, we'll update the date at the top. If the change is significant, we'll tell you in the app before it applies. If you keep using the app after that, the new terms apply. If you don't agree with them, you can stop using the app, delete your account and delete the app at any time.

## 12. Ending

You can stop using The Pantry at any time: delete your account in **Settings**, then delete the app.

We may suspend or delete an account or household, or cancel invites, if it seriously or repeatedly breaks these terms, or if we have to by law. Where it's reasonable, we'll tell you first and give you a chance to fix it. If we ever stop offering the app's online features, we'll give you reasonable notice, and everything on your phone will keep working.

Sections 5, 8 and 9 continue after these terms end.

> DECIDE: the notice period you'd give before shutting down the servers (for example 30 days), if you want to promise one.

## 13. Governing law

These terms are governed by the laws of [state or territory, e.g. New South Wales], Australia. You and we submit to the non-exclusive jurisdiction of its courts. If you live elsewhere in Australia, your local consumer protection laws still apply.

## 14. Contact

Questions, problems or feedback: [contact email]. We read everything.

Support page: [support URL]
