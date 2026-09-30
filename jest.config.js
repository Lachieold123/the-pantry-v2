// Jest runs component tests (*.test.tsx). Every *.test.ts (pure logic, tokens,
// lib) uses Node's built-in runner instead (D-015), via `npm run test:domain`.
// `npm run test:runners` fails if a test file matches neither.
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/*.test.tsx'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
