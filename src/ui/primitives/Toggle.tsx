// The on/off control on its own, in the app's colours. Rows that lay out their
// own label (Settings, the Cupboard) use this; Switch is the labelled row.
import { Switch as RNSwitch } from 'react-native';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { FIXED } from '@/ui/tokens/colour';

type Props = { value: boolean; onChange: (value: boolean) => void; label: string; testID?: string | undefined };

// React Native Web's switch paints its thumb teal when on unless told otherwise.
const WEB_THUMB = { activeThumbColor: FIXED.onPhoto } as object;

export function Toggle({ value, onChange, label, testID }: Props) {
  const { colours } = useTheme();
  return (
    <RNSwitch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={label}
      {...(testID ? { testID } : {})}
      // Off uses a mid grey so the track shows on white and on the grey Settings page alike.
      trackColor={{ true: colours.accent, false: colours.inkSubtle }}
      thumbColor={FIXED.onPhoto}
      ios_backgroundColor={colours.inkSubtle}
      {...WEB_THUMB}
    />
  );
}
