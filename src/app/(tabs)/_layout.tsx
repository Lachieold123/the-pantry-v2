// The four tabs and the centre "+", under the app header and over the
// floating tab bar (spec §4.1–4.2, D-033). Plan and List are separate tabs;
// Browse opens from Home's search bar.
import { Redirect, Tabs } from 'expo-router';

import { useNeedsWelcome } from '@/features/app/useNeedsWelcome';
import { AppHeader } from '@/features/shell/AppHeader';
import { TabBar } from '@/features/shell/TabBar';
import { useTheme } from '@/ui/theme/ThemeProvider';

export default function TabsLayout() {
  const { colours } = useTheme();
  // First launch goes through the welcome and taste quiz (skippable) before the app.
  if (useNeedsWelcome()) return <Redirect href="/welcome" />;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ header: () => <AppHeader />, sceneStyle: { backgroundColor: colours.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="list" options={{ title: 'List' }} />
      <Tabs.Screen name="cupboard" options={{ title: 'Cupboard' }} />
    </Tabs>
  );
}
