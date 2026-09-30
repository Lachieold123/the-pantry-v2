// Write your own recipe, or fix one you imported. You type the way you'd
// write it on a card; the app reads the quantities so it scales, merges on
// the shopping list and gets diet tags like any built-in recipe.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { UnsureLine } from '@/domain/recipes/draft';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { Divider } from '@/ui/primitives/Divider';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';
import { EditorDetails } from './EditorDetails';
import { useRecipeEditor } from './useRecipeEditor';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Only the first letter: the rest quotes the cook's own words ("Check “Nan’s Gravy”"), which keep their capitals. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function UnsureNote({ lines }: { lines: UnsureLine[] }) {
  const unknown = lines.filter((l) => l.reason === 'not-recognised');
  const options = lines.filter((l) => l.reason === 'two-options');
  if (!unknown.length && !options.length) return null;
  return (
    <View style={{ gap: SPACE.xxs }} accessibilityLiveRegion="polite">
      {unknown.length ? (
        <Text variant="meta">
          {`We don’t recognise ${unknown.map((l) => `“${l.raw}”`).join(', ')}. ${unknown.length === 1 ? 'It' : 'They'}’ll still show, and go on your shopping list under Other.`}
        </Text>
      ) : null}
      {options.length ? (
        <Text variant="meta">
          {`${options.length === 1 ? 'One line gives' : `${options.length} lines give`} two options. Diet tags and your avoid list check both; the shopping list shows one, so check it.`}
        </Text>
      ) : null}
    </View>
  );
}

export function RecipeEditorScreen({ id, fromImport }: { id: string | undefined; fromImport: boolean }) {
  const router = useRouter();
  const editor = useRecipeEditor(id, fromImport);
  const { draft, update } = editor;
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!editor.exists) {
    return (
      <Screen>
        <EmptyState
          title="That recipe is gone"
          body="It may have been deleted."
          action={{ label: 'Back', onPress: () => router.back() }}
          testID="editor-missing"
        />
      </Screen>
    );
  }

  const cancel = () => (editor.dirty ? setConfirmingCancel(true) : router.back());

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button label="Cancel" kind="quiet" onPress={cancel} testID="editor-cancel" />
        <Text variant="row" accessibilityRole="header">
          {fromImport ? 'Check and save' : editor.isNew ? 'New recipe' : 'Edit recipe'}
        </Text>
        <Button label="Save" kind="primary" onPress={editor.save} testID="editor-save" />
      </View>
      {editor.showProblems && !editor.built.recipe ? (
        <View style={{ gap: SPACE.sm }} accessibilityLiveRegion="polite">
          <Text variant="body">{`Almost there: ${editor.built.problems.map((p) => lowerFirst(p.message.replace(/\.$/, ''))).join(', ')}.`}</Text>
          {editor.canSaveDraft ? (
            <Button label="Save to finish later" onPress={editor.saveDraft} testID="editor-save-draft" />
          ) : (
            <Button label="Discard changes" kind="destructive" onPress={() => router.back()} testID="editor-discard-changes" />
          )}
        </View>
      ) : null}
      {confirmingCancel ? (
        <View style={{ gap: SPACE.sm }} accessibilityLiveRegion="polite">
          <Text variant="body">Throw away your changes?</Text>
          <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
            <Button label="Keep editing" onPress={() => setConfirmingCancel(false)} testID="editor-keep-editing" />
            <Button label="Discard" kind="destructive" onPress={() => router.back()} testID="editor-discard" />
          </View>
        </View>
      ) : null}

      {editor.sourceUrl ? (
        <Text variant="meta">{`From ${hostOf(editor.sourceUrl)}. Check the quantities and pick a cuisine, then save.`}</Text>
      ) : null}
      <TextField
        label="Name"
        placeholder="Nan’s lentil soup"
        value={draft.title}
        onChangeText={(t) => update('title', t)}
        maxLength={80}
        autoCapitalize="sentences"
        error={editor.titleProblem}
        testID="editor-title"
      />
      <TextField
        label="Short description"
        hint="Optional. One line on why it’s good."
        value={draft.summary}
        onChangeText={(t) => update('summary', t)}
        maxLength={120}
        testID="editor-summary"
      />

      <View style={{ gap: SPACE.sm }}>
        <TextField
          label="Ingredients"
          hint="One per line, like “2 tbsp olive oil”. End a line with a colon to start a group, like “Sauce:”."
          placeholder={'500g beef mince\n1 brown onion, diced\n2 garlic cloves'}
          value={draft.ingredientsText}
          onChangeText={(t) => update('ingredientsText', t)}
          multiline
          autoCapitalize="none"
          error={editor.problem('ingredients')}
          testID="editor-ingredients"
        />
        <UnsureNote lines={editor.built.unsure} />
      </View>
      <TextField
        label="Method"
        hint="One step per line."
        placeholder={'Brown the mince.\nAdd the onion and garlic and cook until soft.'}
        value={draft.methodText}
        onChangeText={(t) => update('methodText', t)}
        multiline
        error={editor.problem('method')}
        testID="editor-method"
      />

      <Divider />
      <EditorDetails draft={draft} update={update} cuisineProblem={editor.problem('cuisine')} mealProblem={editor.problem('mealTypes')} />
      <Divider />

      <TextField
        label="Notes"
        hint="Optional. Tips, swaps, who it came from."
        value={draft.notesText}
        onChangeText={(t) => update('notesText', t)}
        multiline
        testID="editor-notes"
      />

      {editor.isNew ? null : (
        <View style={{ gap: SPACE.sm }}>
          <SectionHeader title="Delete" />
          {confirmingDelete ? (
            <View style={{ gap: SPACE.sm }}>
              <Text variant="body">Delete this recipe? You can undo it straight after.</Text>
              <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
                <Button label="Keep it" onPress={() => setConfirmingDelete(false)} testID="editor-keep" />
                <Button label="Delete" kind="destructive" onPress={editor.remove} testID="editor-confirm-delete" />
              </View>
            </View>
          ) : (
            <Button label="Delete recipe" kind="destructive" onPress={() => setConfirmingDelete(true)} testID="editor-delete" />
          )}
        </View>
      )}
    </Screen>
  );
}
