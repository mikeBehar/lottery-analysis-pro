// test-utils/testDataFactory.js
// Utility to generate test data for draws, predictions, etc.

function makeDraw(overrides = {}) {
  return {
    whiteBalls: [1, 2, 3, 4, 5],
    powerball: 1,
    date: '2025-08-30',
    ...overrides,
  };
}

function makePrediction(overrides = {}) {
  return {
    whiteBalls: [1, 2, 3, 4, 5],
    powerball: 1,
    ...overrides,
  };
}

module.exports = {
  makeDraw,
  makePrediction,
};
