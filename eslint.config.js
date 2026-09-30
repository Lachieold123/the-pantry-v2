// Lint rules that enforce the map's structure (§8) as well as code quality.
// `npm run lint` passes --max-warnings 0, so a warning fails as surely as an error.
const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Read from disk, so a new feature folder is covered the day it's created.
const FEATURES = readdirSync(join(__dirname, 'src/features'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

// Layers below features. None of them may reach up into a feature or a route.
const LOWER_LAYERS = ['domain', 'lib', 'store', 'ui', 'data'];

// Shared by every src file. One list, because a later config's `no-restricted-syntax`
// replaces an earlier one's rather than adding to it.
const SRC_SYNTAX = [
  {
    // A dynamic import or require() hides a dependency from every structure rule below.
    selector: 'ImportExpression',
    message: 'Use a static import, so the structure rules can see the dependency.',
  },
  {
    selector: 'CallExpression[callee.name="require"]',
    message: 'Use a static import, so the structure rules can see the dependency.',
  },
  {
    // A store hook with no selector re-renders on every change to that store (audit PERF-1).
    selector:
      'CallExpression[callee.name=/^use(Preferences|Plan|Saved|Cupboard|CookLog|MyRecipes|RecipeFilters|WelcomeBack)$/][arguments.length=0]',
    message: 'Pass a selector (or useShallow) so the component only re-renders for what it reads.',
  },
];

// Colour literals belong in src/ui/tokens only (map rule 8).
const COLOUR_SYNTAX = [
  {
    selector: 'Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message: 'Use a colour token from src/ui/tokens instead of a hex value.',
  },
  {
    selector: 'Literal[value=/^rgba?\\(/]',
    message: 'Use a colour token from src/ui/tokens instead of an rgb() value.',
  },
];

// Any spelling of a path into another feature: alias, relative or bare. The resolver-based
// zones below catch what resolves; these catch the rest, such as a path that doesn't exist yet.
const otherFeaturePatterns = (feature) => [
  {
    regex: `(^|/)features/(?!${feature}(/|$))`,
    message: 'Features never import other features (map §8). Move shared code down to src/ui, src/lib or src/domain.',
  },
];

// UI copy uses the typographic apostrophe (’), never the straight one, so one
// sentence can't appear both ways across screens (audit F177, v1 QUAL-28).
// Comments are not checked; they are not shown to the cook.
const APOSTROPHE = "/[A-Za-z]'[A-Za-z]/";
const APOSTROPHE_MESSAGE = 'Use the curly apostrophe (’) in UI copy, not a straight one.';
// Log lines are for developers, not the cook, so logger.* arguments are exempt.
const NOT_LOG = ':not(CallExpression[callee.object.name="logger"] > Literal)';
const curlyApostrophes = [
  { selector: `Literal[value=${APOSTROPHE}]${NOT_LOG}`, message: APOSTROPHE_MESSAGE },
  { selector: `TemplateElement[value.raw=${APOSTROPHE}]`, message: APOSTROPHE_MESSAGE },
  { selector: `JSXText[value=${APOSTROPHE}]`, message: APOSTROPHE_MESSAGE },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', '.claude/*', 'node_modules/*', 'ios/*', 'android/*', 'coverage/*', 'src/data/catalogue/images.ts'],
  },
  {
    // Resolve the @/ alias, so import/no-restricted-paths sees where an import really goes.
    files: ['src/**/*.{ts,tsx}'],
    settings: { 'import/resolver': { typescript: { project: join(__dirname, 'tsconfig.json') }, node: true } },
    rules: {
      'no-restricted-syntax': ['error', ...SRC_SYNTAX, ...COLOUR_SYNTAX],
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // Lower layers never import features or routes (map §8).
            ...LOWER_LAYERS.map((layer) => ({
              target: `./src/${layer}`,
              from: ['./src/features', './src/app'],
              message: `src/${layer} sits below the features; it can't import one.`,
            })),
            // Features never import other features, however the path is spelt.
            ...FEATURES.map((feature) => ({
              target: `./src/features/${feature}`,
              from: './src/features',
              except: [`./${feature}`],
              message: 'Features never import other features (map §8).',
            })),
            // The domain is pure TypeScript: only itself (D-015).
            {
              target: './src/domain',
              from: './src',
              except: ['./domain', './data'],
              message: 'src/domain imports only other domain files and node:* (D-015).',
            },
          ],
        },
      ],
    },
  },
  {
    // Screens and UI also get the apostrophe rule. One rule entry replaces another in flat
    // config, so the shared and colour checks are repeated here.
    files: ['src/features/**/*.{ts,tsx}', 'src/ui/**/*.{ts,tsx}'],
    ignores: ['src/ui/tokens/**', '**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-syntax': ['error', ...SRC_SYNTAX, ...COLOUR_SYNTAX, ...curlyApostrophes] },
  },
  {
    // Tests may render a route or a real screen to check the wiring (e.g. the root layout's
    // cold-link anchor); the layering rules are for app code, not for the harness around it.
    files: ['src/**/*.test.{ts,tsx}'],
    rules: { 'import/no-restricted-paths': 'off' },
  },
  {
    files: ['src/ui/tokens/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': ['error', ...SRC_SYNTAX] },
  },
  {
    // The gallery is required only inside __DEV__ so it never ships in a store build (audit F75).
    files: ['src/app/dev/gallery.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...SRC_SYNTAX.slice(2), ...COLOUR_SYNTAX],
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // The domain is an allowlist, not a blocklist: relative imports and Node built-ins only
    // (map §8, D-015). Covers .tsx too, so a component can't hide in there.
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: '^(?!\\.{1,2}/|node:)', message: 'src/domain imports only relative paths and node:* (D-015).' }] },
      ],
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
    rules: { 'no-restricted-imports': ['error', { patterns: otherFeaturePatterns(feature) }] },
  })),
  {
    files: ['**/*.{ts,tsx,mts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // No @ts-ignore or @ts-nocheck; @ts-expect-error only with a reason, so it fails once it's stale.
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Config files run in Node.
    files: ['*.config.js'],
    languageOptions: { globals: { __dirname: 'readonly', module: 'writable', require: 'readonly' } },
  },
  {
    // The build and data scripts are TypeScript run by tsx; lint them like the app (audit F80).
    files: ['scripts/**/*.mts'],
    languageOptions: { parser: require('@typescript-eslint/parser'), globals: { console: 'readonly', process: 'readonly' } },
    plugins: { '@typescript-eslint': require('@typescript-eslint/eslint-plugin') },
  },
]);
