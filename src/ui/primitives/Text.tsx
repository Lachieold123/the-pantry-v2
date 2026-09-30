// The only way text appears in the app: every string uses a type token and a
// colour token. Dynamic Type is respected, with a ceiling so large type can't
// break layouts (the original had none; audit QUAL-21).
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { textStyle } from '@/ui/theme/fonts';
import { useTheme } from '@/ui/theme/ThemeProvider';
import type { ColourTokens } from '@/ui/tokens/colour';
import { TYPE, type TextVariant } from '@/ui/tokens/type';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  colour?: keyof ColourTokens;
  /** A literal colour from another token set (a cuisine colour, text on a photo). */
  tone?: string | undefined;
  align?: 'left' | 'center' | 'right';
};

const MUTED_BY_DEFAULT = new Set<TextVariant>([
  'kicker',
  'kickerSection',
  'kickerSmall',
  'meta',
  'metaSmall',
  'caption',
  'infoLabel',
  'reasonKey',
  'hint',
]);

/** Big display type may grow less than body text before it wraps awkwardly. */
function maxScale(size: number): number {
  if (size >= 30) return 1.3;
  if (size >= 20) return 1.5;
  return 1.8;
}

export function Text({ variant = 'body', colour, tone, align, style, ...rest }: TextProps) {
  const { colours } = useTheme();
  const t = TYPE[variant];
  const fallback: keyof ColourTokens = MUTED_BY_DEFAULT.has(variant) ? 'inkMuted' : 'ink';
  return (
    <RNText
      maxFontSizeMultiplier={maxScale(t.size)}
      style={[textStyle(t), { color: tone ?? colours[colour ?? fallback] }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
