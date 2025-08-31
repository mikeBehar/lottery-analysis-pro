// tests/app-worker-integration.test.js
// Unit tests for app.js integration with ML and backtest workers via pub/sub
import state from '../js/state.js';
import * as app from '../js/app.js';

jest.mock('../js/ui.js'); // Mock the ui module to prevent UI-related side effects

describe('App pub/sub worker integration', () => {
  afterEach(() => {
    state.clear();
    delete state.draws; // Clear draws property
  });

  test('runAnalysis publishes mlResults after ML worker result', async () => {
    // Mock energy calculation
    global.calculateEnergy = () => [{ number: 1, energy: 1 }];
    // Provide draws
    state.draws = [{ whiteBalls: [1, 2, 3, 4, 5] }];

    // Promise to wait for the final result
    const mlResultsPromise = new Promise(resolve => {
      state.subscribe('mlResults', data => resolve(data));
    });

    // Subscribe to the event that triggers the worker and mock the worker's response
    state.subscribe('ml:predict', () => {
      // Simulate worker sending a result back
      state.publish('ml:result', {
        prediction: { whiteBalls: [1, 2, 3, 4, 5], powerball: 1 }
      });
    });

    app.runAnalysis(); // This will now trigger the mock above

    const mlResults = await mlResultsPromise;

    expect(mlResults.whiteBalls).toEqual([1, 2, 3, 4, 5]);
    expect(mlResults.powerball).toBe(1);
  });

  test('runBacktest publishes backtestResults after worker result', async () => {
    state.draws = [{ whiteBalls: [1, 2, 3, 4, 5] }];

    const backtestResultsPromise = new Promise(resolve => {
      state.subscribe('backtestResults', data => resolve(data));
    });

    // Mock the worker response for backtest
    state.subscribe('backtest:run', () => {
      state.publish('backtest:result', { results: [42] });
    });

    app.runBacktest();

    const results = await backtestResultsPromise;

    expect(results).toEqual([42]);
  });
});
