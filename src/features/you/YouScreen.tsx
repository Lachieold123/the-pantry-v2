// "You": the one place for what's yours, opened from the header's avatar
// (Lachlan, 6 October: "one place for 'you', not two menus"). It replaces the
// side menu. The tabs already cover Home, Plan, List and Cupboard, so this
// page holds only what they don't, in the order people reach for it: the
// library, the kitchen's extras, sharing and Pro, then Settings.
import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useOpenPaywall } from '@/store/pro';
import { NavRow } from '@/ui/patterns/NavRow';
import { PushedHeader } from '@/ui/patterns/PushedHeader';
import { Divider } from '@/ui/primitives/Divider';
import { Screen } from '@/ui/primitives/Screen';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';
import { useHouseholdValue, useLibraryCounts, useProValue } from './useYouValues';

export function YouScreen() {
  const router = useRouter();
  const counts = useLibraryCounts();
  const household = useHouseholdValue();
  const pro = useProValue();
  const openPaywall = useOpenPaywall();
  const go = (href: Href) => router.push(href);
  return (
    <Screen testID="you-screen">
      <PushedHeader kicker="You" title="Your kitchen" />

      <Section label="Library">
        <NavRow
          icon="saved"
          label="Cookmarks"
          count={counts.cookmarks}
          onPress={() => go('/library?tab=cookmarks')}
          testID="you-cookmarks"
        />
        <NavRow
          icon="collections"
          label="Collections"
          count={counts.collections}
          onPress={() => go('/library?tab=collections')}
          testID="you-collections"
        />
        <NavRow icon="cook" label="My recipes" count={counts.mine} onPress={() => go('/library?tab=mine')} testID="you-my-recipes" />
        <NavRow icon="time" label="Recent" count={counts.recent} onPress={() => go('/library?tab=recent')} testID="you-recent" />
      </Section>

      <Section label="Kitchen">
        <NavRow icon="flame" label="Kitchen stats" onPress={() => go('/stats')} testID="you-stats" />
        <NavRow icon="camera" label="Share a dish" onPress={() => go('/post')} testID="you-post" />
        <NavRow icon="dice" label="Surprise me" onPress={() => go('/surprise')} testID="you-surprise" />
      </Section>

      <Section label="Sharing and Pro">
        <NavRow icon="people" label="Household" value={household} onPress={() => go('/household')} testID="you-household" />
        <NavRow icon="sparkles" label="The Pantry Pro" value={pro} onPress={() => openPaywall()} testID="you-pro" />
      </Section>

      <View style={{ gap: SPACE.xs }}>
        <Divider />
        <View style={{ marginHorizontal: -SPACE.sm }}>
          <NavRow icon="settings" label="Settings" onPress={() => go('/settings')} testID="you-settings" />
        </View>
      </View>
    </Screen>
  );
}

// Rows carry their own side padding (for the pressed highlight), so the group
// steps out by that much and the icons line up with the header's back button.
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginHorizontal: -SPACE.sm }}>
      <Text variant="kickerSmall" accessibilityRole="header" style={{ paddingHorizontal: SPACE.sm, paddingBottom: SPACE.xs }}>
        {label}
      </Text>
      {children}
    </View>
  );
}
