export default {
    testEnvironment: 'node',
    transform: {},
    transformIgnorePatterns: [
      'node_modules/(?!uuid|socket.io-client)/'
    ],
    setupFilesAfterEnv: ['./jest.setup.js'],
    moduleFileExtensions: ['js', 'mjs'],
    testMatch: ['**/*.test.js'],
    collectCoverage: true,
    coverageReporters: ['text', 'lcov'],
    coverageDirectory: 'coverage',
  };