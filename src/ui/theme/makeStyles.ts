// Styles that depend on the theme, created once per theme rather than on every render.
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme, type Theme } from './ThemeProvider';

export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  const cache = new Map<string, T>();
  return function useStyles(): T {
    const theme = useTheme();
    const key = `${theme.name}:${theme.highContrast ? 'hc' : 'n'}`;
    return useMemo(() => {
      const cached = cache.get(key);
      if (cached) return cached;
      const created = StyleSheet.create(factory(theme));
      cache.set(key, created);
      return created;
    }, [key, theme]);
  };
}
