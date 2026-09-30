// An on/off setting row. Uses the platform switch so it feels native.
import { Switch as RNSwitch, View } from 'react-native';

import { useTheme } from '@/ui/theme/ThemeProvider';
import { FIXED } from '@/ui/tokens/colour';
import { SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Text } from './Text';

type Props = { label: string; detail?: string; value: boolean; onChange: (value: boolean) => void; testID?: string | undefined };

export function Switch({ label, detail, value, onChange, testID }: Props) {
  const { colours } = useTheme();
  return (
    <View style={{ minHeight: TAP_TARGET, flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.xs }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="row">{label}</Text>
        {detail ? <Text variant="meta">{detail}</Text> : null}
      </View>
      <RNSwitch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        {...(testID ? { testID } : {})}
        trackColor={{ true: colours.accent, false: colours.switchTrackOff }}
        thumbColor={FIXED.onPhoto}
        ios_backgroundColor={colours.switchTrackOff}
      />
    </View>
  );
}
