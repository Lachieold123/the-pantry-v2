// Keeps the status bar and the window behind the app in step with the theme,
// so nothing flashes white under a dark screen.
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useTheme } from './ThemeProvider';

export function AppChrome() {
  const { name, colours } = useTheme();
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colours.bg);
  }, [colours.bg]);
  return <StatusBar style={name === 'dark' ? 'light' : 'dark'} />;
}
