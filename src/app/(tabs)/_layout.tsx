// The four tabs in v1's order, under the app header and over the floating tab
// bar with its centre "+" (D-025, spec §4.1–4.2).
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
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
      <Tabs.Screen name="browse" options={{ title: 'Browse' }} />
      <Tabs.Screen name="cupboard" options={{ title: 'Cupboard' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
    </Tabs>
  );
}
