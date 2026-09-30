import { Redirect } from 'expo-router';

// The gallery exists only in development builds. It's required inside the
// __DEV__ branch, which Metro folds away in a release build, so the gallery and
// its sample data never ship in the store bundle (audit F75).
export default function GalleryRoute() {
  if (__DEV__) {
    const { GalleryScreen } = require('@/features/dev/GalleryScreen') as typeof import('@/features/dev/GalleryScreen');
    return <GalleryScreen />;
  }
  return <Redirect href="/" />;
}
