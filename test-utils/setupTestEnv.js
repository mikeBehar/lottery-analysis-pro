// test-utils/setupTestEnv.js
// Global test setup for Jest

// Mock browser APIs
global.alert = jest.fn();
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Optionally, mock other global objects or modules here

// Example: Register MockWorker globally
// const MockWorker = require('./mockWorker');
// global.Worker = MockWorker;
