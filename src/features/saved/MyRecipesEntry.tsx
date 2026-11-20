// The top of My recipes, in v1's layout (CustomMealsModal, `light-19`): a
// name and "Add", then "Or import from a link" and a link and "Import".
//
// v1's "Add" saved a bare name. Here a recipe of your own is a real recipe
// (it scales, shops and cooks), so "Add" opens the editor with the name filled
// in. "Import" reads the page right here and opens the editor to check it,
// the same as the import sheet does.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useLinkImport, writeByHandHelps } from '@/lib/useLinkImport';
import { beginImportReview } from '@/store/pendingImport';
import { useAllowance } from '@/store/pro';
import { EntryRow } from '@/ui/patterns/EntryRow';
import { Button } from '@/ui/primitives/Button';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

export function MyRecipesEntry() {
  const router = useRouter();
  const allowed = useAllowance();
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const importer = useLinkImport((draft, url) => {
    beginImportReview(draft, url);
    setLink('');
    router.push({ pathname: '/my-recipe/edit', params: { from: 'import' } });
  });

  // Free keeps 10 recipes of your own and imports 5 links a month (D-038).
  const add = () => {
    if (!allowed('my-recipes')) return;
    const title = name.trim();
    setName('');
    router.push(title ? { pathname: '/my-recipe/edit', params: { title } } : '/my-recipe/edit');
  };
  const importLink = () => {
    // An empty link is a nudge, not a trip to the paywall.
    if (!link.trim()) return importer.run(link);
    if (allowed('my-recipes') && allowed('imports')) importer.run(link);
  };

  return (
    <View style={{ gap: SPACE.sm }} testID="mine-entry">
      <EntryRow
        label="Recipe name"
        placeholder="Add a recipe…"
        value={name}
        onChangeText={setName}
        action="Add"
        onSubmit={add}
        returnKeyType="done"
        autoCapitalize="sentences"
        testID="mine-name"
      />
      <Text variant="kicker" colour="inkMuted" style={{ marginTop: SPACE.xxs }}>
        Or import from a link
      </Text>
      <EntryRow
        label="Recipe link"
        placeholder="Paste a recipe link…"
        value={link}
        onChangeText={(t) => {
          setLink(t);
          importer.clear();
        }}
        action="Import"
        onSubmit={importLink}
        busy={importer.busy}
        error={importer.message}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        testID="mine-link"
      />
      {writeByHandHelps(importer.failure) ? (
        <Button label="Write it in by hand" kind="quiet" onPress={add} testID="mine-write-by-hand" />
      ) : null}
    </View>
  );
}
