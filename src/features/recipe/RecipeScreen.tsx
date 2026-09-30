// The recipe page (map Phase 3): decide whether to cook it, then cook it.
// Save, Plan and Cook stay pinned in the action bar (map §6).
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';

import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { CUISINE_LABELS, DIET_LABELS, formatMinutes, recipeAsText } from '@/domain/recipes/labels';
import { usePreferences } from '@/store/preferences';
import { useRecipe } from '@/store/recipeBook';
import { useSaved } from '@/store/saved';
import { ActionBar } from '@/ui/patterns/ActionBar';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { Screen } from '@/ui/primitives/Screen';
import { Segmented } from '@/ui/primitives/Segmented';
import { Stepper } from '@/ui/primitives/Stepper';
import { Text } from '@/ui/primitives/Text';
import { cuisineEyebrow } from '@/ui/tokens/cuisine';
import { RADIUS, SPACE } from '@/ui/tokens/type';
import { Ingredients, Method } from './RecipeBody';

const UNITS = [
  { value: 'metric', label: 'Metric' },
  { value: 'imperial', label: 'Imperial' },
] as const;

export function RecipeScreen({ id }: { id: string }) {
  const router = useRouter();
  const recipe = useRecipe(id);
  const toast = useToast();
  const units = usePreferences((s) => s.units);
  const setUnits = usePreferences((s) => s.setUnits);
  const [servings, setServings] = useState(recipe?.servings ?? 4);
  const saved = useSaved((s) => s.bookmarks.some((b) => b.recipeId === id));
  const hidden = useSaved((s) => s.hidden.includes(id));
  const toggleBookmark = useSaved((s) => s.toggleBookmark);
  const toggleHidden = useSaved((s) => s.toggleHidden);
  const recordView = useSaved((s) => s.recordView);
  useEffect(() => {
    if (recipe) recordView(recipe.id);
  }, [recipe, recordView]);

  if (!recipe) {
    return (
      <Screen>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <EmptyState
          title="We couldn't find that recipe"
          body="It may have been removed or renamed."
          action={{ label: 'Browse recipes', onPress: () => router.navigate('/recipes') }}
        />
      </Screen>
    );
  }

  const cuisine = CUISINE_LABELS[recipe.cuisine];
  const diets = recipe.diets.filter((d) => d === 'vegetarian' || d === 'vegan' || d === 'pescatarian').map((d) => DIET_LABELS[d]);
  const mine = recipe.source !== 'house';
  const share = async () => {
    try {
      // Your own recipes aren't on anyone else's phone, so they're shared as the full text.
      await Share.share({
        title: recipe.title,
        message: mine ? recipeAsText(recipe) : `${recipe.title}: ${recipe.summary ?? ''}\nthepantry://recipe/${recipe.id}`,
      });
    } catch {
      toast({ message: "Couldn't open sharing. Try again." });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <RecipeImage source={RECIPE_IMAGES[recipe.id]} shape="hero" cuisine={recipe.cuisine} radius={RADIUS.card} iconSize={56} />
        <View style={{ gap: SPACE.xs }}>
          <Text variant="kicker" tone={cuisineEyebrow(recipe.cuisine)}>
            {cuisine}
          </Text>
          <Text variant="display" accessibilityRole="header">
            {recipe.title}
          </Text>
          {recipe.summary ? (
            <Text variant="body" colour="inkSoft">
              {recipe.summary}
            </Text>
          ) : null}
          <Text variant="meta">
            {[`${formatMinutes(recipe.prepMinutes)} prep`, `${formatMinutes(recipe.cookMinutes)} cook`, ...diets].join(' · ')}
          </Text>
        </View>
        <View style={{ gap: SPACE.sm }}>
          <SectionHeader title="Ingredients" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, flexWrap: 'wrap' }}>
            <Stepper label="Servings" value={servings} onChange={setServings} max={24} format={(n) => `Serves ${n}`} />
            <View style={{ flex: 1, minWidth: 180 }}>
              <Segmented label="Measurements" options={UNITS} value={units} onChange={setUnits} />
            </View>
          </View>
          <Ingredients recipe={recipe} servings={servings} units={units} />
        </View>
        <Method recipe={recipe} />
        {recipe.notes?.length ? (
          <View style={{ gap: SPACE.xs }}>
            <SectionHeader title="Notes" />
            {recipe.notes.map((n, i) => (
              <Text key={i} variant="body" colour="inkSoft">
                {n}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
          <Button
            label="Add to collection"
            kind="quiet"
            onPress={() => router.push({ pathname: '/recipe/[id]/collect', params: { id: recipe.id } })}
          />
          <Button label="Share" kind="quiet" icon="share" onPress={() => void share()} />
          {mine ? (
            <Button
              label="Edit"
              kind="quiet"
              icon="edit"
              onPress={() => router.push({ pathname: '/my-recipe/edit', params: { id: recipe.id } })}
            />
          ) : null}
          <Button
            label={hidden ? 'Show this again' : 'Not for us'}
            kind="quiet"
            accessibilityHint={hidden ? undefined : 'Stops this recipe appearing in suggestions and Surprise me'}
            onPress={() => {
              const nowHidden = toggleHidden(recipe.id);
              toast({
                message: nowHidden ? 'We won\u2019t suggest this again' : 'Back in suggestions',
                undo: () => toggleHidden(recipe.id),
              });
            }}
          />
        </View>
        {recipe.image?.credit ? <Text variant="meta">{recipe.image.credit}</Text> : null}
      </Screen>
      <ActionBar>
        <View style={{ flex: 1 }}>
          <Button
            label={saved ? 'Saved' : 'Save'}
            icon={saved ? 'check' : 'saved'}
            block
            onPress={() => {
              const nowSaved = toggleBookmark(recipe.id);
              toast({ message: nowSaved ? 'Saved' : 'Removed from Saved', undo: () => toggleBookmark(recipe.id) });
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Plan"
            icon="plan"
            block
            onPress={() => router.push({ pathname: '/recipe/[id]/plan', params: { id: recipe.id } })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Cook"
            icon="timer"
            kind="primary"
            block
            onPress={() => router.push({ pathname: '/recipe/[id]/cook', params: { id: recipe.id, servings: String(servings) } })}
          />
        </View>
      </ActionBar>
    </View>
  );
}
