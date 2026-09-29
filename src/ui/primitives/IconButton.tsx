// An icon on its own still needs a 44pt target and a spoken label.
import { Pressable } from 'react-native';

import { TAP_TARGET } from '@/ui/tokens/type';
import type { ColourTokens } from '@/ui/tokens/colour';
import { Icon, type IconName } from './Icon';

type Props = { icon: IconName; label: string; onPress: () => void; colour?: keyof ColourTokens; disabled?: boolean };

export function IconButton({ icon, label, onPress, colour = 'ink', disabled = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => ({
        width: TAP_TARGET,
        height: TAP_TARGET,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed || disabled ? 0.5 : 1,
      })}
    >
      <Icon name={icon} colour={disabled ? 'inkMuted' : colour} />
    </Pressable>
  );
}
