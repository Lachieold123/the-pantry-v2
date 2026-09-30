// Recipe cards two to a row (spec §3.2). An odd last card keeps its width; the
// original stretched it across both columns.
import { View } from 'react-native';

import type { Recipe } from '@/domain/recipes/types';
import { SPACE } from '@/ui/tokens/type';
import { RecipeCard } from './RecipeCard';

type Props = {
  recipes: readonly Recipe[];
  imageFor: (id: string) => number | undefined;
  onOpen: (id: string) => void;
  isSaved?: ((id: string) => boolean) | undefined;
  onToggleSave?: ((id: string) => void) | undefined;
  noteFor?: ((recipe: Recipe) => string | undefined) | undefined;
};

export function RecipeGrid({ recipes, imageFor, onOpen, isSaved, onToggleSave, noteFor }: Props) {
  const rows: Recipe[][] = [];
  for (let i = 0; i < recipes.length; i += 2) rows.push(recipes.slice(i, i + 2));
  return (
    <View style={{ gap: SPACE.sm }}>
      {rows.map((row) => (
        <RecipeRow key={row.map((r) => r.id).join()} row={row} {...{ imageFor, onOpen, isSaved, onToggleSave, noteFor }} />
      ))}
    </View>
  );
}

/** One row of two; also used by virtualised lists that render a row per item. */
export function RecipeRow({ row, imageFor, onOpen, isSaved, onToggleSave, noteFor }: Omit<Props, 'recipes'> & { row: readonly Recipe[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
      {row.map((r) => {
        const note = noteFor?.(r);
        return (
          <RecipeCard
            key={r.id}
            recipe={r}
            image={imageFor(r.id)}
            size="medium"
            onPress={() => onOpen(r.id)}
            {...(note ? { note } : {})}
            {...(onToggleSave ? { saved: isSaved?.(r.id) ?? false, onToggleSave: () => onToggleSave(r.id) } : {})}
          />
        );
      })}
      {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
    </View>
  );
}
