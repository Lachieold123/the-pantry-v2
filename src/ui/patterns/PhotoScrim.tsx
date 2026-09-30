// The dark fade over the bottom of a photo that keeps white text readable.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { GRADIENTS } from '@/ui/tokens/colour';

export function PhotoScrim({ kind }: { kind: keyof typeof GRADIENTS }) {
  const g = GRADIENTS[kind];
  return <LinearGradient colors={g.colors} locations={g.locations} style={StyleSheet.absoluteFill} pointerEvents="none" />;
}
