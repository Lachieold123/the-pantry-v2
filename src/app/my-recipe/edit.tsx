import { useLocalSearchParams } from 'expo-router';

import { RecipeEditorScreen } from '@/features/editor/RecipeEditorScreen';

export default function EditRecipeRoute() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  return <RecipeEditorScreen id={id} fromImport={from === 'import'} />;
}
