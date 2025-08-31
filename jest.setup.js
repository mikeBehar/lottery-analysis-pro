// jest.setup.js
// Mock the Worker API for Jest test environment

class MockWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
    this._type = null;
  }
  postMessage(msg) {
    // Debug: log the message type
    console.log('[MockWorker] postMessage called with:', msg);
    if (msg.type === 'predict') {
      setTimeout(() => {
        if (this.onmessage) {
          console.log('[MockWorker] triggering onmessage for ML worker');
          this.onmessage({
            data: {
              type: 'result',
              data: { prediction: { whiteBalls: [1,2,3,4,5], powerball: 1 } }
            }
          });
        }
      }, 10);
    } else if (msg.type === 'run') {
      setTimeout(() => {
        if (this.onmessage) {
          console.log('[MockWorker] triggering onmessage for backtest worker');
          this.onmessage({
            data: {
              type: 'result',
              data: { results: [42] }
            }
          });
        }
      }, 10);
    }
  }
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}
global.Worker = MockWorker;
