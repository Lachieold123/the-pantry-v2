import { SCAN_CONNECTED } from './scan';

// Development and preview builds (Expo Go, the web preview, TestFlight
// previews: eas.json sets EXPO_PUBLIC_SHOW_DRAFT_RECIPES=1 for them) get a
// few testing aids a store build never shows: draft recipes, the Home viewer
// (/dev/home-viewer), and Settings' switches to preview Pro's free limits or
// pretend to be Pro (D-038). build.test.ts proves a store build hides them.
export const INTERNAL_BUILD: boolean = __DEV__ || process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES === '1';

// Parts that are not ready for the public, shown only in internal builds so
// they can be tested. One switch each, read by every screen that shows them.
// - Other cooks (Home's "From other cooks", /feed, cook and published-recipe
//   pages): the 99 seed cooks are AI personas with follower counts and no
//   label, so a store build must not present them as people until Lachlan
//   decides how they're shown (REL2-1).
// - The Cupboard's scan ways in: scanning isn't switched on, so in a store
//   build they would be dead "Coming soon" buttons (REL2-8, K-25). They show
//   in every build once SCAN_CONNECTED is true.
export const COMMUNITY_SHOWN: boolean = INTERNAL_BUILD;
export const SCAN_WAYS_SHOWN: boolean = INTERNAL_BUILD || SCAN_CONNECTED;
