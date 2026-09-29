// Five tabs, one noun each, in the order of the North Star journey (map §6).
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/ui/primitives/Icon';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { FONT } from '@/ui/tokens/type';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Today', icon: 'today' },
  { name: 'recipes', title: 'Recipes', icon: 'recipes' },
  { name: 'plan', title: 'Plan', icon: 'plan' },
  { name: 'shop', title: 'Shop', icon: 'shop' },
  { name: 'saved', title: 'Saved', icon: 'saved' },
];

export default function TabsLayout() {
  const { colours } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colours.ink,
        tabBarInactiveTintColor: colours.inkMuted,
        tabBarStyle: { backgroundColor: colours.bg, borderTopColor: colours.rule, borderTopWidth: StyleSheet.hairlineWidth },
        tabBarLabelStyle: { fontFamily: FONT.sansMedium, fontSize: 11, lineHeight: 14 },
        sceneStyle: { backgroundColor: colours.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarIcon: ({ focused }) => <Icon name={t.icon} size={22} colour={focused ? 'ink' : 'inkMuted'} />,
          }}
        />
      ))}
    </Tabs>
  );
}
