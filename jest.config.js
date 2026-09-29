// Jest runs component tests (*.test.tsx). Pure logic in src/domain and the
// design tokens use Node's built-in runner instead (D-015), via `npm run test:domain`.
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/*.test.tsx'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
