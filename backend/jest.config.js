module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'models/**/*.js',
    'middlewares/**/*.js',
    'utils/**/*.js',
    '!utils/seeder.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/unit/models/'  // Skip MongoDB model tests (production uses DynamoDB)
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
