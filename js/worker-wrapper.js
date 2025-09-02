// js/worker-wrapper.js
// Pub/Sub-based wrapper for ML and Backtest web workers
import state from './state.js';

const workerPaths = {
  ml: 'dist/ml-worker.bundle.js',
  backtest: 'dist/backtest-worker.bundle.js',
  optimization: 'dist/optimization-worker.bundle.js',
};

const workers = {};

function getWorker(type) {
  if (!workers[type]) {
    workers[type] = new Worker(workerPaths[type]);
    workers[type].onmessage = (e) => {
      const { type: eventType, data } = e.data;
      // Publish all worker messages as events
      state.publish(`${type}:${eventType}`, data);
    };
    workers[type].onerror = (err) => {
      state.publish(`${type}:error`, { message: err.message });
    };
  }
  return workers[type];
}

// Subscribe to events to send messages to workers
state.subscribe('ml:predict', (payload) => {
  getWorker('ml').postMessage({ type: 'predict', data: payload });
});

state.subscribe('backtest:run', (payload) => {
  getWorker('backtest').postMessage({ type: 'run', data: payload });
});

state.subscribe('optimization:start', (payload) => {
  getWorker('optimization').postMessage({ type: 'optimize', data: payload });
});

state.subscribe('optimization:cancel', () => {
  getWorker('optimization').postMessage({ type: 'cancel' });
});

state.subscribe('optimization:status', () => {
  getWorker('optimization').postMessage({ type: 'status' });
});

export default {
  getWorker,
};
