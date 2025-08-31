// test-utils/mockUI.js
// Utility to mock UI modules (alert, showError, etc.) for tests

// Mock window.alert
global.alert = jest.fn();

// Mock showError and other UI functions as needed
module.exports = {
  showError: jest.fn(),
  // Add more UI mocks as needed
};
