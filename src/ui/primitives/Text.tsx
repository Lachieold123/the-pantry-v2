// The only way text appears in the app: every string uses one of the type
// scale's variants (map §9) and a colour token. Dynamic Type is respected,
// with a ceiling so display type can't break layouts at the largest sizes.
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/ui/theme/ThemeProvider';
import type { ColourTokens } from '@/ui/tokens/colour';
import { TYPE, type TextVariant } from '@/ui/tokens/type';

type InkColour = Extract<keyof ColourTokens, 'ink' | 'inkSecondary' | 'inkMuted' | 'accent' | 'onAccent' | 'danger'>;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  colour?: InkColour;
  /** A literal colour from a token set other than the theme's ink, e.g. a cuisine tone. */
  tone?: string | undefined;
  align?: 'left' | 'center' | 'right';
};

const MAX_SCALE: Partial<Record<TextVariant, number>> = { display: 1.4, title: 1.6 };

export function Text({ variant = 'body', colour, tone, align, style, ...rest }: TextProps) {
  const { colours } = useTheme();
  const t = TYPE[variant];
  const defaultColour: InkColour = variant === 'meta' || variant === 'kicker' ? 'inkMuted' : variant === 'numeral' ? 'accent' : 'ink';
  return (
    <RNText
      maxFontSizeMultiplier={MAX_SCALE[variant] ?? 2}
      style={[
        {
          fontFamily: t.fontFamily,
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          letterSpacing: t.letterSpacing ?? 0,
          textTransform: t.textTransform ?? 'none',
          color: tone ?? colours[colour ?? defaultColour],
          textAlign: align ?? 'left',
        },
        style,
      ]}
      {...rest}
    />
  );
}
