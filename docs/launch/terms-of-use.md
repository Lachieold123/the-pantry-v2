> **Draft for Lachlan and a lawyer to review. Not legal advice.** Drafted by an AI (Claude) on 12 October 2026 from the code on the `preview-2026-10-08` branch (K-23). It replaces the 5 October draft, which described an app with no accounts and no server. Points that need Lachlan's decision are marked **DECIDE:**. Fill every [square-bracket placeholder], settle every DECIDE:, then delete this box, every "Note for Lachlan" and every DECIDE: line before publishing.

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

The Pantry is currently free. The Pantry Pro, an optional subscription, isn't on sale yet; section 10 will apply once it is.

## 4. Accounts and households

You don't need an account to use The Pantry. Two optional features use our servers:

- **An account** backs up your kitchen and puts it on any phone you sign in on. You sign in with Apple or with a code we email you.
- **A household** lets up to 8 people share one plan, shopping list and cupboard. You join with an invite, with or without an account.

If you use either:

- **Age.** You must be at least [16] to create an account or start or join a household.
- **Keep access to your email or Apple ID safe.** Anyone who can read your email or use your Apple ID can sign in to your account.
- **One person per account.** To share with family, use a household rather than sharing an account.
- **Give a name you're happy for your household to see.** It must not pretend to be someone else, or be offensive.
- **Only invite people you know.** Whoever uses your invite code first can join while it's valid (48 hours). Every member can see and change the shared plan, list and cupboard, and see the recipes of yours that the shared plan uses.
- **Signing out and deleting.** You can sign out, leave a household, or delete your account in **Settings** at any time. Deleting is permanent; the Privacy Policy explains exactly what's deleted and what stays with the household.

> DECIDE: the minimum age (13, 16 or 18). It must match the Privacy Policy, section 9. The app doesn't check age today; ask the lawyer whether a statement is enough.

## 5. Recipes, food safety and your health

Our recipes have been written and checked with care, and some carry food-safety notes (for example about raw egg, raw fish or cooking temperatures). But we can't see your kitchen, your ingredients or your oven. So, please:

- **Allergies and intolerances: always check the ingredients and the labels yourself.** The "Ingredients to avoid" setting steers suggestions away from ingredients you choose. It is a convenience, **not an allergy filter**. It works from our ingredient list and can miss things, such as an allergen hiding inside a packaged sauce, stock or spice mix, or traces from shared equipment. Diet labels (such as vegetarian) describe the ingredient list, not a guarantee. In a household, each person's avoid list is their own: the shared plan doesn't check anyone else's.
- **Cook food safely.** Cook meat, poultry, seafood and eggs until they're safe to eat. For example, chicken and minced meat should reach 75°C in the centre. Use a thermometer if you're unsure. Ovens, hobs and appliances vary, so cooking times are a guide. Follow the food-safety advice of [Food Standards Australia New Zealand](https://www.foodstandards.gov.au) and your appliance's instructions.
- **Take extra care if you're pregnant, cooking for babies, young children or older people, or if someone has a weakened immune system.** Some foods (such as raw or soft-cooked egg, raw fish, soft cheeses and rare meat) carry more risk for these groups.
- **Kitchens have hazards.** Take care with knives, hot oil, steam and hot surfaces, and supervise children.
- **This isn't medical, dietary or nutritional advice.** The Pantry is a cooking app. If you have a medical condition, an allergy or special dietary needs, follow the advice of your doctor or an accredited practising dietitian.

**How the recipes are made.** The recipes in The Pantry were first drafted with the help of AI writing tools, then reviewed and edited by us before they're published.

> DECIDE: whether to add a cook-testing sentence. Only keep one that's literally true for the build you ship. Today none of the shipped recipes is cook-tested (D-036), and there's no "Tested in The Pantry kitchen" label in the app. Also check this paragraph matches the in-app wording in `src/domain/recipes/labels.ts` (D-049).

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

> DECIDE: member removal and 48-hour single-use codes (D-048) only work once the K-18 migrations are applied to the live project. Apply them before publishing, or delete the line above and change "48 hours" to "14 days".

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

## 10. [Add when Pro goes on sale] Pro subscriptions

> [Draft wording to adapt: "Pro is an optional subscription, sold through the App Store, at the price shown in the app before you buy. Payment is charged to your Apple Account. It renews automatically unless you turn off auto-renew at least 24 hours before the end of the current period, in your Apple Account settings. If a free trial is offered, you're charged when it ends unless you cancel at least 24 hours before. Refunds are handled by Apple under its policies, and your rights under the Australian Consumer Law. Free features stay free; Pro adds [list exactly what Pro does at the time]. If Pro ends, nothing you made is taken away." Apple requires the title, length and price of the subscription, and links to these terms and the privacy policy, on the paywall itself (docs/PRO.md, K-38).]

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
