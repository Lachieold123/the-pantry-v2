// Supplies the active colour tokens to every component. Screens read colours
// only through useTheme(), so light, dark and high contrast are one switch.
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { usePreferences } from '@/store/preferences';
import { THEMES, type ColourTokens, type ThemeName } from '@/ui/tokens/colour';

export type Theme = { name: ThemeName; colours: ColourTokens; highContrast: boolean };

const ThemeContext = createContext<Theme>({ name: 'light', colours: THEMES.light.normal, highContrast: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const appearance = usePreferences((s) => s.appearance);
  const highContrast = usePreferences((s) => s.highContrast);
  const name: ThemeName = appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  const value = useMemo<Theme>(
    () => ({ name, highContrast, colours: highContrast ? THEMES[name].highContrast : THEMES[name].normal }),
    [name, highContrast],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
