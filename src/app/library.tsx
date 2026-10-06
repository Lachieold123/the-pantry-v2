import { useLocalSearchParams } from 'expo-router';

import { LibraryScreen } from '@/features/saved/LibraryScreen';

export default function LibraryRoute() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return <LibraryScreen initialTab={tab} />;
}
