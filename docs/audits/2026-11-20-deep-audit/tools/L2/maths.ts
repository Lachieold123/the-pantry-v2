// L2: re-run the kitchen maths on awkward inputs (prompt section 6, lane 2).
import { parseIngredientLine } from '../../../../../src/domain/ingredients/parse';
import { formatLine, scaleLine } from '../../../../../src/domain/ingredients/format';
import { mergeAmounts } from '../../../../../src/domain/shopping/amounts';
import { splitStepTimers } from '../../../../../src/domain/cook/cook';
import { formatCountdown } from '../../../../../src/domain/cook/timers';

const lines = [
  '0.33 cup milk', '1/3 cup milk', '1 x 400 g tin chopped tomatoes', '1 x 400g tin chickpeas', '2 x 400 g tins tomatoes',
  '1,500 g potatoes', '1.5 kg potatoes', '1,5 kg potatoes', '2 to 3 garlic cloves', '2-3 tbsp oil', 'a pinch of salt',
  'pinch salt', '1/8 tsp cayenne', '½ tsp salt', '3 large onions', '1 egg', '0 eggs', '-2 eggs', '1000000 g flour',
  '1 1/2 cups flour', '1½ cups flour', '250ml milk', '2 cups (500 ml) stock', 'salt and pepper, to taste', '🍅 2 tomatoes',
  '1 lemon, juiced', 'juice of 1 lemon', '400 g can coconut milk', '1 (400 g) can beans', '12 oz pasta', '3/0 cup sugar',
];
const ratios: [string, number][] = [['x1', 1], ['4->1', 0.25], ['4->12', 3], ['4->3', 0.75]];
for (const raw of lines) {
  const { line, issues } = parseIngredientLine(raw);
  const cells = ratios.map(([name, r]) => {
    try { return `${name}: ${formatLine(scaleLine(line, r), 'metric')} | imp ${formatLine(scaleLine(line, r), 'imperial')}`; } catch (e) { return `${name}: THROW ${(e as Error).message}`; }
  });
  console.log(JSON.stringify(raw), '=>', JSON.stringify({ q: line.quantity, u: line.unit, item: line.item, note: line.note }), issues.join(','));
  for (const c of cells) console.log('    ', c);
}

console.log('\n--- merging on the list ---');
const P = (s: string) => parseIngredientLine(s).line;
const merges: string[][] = [
  ['1 tbsp oil', '2 tsp oil'], ['1 cup flour', '100 g flour'], ['2 cloves garlic', '1 tsp garlic'], ['1 tin tomatoes', '400 g tomatoes'],
  ['2 eggs', '1 egg'], ['500 ml stock', '1 l stock'], ['2-3 tbsp oil', '1 tbsp oil'], ['1 onion', '1 clove onion'], ['½ cup milk', '¼ cup milk', '2 tbsp milk'],
];
for (const m of merges) console.log(m.join(' + '), '=>', JSON.stringify(mergeAmounts(m.map(P))));

console.log('\n--- timers ---');
const steps = [
  'Simmer for 10 minutes, then rest for 10 minutes.', 'Bake 1 hour 30 minutes.', 'Cook 1½ hours.', 'Cook 8–10 mins.', 'Roast for 1 1/2 hours.',
  'Boil 30 seconds.', 'Marinate for 2 hours.', 'Keeps for 3 days.', 'Bake for 5 hours.', 'Cook for 90 minutes', 'Cook for 2 hrs 15 mins',
  'Cook for 1 hour and 15 minutes.', 'Leave 10-15 min.', 'Rest 0 minutes', 'Cook 1.5 hrs', 'Fry 3 to 4 minutes per side',
  'Cook for 1 hr, 20 mins', 'Cook for 45 min to 1 hour', 'Chill for at least 30 minutes', 'Microwave 1 minute 30 seconds',
];
for (const s of steps) console.log(JSON.stringify(s), '=>', JSON.stringify(splitStepTimers(s).filter((x) => x.type === 'timer')));
console.log('countdown', [0, 59, 60, 3599, 3600, 5400, -5].map((n) => `${n}=${formatCountdown(n)}`).join(' '));
