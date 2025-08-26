/**
 * ML Prediction Web Worker
 * Version: 1.0.0 | Created: 2025-08-21
 * Handles machine learning predictions in background thread
 */

// Import all required dependencies
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js', '../utils.js', '../ml.js');

let shouldStop = false;

// Initialize ML instance
const lotteryML = new self.LotteryML();

self.onmessage = function(e) {
  if (e.data.type === 'cancel') {
    shouldStop = true;
    return;
  }
  
  const { draws, decayRate } = e.data;
  
  try {
    self.postMessage({ type: 'progress', data: { message: 'Loading ML model' } });
    
    // Train model if needed
    if (draws.length >= 50 && lotteryML.status !== 'trained') {
      self.postMessage({ type: 'progress', data: { message: 'Training model' } });
      lotteryML.trainLSTM(draws).then(() => {
        if (!shouldStop) makePrediction(draws, decayRate);
      }).catch(error => {
        throw new Error(`Training failed: ${error.message}`);
      });
    } else if (!shouldStop) {
      makePrediction(draws, decayRate);
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      data: { message: `ML prediction failed: ${error.message}` } 
    });
  }
};

// Listen for cancellation messages
self.addEventListener('message', function(e) {
  if (e.data.type === 'cancel') {
    shouldStop = true;
  }
});

function makePrediction(draws, decayRate) {
  self.postMessage({ type: 'progress', data: { message: 'Making prediction' } });
  lotteryML.predictNextNumbers(draws, decayRate).then(prediction => {
    if (shouldStop) {
      self.postMessage({ type: 'error', data: { message: 'Prediction cancelled by user.' } });
      console.log('[ML Worker] Prediction cancelled by user.');
    } else {
      self.postMessage({ type: 'result', data: { prediction } });
      console.log('[ML Worker] Prediction result posted:', prediction);
    }
  }).catch(error => {
    self.postMessage({ type: 'error', data: { message: `ML prediction failed: ${error.message}` } });
    console.error('[ML Worker] Prediction error:', error);
  });
}
