// Design gallery (development builds only): every component in every state,
// with a theme switch at the top so both themes can be reviewed in one place.
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { usePreferences, type Appearance } from '@/store/preferences';
import { EmptyState } from '@/ui/patterns/EmptyState';
import { ErrorState } from '@/ui/patterns/ErrorState';
import { TitleBlock } from '@/ui/patterns/TitleBlock';
import { Skeleton } from '@/ui/patterns/Skeleton';
import { useToast } from '@/ui/patterns/Toast';
import { Button } from '@/ui/primitives/Button';
import { Divider } from '@/ui/primitives/Divider';
import { IconButton } from '@/ui/primitives/IconButton';
import { ListRow } from '@/ui/primitives/ListRow';
import { Screen } from '@/ui/primitives/Screen';
import { Segmented } from '@/ui/primitives/Segmented';
import { Switch } from '@/ui/primitives/Switch';
import { SPACE } from '@/ui/tokens/type';
import { Block, Cards, Controls, Swatches, TypeScale } from './GalleryParts';

const THEMES = [
  { value: 'light', label: 'Paper' },
  { value: 'dark', label: 'Night' },
] as const;

export function GalleryScreen() {
  const router = useRouter();
  const toast = useToast();
  const { appearance, highContrast, setAppearance, setHighContrast } = usePreferences(
    useShallow(({ appearance, highContrast, setAppearance, setHighContrast }) => ({
      appearance,
      highContrast,
      setAppearance,
      setHighContrast,
    })),
  );
  return (
    <Screen>
      <TitleBlock
        kicker="Development only"
        title="Gallery"
        action={<IconButton icon="close" label="Close gallery" onPress={() => router.back()} />}
      />
      <Segmented<Appearance> label="Theme" options={THEMES} value={appearance === 'dark' ? 'dark' : 'light'} onChange={setAppearance} />
      <Switch label="High contrast" value={highContrast} onChange={setHighContrast} />
      <Block title="Type">
        <TypeScale />
      </Block>
      <Block title="Colour">
        <Swatches />
      </Block>
      <Block title="Buttons">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
          <Button label="Cook" kind="primary" onPress={() => toast({ message: 'Primary pressed' })} />
          <Button label="Plan" onPress={() => toast({ message: 'Secondary pressed' })} />
          <Button label="Clear filters" kind="quiet" onPress={() => toast({ message: 'Quiet pressed' })} />
          <Button
            label="Delete collection"
            kind="destructive"
            onPress={() => toast({ message: 'Collection deleted', undo: () => toast({ message: 'Restored' }) })}
          />
          <Button label="Disabled" disabled onPress={() => undefined} />
          <Button label="Saving" busy onPress={() => undefined} />
        </View>
      </Block>
      <Block title="Controls">
        <Controls />
      </Block>
      <Block title="Rows">
        <ListRow title="Weeknights" detail="12 recipes" onPress={() => toast({ message: 'Row pressed' })} />
        <Divider />
        <ListRow title="Measurements" value="Metric" onPress={() => toast({ message: 'Row pressed' })} />
      </Block>
      <Block title="Recipe cards">
        <Cards onOpen={(id) => router.push({ pathname: '/recipe/[id]', params: { id } })} />
      </Block>
      <Block title="Loading">
        <Skeleton height={180} radius={14} />
        <Skeleton height={18} width="70%" />
      </Block>
      <Block title="Empty and error">
        <EmptyState
          title="Nothing planned for tonight"
          body="Plan a few dinners and tonight's shows up here."
          action={{ label: 'Browse recipes', onPress: () => router.navigate('/browse') }}
        />
        <ErrorState
          body="The recipe link couldn't be read. Check you're online, then try again."
          onRetry={() => toast({ message: 'Retrying' })}
        />
      </Block>
    </Screen>
  );
}
