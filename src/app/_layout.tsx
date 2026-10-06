// Root: fonts, saved preferences, theme and the splash screen. The splash
// stays up until fonts and preferences are ready, so the first frame is final.
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { RootErrorScreen } from '@/features/app/RootErrorScreen';
import { useAppReady } from '@/features/app/useAppReady';
import { ToastProvider } from '@/ui/patterns/Toast';
import { AppChrome } from '@/ui/theme/AppChrome';
import { ThemeProvider, useTheme } from '@/ui/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <ThemeProvider>
      <RootErrorScreen retry={retry} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const ready = useAppReady();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ToastProvider>
          <AppChrome />
          <RootStack />
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// A screen opened straight from a link (the menu, a recipe) still has the tabs
// underneath it, so closing it lands somewhere sensible and the menu dims a real screen.
export const unstable_settings = { initialRouteName: '(tabs)' };

// Short, focused tasks open as sheets over the current screen (map §6).
const SHEET = { presentation: 'formSheet' as const, sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: false };
// The sheet draws its own grabber, so it looks the same on every platform; the system one would make two.

function RootStack() {
  const { colours } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colours.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" options={{ gestureEnabled: false, animation: 'fade' }} />
      {/* The side menu draws its own slide and backdrop over whatever is underneath. */}
      <Stack.Screen
        name="menu"
        options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
      />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="library" />
      {/* The library's old addresses, each opening it on one tab. */}
      <Stack.Screen name="saved/index" />
      <Stack.Screen name="collections/index" />
      <Stack.Screen name="collections/[id]" />
      <Stack.Screen name="my-recipes" />
      <Stack.Screen name="recent" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="dev/gallery" />
      <Stack.Screen name="recipe/[id]/index" />
      <Stack.Screen name="recipe/[id]/plan" options={SHEET} />
      <Stack.Screen name="recipe/[id]/collect" options={SHEET} />
      <Stack.Screen name="recipe/[id]/list" options={SHEET} />
      <Stack.Screen name="pro" options={SHEET} />
      <Stack.Screen name="household" />
      <Stack.Screen name="join/[code]" options={SHEET} />
      <Stack.Screen name="recipe/[id]/cook" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      {/* v1's Filters is a page with a back button, so it pushes like one rather than rising as a sheet. */}
      <Stack.Screen name="filters" />
      <Stack.Screen name="plan/add" options={SHEET} />
      <Stack.Screen name="cupboard/add-list" options={SHEET} />
      <Stack.Screen name="cupboard/shelf" options={SHEET} />
      <Stack.Screen name="cupboard/scan" options={SHEET} />
      <Stack.Screen name="cupboard/cookable" />
      <Stack.Screen name="browse" />
      <Stack.Screen name="plate/[id]" />
      {/* Sharing a dish keeps a draft as you type, so a swipe down loses nothing. */}
      <Stack.Screen name="post" options={{ presentation: 'modal' }} />
      <Stack.Screen name="surprise" />
      {/* Editing is a deliberate task: no swipe-to-dismiss, so a stray gesture can't lose a typed recipe. */}
      <Stack.Screen name="my-recipe/edit" options={{ presentation: 'modal', gestureEnabled: false }} />
      <Stack.Screen name="my-recipe/import" options={SHEET} />
    </Stack>
  );
}
