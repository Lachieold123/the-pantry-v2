// My recipes, the library's third tab: your own recipes, in v1's layout
// (`light-19`): the Add and Import rows first, then the recipes. Finished ones
// behave like any other recipe, Surprise me included; drafts (no method yet,
// say) open straight in the editor to be finished.
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useMyRecipeList } from '@/store/recipeBook';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { ListRow } from '@/ui/primitives/ListRow';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';
import { MyRecipesEntry } from './MyRecipesEntry';

export function MyRecipesTab() {
  const router = useRouter();
  const mine = useMyRecipeList();
  const edit = (id: string) => router.push({ pathname: '/my-recipe/edit', params: { id } });
  const finished = mine.filter((m) => m.recipe);
  const drafts = mine.filter((m) => !m.recipe);

  return (
    <View testID="my-recipes-screen" style={{ gap: SPACE.lg }}>
      <MyRecipesEntry />
      {mine.length === 0 ? (
        // v1's quiet centred line, since the rows above are the actions (spec §7, My recipes).
        <View testID="mine-empty" style={{ paddingHorizontal: SPACE.lg, paddingVertical: SPACE.xxl }}>
          <Text variant="body" colour="inkMuted" style={{ textAlign: 'center' }}>
            Add your favourites above. They scale, go on the shopping list, work in Cook Mode and turn up in Surprise me.
          </Text>
        </View>
      ) : null}
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
