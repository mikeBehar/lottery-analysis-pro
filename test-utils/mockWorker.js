// test-utils/mockWorker.js
// Utility to mock the Worker API for tests

class MockWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
  }
  postMessage(msg) {
    // Simulate ML and backtest worker responses
    if (msg.type === 'predict') {
      setTimeout(() => {
        this.onmessage?.({
          data: {
            type: 'result',
            data: { prediction: { whiteBalls: [1,2,3,4,5], powerball: 1 } }
          }
        });
      }, 10);
    } else if (msg.type === 'run') {
      setTimeout(() => {
        this.onmessage?.({
          data: {
            type: 'result',
            data: { results: [42] }
          }
        });
      }, 10);
    }
  }
  terminate() {}
  addEventListener() {}
}

module.exports = MockWorker;
