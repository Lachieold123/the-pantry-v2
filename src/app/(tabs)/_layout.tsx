// The five tabs, under the app header and over the floating tab bar
// (spec §4.1–4.2). Plan and the shopping list are separate tabs (D-032).
import { Redirect, Tabs } from 'expo-router';

import { useNeedsWelcome } from '@/features/app/useNeedsWelcome';
import { AppHeader } from '@/features/shell/AppHeader';
import { TabBar } from '@/features/shell/TabBar';
import { useTheme } from '@/ui/theme/ThemeProvider';

// A crash here replaces this screen only, with a way to retry or go home (audit F69).
export { RootErrorScreen as ErrorBoundary } from '@/features/app/RootErrorScreen';

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
      <Tabs.Screen name="browse" options={{ title: 'Browse' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="list" options={{ title: 'List' }} />
      <Tabs.Screen name="cupboard" options={{ title: 'Cupboard' }} />
    </Tabs>
  );
}
