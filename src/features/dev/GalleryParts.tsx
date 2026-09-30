// Pieces of the design gallery, split out to keep each file small.
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { getCatalogueRecipe } from '@/data/catalogue/catalogue';
import { RECIPE_IMAGES } from '@/data/catalogue/images';
import { RecipeCard } from '@/ui/patterns/RecipeCard';
import { SectionHeader } from '@/ui/patterns/SectionHeader';
import { Checkbox } from '@/ui/primitives/Checkbox';
import { Chip } from '@/ui/primitives/Chip';
import { Stepper } from '@/ui/primitives/Stepper';
import { Switch } from '@/ui/primitives/Switch';
import { Text } from '@/ui/primitives/Text';
import { TextField } from '@/ui/primitives/TextField';
import { useTheme } from '@/ui/theme/ThemeProvider';
import type { ColourTokens } from '@/ui/tokens/colour';
import { RADIUS, SPACE, TYPE, type TextVariant } from '@/ui/tokens/type';

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: SPACE.sm }}>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}

// Every type role, so the whole scale can be checked against the original in one place.
const VARIANTS = Object.keys(TYPE) as TextVariant[];

export function TypeScale() {
  return (
    <View style={{ gap: SPACE.xs }}>
      {VARIANTS.map((v) => (
        <Text key={v} variant={v}>
          {v.startsWith('number')
            ? '1 · 2 · 3'
            : v.startsWith('body')
              ? 'Turn the heat up and add the mince. Let it actually colour.'
              : `${v[0]?.toUpperCase()}${v.slice(1)}: Spaghetti Bolognese`}
        </Text>
      ))}
    </View>
  );
}

export function Swatches() {
  const { colours } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
      {(Object.keys(colours) as (keyof ColourTokens)[]).map((k) => (
        <View key={k} style={{ width: 96, gap: SPACE.xxs }}>
          <View style={{ height: 40, borderRadius: RADIUS.sm, backgroundColor: colours[k], borderWidth: 1, borderColor: colours.border }} />
          <Text variant="meta">{k}</Text>
        </View>
      ))}
    </View>
  );
}

export function Controls() {
  const [chip, setChip] = useState(true);
  const [servings, setServings] = useState(4);
  const [ticked, setTicked] = useState(false);
  const [on, setOn] = useState(true);
  return (
    <View style={{ gap: SPACE.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
        <Chip label="Vegetarian" selected={chip} onPress={() => setChip(!chip)} testID="gallery-chip-vegetarian" />
        <Chip label="Under 30 min" selected={!chip} onPress={() => setChip(!chip)} testID="gallery-chip-quick" />
      </View>
      <Stepper label="Servings" value={servings} onChange={setServings} testID="gallery-stepper" />
      <Checkbox label="brown onion" detail="3" checked={ticked} onToggle={() => setTicked(!ticked)} testID="gallery-checkbox" />
      <Switch label="Move ticked items to the cupboard" value={on} onChange={setOn} testID="gallery-switch" />
      <TextField label="Collection name" placeholder="Weeknights" testID="gallery-field" />
      <TextField
        testID="gallery-field-error"
        label="Recipe link"
        defaultValue="not a link"
        error="That doesn’t look like a web address. Check it starts with https://"
      />
    </View>
  );
}

export function Cards({ onOpen }: { onOpen: (id: string) => void }) {
  const bolognese = getCatalogueRecipe('spaghetti-bolognese');
  const curry = getCatalogueRecipe('thai-green-curry');
  if (!bolognese || !curry) return <Text variant="meta">{'Sample recipes aren’t in this build.'}</Text>;
  return (
    <View style={{ gap: SPACE.lg }}>
      <RecipeCard
        recipe={bolognese}
        image={RECIPE_IMAGES[bolognese.id]}
        size="large"
        onPress={() => onOpen(bolognese.id)}
        testID="gallery-card-large"
      />
      <View style={{ flexDirection: 'row', gap: SPACE.md }}>
        <View style={{ flex: 1 }}>
          <RecipeCard
            recipe={curry}
            image={RECIPE_IMAGES[curry.id]}
            size="medium"
            onPress={() => onOpen(curry.id)}
            testID="gallery-card-medium"
          />
        </View>
        <View style={{ flex: 1 }}>
          <RecipeCard
            recipe={{ ...curry, title: 'A recipe with a very long title that has to wrap neatly' }}
            image={undefined}
            size="medium"
            onPress={() => onOpen(curry.id)}
            testID="gallery-card-long-title"
          />
        </View>
      </View>
      <RecipeCard
        recipe={bolognese}
        image={RECIPE_IMAGES[bolognese.id]}
        size="row"
        onPress={() => onOpen(bolognese.id)}
        testID="gallery-card-row"
      />
    </View>
  );
}
