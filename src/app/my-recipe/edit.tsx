import { useLocalSearchParams } from 'expo-router';

import { RecipeEditorScreen } from '@/features/editor/RecipeEditorScreen';

// A crash here replaces this screen only, with a way to retry or go home (audit F69).
export { RootErrorScreen as ErrorBoundary } from '@/features/app/RootErrorScreen';

export default function EditRecipeRoute() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  return <RecipeEditorScreen id={id} fromImport={from === 'import'} />;
}
