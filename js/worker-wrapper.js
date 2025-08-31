// js/worker-wrapper.js
// Pub/Sub-based wrapper for ML and Backtest web workers
import state from './state.js';

const workerPaths = {
  ml: 'js/workers/ml-worker.js',
  backtest: 'js/workers/backtest-worker.js',
};

const workers = {};

function getWorker(type) {
  if (!workers[type]) {
    workers[type] = new Worker(workerPaths[type], { type: 'module' });
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

export default {
  getWorker,
};
