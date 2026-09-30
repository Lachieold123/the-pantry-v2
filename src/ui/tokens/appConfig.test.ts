// app.json can't import the tokens, so the launch colours are copies. This keeps
// them honest: a cold start should fade into the same background the app draws.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { THEMES } from './colour';

type SplashConfig = { backgroundColor?: string; dark?: { backgroundColor?: string } };
type AppJson = { expo: { backgroundColor?: string; plugins?: (string | [string, unknown])[] } };

const app = JSON.parse(readFileSync(new URL('../../../app.json', import.meta.url), 'utf8')) as AppJson;
const splashEntry = app.expo.plugins?.find((p): p is [string, unknown] => Array.isArray(p) && p[0] === 'expo-splash-screen');
const splash = splashEntry?.[1] as SplashConfig | undefined;

describe('app.json launch colours', () => {
  it('the splash background matches the light bg token', () => {
    assert.equal(splash?.backgroundColor?.toUpperCase(), THEMES.light.normal.bg.toUpperCase());
  });
  it('the dark splash background matches the dark bg token', () => {
    assert.equal(splash?.dark?.backgroundColor?.toUpperCase(), THEMES.dark.normal.bg.toUpperCase());
  });
  it('the root background matches the light bg token', () => {
    assert.equal(app.expo.backgroundColor?.toUpperCase(), THEMES.light.normal.bg.toUpperCase());
  });
});
