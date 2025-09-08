// Set environment to test
process.env.NODE_ENV = 'test';

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock node-zpl module to avoid ES Modules issues
jest.mock('node-zpl', () => require('../__mocks__/node-zpl'));
