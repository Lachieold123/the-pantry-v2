// Development and preview builds (Expo Go, the web preview, TestFlight
// previews: eas.json sets EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1 for them) get a
// few testing aids a store build never shows: draft recipes, and Settings'
// switches to preview Pro's free limits or pretend to be Pro (D-038).
export const INTERNAL_BUILD: boolean = __DEV__ || process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES === '1';
