/**
 * Jest test setup file
 * Configures global test environment and mocks
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';
process.env.GOOGLE_SERVICE_ACCOUNT_KEY = 'dGVzdC1jcmVkZW50aWFscw=='; // base64 encoded "test-credentials"

// Global test timeout
jest.setTimeout(30000);

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock DOM methods for frontend tests (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000'
    },
    writable: true
  });
}

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});