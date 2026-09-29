import { Redirect } from 'expo-router';

import { GalleryScreen } from '@/features/dev/GalleryScreen';

// The gallery exists only in development builds.
export default function GalleryRoute() {
  return __DEV__ ? <GalleryScreen /> : <Redirect href="/" />;
}
