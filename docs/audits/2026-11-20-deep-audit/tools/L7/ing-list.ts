import { readFileSync } from 'node:fs';
const root = '/Users/lachlanoldfield/Developer/the-pantry-v2/.claude/worktrees/audit-1120/';
const defs: any[] = JSON.parse(readFileSync(root + 'src/data/ingredients/ingredients.json', 'utf8'));
const ab: Record<string, string> = { meat: 'M', beef: 'B', pork: 'P', lamb: 'L', poultry: 'C', fish: 'F', shellfish: 'S', dairy: 'D', egg: 'E', gluten: 'G', 'tree-nuts': 'N', peanuts: 'Pn', sesame: 'Se', soy: 'Sy', 'animal-product': 'A', 'non-vegetarian': 'NV', alcohol: 'Al', chilli: 'Ch' };
const filter = process.argv[2];
const out = defs
  .filter((d) => !filter || d.aisle === filter)
  .map((d) => `${d.id}${d.groups.length ? '[' + d.groups.filter((g: string) => g !== 'chilli' && g !== 'alcohol').map((g: string) => ab[g]).join('') + ']' : ''}`);
console.log(out.join(' '));
