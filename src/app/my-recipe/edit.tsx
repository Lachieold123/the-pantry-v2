import { useLocalSearchParams } from 'expo-router';
import { RecipeEditorScreen } from '@/features/editor/RecipeEditorScreen';

export default function EditRecipeRoute() {
  const { id, from, title } = useLocalSearchParams<{ id?: string; from?: string; title?: string }>();
  return <RecipeEditorScreen id={id} fromImport={from === 'import'} startTitle={title} />;
}
