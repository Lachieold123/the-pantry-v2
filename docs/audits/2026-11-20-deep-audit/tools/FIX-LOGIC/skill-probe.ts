// FIX-LOGIC F-15: where the best hard dish lands for a confident cook, and why (score parts vs the 25th pick).
import '../L2/dev-global';
import { CATALOGUE, INGREDIENTS } from '../../../../../src/data/catalogue/catalogue';
import { explainScore, rankHome, type RankInput } from '../../../../../src/domain/suggestions/rank';
import { momentOf } from '../../../../../src/domain/suggestions/moment';
import { NO_HOME_FILTERS } from '../../../../../src/domain/suggestions/home';

const sum = (p: Readonly<Record<string, number>>) => Object.values(p).reduce((a, b) => a + b, 0);
for (const date of [new Date(2026, 10, 17, 18, 0), new Date(2026, 10, 21, 9, 0), new Date(2026, 10, 21, 17, 0)]) {
  const input: RankInput = {
    recipes: CATALOGUE,
    taste: { diet: 'everything', avoid: { options: [], custom: [] }, cuisines: [], weeknight: undefined, skill: 'confident' },
    hidden: new Set(),
    filters: NO_HOME_FILTERS,
    history: { cookLog: [], bookmarks: [], recentlyViewed: [], plannedThisWeek: new Set() },
    cupboard: [],
    index: INGREDIENTS,
    moment: momentOf(date),
    depth: 400,
  };
  const picks = rankHome(input).picks;
  const firstHard = picks.findIndex((r) => r.difficulty === 'hard');
  const hard = CATALOGUE.filter((r) => r.difficulty === 'hard')
    .map((r) => ({ r, p: explainScore(r, input, 'all') }))
    .sort((a, b) => sum(b.p) - sum(a.p))[0]!;
  const p25 = picks[24]!;
  console.log(date.toString().slice(0, 21), 'first hard at', firstHard + 1);
  console.log('  best hard', hard.r.id, hard.r.mealTypes.join('/'), hard.r.prepMinutes + hard.r.cookMinutes, 'min', sum(hard.p).toFixed(2), JSON.stringify(hard.p));
  const p = explainScore(p25, input, 'all');
  console.log('  25th', p25.id, p25.difficulty, sum(p).toFixed(2), JSON.stringify(p));
}
