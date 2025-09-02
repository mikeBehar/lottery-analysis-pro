/**
 * Optimization Web Worker
 * Handles parameter optimization tasks in background thread
 * Version: 1.0.0 | Created: 2025-09-02
 */

import { OptimizationEngine } from '../optimization-engine.js';

let currentOptimization = null;
let shouldStop = false;

// Top-level error handler
self.onerror = function(event) {
  try {
    self.postMessage({ 
      type: 'error', 
      data: { message: 'Uncaught error in optimization worker: ' + event.message } 
    });
  } catch (e) {
    console.error('Worker error handler failed:', e);
  }
  return false;
};

console.log('[Optimization Worker] Script loaded and ready');

self.onmessage = async function(e) {
  const { type, data } = e.data;

  try {
    switch (type) {
      case 'optimize':
        await handleOptimization(data);
        break;
        
      case 'cancel':
        handleCancellation();
        break;
        
      case 'status':
        handleStatusRequest();
        break;
        
      default:
        self.postMessage({
          type: 'error',
          data: { message: `Unknown message type: ${type}` }
        });
    }
  } catch (error) {
    console.error('[Optimization Worker] Error handling message:', error);
    self.postMessage({
      type: 'error',
      data: { 
        message: `Worker error: ${error.message}`,
        stack: error.stack
      }
    });
  }
};

/**
 * Handle optimization request
 */
async function handleOptimization(data) {
  if (currentOptimization && currentOptimization.isRunning) {
    self.postMessage({
      type: 'error',
      data: { message: 'Optimization already in progress' }
    });
    return;
  }

  shouldStop = false;
  
  try {
    const { historicalData, optimizationType, searchParams } = data;
    
    if (!historicalData || !Array.isArray(historicalData)) {
      throw new Error('Invalid historical data provided');
    }

    if (historicalData.length < 50) {
      throw new Error('Insufficient historical data (minimum 50 draws required)');
    }

    console.log(`[Optimization Worker] Starting ${optimizationType} optimization with ${historicalData.length} draws`);
    
    // Create optimization engine
    currentOptimization = new OptimizationEngine(optimizationType);
    
    // Override progress reporting to send messages to main thread
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      originalConsoleLog(...args);
      if (args[0] && args[0].includes('progress:')) {
        self.postMessage({
          type: 'progress',
          data: { message: args[0] }
        });
      }
    };

    // Set up progress monitoring
    const progressInterval = setInterval(() => {
      if (shouldStop) {
        clearInterval(progressInterval);
        self.postMessage({
          type: 'cancelled',
          data: { message: 'Optimization cancelled by user' }
        });
        return;
      }
      
      const status = currentOptimization.getStatus();
      self.postMessage({
        type: 'progress',
        data: {
          message: `Processing... (${status.resultsCount} iterations completed)`,
          iteration: status.resultsCount,
          isRunning: status.isRunning
        }
      });
    }, 1000);

    // Run optimization
    self.postMessage({
      type: 'started',
      data: { 
        message: `Starting ${optimizationType} optimization...`,
        type: optimizationType,
        dataSize: historicalData.length
      }
    });

    const results = await currentOptimization.optimize(historicalData, {
      method: searchParams.method || 'random',
      iterations: searchParams.iterations || 100,
      crossValidationFolds: searchParams.crossValidationFolds || 5,
      ...searchParams
    });

    clearInterval(progressInterval);
    console.log = originalConsoleLog; // Restore original console.log

    if (shouldStop) {
      self.postMessage({
        type: 'cancelled',
        data: { message: 'Optimization cancelled before completion' }
      });
      return;
    }

    // Send successful results
    self.postMessage({
      type: 'complete',
      data: {
        results: results,
        message: `${optimizationType} optimization completed successfully`,
        duration: results.duration,
        bestParams: results.bestParams,
        improvement: results.improvement
      }
    });

    console.log(`[Optimization Worker] ${optimizationType} optimization completed`);
    
  } catch (error) {
    console.error('[Optimization Worker] Optimization failed:', error);
    self.postMessage({
      type: 'error',
      data: {
        message: `Optimization failed: ${error.message}`,
        error: error.stack
      }
    });
  } finally {
    currentOptimization = null;
  }
}

/**
 * Handle cancellation request
 */
function handleCancellation() {
  console.log('[Optimization Worker] Cancellation requested');
  shouldStop = true;
  
  if (currentOptimization) {
    // The optimization engine will check shouldStop flag
    console.log('[Optimization Worker] Stopping current optimization...');
  }
  
  self.postMessage({
    type: 'cancelled',
    data: { message: 'Optimization cancellation initiated' }
  });
}

/**
 * Handle status request
 */
function handleStatusRequest() {
  const status = {
    isRunning: currentOptimization ? currentOptimization.isRunning : false,
    currentType: currentOptimization ? currentOptimization.type : null,
    resultsCount: currentOptimization ? currentOptimization.results.length : 0,
    shouldStop: shouldStop
  };
  
  self.postMessage({
    type: 'status',
    data: status
  });
}

// Enhanced error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', function(event) {
  console.error('[Optimization Worker] Unhandled promise rejection:', event.reason);
  self.postMessage({
    type: 'error',
    data: {
      message: `Unhandled promise rejection: ${event.reason}`,
      type: 'unhandledRejection'
    }
  });
});

console.log('[Optimization Worker] Initialized and ready for optimization tasks');