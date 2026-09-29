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

function RootStack() {
  const { colours } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colours.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings/index" options={{ presentation: 'modal' }} />
      <Stack.Screen name="dev/gallery" />
      <Stack.Screen name="recipe/[id]" />
      <Stack.Screen name="filters" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }} />
    </Stack>
  );
}
