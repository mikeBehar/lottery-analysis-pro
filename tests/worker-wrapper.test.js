import workerWrapper from '../js/worker-wrapper.js';
// tests/worker-wrapper.test.js
// Unit tests for the pub/sub worker wrapper integration
import state from '../js/state.js';

describe('Worker Wrapper Pub/Sub Integration', () => {
  jest.setTimeout(10000); // Increase timeout for async worker tests
  afterEach(() => {
    state.clear();
  });


  test('publishes ml:result event when ML worker responds', done => {
    state.subscribe('ml:result', (data) => {
      expect(data.prediction.whiteBalls).toEqual([1,2,3,4,5]);
      expect(data.prediction.powerball).toBe(1);
      done();
    });
    state.publish('ml:predict', { draws: [{ whiteBalls: [1,2,3,4,5] }] });
  });


  test('publishes backtest:result event when backtest worker responds', done => {
    // Get the mock backtest worker
    const backtestWorker = workerWrapper.getWorker('backtest');
    state.subscribe('backtest:result', (data) => {
      expect(data.results).toEqual([42]);
      done();
    });
    // Directly call postMessage to simulate the event
    backtestWorker.postMessage({ type: 'run', data: { draws: [{ whiteBalls: [1,2,3,4,5] }], settings: {} } });
  });
});
