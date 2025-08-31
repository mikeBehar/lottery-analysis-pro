# Test Utilities

Reusable helpers and mocks for robust, maintainable tests.

## Utilities

- `mockWorker.js`: Mock implementation of the Worker API for simulating ML and backtest workers.
- `mockUI.js`: Mocks for UI functions (e.g., `alert`, `showError`).
- `testDataFactory.js`: Factories for generating test data (draws, predictions, etc.).
- `eventHelpers.js`: Helpers to publish events and simulate worker messages.

---

## How to Use

### 1. Mocking Workers
```js
const MockWorker = require('../test-utils/mockWorker');
global.Worker = MockWorker;
```

### 2. Mocking UI
```js
const mockUI = require('../test-utils/mockUI');
mockUI.showError.mockImplementation((msg) => {/* custom logic */});
```

### 3. Generating Test Data
```js
const { makeDraw, makePrediction } = require('../test-utils/testDataFactory');
const draw = makeDraw({ whiteBalls: [10, 20, 30, 40, 50] });
```

### 4. Simulating Events
```js
const { publishEvent, simulateWorkerMessage } = require('../test-utils/eventHelpers');
publishEvent('ml:predict', { draws: [draw] });
simulateWorkerMessage(worker, 'result', { prediction: { whiteBalls: [1,2,3,4,5], powerball: 1 } });
```

---

**Tip:**
- Import these utilities in your test files or global setup to reduce boilerplate and improve test reliability.
