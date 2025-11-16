// Set environment to test
process.env.NODE_ENV = 'test';

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock node-zpl module to avoid ES Modules issues
jest.mock('node-zpl', () => require('../__mocks__/node-zpl'));

// Mock setInterval to prevent timers in tests
const originalSetInterval = global.setInterval;
global.setInterval = jest.fn((callback, delay) => {
  if (process.env.NODE_ENV === 'test') {
    // In test environment, don't actually set intervals
    return { unref: jest.fn() };
  }
  return originalSetInterval(callback, delay);
});

// Global cleanup after each test
afterEach(() => {
  jest.clearAllTimers();
});
