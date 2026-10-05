// Lint rules that enforce the map's structure (§8) as well as code quality.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const FEATURES = ['feed', 'recipes', 'recipe', 'plan', 'cupboard', 'saved', 'cook', 'surprise', 'settings', 'editor', 'welcome', 'shell', 'dev', 'app', 'shopping', 'plates', 'tour', 'pro'];

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

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*', 'node_modules/*', 'ios/*', 'android/*', 'coverage/*'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/ui/tokens/**'],
    rules: noColourLiterals,
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
