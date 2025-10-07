const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname),
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/services/cora.service.js',
    'src/services/token.service.js',
    'src/middlewares/auth.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'cobertura'],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 65,
      functions: 70,
      lines: 75
    },
    './src/services/cora.service.js': {
      statements: 70,
      branches: 60,
      functions: 65,
      lines: 70
    },
    './src/services/token.service.js': {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70
    },
    './src/middlewares/auth.js': {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80
    }
  },
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: '<rootDir>/coverage', outputName: 'junit.xml' }]
  ],
  moduleFileExtensions: ['js', 'json']
};
