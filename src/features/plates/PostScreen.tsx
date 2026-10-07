// The centre "+": share a dish you cooked (v1's CreatePostModal, D-033).
// Photo first, then what it is, a few words, time, serves and how hard, with
// a preview of the card it makes. Linking one of our recipes fills the blanks.
// Until accounts arrive (P9) a plate stays on this phone, and the page says so
// rather than pretending it went anywhere. What you type is kept as a draft,
// so closing never loses it.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { CUISINE_LABELS, DIFFICULTY_LABELS } from '@/domain/recipes/labels';
import { indexForSearch, searchRecipes } from '@/domain/recipes/search';
import { DIFFICULTIES, totalMinutes } from '@/domain/recipes/types';
import { addPhotos, draftHasContent, linkRecipe, PLATE_LIMITS, plateMeta, plateProblems } from '@/domain/plates/plate';
import { goBack } from '@/lib/navigation';
import { capturePhotos, captureProblem, type PhotoSource } from '@/lib/photos';
import { usePlates } from '@/store/plates';
import { useAllRecipes, useRecipeLookup } from '@/store/recipeBook';
import { ActionSheet } from '@/ui/patterns/ActionSheet';
import { PlateCard } from '@/ui/patterns/PlateCard';
import { RecipeImage } from '@/ui/patterns/RecipeImage';
import { useToast } from '@/ui/patterns/Toast';
import { useAnnounce } from '@/ui/primitives/accessibility';
import { Button } from '@/ui/primitives/Button';
import { Chip } from '@/ui/primitives/Chip';
import { Icon } from '@/ui/primitives/Icon';
import { Screen } from '@/ui/primitives/Screen';
import { Stepper } from '@/ui/primitives/Stepper';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { makeStyles } from '@/ui/theme/makeStyles';
import { FIXED } from '@/ui/tokens/colour';
import { PLATE } from '@/ui/tokens/screens';
import { PRESSED, RADIUS, SPACE, slopFor } from '@/ui/tokens/type';

const SUGGEST = 3;

export function PostScreen() {
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();
  const draft = usePlates((s) => s.draft);
  const setDraft = usePlates((s) => s.setDraft);
  const discardDraft = usePlates((s) => s.discardDraft);
  const share = usePlates((s) => s.share);
  const all = useAllRecipes();
  const getRecipe = useRecipeLookup();
  const index = useMemo(() => indexForSearch(all, (c) => CUISINE_LABELS[c]), [all]);
  const [choosing, setChoosing] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  const [tried, setTried] = useState(false);
  useAnnounce(problem);
  const problems = plateProblems(draft);
  const linked = draft.recipeId ? getRecipe(draft.recipeId) : undefined;
  const suggestions = !linked && draft.title.trim().length > 2 ? searchRecipes(index, draft.title).slice(0, SUGGEST) : [];

  const add = async (source: PhotoSource) => {
    setProblem(undefined);
    const got = await capturePhotos(source, { max: PLATE_LIMITS.photos - draft.photoUris.length });
    if (got.status === 'ok') setDraft((d) => addPhotos(d, got.uris));
    else if (got.status !== 'cancelled') setProblem(captureProblem(got, source));
  };
  const close = () => {
    if (draftHasContent(draft)) toast({ message: 'Kept as a draft. It’s here next time you tap +.' });
    goBack(router);
  };
  const submit = () => {
    setTried(true);
    if (problems.length) return;
    const plate = share();
    toast({ message: `${plate.title} added to your plates` });
    goBack(router);
  };

  return (
    <Screen testID="post-screen">
      <View style={styles.bar}>
        <Button label="Close" kind="quiet" onPress={close} testID="post-close" />
        <Text variant="row" accessibilityRole="header">
          Share a dish
        </Text>
        <Button label="Share" kind="primary" onPress={submit} testID="post-share" />
      </View>
      {tried && problems.length ? (
        <Text variant="bodySmall" colour="danger" accessibilityLiveRegion="polite" testID="post-problems">
          {`Almost there: ${problems.join(' and ').toLowerCase()}.`}
        </Text>
      ) : null}

      <View style={{ gap: SPACE.xs }}>
        <Text variant="kicker">{`Photos · ${draft.photoUris.length} of ${PLATE_LIMITS.photos}`}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.strip}>
          {draft.photoUris.length < PLATE_LIMITS.photos ? (
            <Pressable
              onPress={() => setChoosing(true)}
              accessibilityRole="button"
              accessibilityLabel="Add a photo"
              testID="post-add-photo"
              style={({ pressed }) => [styles.addTile, pressed && { opacity: PRESSED.row }]}
            >
              <Icon name="camera" size={26} />
              <Text variant="chip">Add photo</Text>
            </Pressable>
          ) : null}
          {draft.photoUris.map((uri, i) => (
            <View key={uri} style={styles.photo}>
              <RecipeImage
                source={{ uri }}
                shape="square"
                cuisine="modern-australian"
                radius={RADIUS.lg}
                label={`Photo ${i + 1} of ${draft.photoUris.length}`}
              />
              <Pressable
                onPress={() => setDraft((d) => ({ ...d, photoUris: d.photoUris.filter((u) => u !== uri) }))}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${i + 1}`}
                hitSlop={slopFor(PLATE.removeDisc)}
                testID={`post-remove-photo-${i}`}
                style={styles.removeDisc}
              >
                <Icon name="close" size={14} tone={FIXED.photoDiscInk} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
        {problem ? (
          <Text variant="bodySmall" colour="danger" testID="post-photo-problem">
            {problem}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: SPACE.xs }}>
        <TextField
          label="What did you cook?"
          placeholder="Sunday roast chicken"
          value={draft.title}
          onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
          maxLength={PLATE_LIMITS.title}
          autoCapitalize="sentences"
          testID="post-title"
        />
        {linked ? (
          <View style={styles.chips}>
            <Chip
              kind="quick"
              icon="close"
              label={`From the recipe: ${linked.title}`}
              selected
              onPress={() => setDraft((d) => ({ ...d, recipeId: undefined }))}
              testID="post-unlink"
            />
          </View>
        ) : suggestions.length ? (
          <View style={{ gap: SPACE.xxs }}>
            <Text variant="meta">Cooked one of ours? Link it:</Text>
            <View style={styles.chips}>
              {suggestions.map((r) => (
                <Chip
                  key={r.id}
                  kind="quick"
                  icon="link"
                  label={r.title}
                  selected={false}
                  onPress={() => setDraft((d) => linkRecipe(d, { ...r, totalMinutes: totalMinutes(r) }))}
                  testID={`post-link-${r.id}`}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <TextField
        label="A few words"
        hint="Optional. What you changed, who you cooked for, how it went."
        value={draft.caption}
        onChangeText={(caption) => setDraft((d) => ({ ...d, caption }))}
        maxLength={PLATE_LIMITS.caption}
        multiline
        testID="post-caption"
      />

      <View style={styles.steppers}>
        <View style={{ flex: 1, gap: SPACE.xs }}>
          <Text variant="kicker">Time</Text>
          <Stepper
            label="Minutes"
            value={draft.minutes}
            min={5}
            max={600}
            step={5}
            format={(m) => `${m} min`}
            onChange={(minutes) => setDraft((d) => ({ ...d, minutes }))}
            testID="post-minutes"
          />
        </View>
        <View style={{ flex: 1, gap: SPACE.xs }}>
          <Text variant="kicker">Serves</Text>
          <Stepper label="People" value={draft.serves} onChange={(serves) => setDraft((d) => ({ ...d, serves }))} testID="post-serves" />
        </View>
      </View>

      <View style={{ gap: SPACE.xs }}>
        <Text variant="kicker">How hard</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {DIFFICULTIES.map((level) => (
            <Chip
              key={level}
              role="radio"
              label={DIFFICULTY_LABELS[level]}
              selected={draft.difficulty === level}
              onPress={() => setDraft((d) => ({ ...d, difficulty: d.difficulty === level ? undefined : level }))}
              testID={`post-difficulty-${level}`}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: SPACE.xs }}>
        <Text variant="kicker">Preview</Text>
        <View style={{ width: PLATE.preview }}>
          <PlateCard photo={draft.photoUris[0]} title={draft.title.trim()} meta={plateMeta(draft)} testID="post-preview" />
        </View>
        <Text variant="meta">Only you can see your plates for now. Sharing with friends comes with accounts.</Text>
      </View>

      {draftHasContent(draft) ? (
        <Button
          label="Discard this dish"
          kind="quiet"
          onPress={() => {
            discardDraft();
            goBack(router);
          }}
          testID="post-discard"
        />
      ) : null}

      <ActionSheet
        visible={choosing}
        onClose={() => setChoosing(false)}
        title="Add a photo"
        actions={[
          { label: 'Take a photo', icon: 'camera', onPress: () => void add('camera'), testID: 'post-camera' },
          { label: 'Choose from your photos', icon: 'collections', onPress: () => void add('library'), testID: 'post-library' },
        ]}
      />
    </Screen>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bleed: { marginHorizontal: -SPACE.gutter },
  strip: { gap: SPACE.xs, paddingHorizontal: SPACE.gutter },
  addTile: {
    width: PLATE.tile,
    height: PLATE.tile,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colours.inkSubtle,
    backgroundColor: colours.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xxs,
  },
  photo: { width: PLATE.tile },
  removeDisc: {
    position: 'absolute',
    top: SPACE.xxs,
    right: SPACE.xxs,
    width: PLATE.removeDisc,
    height: PLATE.removeDisc,
    borderRadius: PLATE.removeDisc / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FIXED.photoDisc,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  steppers: { flexDirection: 'row', gap: SPACE.md },
}));
