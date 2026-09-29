// The two brand typefaces, registered under the names the type tokens use.
// Each weight is imported on its own so only these six files ship in the app.
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader/400Regular_Italic';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';

import { FONT } from '@/ui/tokens/type';

export const FONT_FILES = {
  [FONT.serif]: Newsreader_400Regular,
  [FONT.serifItalic]: Newsreader_400Regular_Italic,
  [FONT.serifMedium]: Newsreader_500Medium,
  [FONT.sans]: Manrope_400Regular,
  [FONT.sansMedium]: Manrope_500Medium,
  [FONT.sansBold]: Manrope_700Bold,
};
