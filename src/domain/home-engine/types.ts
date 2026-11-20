// The Home engine's shapes. Kept free of the app's own recipe model so the
// same engine runs in the app, in the simulation harness and (later) as the
// spec for a server-side ranker. An adapter (lib/homeFeed.ts) maps published
// recipes onto EngineItem.

/** One recipe the engine can recommend. */
export type EngineItem = {
  id: string;
  cookId: string;
  cookName: string;
  title: string;
  /** The cook's own word, lower case ("indian", "caribbean"). */
  cuisine: string;
  mealTypes: readonly string[];
  /** Diet tags the recipe carries ("vegetarian", "no-gluten"). */
  diets: readonly string[];
  difficulty: string;
  totalMinutes: number | undefined;
  /** Every ingredient id the recipe uses, optional lines included (for allergens and taste). */
  ingredientIds: readonly string[];
  /** The ingredients you need to have (required, not a basic like salt or water): the pantry match runs on these. */
  needIds: readonly string[];
  /** Milliseconds since epoch. */
  publishedAt: number;
  /** 0..1: how trustworthy the cook and the post are (followers, completeness). Missing means 0.5. */
  authorQuality?: number;
};

export type EventType = 'impression' | 'open' | 'dwell' | 'save' | 'unsave' | 'cook' | 'like' | 'follow' | 'unfollow' | 'hide';

/** One interaction. `itemId` is the recipe; follow events carry `cookId` instead (or as well). */
export type EngineEvent = {
  type: EventType;
  at: number;
  viewerId: string;
  itemId?: string;
  cookId?: string;
  /** Dwell only: seconds on the recipe. */
  seconds?: number;
  /** Where it happened ("home", "recipe"), for later analysis. */
  surface?: string;
};

/** How well your cupboard covers a recipe. */
export type PantryMatch = { have: number; total: number; missing: readonly string[] };

export type Viewer = {
  id: string;
  /** Cook ids this viewer follows. */
  follows: ReadonlySet<string>;
  /** Ingredient ids in the cupboard. */
  pantry: ReadonlySet<string>;
  /** Hard filter: when set, a recipe must carry at least one of these diet tags. */
  dietAnyOf?: readonly string[];
  /** Hard filter: a recipe using any of these ingredient ids is never shown. */
  avoidIngredientIds?: ReadonlySet<string>;
  /** Cuisines picked at sign-up: the taste profile's seed before there are events. */
  likedCuisines?: readonly string[];
  /** This viewer's own events, any order. */
  events: readonly EngineEvent[];
};

export type Source = 'following' | 'cookable' | 'similar' | 'popular' | 'fresh' | 'explore';

/** The features one item is ranked on, all 0..1 so the weights read as importance. */
export type Features = {
  follow: number;
  affinity: number;
  pantry: number;
  similarity: number;
  collab: number;
  popularity: number;
  freshness: number;
  quality: number;
  quick: number;
};

export type Predictions = { save: number; cook: number; like: number; dwell: number };

export type Reason = { kind: Source | 'saved' | 'nearly'; text: string };

export type RankedItem = {
  item: EngineItem;
  score: number;
  sources: Source[];
  features: Features;
  predictions: Predictions;
  pantry: PantryMatch;
  /** Best first; `reasons[0].text` is the line under the card. */
  reasons: Reason[];
  explanation: string;
};
