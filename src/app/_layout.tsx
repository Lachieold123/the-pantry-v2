// Root: fonts, saved preferences, theme and the splash screen. The splash
// stays up until fonts and preferences are ready, so the first frame is final.
import { Stack, useRouter, type ErrorBoundaryProps, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { RootErrorScreen } from '@/features/app/RootErrorScreen';
import { useAppReady } from '@/features/app/useAppReady';
import { useStorageProblemToast } from '@/features/app/useStorageProblemToast';
import { ToastProvider } from '@/ui/patterns/Toast';
import { configureNotifications, useNotificationTaps } from '@/lib/notifications';
import { AppChrome } from '@/ui/theme/AppChrome';
import { ThemeProvider, useTheme } from '@/ui/theme/ThemeProvider';

// The tabs sit under every other screen, even one opened cold from a link (a
// shared recipe, a notification), so Back and Done always have somewhere to go (audit F48).
export const unstable_settings = { anchor: '(tabs)' };

void SplashScreen.preventAutoHideAsync();
configureNotifications();

// Route groups have their own boundaries; this one catches a crash in the root itself,
// above the app's ThemeProvider, so it brings its own.
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <ThemeProvider>
      <RootErrorScreen {...props} />
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

// Short, focused tasks open as sheets over the current screen (map §6).
const SHEET = { presentation: 'formSheet' as const, sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true };

function RootStack() {
  const { colours } = useTheme();
  useStorageProblemToast();
  const router = useRouter();
  // Tapping the Sunday reminder opens Plan (audit F133). Here, so the stack exists to push onto.
  useNotificationTaps((path) => router.navigate(path as Href));
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
      <Stack.Screen name="recipe/[id]/cook" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="filters" options={SHEET} />
      <Stack.Screen name="plan/add" options={SHEET} />
      <Stack.Screen name="cupboard/add-list" options={SHEET} />
      <Stack.Screen name="cupboard/shelf" options={SHEET} />
      <Stack.Screen name="cupboard/cookable" />
      <Stack.Screen name="surprise" />
      {/* Editing is a deliberate task: no swipe-to-dismiss, so a stray gesture can't lose a typed recipe. */}
      <Stack.Screen name="my-recipe/edit" options={{ presentation: 'modal', gestureEnabled: false }} />
      <Stack.Screen name="my-recipe/import" options={SHEET} />
    </Stack>
  );
}
