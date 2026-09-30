// v1's COOKING group: one row per taste preference, each opening a small sheet
// with just that choice. Surprise me and suggestions treat diet and avoid as
// hard rules; cuisines and weeknight time only reorder.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { DIET_PREFERENCE_LABELS } from '@/domain/recipes/labels';
import { usePreferences } from '@/store/preferences';
import { ModalSheet } from '@/ui/patterns/ModalSheet';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { SPACE } from '@/ui/tokens/type';
import { EDITOR_TITLES, PreferenceEditor, WEEKNIGHT_LABELS, type CookingPreference } from './PreferenceEditors';
import { SettingsSection } from './SettingsParts';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function CookingSection() {
  const [editing, setEditing] = useState<CookingPreference | null>(null);
  const { diet, avoid, cuisines, weeknight } = usePreferences(
    useShallow(({ diet, avoid, cuisines, weeknight }) => ({ diet, avoid, cuisines, weeknight })),
  );
  const avoidCount = avoid.options.length + avoid.custom.length;
  const close = () => setEditing(null);
  return (
    <>
      <SettingsSection label="Cooking">
        <ListRow
          icon="cook"
          title="Diet"
          value={DIET_PREFERENCE_LABELS[diet]}
          onPress={() => setEditing('diet')}
          testID="settings-cooking-diet"
        />
        <ListRow
          icon="leaf"
          title="Avoid"
          value={avoidCount === 0 ? 'Nothing' : plural(avoidCount, 'item', 'items')}
          onPress={() => setEditing('avoid')}
          testID="settings-cooking-avoid"
        />
        <ListRow
          icon="globe"
          title="Cuisines"
          value={cuisines.length === 0 ? 'All' : `${cuisines.length} picked`}
          onPress={() => setEditing('cuisines')}
          testID="settings-cooking-cuisines"
        />
        <ListRow
          icon="time"
          title="Weeknight time"
          value={WEEKNIGHT_LABELS[weeknight ?? 'any'] ?? 'No rush'}
          onPress={() => setEditing('weeknight')}
          testID="settings-cooking-weeknight"
        />
      </SettingsSection>
      <ModalSheet visible={editing !== null} onClose={close} title={editing ? EDITOR_TITLES[editing] : ''} testID="settings-editor">
        {/* The avoid sheet has a text field; this lifts the sheet above the keyboard. */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ gap: SPACE.lg, paddingVertical: SPACE.sm }}>
            {editing ? <PreferenceEditor section={editing} /> : null}
            <Button label="Done" kind="primary" block onPress={close} testID="settings-editor-done" />
          </View>
        </KeyboardAvoidingView>
      </ModalSheet>
    </>
  );
}
