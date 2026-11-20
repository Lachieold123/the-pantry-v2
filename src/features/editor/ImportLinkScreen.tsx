// Import a recipe from a web page, as a sheet (kept for links made to it; My
// recipes has the same thing inline, as v1 did). The recipe then opens in the
// editor to check before saving.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { SPACE } from '@/ui/tokens/type';
import { goBack } from '@/lib/navigation';
import { useLinkImport, writeByHandHelps } from '@/lib/useLinkImport';
import { beginImportReview } from '@/store/pendingImport';

export function ImportLinkScreen() {
  const router = useRouter();
  const [link, setLink] = useState('');
  const importer = useLinkImport((draft, url) => {
    beginImportReview(draft, url);
    router.replace({ pathname: '/my-recipe/edit', params: { from: 'import' } });
  });

  return (
    <Sheet title="Import from a link" onClose={() => goBack(router)}>
      <Text variant="body" colour="inkSoft">
        Paste a link to a recipe page. You’ll check it over before it’s saved.
      </Text>
      <TextField
        label="Recipe link"
        placeholder="https://"
        value={link}
        onChangeText={(t) => {
          setLink(t);
          importer.clear();
        }}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={() => importer.run(link)}
        error={importer.message}
        testID="import-link"
      />
      <View style={{ gap: SPACE.sm }}>
        <Button
          label="Import"
          kind="primary"
          busy={importer.busy}
          disabled={!link.trim() || importer.busy}
          onPress={() => importer.run(link)}
          testID="import-submit"
        />
        {writeByHandHelps(importer.failure) ? (
          <Button label="Write it in by hand" onPress={() => router.replace('/my-recipe/edit')} testID="import-write-by-hand" />
        ) : null}
      </View>
    </Sheet>
  );
}
