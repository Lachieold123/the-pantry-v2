import { useLocalSearchParams } from 'expo-router';

import { RecipesScreen } from '@/features/recipes/RecipesScreen';

export default function BrowseRoute() {
  // Home's search bar opens Browse with ?search=1, ready to type.
  const { search } = useLocalSearchParams<{ search?: string }>();
  return <RecipesScreen focusSearch={search === '1'} />;
}
