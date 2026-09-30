// Lint rules that enforce the map's structure (§8) as well as code quality.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const FEATURES = ['today', 'recipes', 'recipe', 'plan', 'shop', 'saved', 'cook', 'surprise', 'onboarding', 'settings', 'pro', 'dev', 'app', 'editor', 'welcome'];

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
