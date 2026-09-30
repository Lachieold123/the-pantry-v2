// Fonts the app loads before its first frame. Georgia and the system sans are
// built into the phone (D-025), so only the icon font ships with the app.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, type TextStyle } from 'react-native';

import { FONT_FAMILY, type TextStyleToken } from '@/ui/tokens/type';

export const FONT_FILES = { ...Ionicons.font };

const SERIF = Platform.select({ ios: FONT_FAMILY.serif.ios, android: FONT_FAMILY.serif.android, default: FONT_FAMILY.serif.web });

/** A type token as a React Native text style. Used by Text and by text inputs. */
export function textStyle(t: TextStyleToken): TextStyle {
  return {
    ...(t.family === 'serif' ? { fontFamily: SERIF } : {}),
    fontSize: t.size,
    fontWeight: t.weight,
    ...(t.lineHeight ? { lineHeight: t.lineHeight } : {}),
    letterSpacing: t.letterSpacing ?? 0,
    ...(t.upper ? { textTransform: 'uppercase' as const } : {}),
    ...(t.italic ? { fontStyle: 'italic' as const } : {}),
  };
}
