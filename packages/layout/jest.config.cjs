const baseConfig = require('../../jest.config.base.cjs');
const packageJson = require('./package');

module.exports = {
  ...baseConfig,
  displayName: packageJson.name,
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
};
