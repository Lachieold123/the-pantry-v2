// Kept for links made before the library was one page, and where the recipe editor returns to.
import { LibraryScreen } from '@/features/saved/LibraryScreen';

export default function MyRecipesRoute() {
  return <LibraryScreen initialTab="mine" />;
}
