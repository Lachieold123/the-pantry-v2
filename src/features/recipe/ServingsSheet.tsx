// Servings and units, opened from the servings tile (spec §4.18 item 6).
import { View } from 'react-native';

import type { UnitSystem } from '@/domain/ingredients/format';
import { ModalSheet } from '@/ui/patterns/ModalSheet';
import { Button } from '@/ui/primitives/Button';
import { Segmented } from '@/ui/primitives/Segmented';
import { Stepper } from '@/ui/primitives/Stepper';
import { Text } from '@/ui/primitives/Text';
import { SPACE } from '@/ui/tokens/type';

const UNITS = [
  { value: 'metric', label: 'Metric' },
  { value: 'imperial', label: 'Imperial' },
] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  servings: number;
  original: number;
  onServings: (n: number) => void;
  units: UnitSystem;
  onUnits: (u: UnitSystem) => void;
};

export function ServingsSheet({ visible, onClose, servings, original, onServings, units, onUnits }: Props) {
  return (
    <ModalSheet visible={visible} onClose={onClose} title="Servings" testID="servings-sheet">
      <View style={{ gap: SPACE.md, paddingVertical: SPACE.sm, alignItems: 'center' }}>
        <View style={{ alignSelf: 'center' }}>
          <Stepper label="Servings" value={servings} onChange={onServings} max={24} format={(n) => `Serves ${n}`} />
        </View>
        <Text variant="caption" align="center">
          The recipe is written for {original}. Amounts scale as you change it.
        </Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Segmented<UnitSystem> label="Measurements" options={UNITS} value={units} onChange={onUnits} size="sm" />
        </View>
        <View style={{ flexDirection: 'row', gap: SPACE.sm, alignSelf: 'stretch' }}>
          {servings !== original ? (
            <View style={{ flex: 1 }}>
              <Button label={`Reset to ${original}`} kind="soft" block onPress={() => onServings(original)} testID="servings-reset" />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Button label="Done" kind="primary" block onPress={onClose} testID="servings-done" />
          </View>
        </View>
      </View>
    </ModalSheet>
  );
}
