import { Redirect } from 'expo-router';

import { HomeViewerScreen } from '@/features/dev/HomeViewerScreen';

// Testing only: pick which AI cook Home ranks as. Store builds go home.
const TESTING = __DEV__ || process.env.EXPO_PUBLIC_SHOW_DRAFT_RECIPES === '1';

export default function HomeViewerRoute() {
  return TESTING ? <HomeViewerScreen /> : <Redirect href="/" />;
}
