import { Redirect } from 'expo-router';

import { HomeViewerScreen } from '@/features/dev/HomeViewerScreen';
import { INTERNAL_BUILD } from '@/lib/build';

// Testing only: pick which AI cook Home ranks as. Store builds go home (REPO-13).
export default function HomeViewerRoute() {
  return INTERNAL_BUILD ? <HomeViewerScreen /> : <Redirect href="/" />;
}
