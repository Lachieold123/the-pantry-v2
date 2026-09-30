// The recipe page (spec §4.18): the photo stays put and the recipe sheet slides
// up over it as you read. Everything the old page did is here; the action bar
// v2 used to pin at the bottom became v1's action row and "⋯" menu.
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INGREDIENTS, KITCHEN } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { hasCooked } from '@/domain/cook/cook';
import { cookable } from '@/domain/cupboard/cookable';
import { cupboardIds } from '@/domain/cupboard/match';
import { recipeAsText } from '@/domain/recipes/labels';
import { parseServings } from '@/domain/recipes/servings';
import { logger } from '@/lib/logger';
import { goBackOr, goToTab } from '@/lib/navigation';
import { useCookLog } from '@/store/cookLog';
import { ingredientName } from '@/store/cookable';
import { useCupboard } from '@/store/cupboard';
import { usePlan } from '@/store/plan';
import { usePreferences } from '@/store/preferences';
import { useRecipe } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';
import { useToggleBookmark } from '@/ui/patterns/useBookmarks';
import { ActionSheet } from '@/ui/patterns/ActionSheet';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { PhotoScrim } from '@/ui/patterns/PhotoScrim';
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { useToast } from '@/ui/patterns/Toast';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { RADIUS, RECIPE, SPACE } from '@/ui/tokens/type';
import { Ingredients, Method, Notes } from './RecipeBody';
import { CupboardSummary } from './CupboardSummary';
import { RecipeHeader } from './RecipeHeader';
import { ServingsSheet } from './ServingsSheet';

/** `servings` is the raw route param: a planned dinner opens scaled to what it was planned for (audit F37). */
export function RecipeScreen({ id, servings: requested }: { id: string; servings?: string | undefined }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const recipe = useRecipe(id);
  const toast = useToast();
  const units = usePreferences((s) => s.units);
  const setUnits = usePreferences((s) => s.setUnits);
  const startServings = parseServings(requested) ?? recipe?.servings ?? 4;
  const [servings, setServings] = useState(startServings);
  // Editing your own recipe makes a new recipe object: start again from its servings rather
  // than keep the old ones (audit F50). Ticks reset with it, as they belong to the old lines.
  const [shownRecipe, setShownRecipe] = useState(recipe);
  if (shownRecipe !== recipe) {
    setShownRecipe(recipe);
    setServings(shownRecipe && recipe && shownRecipe.id === recipe.id ? recipe.servings : startServings);
  }
  const [menu, setMenu] = useState(false);
  const [servingsOpen, setServingsOpen] = useState(false);
  const saved = useSaved((s) => s.bookmarks.some((b) => b.recipeId === id));
  const hidden = useSaved((s) => s.hidden.includes(id));
  const toggleBookmark = useToggleBookmark({ toastOnSave: true });
  const toggleHidden = useSaved((s) => s.toggleHidden);
  const setHidden = useSaved((s) => s.setHidden);
  const recordView = useSaved((s) => s.recordView);
  const cooked = useCookLog((s) => hasCooked(s.log, id));
  const markCooked = useCookLog((s) => s.markCooked);
  const undoCooked = useCookLog((s) => s.undo);
  const items = useCupboard((s) => s.items);
  const shelf = useCupboard((s) => s.shelf);
  const addToList = usePlan((s) => s.addToList);
  const have = useMemo(() => cupboardIds(items), [items]);
  const fromCupboard = useMemo(
    () => (recipe && have.size ? cookable(recipe, have, shelf, INGREDIENTS, KITCHEN) : undefined),
    [recipe, have, shelf],
  );
  // A same-family stand-in you have (brown onion for white) earns the HAVE pill too.
  const havePills = useMemo(
    () => (fromCupboard ? new Set([...have, ...fromCupboard.swaps.map((s) => s.need)]) : have),
    [have, fromCupboard],
  );
  useEffect(() => {
    if (recipe) recordView(recipe.id);
  }, [recipe, recordView]);

  if (!recipe) {
    return (
      <Screen>
        <PushedHeader title="Recipe" />
        <EmptyState
          title="We couldn't find that recipe"
          body="It may have been removed or renamed."
          action={{ label: 'Browse recipes', onPress: () => goToTab(router, '/browse') }}
          testID="recipe-missing"
        />
      </Screen>
    );
  }

  const mine = recipe.source !== 'house';
  // House photos without a photographer's credit are the original app's AI-generated images (D-029).
  const photoNote = recipe.image?.credit ?? (!mine && RECIPE_IMAGES[recipe.id] !== undefined ? 'AI-generated photo' : undefined);
  const edit = () => router.push({ pathname: '/my-recipe/edit', params: { id: recipe.id } });
  // The plan sheet starts at the servings you're looking at, not the recipe's own.
  const plan = () => router.push({ pathname: '/recipe/[id]/plan', params: { id: recipe.id, servings: String(servings) } });
  const share = async () => {
    try {
      // Your own recipes aren't on anyone else's phone, so they're shared as the full text.
      await Share.share({
        title: recipe.title,
        message: mine ? recipeAsText(recipe) : `${recipe.title}: ${recipe.summary ?? ''}\nthepantry://recipe/${recipe.id}`,
      });
    } catch (e) {
      logger.warn('share', "couldn't open the share sheet", e);
      toast({ message: "Couldn't open sharing. Try again.", tone: 'problem' });
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <RecipeImage source={RECIPE_IMAGES[recipe.id]} shape="hero" cuisine={recipe.cuisine} radius={0} height={RECIPE.hero} iconSize={64}>
          <PhotoScrim kind="photoTop" />
        </RecipeImage>
      </View>

      {/* Before the page in the tree, so TalkBack reads Back and ⋯ first; zIndex keeps them drawn on top (audit F108). */}
      <View style={[styles.nav, { top: insets.top + SPACE.sm }]} pointerEvents="box-none">
        <IconButton icon="arrowBack" label="Back" shape="round" onPress={() => goBackOr(router)} testID="back" />
        <IconButton icon="more" label="More actions" shape="round" onPress={() => setMenu(true)} testID="recipe-more" />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingTop: RECIPE.hero - RECIPE.overlap }} testID="recipe-screen">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACE.xxl }]}>
          <View style={styles.handle} />
          <RecipeHeader
            recipe={recipe}
            mine={mine}
            saved={saved}
            cooked={cooked}
            servings={servings}
            onEdit={edit}
            onSave={() => void toggleBookmark(recipe.id)}
            onPlan={plan}
            onShare={() => void share()}
            onMarkCooked={() => {
              const event = markCooked(recipe.id);
              toast({ message: 'Marked as cooked', undo: () => undoCooked(event.id) });
            }}
            onServings={() => setServingsOpen(true)}
            onCook={() => router.push({ pathname: '/recipe/[id]/cook', params: { id: recipe.id, servings: String(servings) } })}
          />
          {recipe.summary ? (
            <Text variant="body" colour="inkSoft">
              {recipe.summary}
            </Text>
          ) : null}
          {fromCupboard ? (
            <CupboardSummary
              result={fromCupboard}
              nameOf={ingredientName}
              onPlan={plan}
              onAddMissing={() => {
                const names = fromCupboard.missing.map((id) => capitalise(ingredientName(id)));
                const undo = addToList(names);
                toast({
                  message: undo ? `${names.length} added to your shopping list` : 'Already on your shopping list',
                  ...(undo ? { undo } : {}),
                });
              }}
            />
          ) : null}
          <Ingredients recipe={recipe} servings={servings} units={units} have={havePills} />
          <Method recipe={recipe} units={units} />
          <Notes notes={recipe.notes ?? []} />
          {photoNote ? (
            <View style={styles.credit}>
              <Text variant="metaSmall" align="center" testID="recipe-photo-credit">
                {photoNote}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title={recipe.title}
        actions={[
          { label: 'Add to plan', icon: 'plan', onPress: plan, testID: 'action-plan' },
          {
            label: 'Add to a collection',
            icon: 'collections',
            onPress: () => router.push({ pathname: '/recipe/[id]/collect', params: { id: recipe.id } }),
            testID: 'action-collect',
          },
          { label: 'Share', icon: 'share', onPress: () => void share(), testID: 'action-share' },
          ...(mine ? [{ label: 'Edit recipe', icon: 'edit' as const, onPress: edit, testID: 'action-edit' }] : []),
          {
            label: hidden ? 'Show this again' : 'Not for us',
            icon: hidden ? 'eye' : 'eyeOff',
            testID: 'action-hide',
            onPress: () => {
              const nowHidden = toggleHidden(recipe.id);
              // Undo sets the old value, so after another change it can't flip the wrong way.
              toast({
                message: nowHidden ? 'We won’t suggest this again' : 'Back in suggestions',
                undo: () => setHidden(recipe.id, !nowHidden),
              });
            },
          },
        ]}
      />
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
  scroll: { flex: 1 },
  sheet: {
    minHeight: '100%',
    backgroundColor: colours.bg,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACE.sheet,
    paddingTop: SPACE.xs,
    gap: SPACE.lg,
  },
  handle: {
    alignSelf: 'center',
    width: RECIPE.handleWidth,
    height: RECIPE.handleHeight,
    borderRadius: 3,
    backgroundColor: colours.border,
    marginBottom: -SPACE.xs,
  },
  nav: { position: 'absolute', zIndex: 1, left: SPACE.gutter, right: SPACE.gutter, flexDirection: 'row', justifyContent: 'space-between' },
  credit: { paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: colours.border },
}));

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
