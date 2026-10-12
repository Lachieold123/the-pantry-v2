# The Home engine

How Home decides which recipes from other cooks to show, in what order, and why. Branch `feature/home-engine`, 12 October 2026. Code: `src/domain/home-engine` (pure, tested), `src/lib/homeFeed.ts` (wiring), `src/features/feed/HomeForYou.tsx` (screen). Results: `docs/reports/home-engine.md`.

## 1. What it's modelled on

The big feeds publicly describe the same three-stage shape, and we copy the shape, not the scale:

- **Candidate generation** (Instagram calls it "inventory" or retrieval; YouTube's paper calls it candidate generation). Several cheap sources each put forward a few hundred items.
- **Ranking**. Each candidate gets predicted probabilities for several actions (Instagram: like, save, share, tap, time spent; TikTok: likes, comments, watch time, completion). The final score is a weighted sum of those predictions, so the business can say what it values.
- **Re-ranking**. Rules on top of the score: variety (no wall of one creator), integrity filters, "already seen" suppression, and a slot for exploration so the system keeps learning.

Facebook's old EdgeRank (affinity × weight × time decay) is the ancestor of our direct terms. We use small explainable models (logistic-style weights, content similarity, item-item co-occurrence) because we have ~600 recipes, 100 cooks and no training data yet. Every weight lives in `config.ts`.

## 2. Candidate sources (`candidates.ts`)

| Source | What | Limit |
|---|---|---|
| following | Recipes from cooks you follow (server follows plus follow taps logged on this phone), newest first | 80 |
| cookable | Recipes your cupboard covers: at least 60% of what you'd buy, or at most 2 missing | 60 |
| similar | Cosine similarity to your taste profile, or "cooks who saved X saved this" (co-occurrence) | 60 |
| popular | Decayed engagement (half-life 96 h). With no events yet: author quality × freshness | 40 |
| fresh | Newest | 30 |
| explore | Seeded random, leaning to cuisines you haven't shown interest in; never followed cooks | 20 |

Hard filters run before any source (stage 0, `context.ts`): diet (a recipe must carry one of the viewer's diet tags), the avoid list (allergens and custom words, through `containsAvoided`), and hidden recipes. Nothing downstream can let a blocked recipe back in.

## 3. Ranking (`rank.ts`)

Nine features, each 0..1: `follow`, `affinity` (your interactions with this cook, 1 - e^(-w/6)), `pantry` (share covered), `similarity` (cosine to taste profile), `collab` (co-occurrence), `popularity`, `freshness` (half-life 72 h), `quality` (author: followers on a log scale, recipe count, has a photo), `quick` (30 minutes or less).

Four logistic heads predict P(save), P(cook), P(like) and P(long look, i.e. dwell). Example: P(cook) = σ(-3.2 + 3.0·pantry + 1.4·similarity + 0.8·quick + 0.8·affinity + 0.4·follow + 0.8·collab).

Score = 1.0·P(save) + 1.5·P(cook) + 0.5·P(like) + 0.3·P(dwell) + 0.45·follow + 0.2·affinity + 0.35·pantry + 0.15·freshness + 0.1·quality.

Then: shown 3+ times with no open, the score is multiplied by 0.6 per extra showing; already saved or cooked, by 0.5 (it's in your Library).

When real events exist, the heads are the thing to fit (logistic regression per action on logged features), with these numbers as the prior.

## 4. Re-ranking (`rerank.ts`)

Greedy walk down the scored list, taking the best item that keeps the page varied: no more than 2 in a row from one cook, 3 in a row from one cuisine, 4 from one cook per page of 20; every 8th slot goes to an exploration pick. If nothing fits, the in-a-row rules still apply; if even that fails, the best item wins (a short feed beats an empty one).

## 5. Cold start

- New viewer: popular (author quality × freshness until there are events), fresh and explore fill the page; cuisines picked at sign-up seed the taste profile.
- New recipe: the fresh source and the freshness term give it a few days of exposure; its cook's quality carries it until it has engagement.
- New cook: followers come from the follow button; exploration slots show their recipes to people outside their circle.

## 6. Events (`events.ts`, `store/homeEvents.ts`)

Logged on the phone today (max 3,000, 90 days): `impression` (card shown on Home, deduped for 30 minutes), `open`, `dwell` (seconds on the recipe page, from 3 s), `save`/`unsave`, `cook`, `like`, `follow`/`unfollow` (the cook profile's Follow button), `hide` ("Not for me"). Taste weights: open 1, like 2, save 3, cook 4, hide -6, dwell 1 per 30 s up to 3. Home ranks on events from before this visit (plus hides and follows, which apply at once), so cards don't jump while you scroll.

Save, cook and like for published recipes have no buttons yet (those recipes aren't in the phone's recipe book), so today's live signals are impressions, opens, dwell, hides and follows. The engine handles all ten.

## 7. Server side (later, not applied)

- `supabase/migrations/20261012000000_home_events.sql`: `home_events`, append-only, each cook reads and writes only their own rows; a tidy function for 180-day retention.
- `supabase/migrations/20261012000100_home_ranking.sql`: `home_popularity` (decayed engagement), `home_also_engaged` (co-occurrence, at least 3 cooks behind every pair), `home_candidates` (stage 1 with follow, popularity, freshness). Totals only.
- Edge Function design (`home-feed`): called with the user's JWT; runs `home_candidates` (300) + `home_also_engaged` (for the viewer's last 30 saves) + `home_popularity`; loads the same `src/domain/home-engine` code (pure TypeScript, runs in Deno unchanged) to rank and re-rank; returns ids + explanations. The phone keeps ranking locally as the offline fallback. Cache per viewer for 10 minutes.

## 8. "Can I cook it?" and the ingredient model

Owner report (msg 876): 72 items in the pantry, "can cook 4". Diagnosis: both dev servers (8081 `preview-2026-10-08`, 8083 `cloud/12-feed`) run the same matcher, and it matched ingredient ids exactly, with only 15 hand-made swap families. "Chilli" became red chilli and missed green and bird's eye; "chicken thighs" missed "chicken pieces"; "pasta" missed every shape; "bread" missed sourdough. Generator junk made it worse ("salt cod" linked to salt, "whole fish" to "whole"). Home also only matched the catalogue, never the 592 published recipes. The figure of 4 fits the store or "only what I ticked" setting (3 to 10 recipes for a 72-item pantry).

The model (`src/domain/ingredients/hierarchy.ts`, data `src/data/ingredients/hierarchy.json`):

- **Parents**: a kind covers its generic (cheddar for grated cheese, spaghetti for pasta). **Varieties**: generics where any kind will do also cover their kinds (potato covers waxy, desiree, kipfler; pasta covers every shape). Generic cheese doesn't cover cheddar.
- **Aliases**: AU/UK/US names (capsicum/bell pepper, coriander/cilantro, mince/ground beef, courgette, aubergine, rocket/arugula, desiree, kipfler).
- **Substitutes**: 48 groups (dried/fresh herbs, stock types, vinegars, mince types, stewing cuts) with half credit. They count as "have" only when the cook turns substitutes on (`Shelf.substitutes`). The missing line says "thyme (or your dried thyme)".
- **Staples**: water, salt and pepper are always assumed. Oil is assumed unless the cook turns the oil switch off (`Shelf.oil`).
- **Lines that don't block**: optional, garnish, "to serve", "to taste" and unmeasured lines. "Plus extra to serve" still counts.
- **Junk links**: staple or unknown links are matched again on the remaining words. Salt cod becomes `unknown:salt-cod` (always missing), whole fish becomes white fish, "4 whole cloves" becomes cloves.
- **Both directions**: `coversFor(need)` and `coveredBy(pantryItem)` come from the same table.

Tiers: **Can cook now** (nothing missing) and **Missing 1-2** (listed by name), on Home for published recipes and in the Cupboard for the catalogue. Before and after counts: `docs/reports/pantry-match.md`.

## 9. Testing switches

Dev and preview builds show "Testing: ranked as you" under the section, with **Change**, which opens `/dev/home-viewer` to rank as any AI cook (their real follows, read only). Store builds don't show it, and the route sends you home.

## 10. Next

1. Owner review, then apply the two migrations and add batched upload of the local log.
2. Save, like and cook for published recipes, so those signals flow.
3. Fit the four heads on real events, then compare offline (NDCG/recall on held-out saves) before changing weights.
4. Swap content similarity for embeddings once there's text worth embedding (on-device or a free model).
5. Bring the catalogue's house recipes into the same ranked feed (as "The Pantry" cook) so Home is one engine.
