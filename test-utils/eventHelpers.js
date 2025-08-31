// test-utils/eventHelpers.js
// Utility functions to simulate pub/sub events and worker messages

const state = require('../js/state.js').default;

function publishEvent(event, data) {
  state.publish(event, data);
}

function simulateWorkerMessage(worker, type, data) {
  worker.onmessage?.({ data: { type, data } });
}

module.exports = {
  publishEvent,
  simulateWorkerMessage,
};
