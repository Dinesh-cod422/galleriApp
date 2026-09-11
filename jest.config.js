module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest/setupAfterEnv.js'],
  // Path aliases must mirror tsconfig paths + babel module-resolver.
  moduleNameMapper: {
    // See jest/mocks/reanimated.js for why the library is mocked wholesale.
    '^react-native-reanimated$': '<rootDir>/jest/mocks/reanimated.js',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@ds$': '<rootDir>/src/design-system/index.ts',
    '^@ds/(.*)$': '<rootDir>/src/design-system/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@infra/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|react-native-.*|@react-navigation/.*|@shopify/flash-list|@gorhom/.*|@d11/.*)/)',
  ],
  collectCoverageFrom: [
    // Coverage is gated on logic, not on UI. Chasing component coverage
    // produces brittle tests that assert implementation details.
    'src/features/*/domain/**/*.ts',
    'src/features/*/data/**/*.ts',
    'src/core/**/*.ts',
    '!**/*.mock.ts',
    '!**/index.ts',
  ],
  coverageThreshold: {
    global: { statements: 85, branches: 75, functions: 85, lines: 85 },
  },
};
