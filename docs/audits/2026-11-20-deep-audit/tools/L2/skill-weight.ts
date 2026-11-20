// L2: does the hand-picked skill weight (0.75) change what a beginner sees on Home? Difficulty mix in the top 25.
import './dev-global';
import { CATALOGUE, INGREDIENTS } from '../../../../../src/data/catalogue/catalogue';
import { rankHome } from '../../../../../src/domain/suggestions/rank';
import { momentOf } from '../../../../../src/domain/suggestions/moment';
import { NO_HOME_FILTERS } from '../../../../../src/domain/suggestions/home';

const mix = (ids: { difficulty: string }[]) => ids.reduce<Record<string, number>>((m, r) => ((m[r.difficulty] = (m[r.difficulty] ?? 0) + 1), m), {});
const all = mix(CATALOGUE as never);
console.log('catalogue mix', JSON.stringify(all));
for (const [label, date] of [['Tue 6pm', new Date(2026, 10, 17, 18, 0)], ['Sat 9am', new Date(2026, 10, 21, 9, 0)]] as const) {
  for (const skill of [undefined, 'starting', 'comfortable', 'confident'] as const) {
    const r = rankHome({
      recipes: CATALOGUE, taste: { diet: 'everything', avoid: { options: [], custom: [] }, cuisines: [], weeknight: undefined, skill },
      hidden: new Set(), filters: NO_HOME_FILTERS, history: { cookLog: [], bookmarks: [], recentlyViewed: [], plannedThisWeek: new Set() },
      cupboard: [], index: INGREDIENTS, moment: momentOf(date), depth: 25,
    });
    console.log(label, String(skill).padEnd(11), 'top 5', JSON.stringify(mix(r.picks.slice(0, 5))), 'top 25', JSON.stringify(mix(r.picks.slice(0, 25))));
  }
}
