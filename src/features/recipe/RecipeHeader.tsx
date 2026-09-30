// The top of the recipe sheet (spec §4.18 items 3–7): title, byline, the
// action row, the three info tiles and the Cook Mode button.
import { Pressable, View } from 'react-native';

import { formatMinutes } from '@/domain/recipes/labels';
import { totalMinutes, type Recipe } from '@/domain/recipes/types';
import { Avatar } from '@/ui/primitives/Avatar';
import { Icon, type IconName } from '@/ui/primitives/Icon';
import { Text } from '@/ui/primitives/Text';
import { makeStyles } from '@/ui/theme/makeStyles';
import { hitSlopFor, RADIUS, RECIPE, SPACE, TAP_TARGET } from '@/ui/tokens/type';

type Props = {
  recipe: Recipe;
  mine: boolean;
  saved: boolean;
  cooked: boolean;
  servings: number;
  onEdit: () => void;
  onSave: () => void;
  onPlan: () => void;
  onShare: () => void;
  onMarkCooked: () => void;
  onServings: () => void;
  onCook: () => void;
};

export function RecipeHeader(p: Props) {
  const styles = useStyles();
  const { recipe } = p;
  const adjusted = p.servings !== recipe.servings;
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text variant="recipeTitle" accessibilityRole="header" style={{ flex: 1 }}>
          {recipe.title}
        </Text>
        {p.mine ? (
          <Pressable
            onPress={p.onEdit}
            style={styles.editPill}
            hitSlop={hitSlopFor(RECIPE.editPill)}
            accessibilityRole="button"
            accessibilityLabel="Edit this recipe"
            testID="recipe-edit"
          >
            <Text variant="label" colour="accentDeep">
              Edit
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.byline}>
        <Avatar name={p.mine ? 'You' : 'The Pantry'} size={RECIPE.byline} />
        <View>
          <Text variant="metaSmall">By</Text>
          <Text variant="name">{p.mine ? 'You' : 'The Pantry'}</Text>
          {/* Only for recipes Lachlan has cook-tested (D-008); an AI draft never claims it. */}
          {!p.mine && recipe.provenance === 'vetted' ? (
            <Text variant="metaSmall" colour="accentDeep" testID="recipe-vetted">
              Tested in The Pantry kitchen
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Action
          icon={p.saved ? 'savedFilled' : 'saved'}
          label={p.saved ? 'Saved' : 'Save'}
          on={p.saved}
          onPress={p.onSave}
          testID="recipe-save"
        />
        <Action icon="plan" label="Plan" onPress={p.onPlan} testID="recipe-plan" />
        <Action icon="send" label="Share" onPress={p.onShare} testID="recipe-share" />
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={p.onMarkCooked}
          hitSlop={hitSlopFor(RECIPE.cookPill)}
          accessibilityRole="button"
          // Starts with the word on the pill, so Voice Control's "tap Cook" finds it (audit F174).
          accessibilityLabel={p.cooked ? 'Cooked, mark as cooked again' : 'Cook, mark as cooked'}
          testID="recipe-mark-cooked"
          style={({ pressed }) => [styles.cookPill, p.cooked && styles.cookPillOn, pressed && styles.pressed]}
        >
          <Icon name={p.cooked ? 'checkCircle' : 'cook'} size={18} colour={p.cooked ? 'onAccent' : 'ink'} />
          <Text variant="chip" colour={p.cooked ? 'onAccent' : 'ink'}>
            {p.cooked ? 'Cooked' : 'Cook'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.tiles}>
        <Tile icon="time" value={formatMinutes(totalMinutes(recipe))} label="Total time" />
        <Tile icon="difficulty" value={recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)} label="Difficulty" />
        <Pressable
          onPress={p.onServings}
          accessibilityRole="button"
          accessibilityLabel={`Serves ${p.servings}. Change servings and units`}
          testID="recipe-servings"
          style={({ pressed }) => [{ flex: 1 }, pressed && styles.pressedTile]}
        >
          <Tile icon="people" value={`${p.servings}`} unit="serves" label={adjusted ? 'Adjusted' : 'Tap to adjust'} on={adjusted} />
        </Pressable>
      </View>

      {recipe.steps.length ? (
        <Pressable
          onPress={p.onCook}
          accessibilityRole="button"
          accessibilityLabel="Start Cook Mode, guided one step at a time"
          testID="recipe-cook"
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <View style={styles.ctaDisc}>
            <Icon name="flame" size={18} colour="bg" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="cardTitleMedium" colour="bg">
              Start Cook Mode
            </Text>
            <Text variant="metaSmall" colour="bgSoft">
              Guided, one step at a time
            </Text>
          </View>
          <Icon name="arrowForward" size={18} colour="bg" />
        </Pressable>
      ) : null}
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
  on = false,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  on?: boolean;
  testID: string;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Icon name={icon} size={20} colour={on ? 'accent' : 'ink'} />
      <Text variant="meta" colour="ink">
        {label}
      </Text>
    </Pressable>
  );
}

function Tile({ icon, value, unit, label, on = false }: { icon: IconName; value: string; unit?: string; label: string; on?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}>
      <Icon name={icon} size={18} colour={on ? 'accent' : 'inkSoft'} />
      <View style={styles.tileValue}>
        <Text variant="infoValue" colour={on ? 'accent' : 'ink'}>
          {value}
        </Text>
        {unit ? (
          <Text variant="caption" colour="inkMuted">
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="infoLabel" colour={on ? 'accent' : 'inkMuted'}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ colours }) => ({
  wrap: { gap: SPACE.md },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  editPill: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.accentSoft,
  },
  byline: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm - 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6, minHeight: TAP_TARGET },
  cookPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACE.sm,
    minHeight: RECIPE.cookPill,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.bgSoft,
  },
  cookPillOn: { backgroundColor: colours.accent },
  pressed: { opacity: 0.7 },
  pressedTile: { opacity: 0.6 },
  tiles: {
    flexDirection: 'row',
    gap: SPACE.xs,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: RADIUS.big,
    backgroundColor: colours.bgSoft,
  },
  tile: { flex: 1, alignItems: 'center', gap: 6 },
  tileValue: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.xxs },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingVertical: 14,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.ink,
  },
  ctaDisc: {
    width: RECIPE.iconDisc,
    height: RECIPE.iconDisc,
    borderRadius: RADIUS.pill,
    backgroundColor: colours.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
