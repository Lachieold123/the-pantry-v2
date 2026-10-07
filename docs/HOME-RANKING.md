# How Home decides what to show

**Status:** built 7 October 2026 (Claude, delegated). The numbers are a first tuning; the questions at the end are for Lachlan, and the app uses the recommended answer to each until he says otherwise.
**Code:** `src/domain/suggestions/` — `rank.ts` (the steps), `score.ts` (the weights and reason lines), `moment.ts` (fit to now), `signals.ts` (what you've done), `diversify.ts` (variety). `home.ts` lays the result out as cards, grid and shelf; `slot.ts` scores the same way for a meal being planned (§3.9). Wired up in `src/store/suggestions.ts` (`useHomeRanking`, `useSlotIdeas`).

---

## 1. What Home is for

Home answers one question: **what's for dinner tonight?** It's Tuesday, 6pm, and you've opened the app tired. The best answer is something you'll enjoy, that fits the time you've got, and ideally that you can make with what's already in the cupboard. If tonight is already planned, that's the answer.

Everything else on Home serves that: the "What I have / Everything" switch (D-034), the four filters, five big cards, then the grid. The cards are the answer; the grid is "or one of these".

The ranking's job is to put the right five dishes on those cards, in a sensible order, and to say honestly why each one is there.

## 2. What the app knows (all on the phone)

| Signal | Where it comes from | Used as |
|---|---|---|
| Diet (vegetarian, vegan, pescatarian) | Settings, welcome | **Hard rule** |
| Leave-outs ("Ingredients to avoid") | Settings, welcome | **Hard rule** |
| "Not for us" (hidden dishes) | Recipe page | **Hard rule** |
| Meal, Time, Cuisine, Difficulty filters on Home | The chips on Home | **Hard rule** |
| Tonight's planned dinner | Plan | Always the first card (see §6) |
| The clock: time of day, day of the week | The phone | Soft: fit to now |
| Season (Australian) | The date | Soft |
| Weeknight time limit | Settings → Cooking | Soft |
| What's in the cupboard: ready, or 1–2 things short | Cupboard (the shared engine, D-030) | Soft, and decides the What I have lists |
| Favourite cuisines | Settings → Cooking | Soft |
| What you've cooked, how often, how lately | Cooking log | Soft: taste and freshness |
| Cookmarks | Bookmarks | Soft |
| Recently opened | Library → Recent | Soft: interest |
| This week's plan | Plan | Soft: don't suggest what's already coming |
| Review status (reviewed / vetted / draft), photo | The recipe | Soft: quality |

**Hard rules** decide what may show at all. No score can break them. **Soft signals** only change the order.

There are no star ratings in the app. Cooking something again is the strongest sign you liked it, so that's what the ranking uses.

## 3. The ranking

Every dish that passes the hard rules gets **one score**: a plain sum of points from the parts below. Highest score first. Because it's a sum of named parts, any card's place can be explained part by part (`explainScore` in `rank.ts` prints them).

### 3.1 Fit to now

- **Meal for the time of day.** The day is split into five windows:

  | Window | Hours | Leads with |
  |---|---|---|
  | Morning | 5:00–10:30 | Breakfast (dinner still close behind) |
  | Midday | 10:30–2:30 | Lunch |
  | Afternoon | 2:30–5:00 | Dinner (people start thinking about it) |
  | Evening | 5:00–9:00 | Dinner |
  | Late | 9:00–5:00 | Dinner (tomorrow's), snacks close behind |

  Dinner never drops low, because it's what the app is for and the catalogue has only seven breakfasts. If you pick a Meal filter, the clock stops mattering.

- **Time.** Monday to Thursday are weeknights: dinner should fit your weeknight time (Settings → Cooking). Friday to Sunday you get half an hour more, and never less than 75 minutes. A dish over the limit loses points the further over it is. Hard recipes lose a little on weeknights. If you haven't set a weeknight time, the app guesses 45 minutes and counts it at half strength.
- **Season.** Southern hemisphere. A dish tagged for this season gets a lift; one tagged only for the opposite season (a winter stew in January) is lowered. Untagged dishes (most of them) are year-round.

### 3.2 What you have

From the same cupboard engine the Cupboard tab uses, so they never disagree about what you can make.

- In **Everything**, a dish you can make now gets a light lift, and one that's a thing or two short a smaller one. Light on purpose: Everything is the wider view, and What I have already shows the full set.
- In **What I have**, every card is ready, so readiness can't rank them. Instead, dishes that use more of your cupboard rank higher, especially fresh food that will go off. Stand-ins (using one onion for another) count a little against.

### 3.3 Taste

- **Cuisines you picked** in Settings get a lift.
- **Cuisines you actually cook** get a lift too, learned from the cooking log (strongest), Cookmarks and what you open. It needs a bit of evidence first: opening one recipe isn't a taste.
- **Cookmarks** get a lift, and a little more if you haven't cooked them yet ("Saved, not cooked yet").
- **Regulars**: a dish you've cooked twice or more comes back up, once it's been a while.
- **Rediscoveries**: a dish you cooked once, three or more weeks ago, gets a small nudge.
- **Recently opened**: if you looked at it lately and haven't saved or cooked it, it gets a lift that fades down the Recent list.
- **Hidden** dishes never show (hard rule).

### 3.4 Freshness

- Cooked in the **last 10 days**: pushed right down. Not removed, so a small pool still fills the screen.
- Cooked **10–21 days** ago: a smaller push that fades away.
- **Already on this week's plan**: pushed down. It's coming anyway.

### 3.5 Variety

Ranking alone puts look-alikes together: if you love Thai, you'd get five Thai curries in a row. So the top of each list (the five cards and the grid) is re-ranked: going down the list, each place takes the best dish once a penalty is counted for being the same cuisine or main protein (chicken, beef, pork, lamb, seafood) as the cards just above it. Same cuisine twice in a row costs more than any ordinary gap between two good dishes, so it only happens when nothing else comes close, or when everything left is that cuisine (a Cuisine filter).

### 3.6 Quality

Reviewed and vetted recipes get a small lift; drafts (test builds only) are lowered. A dish with no photo is lowered, because the cards are photo-led.

### 3.7 Stability

Each dish gets a small fixed nudge that depends on the date. Within a day it never changes, so Home doesn't reshuffle every time you open it; tomorrow it's different, so near-ties settle differently and the screen doesn't go stale. The order also changes when the meal window changes (morning to midday, and so on) or when you do something (cook, save, plan, stock the cupboard). The phone's clock is read to the quarter hour.

### 3.8 A new cook

With no history, no cupboard and no settings, the score is just fit to now, time, season, quality and the daily nudge, then the variety re-rank. The first screen is five reviewed, photographed dinners that fit a weeknight, from at least four cuisines, and it's different tomorrow.

### 3.9 Planning a meal (the Plan tab)

Plan's "Picked for you" and the ideas in Add to plan use this same scorer (`slot.ts`, `rankForSlot`), scored for the meal being planned, not for now:

- **The meal is a hard rule**, like Home's Meal filter. A breakfast slot only offers breakfasts.
- **The day is the planned day.** Saturday's dinner gets the weekend's extra time and "Weekend cooking"; a Tuesday dinner gets the weeknight limit. The season is that day's season.
- **The hour is the meal's**: breakfast 8am, lunch midday, dinner 6pm, so a reason line reads right for the meal ("Quick" for breakfast, "Quick for a weeknight" for a Tuesday dinner).
- **"Already coming" means that day's week.** Planning next Thursday, a dish on next Monday's plan is pushed down; one on this week's plan isn't.
- **History is measured from now**: cooked lately, saved, opened, and the cupboard are as they are today, so every reason is true when you read it.
- The daily nudge uses the planned day, so each day of the week offers a different set and none reshuffles while you plan.

With no meal to fill (the day is full, and a tap just opens the recipe), the ideas are dinners.

## 4. The reason on each card

Every card says why it's there, and it must be true. The line is chosen from the parts that actually scored for that dish: whichever gave it the most points, with personal reasons winning ties.

| Line | Only when |
|---|---|
| Tonight · On the plan | It's tonight's planned dinner |
| Ready now · Nothing to buy | The cupboard can make it |
| Need 1: feta | It's one or two things short (names them) |
| Saved, not cooked yet | In Cookmarks, never cooked |
| In your Cookmarks | In Cookmarks, cooked before |
| A regular · cooked 3 times | Cooked twice or more, not in the last 10 days |
| You cooked this 5 weeks ago | Cooked once, three or more weeks ago |
| You looked at this lately | In Recent, not saved or cooked |
| Because you like Thai | Thai is one of your chosen cuisines |
| You often cook Japanese | At least 3 cooks of that cuisine, and at least a fifth of all your cooks |
| Quick for a weeknight · 25m | Monday–Thursday, dinner time, 30 minutes or less (or your own tighter limit) |
| Quick · 10m | Morning or midday, same limit |
| Weekend cooking · 1h 10m | Friday–Sunday, over an hour |
| In season for autumn | Tagged for this season |
| For breakfast / For lunch | It's that meal and that time of day |
| Picked for you · Easy | Nothing more specific is true |

Every line fits on one line of the card (34 characters or fewer). The tests check every line against the raw data for hundreds of random cooks.

## 5. The weights

All in one table in `score.ts` (`WEIGHTS`). Tuning Home means changing these numbers and nothing else. Points are relative: what matters is how they compare.

| Part | Everything | What I have | Why this size |
|---|---|---|---|
| Meal fits the time of day (× 0–1) | 4 | 4 | The biggest single part: a breakfast at 6pm is simply wrong. Not so big that a loved, saved lunch can't climb. |
| Within today's time budget | +2 | +2 | Matters every weeknight. Half strength (+1) when we're guessing the budget. |
| Over the budget (scaled, at most) | −2 | −2 | A 60-minute dish against a 30-minute budget loses the full 2. |
| Hard, on a weeknight | −1 | −1 | Tuesday night isn't the night for a hard recipe. |
| In season / opposite season | ±1.5 | ±1.5 | A gentle seasonal feel; only 54 recipes are tagged. |
| Cupboard: ready | +1.5 | 0 | A tie-breaker in Everything, not a takeover. |
| Cupboard: nearly (1 short / 2 short) | +0.5 / +0.25 | 0 | Smaller than ready. |
| Cupboard: things it uses from your cupboard | 0 | +0.5 each, up to 3 | In What I have, use more of what you've got. |
| Cupboard: fresh things it uses up | 0 | +0.5 each, up to 1.5 | Use the spinach before it wilts. |
| Cupboard: each stand-in | 0 | −0.25 | The exact ingredient is better than a swap. |
| A cuisine you picked | +2 | +2 | You told us; strong, but not enough to win alone. |
| A cuisine you cook (× 0–1 lean) | up to +2 | up to +2 | Learned taste counts as much as stated taste. |
| In Cookmarks | +2.5 | +2.5 | You saved it to cook it. |
| …and not cooked yet | +0.5 | +0.5 | A nudge to finally cook it. |
| A regular (cooked 2+ times) | +2 | +2 | The best evidence of a dish you love. |
| Cooked once, 3+ weeks ago | +1 | +1 | Worth a reminder. |
| Opened lately (fades down Recent) | up to +1.5 | up to +1.5 | Interest, weaker than saving. |
| Cooked in the last 10 days | −8 | −8 | Off the screen, not out of the pool. |
| Cooked 10–21 days ago (fading) | up to −3 | up to −3 | Back gradually. |
| On this week's plan | −4 | −4 | Already coming. |
| Vetted / reviewed / draft | +1 / +0.5 / −1 | same | Checked recipes first. |
| No photo | −1.5 | −1.5 | The cards are photographs. |
| Daily nudge (× 0–1, fixed per day) | up to +1.5 | up to +1.5 | Big enough to rotate near-ties day to day; too small to beat a real signal. |

Variety penalties (in `diversify.ts`): same cuisine as the card just above −6, same protein just above −2; for each of the four cards above that, same cuisine −1, same protein −0.5.

## 6. How the pieces fit together

1. **Hard rules first**: diet, leave-outs, hidden, and Home's Meal, Time, Cuisine and Difficulty chips. What's left is the pool.
2. **Score** every dish in the pool with the Everything weights; score the ready dishes again with the What I have weights.
3. **Variety re-rank** the top 29 (five cards and the 24-tile grid) of each list.
4. **Lay out** (`home.ts`):
   - **Everything:** tonight's planned dinner first (if it fits the filters), then the best ready dish, then the ranked picks. A pick you can cook now, or nearly, is labelled that way ("Ready now", "Need 1: feta"); other picks carry their reason line.
   - **What I have:** tonight's dinner first only if the cupboard can make it (D-034), then ready dishes in rank order. The Nearly there shelf is every dish one short, then every dish two short, best first within each.

Filters are applied before the variety step, so variety holds in whatever is left to show.

## 7. Edge cases

| Case | What happens |
|---|---|
| Empty cupboard | No cupboard signals. What I have shows its empty state; Everything ranks on everything else. |
| Filters leave nothing | No cards; Home's existing "clear filters" empty state. |
| Tiny pool (vegan with many leave-outs) | Soft rules never remove, so the whole pool shows, best first. |
| Cooked everything | Last 10 days' dishes drop to the bottom; regulars rise. The cards still fill. |
| Just before / after midnight | "Today" is the phone's local date; the daily nudge changes at local midnight, not before. |
| Phone clock wrong (a cook stamped in the future) | Counts as cooked today. |
| A recipe in the log that's been deleted | Ignored for taste. |
| No time given (some of your own recipes) | No time points, and no "quick" claim. |
| No meal tagged | Scores 0 for meal fit; can still show lower down, or with a Meal filter if it matched. |
| No photo, no review status (your own recipes) | Photo penalty only; cooking or saving them still lifts them. |

## 8. What changed from before

- Everything used to be **dinner-only** "For you" picks re-filtered by the chips, so Meal: Breakfast in Everything only showed dishes tagged both breakfast and dinner. Home now ranks every meal.
- Cards used to say "Picked for you · Easy" for every pick. Now each says its real reason.
- Variety, season, time of day, weekend time, Cookmarks, regulars and Recent weren't used before.
- What I have used to keep the Cupboard tab's order. It now uses the same scorer (taste, time and freshness count too), so a dish you cooked last night no longer leads. The Cupboard tab keeps its own order (most of your cupboard used first).

## 9. Questions for Lachlan

Each is built with the recommended answer. Say if you want any changed.

1. **Should Home follow the clock?** Recommended: **yes, gently.** Breakfast leads in the morning and lunch at midday, but dinner never drops far, so a Sunday-morning planner still sees dinners. *Alternative:* dinner all day.
2. **When does the weekend start?** Recommended: **Friday night.** Mon–Thu are weeknights. *Alternative:* Saturday and Sunday only.
3. **No weeknight time set (most people, now the welcome doesn't ask, D-041).** Recommended: **guess 45 minutes, at half strength.** *Alternatives:* no time nudge at all, or put the question back in the welcome.
4. **How long before a dish you've cooked comes back?** Recommended: **off the screen for 10 days, fully back after 3 weeks.**
5. **Cupboard dishes in Everything.** It used to show exactly one ready dish. Recommended: **one guaranteed, more only if they rank**, labelled "Ready now" or "Need 1: …". *Alternative:* exactly one.
6. **Reasons on the grid tiles too?** Recommended: **not yet.** Only the five cards carry a reason, so the grid stays quiet. It's a one-line change (the grid already supports a note, as Nearly there uses).
7. **Your own recipes have no photo and lose 1.5 points for it.** Recommended: **keep.** They still rise when you cook or save them. *Alternative:* no photo penalty for your own recipes.
8. **A way to say "loved it".** There are no ratings, so "cooked again" stands in. Recommended: **consider a one-tap "We'd have this again" after Cook Mode.** It would be the strongest taste signal we could add. Not built: that's a product change.

## 10. Technical appendix

- **Purity.** All ranking code is in `src/domain/suggestions/`, with no React and no packages (D-015). Time comes in as a `Moment` (`{ today, hour, minute, nowMs }`); nothing inside reads the clock. The store builds it from `new Date()` rounded to the quarter hour.
- **Entry point.** `rankHome(input): { picks, ready, nearly, reasons }`. Input: all recipes, taste (diet, avoid, cuisines, weeknight), hidden ids, Home filters, history (cook log, bookmarks, recently viewed, this week's planned ids), the cupboard engine's matches, the ingredient index, the moment, and `depth` (places to re-rank for variety).
- **Hard rules** reuse `eligibleForSurprise` (the same rules as Surprise me and the cupboard engine).
- **Score** (`scoreRecipe`) returns `{ score, parts, reason }`. `parts` is a record of named point totals (`meal`, `time`, `season`, `cupboard`, `taste`, `fresh`, `quality`, `jitter`); `score` is their sum.
- **Daily nudge** is `stableJitter(today, recipeId)` (`jitter.ts`, FNV-1a hash, 0–1), shared with the cupboard engine and Browse.
- **Variety** (`diversify`) is a greedy re-rank with maximal-marginal-relevance-style penalties, over the top `depth` places; the rest keep score order. Main protein is the first meat or seafood line in the recipe (`mainProtein`), from ingredient groups, so it never guesses from text.
- **Cost.** About 300 recipes are scored twice and the top 29 re-ranked on each change of input: a few milliseconds.
- **Tests** (`node:test`): `moment.test.ts`, `signals.test.ts`, `diversify.test.ts`, `rank.test.ts` (behaviour), `rank.property.test.ts` (150 random cooks over the real catalogue: hard rules, true reasons, line length, no duplicates, stability, layout), `slot.test.ts` (Plan: right meal, right day, that week's plan, true reasons, hard rules), plus `home.test.ts`. The reason check (`src/domain/testing/home.ts`, `falseReason`) re-derives every claim from the raw inputs, never from the ranking's own signals.
- **Plan** (`slot.ts`): `rankForSlot` builds a `RankInput` for one planned meal (Meal filter = the slot, a moment at the slot's day and hour with `nowMs` still now, and that week's planned ids) and calls `rankHome`. It replaced `forYou.ts`, which ranked dinners only, so breakfast and lunch slots used to get dinner-tagged dishes. Wired in `useSlotIdeas` (`src/store/suggestions.ts`).
