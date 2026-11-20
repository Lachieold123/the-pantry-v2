// Lane 5: WCAG ratios for the real text/border pairings found in code, both themes.
// Run: npx tsx docs/audits/2026-11-20-deep-audit/tools/L5/contrast.ts
import { FIXED, THEMES, type ColourTokens } from '../../../../../src/ui/tokens/colour';
import { composite, contrastRatio, parseColour } from '../../../../../src/ui/tokens/contrast';
import { libraryColours } from '../../../../../src/ui/tokens/library';
import { PANTRY_CATEGORY, PANTRY_CATEGORY_DARK, PANTRY_CHIP_INK, PANTRY_CHIP_INK_DARK } from '../../../../../src/ui/tokens/cuisine';

type K = keyof ColourTokens;
// [fg, bg, kind, where] kind: text (4.5) | large (3) | ui (3, borders/controls/icons)
const PAIRS: [K, K, 'text' | 'large' | 'ui', string][] = [
  ['inkMuted', 'bgSoft', 'text', 'Segmented unselected, search placeholder, chips (Segmented.tsx:36, SearchField)'],
  ['inkMuted', 'accentSoft', 'text', 'meta on amber wash (CupboardSummary, PlanChoice caption)'],
  ['inkMuted', 'raised', 'text', 'tour card meta'],
  ['inkMuted', 'tintNeutral', 'text', 'meta on neutral tile'],
  ['accentText', 'tintButter', 'text', 'amber kicker on tile'],
  ['accentDeep', 'bgSoft', 'text', 'cupboard action disabled (CupboardSummary.tsx:88) / timer chip'],
  ['accentDeep', 'bg', 'text', 'timer chip text (CookStep.tsx:45)'],
  ['inkSubtle', 'bg', 'text', 'Cook Back (first step) label, Surprise counter slash (CookFooter.tsx:27, SurpriseParts.tsx:31)'],
  ['inkSubtle', 'bg', 'large', 'Cook step numeral (CookStep.tsx:26) - decorative, hidden from a11y'],
  ['inkMuted', 'bg', 'ui', 'inactive tab icon/label (TabBar.tsx:78)'],
  ['border', 'bg', 'ui', 'every 1pt border/divider/progress track'],
  ['border', 'bgSoft', 'ui', 'border on soft fill'],
  ['border', 'card', 'ui', 'card edge'],
  ['inkSubtle', 'bg', 'ui', 'Toggle off track (Toggle.tsx:22,24), DaySlots empty-slot border (DaySlots.tsx:217), Post photo box (PostScreen.tsx:265), sheet handle'],
  ['inkSubtle', 'card', 'ui', 'sheet handle on card (Sheet.tsx:60, ModalSheet.tsx:79)'],
  ['accent', 'bg', 'ui', 'Toggle on track, progress fill, accent dots'],
  ['accent', 'bg', 'text', 'Icon colour="accent" (RecipeCard.tsx:84 on photo disc) / known failure'],
  ['bullet', 'bg', 'ui', 'ingredient bullet dot'],
  ['raisedEdge', 'bg', 'ui', 'tour card edge'],
];

const LIM = { text: 4.5, large: 3, ui: 3 } as const;
const rows: string[] = [];
const fail: string[] = [];

function check(theme: string, fg: string, bg: string, fgName: string, bgName: string, kind: keyof typeof LIM, where: string) {
  const r = contrastRatio(fg, bg);
  const line = `| ${theme} | ${fgName} \`${fg}\` | ${bgName} \`${bg}\` | ${kind} | ${r.toFixed(2)} | ${r >= LIM[kind] ? 'pass' : '**FAIL**'} | ${where} |`;
  rows.push(line);
  if (r < LIM[kind]) fail.push(line);
}

for (const [theme, v] of Object.entries(THEMES)) {
  for (const [label, t] of [[theme, v.normal], [`${theme}-HC`, v.highContrast]] as const) {
    for (const [fg, bg, kind, where] of PAIRS) check(label, t[fg], t[bg], fg, bg, kind, where);
  }
  // Library cream cards and page.
  const L = libraryColours(theme as 'light' | 'dark');
  const t = v.normal;
  check(theme, L.count, t.bg, 'LIBRARY.count', 'bg', 'text', 'italic "4 recipes" count, 15pt (countLibrary)');
  check(theme, L.meta, L.card, 'LIBRARY.meta', 'LIBRARY.card', 'text', 'card time/difficulty');
  check(theme, L.title, L.card, 'LIBRARY.title', 'LIBRARY.card', 'text', 'card title');
  check(theme, L.wellIcon, L.well, 'LIBRARY.wellIcon', 'LIBRARY.well', 'ui', 'no-photo icon');
  check(theme, L.card, t.bg, 'LIBRARY.card', 'bg', 'ui', 'card edge vs page (no border?)');
  // Cupboard jars.
  const cat = theme === 'dark' ? PANTRY_CATEGORY_DARK : PANTRY_CATEGORY;
  const ink = theme === 'dark' ? PANTRY_CHIP_INK_DARK : PANTRY_CHIP_INK;
  for (const [name, c] of Object.entries(cat)) {
    check(theme, c.bold, c.tint, `cat.${name}.bold`, 'tint', 'text', 'jar initial / x');
    check(theme, ink, c.tint, 'PANTRY_CHIP_INK', `cat.${name}.tint`, 'text', 'jar chip label');
    check(theme, c.soft, t.bg, `cat.${name}.soft`, 'bg', 'ui', 'jar line colour');
  }
}

// White text on photo scrims, worst case a white photo (gradient end stop).
const WHITE_PHOTO = '#FFFFFF';
for (const [name, a] of [['heroBottom', 0.78], ['shelfBottom', 0.75], ['feedBottom', 0.85], ['videoScrim50', 0.5]] as const) {
  const ground = composite(`rgba(0,0,0,${a})`, WHITE_PHOTO);
  const hex = '#' + [ground.r, ground.g, ground.b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
  for (const [fgName, fg] of [['onPhoto', FIXED.onPhoto], ['onPhotoMuted', FIXED.onPhotoMuted], ['onPhotoFaint', FIXED.onPhotoFaint], ['videoSub', FIXED.videoSub], ['videoQuiet', FIXED.videoQuiet]] as const) {
    check('both', fg, hex, fgName, `${name} at end stop on white photo`, 'text', 'text on photo (best case: the end stop)');
  }
}
void parseColour;

// Smallest passing change: step the fore colour toward black (on a light ground) or white
// (dark ground) 1% at a time; for an rgba border, raise its alpha 0.01 at a time.
function hex(c: { r: number; g: number; b: number }) {
  return '#' + [c.r, c.g, c.b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function solve(fg: string, bg: string, min: number): string {
  const f = parseColour(fg);
  const darkGround = contrastRatio('#000000', bg) < contrastRatio('#FFFFFF', bg);
  if (f.a < 1) {
    for (let a = f.a; a <= 1.0001; a += 0.01) {
      const c = `rgba(${f.r},${f.g},${f.b},${a.toFixed(2)})`;
      if (contrastRatio(c, bg) >= min) return `${c} (or solid ${hex(composite(c, bg))})`;
    }
    return 'alpha alone cannot pass';
  }
  const t = darkGround ? 255 : 0;
  for (let p = 0; p <= 1; p += 0.01) {
    const c = hex({ r: f.r + (t - f.r) * p, g: f.g + (t - f.g) * p, b: f.b + (t - f.b) * p });
    if (contrastRatio(c, bg) >= min) return `${c} (${Math.round(p * 100)}% toward ${darkGround ? 'white' : 'black'})`;
  }
  return 'none';
}
const SOLVE: [string, string, string, number][] = [
  ['light border', THEMES.light.normal.border, THEMES.light.normal.bg, 3],
  ['dark border', THEMES.dark.normal.border, THEMES.dark.normal.bg, 3],
  ['light inkSubtle (track/handle/slot border)', THEMES.light.normal.inkSubtle, THEMES.light.normal.bg, 3],
  ['dark inkSubtle (track/handle/slot border)', THEMES.dark.normal.inkSubtle, THEMES.dark.normal.card, 3],
  ['light accent as a control fill', THEMES.light.normal.accent, THEMES.light.normal.bg, 3],
  ['light LIBRARY.count text', libraryColours('light').count, THEMES.light.normal.bg, 4.5],
  ['dark LIBRARY.wellIcon', libraryColours('dark').wellIcon, libraryColours('dark').well, 3],
  ['light inkMuted on accentSoft', THEMES.light.normal.inkMuted, THEMES.light.normal.accentSoft, 4.5],
  ['dark raisedEdge', THEMES.dark.normal.raisedEdge, THEMES.dark.normal.bg, 3],
];
const solved = SOLVE.map(([n, fg, bg, m]) => `| ${n} | \`${fg}\` on \`${bg}\` | ${m}:1 | ${solve(fg, bg, m)} |`);

console.log('| Theme | Fore | Back | Kind | Ratio | Result | Where |\n|---|---|---|---|---|---|---|');
console.log(rows.join('\n'));
console.log(`\nFAILURES (${fail.length})\n`);
console.log(fail.join('\n'));
console.log('\nSMALLEST PASSING CHANGE\n\n| Token | Now | Needs | Smallest change |\n|---|---|---|---|');
console.log(solved.join('\n'));
