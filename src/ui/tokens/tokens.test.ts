import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CUISINES } from '../../domain/recipes/types';
import { CUISINE_TONES, THEMES, type ColourTokens } from './colour';
import { contrastRatio, isGreen } from './contrast';

const AA_TEXT = 4.5;
const AA_LARGE = 3;

function checkTheme(name: string, t: ColourTokens, quietRules = true) {
  const text: [keyof ColourTokens, keyof ColourTokens][] = [
    ['ink', 'bg'], ['ink', 'surface'], ['ink', 'surfaceSunken'],
    ['inkSecondary', 'bg'], ['inkSecondary', 'surface'],
    ['inkMuted', 'bg'], ['inkMuted', 'surface'],
    ['accent', 'bg'], ['accent', 'surface'],
    ['onAccent', 'accent'], ['ink', 'accentSoft'],
    ['danger', 'bg'], ['danger', 'surface'],
  ];
  for (const [fg, bg] of text) {
    const ratio = contrastRatio(t[fg], t[bg]);
    assert.ok(ratio >= AA_TEXT, `${name}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${AA_TEXT}:1`);
  }
  // Hairline rules stay quiet in the normal themes; high contrast deliberately strengthens them.
  if (quietRules) assert.ok(contrastRatio(t.rule, t.bg) < AA_LARGE, `${name}: rules should stay hairline-quiet`);
}

describe('colour tokens', () => {
  for (const [name, variants] of Object.entries(THEMES)) {
    it(`${name} passes WCAG AA for every text pair`, () => checkTheme(name, variants.normal));
    it(`${name} high contrast passes WCAG AA and is at least as strong`, () => {
      checkTheme(`${name} high contrast`, variants.highContrast, false);
      assert.ok(contrastRatio(variants.highContrast.inkMuted, variants.highContrast.bg) >= contrastRatio(variants.normal.inkMuted, variants.normal.bg));
    });
  }

  it('has a tone for every cuisine, readable on both themes, and none are green', () => {
    for (const cuisine of CUISINES) {
      const tone = CUISINE_TONES[cuisine];
      assert.ok(tone, `missing tone for ${cuisine}`);
      assert.ok(contrastRatio(tone.paper, THEMES.paper.normal.bg) >= AA_TEXT, `${cuisine} on paper`);
      assert.ok(contrastRatio(tone.night, THEMES.night.normal.bg) >= AA_TEXT, `${cuisine} on night`);
      assert.ok(!isGreen(tone.paper) && !isGreen(tone.night), `${cuisine} is green`);
    }
  });

  it('no theme colour is green', () => {
    for (const variants of Object.values(THEMES)) {
      for (const t of [variants.normal, variants.highContrast]) {
        for (const [key, value] of Object.entries(t)) if (value.startsWith('#')) assert.ok(!isGreen(value), key);
      }
    }
  });
});
