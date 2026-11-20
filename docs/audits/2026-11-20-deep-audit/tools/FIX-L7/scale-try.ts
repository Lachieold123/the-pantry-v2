// scale-try.ts "<line>" ... : how each line parses and reads at double servings (FIX-LOGIC-DATA-TODO §1).
import { formatLine, scaleLine } from '../../../../../src/domain/ingredients/format.ts';
import { parseIngredientLine } from '../../../../../src/domain/ingredients/parse.ts';
for (const raw of process.argv.slice(2)) {
  const p = parseIngredientLine(raw).line;
  console.log(JSON.stringify(raw), '->', JSON.stringify(formatLine(scaleLine(p, 2), 'metric')), '| prep', p.prep ?? '', '| note', p.note ?? '');
}
