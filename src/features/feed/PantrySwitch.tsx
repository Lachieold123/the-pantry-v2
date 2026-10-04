// The top of Home (D-034): one switch between "What I have" and "Everything",
// with search beside it. "What I have" is the app's reason for being, so it
// comes first, carries the amber and the count of dishes ready now, and is on
// by default whenever the cupboard can make something. In that mode a quiet
// line under it says what it's working from, and opens the Cupboard.
import { Pressable, View } from 'react-native';

import type { HomeMode } from '@/domain/suggestions/home';
import { useTourTarget } from '@/store/tour';
import { Icon } from '@/ui/primitives/Icon';
import { IconButton } from '@/ui/primitives/IconButton';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { HOME } from '@/ui/tokens/screens';
import { PRESSED, RADIUS, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type Props = {
  mode: HomeMode;
  onMode: (mode: HomeMode) => void;
  /** Dishes ready now that pass the other filters. */
  ready: number;
  /** Things in the cupboard. */
  stocked: number;
  onCupboard: () => void;
  onSearch: () => void;
};

export function PantrySwitch({ mode, onMode, ready, stocked, onCupboard, onSearch }: Props) {
  const styles = useStyles();
  const pantry = mode === 'pantry';
  // The first stop of the first-use tour (D-035).
  const tourRef = useTourTarget('home-pantry');
  const readyLabel = ready === 1 ? '1 dish ready' : `${ready} dishes ready`;
  return (
    // The tour's first stop takes in the switch and the line under it.
    <View style={{ gap: SPACE.xs }} ref={tourRef} collapsable={false}>
      <View style={styles.row}>
        <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel="Show recipes">
          <Pressable
            onPress={() => onMode('pantry')}
            accessibilityRole="radio"
            accessibilityState={{ selected: pantry }}
            accessibilityLabel={`What I have, ${readyLabel}`}
            testID="home-mode-pantry"
            style={({ pressed }) => [styles.segment, styles.pantrySegment, pantry && styles.pantryOn, pressed && styles.pressed]}
          >
            <Icon name="basket" size={18} colour={pantry ? 'accentDeep' : 'inkMuted'} />
            <Text
              variant="label"
              colour={pantry ? 'accentDeep' : 'inkMuted'}
              style={pantry ? styles.bold : null}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={HOME.labelMinScale}
            >
              What I have
            </Text>
            <View style={[styles.count, pantry && styles.countOn]}>
              <Text variant="badge" colour={pantry ? 'bg' : 'inkMuted'} maxFontSizeMultiplier={HOME.countMaxScale}>
                {String(ready)}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => onMode('all')}
            accessibilityRole="radio"
            accessibilityState={{ selected: !pantry }}
            accessibilityLabel="Everything"
            testID="home-mode-all"
            style={({ pressed }) => [styles.segment, !pantry && styles.allOn, pressed && styles.pressed]}
          >
            <Text
              variant="label"
              colour={pantry ? 'inkMuted' : 'bg'}
              style={pantry ? null : styles.bold}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={HOME.labelMinScale}
            >
              Everything
            </Text>
          </Pressable>
        </View>
        <IconButton icon="search" shape="squareOnSoft" label="Search recipes" onPress={onSearch} testID="home-search" />
      </View>
      {/* Only in "What I have": it says what the answer is worked out from. */}
      {pantry ? (
        <Pressable onPress={onCupboard} accessibilityRole="button" testID="home-pantry-line" style={styles.line}>
          <Text variant="meta" colour="inkMuted" numberOfLines={1}>
            {stocked === 0 ? (
              <>
                Your cupboard is empty ·{' '}
                <Text variant="meta" colour="accentDeep">
                  Add what you have
                </Text>
              </>
            ) : (
              <>
                {`From ${stocked} ${stocked === 1 ? 'thing' : 'things'} in your cupboard · `}
                <Text variant="meta" colour="accentDeep">
                  Change
                </Text>
              </>
            )}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  track: {
    flex: 1,
    flexDirection: 'row',
    padding: SPACE.xxs,
    gap: SPACE.xxs,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.bgSoft,
  },
  segment: {
    flex: 1,
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.pill,
  },
  // The pantry side is the wider one: it's the point of the app and carries the count.
  pantrySegment: { flex: HOME.pantryShare },
  pantryOn: { backgroundColor: colours.accentSoft },
  allOn: { backgroundColor: colours.ink },
  bold: { fontWeight: '800' },
  count: {
    minWidth: HOME.countPill,
    minHeight: HOME.countPill,
    paddingHorizontal: SPACE.xxs + 2,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.border,
  },
  countOn: { backgroundColor: colours.accentDeep },
  pressed: { opacity: PRESSED.row },
  // A full-height tap target; the text alone was 32pt (health check #12).
  line: { minHeight: TAP_TARGET, justifyContent: 'center' },
}));
