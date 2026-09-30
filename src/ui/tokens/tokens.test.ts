import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CUISINES } from '../../domain/recipes/types';
import { THEMES, type ColourTokens } from './colour';
import { contrastRatio, fadedContrast } from './contrast';
import { cuisineEyebrow, cuisineTint } from './cuisine';
import { TYPE } from './type';

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

// Text pairs every theme must pass.
const MUST_PASS: [keyof ColourTokens, keyof ColourTokens][] = [
  ['ink', 'bg'],
  ['ink', 'card'],
  ['ink', 'bgSoft'],
  ['bg', 'ink'],
  ['inkSoft', 'bg'],
  ['inkSoft', 'bgSoft'],
  ['inkMuted', 'bg'],
  ['accentDeep', 'accentSoft'],
];

// Every real text/background pair on screen, and the ratio it needs (3 for non-text parts
// like a switch track). Token pairs first, then pairs built from fixed colours or opacity.
type Measured = { ratio: number; need: number; token: boolean };
const TOKEN_PAIRS: [keyof ColourTokens, keyof ColourTokens, number, string][] = [
  ['accent', 'bg', AA_TEXT, 'accent kickers'],
  ['accent', 'bgSoft', AA_TEXT, 'adjusted servings tile'],
  ['onAccent', 'accent', AA_TEXT, 'Plan badge, Cooked pill, Time’s up'],
  ['danger', 'bg', AA_TEXT, 'field errors, editor problems'],
  ['danger', 'bgSoft', AA_TEXT, 'Delete and Discard buttons'],
  ['onDanger', 'danger', AA_TEXT, 'text on a danger fill'],
  ['inkSubtle', 'bg', AA_TEXT, 'ticked ingredients'],
  ['inkMuted', 'bgSoft', AA_TEXT, 'placeholders, unselected segments'],
  ['inkMuted', 'card', AA_TEXT, 'meta on cards'],
  ['switchTrackOff', 'bg', AA_NON_TEXT, 'switch off'],
  ['switchTrackOff', 'bgSoft', AA_NON_TEXT, 'switch off on Settings'],
];
// Plan rows for past days are drawn at this opacity (DaySlots).
const PAST_ROW_OPACITY = 0.6;

function measure(t: ColourTokens): Record<string, Measured> {
  const out: Record<string, Measured> = {};
  for (const [fg, bg, need] of TOKEN_PAIRS) out[`${fg} on ${bg}`] = { ratio: contrastRatio(t[fg], t[bg]), need, token: true };
  out['past plan row meta'] = { ratio: fadedContrast(t.inkMuted, t.bg, PAST_ROW_OPACITY), need: AA_TEXT, token: false };
  out['past plan row title'] = { ratio: fadedContrast(t.ink, t.bg, PAST_ROW_OPACITY), need: AA_TEXT, token: false };
  for (const c of CUISINES)
    out[`eyebrow ${cuisineEyebrow(c)}`] = { ratio: contrastRatio(cuisineEyebrow(c), t.card), need: AA_TEXT, token: false };
  return out;
}

// Pairs that ship below what they need, per theme, with the ratio each has today (rounded
// down). In the normal themes these are the original app's colours, kept so v2 looks the same
// (D-025) and listed for the redesign. A pair may not get worse than its floor, and a pair that
// starts passing fails until it is taken off, so the list only ever shrinks.
// High contrast is v2's own: none of its token pairs may fail; only the fixed cuisine colours
// and faded rows, which don't come from the theme, are still listed.
const KNOWN_FAILURES: Record<string, Record<string, number>> = {
  light: {
    'accent on bg': 2.73,
    'accent on bgSoft': 2.55,
    'onAccent on accent': 2.73,
    'danger on bg': 3.79,
    'danger on bgSoft': 3.54,
    'onDanger on danger': 3.79,
    'inkSubtle on bg': 1.89,
    'switchTrackOff on bg': 1.07,
    'switchTrackOff on bgSoft': 1.0,
    'past plan row meta': 2.37,
    'eyebrow #7C6FB8': 4.35,
    'eyebrow #8A6FB0': 4.21,
    'eyebrow #3D9E82': 3.27,
    'eyebrow #B88E47': 3.0,
    'eyebrow #C66A3C': 3.79,
    'eyebrow #3D9C6E': 3.39,
    'eyebrow #C87838': 3.38,
  },
  'light high contrast': {
    'past plan row meta': 3.64,
    'eyebrow #7C6FB8': 4.35,
    'eyebrow #8A6FB0': 4.21,
    'eyebrow #3D9E82': 3.27,
    'eyebrow #B88E47': 3.0,
    'eyebrow #C66A3C': 3.79,
    'eyebrow #3D9C6E': 3.39,
    'eyebrow #C87838': 3.38,
  },
  dark: {
    'onAccent on accent': 2.03,
    'onDanger on danger': 2.77,
    'inkSubtle on bg': 2.16,
    'switchTrackOff on bg': 1.07,
    'switchTrackOff on bgSoft': 1.0,
    'past plan row meta': 3.07,
    'eyebrow #B85A3D': 4.0,
    'eyebrow #7C6FB8': 4.23,
    'eyebrow #8A6FB0': 4.36,
    'eyebrow #B05060': 3.65,
    'eyebrow #C04A38': 3.75,
  },
  'dark high contrast': {
    'eyebrow #B05060': 4.16,
    'eyebrow #C04A38': 4.27,
  },
};

describe('colour tokens', () => {
  for (const [name, variants] of Object.entries(THEMES)) {
    for (const [label, t] of [
      [name, variants.normal],
      [`${name} high contrast`, variants.highContrast],
    ] as const) {
      it(`${label} passes WCAG AA for core text`, () => {
        for (const [fg, bg] of MUST_PASS) {
          const ratio = contrastRatio(t[fg], t[bg]);
          assert.ok(ratio >= AA_TEXT, `${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
        }
      });
      it(`${label} fails no watched pair outside its known list, and none gets worse`, () => {
        const known = KNOWN_FAILURES[label] ?? {};
        for (const [pair, { ratio, need }] of Object.entries(measure(t))) {
          const floor = known[pair];
          if (ratio >= need) {
            assert.equal(floor, undefined, `${label}: ${pair} now passes (${ratio.toFixed(2)}:1); take it off the known list`);
          } else {
            assert.ok(floor !== undefined, `${label}: new failure ${pair} at ${ratio.toFixed(2)}:1`);
            assert.ok(ratio >= floor, `${label}: ${pair} got worse, ${ratio.toFixed(2)}:1 is under its ${floor}:1 floor`);
          }
        }
        for (const pair of Object.keys(known)) assert.ok(pair in measure(t), `${label}: ${pair} is listed but not measured`);
      });
    }
    it(`${name} high contrast fails no token pair`, () => {
      for (const [pair, m] of Object.entries(measure(variants.highContrast))) {
        if (m.token) assert.ok(m.ratio >= m.need, `${name} high contrast: ${pair} is ${m.ratio.toFixed(2)}:1`);
      }
    });
    it(`${name} high contrast is at least as strong as normal`, () => {
      assert.ok(
        contrastRatio(variants.highContrast.inkMuted, variants.highContrast.bg) >=
          contrastRatio(variants.normal.inkMuted, variants.normal.bg),
      );
    });
  }

  it('every cuisine has its own family colours, and only unmapped ones fall back', () => {
    const fallback = { eyebrow: cuisineEyebrow('not-a-cuisine'), tint: cuisineTint('not-a-cuisine') };
    assert.equal(fallback.tint, 'tintNeutral');
    for (const c of CUISINES) {
      assert.match(cuisineEyebrow(c), /^#[0-9A-F]{6}$/i);
      assert.ok(cuisineTint(c) in THEMES.light.normal, `${c} tint is not a colour token`);
    }
    // Most cuisines belong to a real family; if they all fell back, the map would be broken.
    assert.ok(CUISINES.filter((c) => cuisineTint(c) !== 'tintNeutral').length > CUISINES.length / 2);
  });
});

describe('contrast maths', () => {
  it('reads short hex the same as long hex', () => {
    assert.equal(contrastRatio('#FFF', '#000'), contrastRatio('#FFFFFF', '#000000'));
    assert.equal(Math.round(contrastRatio('#FFF', '#000') * 10) / 10, 21);
  });
  it('refuses a translucent background rather than inventing a ratio', () => {
    assert.throws(() => contrastRatio('#000000', 'rgba(255,255,255,0.5)'), /translucent/);
  });
  it('fades text towards its surface', () => {
    assert.ok(fadedContrast('#000000', '#FFFFFF', 0.6) < contrastRatio('#000000', '#FFFFFF'));
    assert.equal(fadedContrast('#000000', '#FFFFFF', 1), contrastRatio('#000000', '#FFFFFF'));
  });
});

describe('type tokens', () => {
  it('serif text uses only weights Georgia has, so iOS renders what we specify', () => {
    for (const [name, t] of Object.entries(TYPE)) {
      if (t.family === 'serif') assert.ok(t.weight === '400' || t.weight === '700', `${name} is serif ${t.weight}`);
    }
  });
  it('line heights are never tighter than the font size', () => {
    for (const [name, t] of Object.entries(TYPE)) {
      if ('lineHeight' in t && t.lineHeight !== undefined) assert.ok(t.lineHeight >= t.size, name);
    }
  });
});
