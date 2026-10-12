// Another cook's published recipe, on the same page as the catalogue's: the
// photo with the sheet over it, the cook's byline (it opens their profile),
// their caption, then ingredients and method. Read only for now: saving,
// planning and Cook Mode work on this phone's recipe book, which these
// recipes aren't part of yet, so those actions aren't offered.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { photoUrl, fetchPublishedRecipe, problemWords } from '@/lib/published';
import { useRead } from '@/lib/usePublished';
import { goBack } from '@/lib/navigation';
import { usePreferences } from '@/store/preferences';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { PhotoScrim } from '@/ui/patterns/PhotoScrim';
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, RECIPE, SPACE } from '@/ui/tokens/type';
import { Ingredients, Method, Notes } from './RecipeBody';
import { RecipeHeader } from './RecipeHeader';
import { ServingsSheet } from './ServingsSheet';

const NONE: ReadonlySet<string> = new Set();

export function PublishedRecipeScreen({ id }: { id: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const load = useRead(fetchPublishedRecipe, id);
  const units = usePreferences((s) => s.units);
  const setUnits = usePreferences((s) => s.setUnits);
  const [chosenServings, setServings] = useState<number | undefined>();
  const [servingsOpen, setServingsOpen] = useState(false);

  if (load.state !== 'ready') {
    return (
      <Screen>
        <PushedHeader title="Recipe" />
        {load.state === 'loading' ? (
          <Text variant="body" colour="inkSoft" testID="published-loading">
            Loading the recipe…
          </Text>
        ) : (
          <View style={{ gap: SPACE.md }} testID="published-error">
            <EmptyState
              title={load.problem === 'not-found' ? 'We couldn’t find that recipe' : 'Couldn’t load this recipe'}
              body={problemWords(load.problem)}
            />
            {load.problem === 'not-found' ? null : <Button label="Try again" kind="soft" onPress={load.retry} testID="published-retry" />}
          </View>
        )}
      </Screen>
    );
  }

  const { item, recipe } = load.value;
  const servings = chosenServings ?? recipe.servings;
  const photo = photoUrl('recipe-photos', item.photoPath);
  const openCook = () => router.push({ pathname: '/cooks/[id]', params: { id: item.cook.id } });

  return (
    <View style={styles.page}>
      <View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <RecipeImage
          source={photo ? { uri: photo } : undefined}
          shape="hero"
          cuisine={recipe.cuisine}
          radius={0}
          height={RECIPE.hero}
          iconSize={64}
        >
          <PhotoScrim kind="photoTop" />
        </RecipeImage>
      </View>

      <View style={[styles.sheetFrame, { marginTop: RECIPE.hero - RECIPE.overlap }]}>
        <View style={styles.handle} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + SPACE.xxl }]}
          testID="published-recipe-screen"
        >
          <RecipeHeader
            recipe={recipe}
            mine={false}
            saved={false}
            cooked={false}
            servings={servings}
            author={{ name: item.cook.displayName, avatarUri: photoUrl('avatars', item.cook.avatarPath), onPress: openCook }}
            onServings={() => setServingsOpen(true)}
          />
          {recipe.summary ? (
            <Text variant="body" colour="inkSoft">
              {recipe.summary}
            </Text>
          ) : null}
          {item.caption ? (
            <View style={styles.caption} testID="published-caption">
              <Text variant="kicker" colour="accentText">
                From {item.cook.displayName}
              </Text>
              <Text variant="body">{item.caption}</Text>
            </View>
          ) : null}
          <Ingredients recipe={recipe} servings={servings} units={units} have={NONE} />
          <Method recipe={recipe} />
          <Notes notes={recipe.notes ?? []} />
          <View style={styles.credit}>
            <Text variant="metaSmall" align="center">
              Published by @{item.cook.handle}
            </Text>
            {item.photoCredit ? (
              <Text variant="metaSmall" align="center" testID="recipe-photo-credit">
                {item.photoCredit}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <View style={[styles.nav, { top: insets.top + SPACE.sm }]} pointerEvents="box-none">
        <IconButton icon="arrowBack" label="Back" shape="round" onPress={() => goBack(router)} testID="back" />
      </View>

      <ServingsSheet
        visible={servingsOpen}
        onClose={() => setServingsOpen(false)}
        servings={servings}
        original={recipe.servings}
        onServings={setServings}
        units={units}
        onUnits={setUnits}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  page: { flex: 1, backgroundColor: colours.bg },
  hero: { position: 'absolute', top: 0, left: 0, right: 0 },
  sheetFrame: {
    flex: 1,
    backgroundColor: colours.bg,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    overflow: 'hidden',
  },
  scroll: { flex: 1 },
  sheet: { paddingHorizontal: SPACE.sheet, paddingTop: SPACE.md, gap: SPACE.lg },
  handle: {
    alignSelf: 'center',
    width: RECIPE.handleWidth,
    height: RECIPE.handleHeight,
    borderRadius: 3,
    backgroundColor: colours.border,
    marginTop: SPACE.xs,
  },
  caption: { gap: SPACE.xs, padding: SPACE.md, borderRadius: RADIUS.big, backgroundColor: colours.bgSoft },
  nav: { position: 'absolute', left: SPACE.gutter, right: SPACE.gutter, flexDirection: 'row' },
  credit: { paddingTop: SPACE.md, gap: SPACE.xxs, borderTopWidth: 1, borderTopColor: colours.border },
}));
