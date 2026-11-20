// Test fixtures only: rows shaped as the server sends them for published
// recipes and cooks. Never imported by app code (plan rule 4).

export const COOK_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'person',
  handle: 'kinilaw.kai',
  display_name: 'Kai Santos',
  bio: 'Filipino home cooking by the reef.',
  home_region: 'Cairns, Australia',
  avatar_path: 'cooks/11111111-1111-4111-8111-111111111111.png',
  recipe_count: 1,
  follower_count: 1200,
  following_count: 26,
};

export const RECIPE_JSON = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Escabeche',
  summary: 'Sweet and sour fried fish with pickled vegetables.',
  cuisine: 'filipino',
  diets: ['pescatarian', 'no-dairy', 'made-up'],
  mealTypes: ['dinner'],
  difficulty: 'easy',
  prepMinutes: 20,
  cookMinutes: 25,
  servings: 4,
  onePot: false,
  source: 'user',
  seasons: ['autumn'],
  ingredientGroups: [
    {
      items: [
        { raw: '800 g firm white fish fillets', item: 'firm white fish fillets', unit: 'g', quantity: 800, ingredientId: 'white-fish' },
        { raw: '150 ml cane vinegar', item: 'cane vinegar', unit: 'ml', quantity: 150 },
        { raw: '2 thimbles of soy', item: 'soy', unit: 'thimble', quantity: 2 },
        { nonsense: true },
      ],
    },
  ],
  steps: [{ text: 'Fry the fish hard and fast.' }, { text: 'Pour the hot vinegar over it.' }],
  notes: ['Better the next day.'],
};

export function feedRow(n: number, overrides: Record<string, unknown> = {}) {
  const id = `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
  return {
    id,
    title: `Dish ${n}`,
    caption: `Caption for dish ${n}`,
    cuisine: 'filipino',
    total_minutes: 45,
    published_at: `2026-10-${String(11 - (n % 10)).padStart(2, '0')}T21:00:00.000000+00:00`,
    photo_path: `house/${id}.jpg`,
    photo_credit: 'Photo: Someone / Pexels',
    photo_source: 'pexels',
    cook: { id: COOK_ROW.id, handle: COOK_ROW.handle, display_name: COOK_ROW.display_name, avatar_path: COOK_ROW.avatar_path },
    ...overrides,
  };
}
