// An on/off setting row. Uses the platform switch so it feels native.
import { View } from 'react-native';

import { SPACE, TAP_TARGET } from '@/ui/tokens/type';
import { Text } from './Text';
import { Toggle } from './Toggle';

type Props = { label: string; detail?: string; value: boolean; onChange: (value: boolean) => void; testID?: string | undefined };

export function Switch({ label, detail, value, onChange, testID }: Props) {
  return (
    <View style={{ minHeight: TAP_TARGET, flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.xs }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="row">{label}</Text>
        {detail ? <Text variant="meta">{detail}</Text> : null}
      </View>
      <Toggle value={value} onChange={onChange} label={label} testID={testID} />
    </View>
  );
}
