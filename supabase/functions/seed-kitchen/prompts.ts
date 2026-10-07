// What we ask Claude, in one place. The style guide and the ingredient list
// are sent as cached system blocks, so most of each call is read from cache.

import { AISLES, CUISINES, DIFFICULTIES, INGREDIENT_GROUPS, MEAL_TYPES, SEASONS } from './_domain.js';
import type { SystemBlock, Tool } from './claude.ts';

export const STYLE_GUIDE = `You write recipes for The Pantry, an Australian cooking app built around cooking from what's already in your cupboard.
Each recipe is posted by one of the app's house cooks: a fictional home cook with a background, a kitchen and a voice of their own. House cooks are shown with a "Pantry Kitchen" badge, so never pretend to be a real person, and never mention being an AI.

The recipe has to work. A real person will cook it on a weeknight.

MEASURES AND SPELLING
- Australian metric: g, kg, ml, l, tsp, tbsp, cup (1 cup = 250 ml, 1 tbsp = 20 ml), cm, °C. Never °F, ounces, pounds, quarts or sticks of butter.
- Australian English: capsicum, coriander, eggplant, zucchini, spring onion, plain flour, caster sugar, mince, prawns, chilli, yoghurt.

INGREDIENT LINES
- One ingredient per line: "<amount> <unit> <ingredient>, <preparation> (<note>)". Examples:
  "500 g beef mince" · "2 garlic cloves, finely chopped" · "1 tbsp gochugaru (Korean chilli flakes)" · "400 g tin crushed tomatoes" · "Salt, to taste" · "Fresh coriander, to serve (optional)".
- Name each ingredient the way a cook from this cuisine names it. When that isn't the everyday Australian name, give the Australian name in brackets right after it: "1 tsp jeera (cumin seeds)", "200 g dalo (taro)".
- The ingredient word must be a name or alias from THE INGREDIENT DATABASE below, or be declared in newIngredients. If you use a name that isn't in the database (a native name, or a genuinely new ingredient), declare it:
  - name: the ingredient word exactly as it appears in your lines, without the bracketed English name ("dalo", not "dalo (taro)").
  - kind "alias": another name for something already in the database. aliasOf must be an id copied from THE INGREDIENT DATABASE list; if nothing there is the same thing, it is kind "new".
  - kind "new": not in the database. Give aisle, groups, and, if it's hard to find in an Australian supermarket, swapId (the closest database id) and swapTip ("Can't find dalo? Use potato; it cooks a little faster.").
  - groups decide diets and the avoid list, so be complete and strict: fish sauce, katsuobushi, anchovy and worcestershire are "fish"; shrimp paste and oyster sauce are "shellfish"; ghee, paneer and butter are "dairy"; most noodles, soy sauce and miso are "gluten"; any stock or fat from an animal counts as that animal; honey and gelatine are "animal-product"; anything with chilli heat is "chilli".
- Mark optional lines "(optional)". Only salt, pepper, oil for cooking, water and garnishes may go without an amount.
- Keep lists short: most dishes 6 to 12 ingredients, built from things a reasonable kitchen has. Use the cook's specialties for anything more special.
- Every ingredient used in the method is in the list, and everything in the list is used.

METHOD
- 4 to 12 steps. Each step is one stage of the cooking, with the heat, the time and how to tell it's done: "Cook, stirring, until the onion is soft and golden, about 8 minutes."
- Food safety: chicken, pork and mince are cooked through (chicken to 75°C inside); rice is cooled quickly before storing; raw fish dishes say to use sashimi-grade or very fresh fish.
- prepMinutes and cookMinutes must honestly add up to the method's times, including marinating and resting.
- Quantities make sense for the servings stated.

WORDS
- summary: one sentence, at most 110 characters, saying what the dish is. No "delicious", "mouth-watering", "perfect for", "elevate", "game-changer".
- caption: what this cook writes when they share it. 1 to 4 sentences in their own voice, with one specific, believable detail (when they cook it, who taught them, what they change). No hashtags or emoji unless their brief says they use them. No health claims, no brand names, no real people's names (family roles like "my aunty" are fine).
- notes (optional, at most 3): storage, make-ahead or a swap a cook would genuinely want.

PHOTO
- photoQuery: 2 to 5 plain English words to find a stock photo of the finished dish ("korean pork stew", "coconut lime raw fish").
- photoFallbackQuery: a broader version ("pork stew bowl").
- photoDescription: one sentence on what the finished dish looks like on the plate.`;

type IngredientRow = { id: string; name: string; aliases: string[] };

export function ingredientBlocks(defs: IngredientRow[], extras: { id: string; kind: string; name: string; alias_of: string | null; aliases: string[] }[]): SystemBlock[] {
  const db = defs.map((d) => `${d.id}: ${[d.name, ...d.aliases].join(' / ')}`).join('\n');
  const blocks: SystemBlock[] = [
    { type: 'text', text: STYLE_GUIDE },
    { type: 'text', text: `THE INGREDIENT DATABASE (id: names)\n${db}`, cache_control: { type: 'ephemeral' } },
  ];
  if (extras.length) {
    const lines = extras.map((e) =>
      e.kind === 'alias' ? `${e.name} → alias of ${e.alias_of}` : `${e.id}: ${[e.name, ...e.aliases].join(' / ')} (new)`,
    );
    // Already declared by earlier recipes: reuse these names, don't declare them again.
    blocks.push({ type: 'text', text: `ALREADY DECLARED (use freely, don't redeclare)\n${lines.join('\n')}`, cache_control: { type: 'ephemeral' } });
  }
  return blocks;
}

export const MENU_GUIDE = `You plan which dishes one of The Pantry's house cooks will post. House cooks are fictional home cooks with distinct backgrounds; their recipes are what they'd really cook at home.
- Mostly dinners, some lunches; breakfasts, snacks and sweets as the cook's brief suggests.
- About 7 in 10 are weeknight cooking: 45 minutes or less, ordinary ingredients. The rest can be weekend or project cooking.
- Home cooking, regional and specific. Not restaurant showpieces, not fusion gimmicks, not "healthy" makeovers unless that's who the cook is.
- Title: what this cook calls it. Use the dish's own name where it has one ("Kokoda", "Dal tadka", "Pastel de choclo"); the angle says what it is in plain English.
- Every title must be a genuinely different dish from the ones listed as taken, not a rewording.
- cuisine must be one of the app's cuisines; region is the specific place or community ("Fijian", "Punjabi", "Sicilian").`;

export const menuTool: Tool = {
  name: 'plan_menu',
  description: 'The dishes this cook will post.',
  input_schema: {
    type: 'object',
    required: ['dishes'],
    properties: {
      dishes: {
        type: 'array',
        items: {
          type: 'object',
          required: ['title', 'cuisine', 'region', 'meal_type', 'angle'],
          properties: {
            title: { type: 'string', maxLength: 70 },
            cuisine: { type: 'string', enum: CUISINES },
            region: { type: 'string', maxLength: 40 },
            meal_type: { type: 'string', enum: MEAL_TYPES },
            angle: { type: 'string', maxLength: 140, description: 'What the dish is, in plain English, and this cook’s take on it.' },
          },
        },
      },
    },
  },
};

export const recipeTool: Tool = {
  name: 'write_recipe',
  description: 'The finished recipe, as this house cook would post it.',
  input_schema: {
    type: 'object',
    required: ['title', 'summary', 'caption', 'cuisine', 'region', 'mealTypes', 'difficulty', 'prepMinutes', 'cookMinutes', 'servings', 'onePot', 'ingredientGroups', 'steps', 'newIngredients', 'photoQuery', 'photoFallbackQuery', 'photoDescription'],
    properties: {
      title: { type: 'string', maxLength: 80 },
      summary: { type: 'string', maxLength: 120 },
      caption: { type: 'string', maxLength: 600 },
      cuisine: { type: 'string', enum: CUISINES },
      region: { type: 'string', maxLength: 40 },
      mealTypes: { type: 'array', items: { type: 'string', enum: MEAL_TYPES }, minItems: 1 },
      difficulty: { type: 'string', enum: DIFFICULTIES },
      prepMinutes: { type: 'integer', minimum: 0 },
      cookMinutes: { type: 'integer', minimum: 0 },
      servings: { type: 'integer', minimum: 1, maximum: 12 },
      onePot: { type: 'boolean' },
      seasons: { type: 'array', items: { type: 'string', enum: SEASONS } },
      ingredientGroups: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['lines'],
          properties: {
            title: { type: 'string', description: 'Only when the recipe has parts, e.g. "Marinade".' },
            lines: { type: 'array', items: { type: 'string' }, minItems: 1 },
          },
        },
      },
      steps: { type: 'array', items: { type: 'string' }, minItems: 3 },
      notes: { type: 'array', items: { type: 'string' }, maxItems: 3 },
      newIngredients: {
        type: 'array',
        items: {
          type: 'object',
          required: ['kind', 'name'],
          properties: {
            kind: { type: 'string', enum: ['alias', 'new'] },
            name: { type: 'string', description: 'The name exactly as used in the lines.' },
            aliasOf: { type: 'string', description: 'kind alias: the database id it is another name for.' },
            aliases: { type: 'array', items: { type: 'string' } },
            aisle: { type: 'string', enum: AISLES },
            groups: { type: 'array', items: { type: 'string', enum: INGREDIENT_GROUPS } },
            swapId: { type: 'string', description: 'kind new: closest database id to use instead.' },
            swapTip: { type: 'string', maxLength: 200 },
          },
        },
      },
      photoQuery: { type: 'string' },
      photoFallbackQuery: { type: 'string' },
      photoDescription: { type: 'string' },
    },
  },
};

export const REVIEW_GUIDE = `You are The Pantry's recipe tester. Read the recipe as a careful home cook about to make it, and decide whether it can be published.
Fail it ("fix") only for real problems:
- unsafe: meat, poultry or seafood not cooked safely; dangerous technique without a warning;
- won't work: quantities clearly wrong for the servings, a step that can't produce the result, times that don't fit the method;
- incomplete: an ingredient used in the method that isn't listed, or a listed ingredient never used; a missing step;
- wrong for its cuisine in a way a cook from there would object to;
- not Australian metric (°F, ounces, sticks).
The caption is written in the first person by a house cook: a named, clearly labelled fictional persona. First person, family details and personal history are intended; fail a caption only if it names a real public figure or mentions being an AI.
Native ingredient names with an English name in brackets are intended. A hard-to-find ingredient is fine. Don't fail for style preferences.
Each problem: one sentence saying what to change.`;

export const reviewTool: Tool = {
  name: 'review',
  description: 'Whether the recipe can be published.',
  input_schema: {
    type: 'object',
    required: ['verdict', 'problems'],
    properties: {
      verdict: { type: 'string', enum: ['pass', 'fix'] },
      problems: { type: 'array', items: { type: 'string' } },
    },
  },
};

export const VERIFY_GUIDE = `You check ingredient facts for a cooking app. For each ingredient, give the groups that apply, strictly:
meat (any land animal flesh, including its stock or fat), beef, pork, lamb, poultry, fish, shellfish, dairy, egg, gluten (wheat, barley, rye and most noodles, soy sauce, miso), tree-nuts, peanuts, sesame, soy, animal-product (not meat but not vegan: honey, gelatine, animal rennet cheese), alcohol, chilli (has chilli heat).
For an alias, say whether it really is another name for the database item.`;

export const verifyTool: Tool = {
  name: 'verify',
  description: 'Groups for each new ingredient, and whether each alias is right.',
  input_schema: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
            groups: { type: 'array', items: { type: 'string', enum: INGREDIENT_GROUPS } },
            aliasIsRight: { type: 'boolean' },
            note: { type: 'string' },
          },
        },
      },
    },
  },
};

export const PHOTO_GUIDE = `You choose a stock photo for a recipe in a cooking app. Pick a photo only if a cook would accept it as this dish: the same kind of dish, plausibly plated, the hero ingredients visible.
Reject: a different dish, raw ingredients only, people or hands as the main subject, text, logos, watermarks, packaging, or anything unappetising.
If none of them is right, answer -1. A missing photo is better than a wrong one.`;

export const photoTool: Tool = {
  name: 'pick_photo',
  description: 'The number of the photo that honestly shows this dish, or -1.',
  input_schema: {
    type: 'object',
    required: ['choice'],
    properties: { choice: { type: 'integer', minimum: -1 }, reason: { type: 'string' } },
  },
};
