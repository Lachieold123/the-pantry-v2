// "Your plates" on Home: the dishes you've shared with the "+", newest first
// (D-033). Shown only when there are some. Until social, they're only yours,
// so they sit apart from the recipe picks rather than mixed in as if posted.
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { plateMeta } from '@/domain/plates/plate';
import { usePlates } from '@/store/plates';
import { PlateCard } from '@/ui/patterns/PlateCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Button } from '@/ui/primitives/Button';
import { HOME, PLATE } from '@/ui/tokens/screens';
import { SPACE } from '@/ui/tokens/type';

export function PlatesRail() {
  const router = useRouter();
  const plates = usePlates((s) => s.plates);
  if (plates.length === 0) return null;
  return (
    <View testID="home-plates" style={{ marginBottom: HOME.afterCarousel }}>
      <SectionHeader
        kicker={`Your plates · ${plates.length}`}
        tone="accent"
        title="What you've cooked"
        action={<Button label="Share one" kind="quiet" onPress={() => router.push('/post')} testID="home-plates-add" />}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -SPACE.gutter }}
        contentContainerStyle={{ gap: SPACE.sm, paddingHorizontal: SPACE.gutter, alignItems: 'flex-start' }}
      >
        {plates.map((p) => (
          <PlateCard
            key={p.id}
            photo={p.photoUris[0]}
            title={p.title}
            meta={plateMeta(p)}
            width={PLATE.railCard}
            onPress={() => router.push({ pathname: '/plate/[id]', params: { id: p.id } })}
            testID={`home-plate-${p.id}`}
          />
        ))}
      </ScrollView>
    </View>
  );
}
