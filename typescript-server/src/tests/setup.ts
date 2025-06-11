// Jest setup file for TypeScript tests

// Mock console.log in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret-key';
process.env['REQUIRE_AUTH'] = 'false';

// Global test timeout
jest.setTimeout(10000); 