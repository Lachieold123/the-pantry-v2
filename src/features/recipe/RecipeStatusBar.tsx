// The status bar over the recipe photo: light while the darkened photo is
// behind it, back to the theme's once the white sheet has scrolled up under
// it (audit F113). Only while this page is on top, so Cook Mode and the plan
// sheet opened from here keep the app-wide one.
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';

import { useTheme } from '@/ui/theme/ThemeProvider';

export function RecipeStatusBar({ overPhoto }: { overPhoto: boolean }) {
  const { name } = useTheme();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  if (!focused) return null;
  return <StatusBar style={overPhoto || name === 'dark' ? 'light' : 'dark'} />;
}
