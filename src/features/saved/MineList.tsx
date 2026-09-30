// Your own recipes. Finished ones behave like any other recipe; drafts
// (no method yet, say) open straight in the editor to be finished.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useMyRecipeList } from '@/store/recipeBook';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { SPACE } from '@/ui/tokens/type';

export function MineList() {
  const router = useRouter();
  const mine = useMyRecipeList();
  const write = () => router.push('/my-recipe/edit');
  const importLink = () => router.push('/my-recipe/import');
  const edit = (id: string) => router.push({ pathname: '/my-recipe/edit', params: { id } });

  if (mine.length === 0) {
    return (
      <View>
        <EmptyState
          title="Your own recipes live here"
          body="Write down the ones you already cook, or bring one in from a website. They scale, go on the shopping list and work in Cook Mode like any other."
          action={{ label: 'Write a recipe', onPress: write }}
          testID="mine-empty"
        />
        <Button label="Import from a link" icon="link" kind="quiet" onPress={importLink} testID="mine-import" />
      </View>
    );
  }

  const finished = mine.filter((m) => m.recipe);
  const drafts = mine.filter((m) => !m.recipe);
  return (
    <View style={{ gap: SPACE.lg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
        <Button label="Write a recipe" icon="add" onPress={write} testID="mine-write" />
        <Button label="Import from a link" icon="link" kind="quiet" onPress={importLink} testID="mine-import" />
      </View>
      {drafts.length ? (
        <View style={{ gap: SPACE.xs }}>
          <SectionHeader title="To finish" />
          {drafts.map((d) => (
            <ListRow
              key={d.id}
              title={d.draft.title}
              detail={d.problems[0]?.message ?? 'Needs a little more'}
              onPress={() => edit(d.id)}
              testID={`mine-draft-${d.id}`}
            />
          ))}
        </View>
      ) : null}
      {finished.length ? (
        <View style={{ gap: SPACE.md }}>
          {drafts.length ? <SectionHeader title="Ready to cook" /> : null}
          {finished.map((m) =>
            m.recipe ? (
              <RecipeCard
                key={m.id}
                recipe={m.recipe}
                image={undefined}
                size="row"
                onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: m.id } })}
                testID={`mine-recipe-${m.id}`}
              />
            ) : null,
          )}
        </View>
      ) : null}
    </View>
  );
}
