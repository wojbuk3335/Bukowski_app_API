module.exports = {
  moduleNameMapping: {
    'react-barcode': '<rootDir>/__mocks__/react-barcode.js'
  },
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleFileExtensions: ['js', 'json', 'jsx'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  }
};