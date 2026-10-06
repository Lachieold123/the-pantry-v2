import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CUISINES } from '../../domain/recipes/types';
import { THEMES, type ColourTokens } from './colour';
import { contrastRatio } from './contrast';
import { CUISINE_FAMILY_KEYS, cuisineEyebrow } from './cuisine';
import { TYPE } from './type';

const AA_TEXT = 4.5;

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
  ['accentText', 'bg'],
  ['accentText', 'bgSoft'],
  ['accentText', 'accentSoft'],
  ['onAccent', 'accent'],
  ['danger', 'bg'],
  ['danger', 'bgSoft'],
  ['onDanger', 'danger'],
  // The tour card.
  ['ink', 'raised'],
  ['inkSoft', 'raised'],
  ['accentText', 'raised'],
];

// Pairs the original app ships below AA. They are kept so v2 looks the same (D-025) and are
// listed for the redesign. This list may only shrink: a new failing pair fails the test.
// `accent` is only for fills, rules and dots now; amber text uses `accentText`.
const KNOWN_FAILURES: readonly string[] = ['accent on bg'];
const WATCHED: [keyof ColourTokens, keyof ColourTokens][] = [
  ['accent', 'bg'],
  ['inkMuted', 'bgSoft'],
];

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
      it(`${label} fails no pair outside the known list`, () => {
        for (const [fg, bg] of WATCHED) {
          const ratio = contrastRatio(t[fg], t[bg]);
          if (ratio < AA_TEXT) assert.ok(KNOWN_FAILURES.includes(`${fg} on ${bg}`), `${label}: new failure ${fg} on ${bg}`);
        }
      });
    }
    it(`${name} high contrast is at least as strong as normal`, () => {
      assert.ok(
        contrastRatio(variants.highContrast.inkMuted, variants.highContrast.bg) >=
          contrastRatio(variants.normal.inkMuted, variants.normal.bg),
      );
    });
  }

  it('every cuisine eyebrow passes AA on every ground it sits on', () => {
    const grounds = { light: ['#FFFFFF', '#F7F7F7', '#F7F3EA'], dark: ['#0A0A0A', '#141414', '#1A1A1A', '#1C1915'] } as const;
    for (const c of CUISINES) {
      for (const ground of ['light', 'dark'] as const) {
        for (const behind of grounds[ground]) {
          const ratio = contrastRatio(cuisineEyebrow(c, ground), behind);
          assert.ok(ratio >= AA_TEXT, `${c} eyebrow on ${behind} is ${ratio.toFixed(2)}:1`);
        }
      }
    }
  });

  it('every cuisine has an eyebrow colour', () => {
    for (const c of CUISINES) {
      assert.ok(CUISINE_FAMILY_KEYS.includes(c), `no family for ${c}`);
      for (const ground of ['light', 'dark'] as const) assert.match(cuisineEyebrow(c, ground), /^#[0-9A-F]{6}$/i);
    }
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
