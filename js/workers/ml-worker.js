import * as utils from '../utils.js';
import * as tf from '@tensorflow/tfjs';

// First line: confirm worker script is loaded
console.log('[ML Worker] Script loaded');
// Top-level error handler for uncaught exceptions
self.onerror = function(event) {
  try {
    self.postMessage({ type: 'error', data: { message: 'Uncaught error in ML worker: ' + event.message } });
  } catch (e) {}
  // Let the error propagate to the browser as well
  return false;
};
/**
 * ML Prediction Web Worker
 * Version: 1.0.0 | Created: 2025-08-21
 * Handles machine learning predictions in background thread
 */


// Debug: Log before loading dependencies
console.log('[ML Worker] Starting worker script');

let lotteryML = null;
let shouldStop = false;

self.onmessage = async function(e) {
  if (e.data.type === 'cancel') {
    shouldStop = true;
    return;
  }

  if (!lotteryML) {
    const { default: LotteryML } = await import('../ml.js');
    await tf.ready();
    lotteryML = new LotteryML(tf);
  }
  
  const { draws, decayRate } = e.data.data;
  
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
