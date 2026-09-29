// Hairline rules separate sections instead of boxes and shadows (map §9).
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/ui/theme/ThemeProvider';

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colours } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colours.rule, marginLeft: inset }} />;
}
