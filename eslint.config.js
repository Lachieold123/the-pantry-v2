// Lint rules that enforce the map's structure (§8) as well as code quality.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const FEATURES = ['feed', 'recipes', 'recipe', 'plan', 'cupboard', 'saved', 'cook', 'surprise', 'settings', 'editor', 'welcome', 'shell', 'dev', 'app'];

// Colour literals belong in src/ui/tokens only (map rule 8).
const noColourLiterals = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
      message: 'Use a colour token from src/ui/tokens instead of a hex value.',
    },
    {
      selector: 'Literal[value=/^rgba?\\(/]',
      message: 'Use a colour token from src/ui/tokens instead of an rgb() value.',
    },
    {
      // A store hook with no selector re-renders on every change to that store (audit PERF-1).
      selector: 'CallExpression[callee.name=/^use(Preferences|Plan|Saved|Cupboard|CookLog|MyRecipes|RecipeFilters|WelcomeBack)$/][arguments.length=0]',
      message: 'Pass a selector (or useShallow) so the component only re-renders for what it reads.',
    },
  ],
};

// UI copy uses the typographic apostrophe (’), never the straight one, so one
// sentence can't appear both ways across screens (audit F177, v1 QUAL-28).
// Comments are not checked; they are not shown to the cook.
const APOSTROPHE = "/[A-Za-z]'[A-Za-z]/";
const APOSTROPHE_MESSAGE = 'Use the curly apostrophe (’) in UI copy, not a straight one.';
const curlyApostrophes = [
  { selector: `Literal[value=${APOSTROPHE}]`, message: APOSTROPHE_MESSAGE },
  { selector: `TemplateElement[value.raw=${APOSTROPHE}]`, message: APOSTROPHE_MESSAGE },
  { selector: `JSXText[value=${APOSTROPHE}]`, message: APOSTROPHE_MESSAGE },
];

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*', 'node_modules/*', 'ios/*', 'android/*', 'coverage/*'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/ui/tokens/**'],
    rules: noColourLiterals,
  },
  {
    // One rule entry replaces another in flat config, so the colour checks are repeated here.
    files: ['src/features/**/*.{ts,tsx}', 'src/ui/**/*.{ts,tsx}'],
    ignores: ['src/ui/tokens/**', '**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-syntax': [...noColourLiterals['no-restricted-syntax'], ...curlyApostrophes] },
  },
  {
    // The domain is pure TypeScript: no React, no Expo, no storage (map §8, D-015).
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['react', 'react-native', 'react-native-*', 'expo*', '@react-native*', 'zustand*', '@/store/*', '@/ui/*', '@/features/*', '@/app/*'] }],
    },
  },
  {
    // Routes stay thin: they import feature screens, never domain logic or the store directly.
    files: ['src/app/**/*.tsx'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@/domain/*', '@/store/*', '../*'] }],
    },
  },
  // Features never import other features (map §8).
  ...FEATURES.map((feature) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: FEATURES.filter((f) => f !== feature).map((f) => `@/features/${f}/*`) },
      ],
    },
  })),
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
]);
