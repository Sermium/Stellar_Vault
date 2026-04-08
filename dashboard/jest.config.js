module.exports = {
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@stellar/stellar-sdk|@stellar/freighter-api)/)'
  ],
  moduleNameMapper: {
    '^axios$': 'axios/dist/node/axios.cjs'
  },
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  }
};