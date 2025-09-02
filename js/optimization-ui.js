/**
 * OPTIMIZATION UI CONTROLLER
 * Handles user interactions and displays for parameter optimization
 * Version: 1.0.0 | Created: 2025-09-02
 */

import state from './state.js';
import { showNotification, showError, showSuccess, showInfo } from './notifications.js';
import { createElement, setContent } from './dom-helpers.js';

let currentOptimization = null;
let optimizationProgress = null;

/**
 * Initialize optimization UI and event listeners
 */
export function initOptimizationUI() {
  const optimizeOffsetsBtn = document.getElementById('optimize-offsets');
  const optimizeWeightsBtn = document.getElementById('optimize-weights');  
  const optimizeHybridBtn = document.getElementById('optimize-hybrid');
  const cancelBtn = document.getElementById('cancel-optimization');

  // Add event listeners
  if (optimizeOffsetsBtn) {
    optimizeOffsetsBtn.addEventListener('click', () => startOptimization('offsets'));
  }
  
  if (optimizeWeightsBtn) {
    optimizeWeightsBtn.addEventListener('click', () => startOptimization('weights'));
  }
  
  if (optimizeHybridBtn) {
    optimizeHybridBtn.addEventListener('click', () => startOptimization('hybrid'));
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelOptimization);
  }

  // Subscribe to optimization events
  state.subscribe('optimization:started', handleOptimizationStarted);
  state.subscribe('optimization:progress', handleOptimizationProgress);
  state.subscribe('optimization:complete', handleOptimizationComplete);
  state.subscribe('optimization:cancelled', handleOptimizationCancelled);
  state.subscribe('optimization:error', handleOptimizationError);

  console.log('[Optimization UI] Initialized successfully');
}

/**
 * Start optimization process
 * @param {string} type - Type of optimization ('offsets', 'weights', 'hybrid')
 */
function startOptimization(type) {
  if (currentOptimization) {
    showError('Optimization Running', 'An optimization is already in progress');
    return;
  }

  if (!state.draws || state.draws.length < 50) {
    showError('Insufficient Data', 'Please upload a CSV file with at least 50 historical draws');
    return;
  }

  // Get user settings
  const iterations = parseInt(document.getElementById('optimization-iterations').value) || 100;
  const method = document.getElementById('optimization-method').value || 'random';

  if (iterations < 10 || iterations > 1000) {
    showError('Invalid Settings', 'Iterations must be between 10 and 1000');
    return;
  }

  currentOptimization = {
    type: type,
    startTime: Date.now(),
    settings: { iterations, method }
  };

  // Update UI state
  setOptimizationRunningState(true);
  showOptimizationProgress(`Starting ${type} optimization...`, 0);

  // Clear previous results
  const resultsContainer = document.getElementById('optimization-results');
  if (resultsContainer) {
    resultsContainer.innerHTML = '';
  }

  showInfo('Optimization Started', `${getOptimizationTypeLabel(type)} optimization started with ${iterations} iterations`);

  // Send optimization request to worker
  state.publish('optimization:start', {
    historicalData: state.draws,
    optimizationType: type,
    searchParams: {
      method: method,
      iterations: iterations,
      crossValidationFolds: 5
    }
  });
}

/**
 * Cancel current optimization
 */
function cancelOptimization() {
  if (!currentOptimization) {
    return;
  }

  showInfo('Cancelling', 'Stopping optimization...');
  state.publish('optimization:cancel');
}

/**
 * Handle optimization started event
 */
function handleOptimizationStarted(data) {
  console.log('[Optimization UI] Optimization started:', data);
  showOptimizationProgress(data.message, 0);
}

/**
 * Handle optimization progress updates
 */
function handleOptimizationProgress(data) {
  console.log('[Optimization UI] Progress:', data);
  
  if (data.iteration && currentOptimization) {
    const progress = (data.iteration / currentOptimization.settings.iterations) * 100;
    showOptimizationProgress(data.message, progress);
  } else {
    showOptimizationProgress(data.message, null);
  }
}

/**
 * Handle optimization completion
 */
function handleOptimizationComplete(data) {
  console.log('[Optimization UI] Optimization complete:', data);
  
  const duration = currentOptimization ? (Date.now() - currentOptimization.startTime) / 1000 : 0;
  
  hideOptimizationProgress();
  setOptimizationRunningState(false);
  displayOptimizationResults(data.results, duration);
  
  showSuccess('Optimization Complete', `${getOptimizationTypeLabel(data.results.type)} optimization completed successfully`);
  
  currentOptimization = null;
}

/**
 * Handle optimization cancellation
 */
function handleOptimizationCancelled(data) {
  console.log('[Optimization UI] Optimization cancelled:', data);
  
  hideOptimizationProgress();
  setOptimizationRunningState(false);
  showInfo('Cancelled', 'Optimization was cancelled');
  
  currentOptimization = null;
}

/**
 * Handle optimization errors
 */
function handleOptimizationError(data) {
  console.error('[Optimization UI] Optimization error:', data);
  
  hideOptimizationProgress();
  setOptimizationRunningState(false);
  showError('Optimization Failed', data.message || 'An unknown error occurred');
  
  currentOptimization = null;
}

/**
 * Set UI state for optimization running/stopped
 */
function setOptimizationRunningState(running) {
  const optimizationBtns = document.querySelectorAll('.optimization-btn');
  const cancelBtn = document.getElementById('cancel-optimization');
  
  optimizationBtns.forEach(btn => {
    btn.disabled = running;
  });
  
  if (cancelBtn) {
    cancelBtn.style.display = running ? 'inline-block' : 'none';
  }
}

/**
 * Show optimization progress
 */
function showOptimizationProgress(message, progress = null) {
  const progressContainer = document.getElementById('optimization-progress');
  if (!progressContainer) return;

  progressContainer.style.display = 'block';
  
  let progressBarHtml = '';
  if (progress !== null) {
    progressBarHtml = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
    `;
  }

  progressContainer.innerHTML = `
    <div class="progress-text">${message}</div>
    ${progressBarHtml}
    <div class="progress-details">
      ${progress !== null ? `Progress: ${progress.toFixed(1)}%` : 'Processing...'}
    </div>
  `;
}

/**
 * Hide optimization progress
 */
function hideOptimizationProgress() {
  const progressContainer = document.getElementById('optimization-progress');
  if (progressContainer) {
    progressContainer.style.display = 'none';
  }
}

/**
 * Display optimization results
 */
function displayOptimizationResults(results, duration) {
  const resultsContainer = document.getElementById('optimization-results');
  if (!resultsContainer) return;

  const { bestParams, bestPerformance, improvement, type } = results;

  // Create results summary
  const summaryHtml = `
    <div class="optimization-summary">
      <h3>✅ ${getOptimizationTypeLabel(type)} Optimization Complete</h3>
      <p><strong>Duration:</strong> ${duration.toFixed(1)} seconds</p>
      <p><strong>Best Hit Rate:</strong> ${(bestPerformance.hitRate * 100).toFixed(2)}%</p>
      <p><strong>Average Matches:</strong> ${bestPerformance.averageMatches.toFixed(2)}</p>
      ${improvement.hitRateImprovement > 0 ? 
        `<span class="improvement-indicator improvement-positive">
          +${improvement.hitRateImprovement.toFixed(1)}% improvement
        </span>` : 
        `<span class="improvement-indicator improvement-negative">
          ${improvement.hitRateImprovement.toFixed(1)}% change
        </span>`
      }
    </div>
  `;

  // Create performance metrics grid
  const metricsHtml = `
    <div class="results-grid">
      <div class="result-card">
        <div class="result-value">${(bestPerformance.hitRate * 100).toFixed(1)}%</div>
        <div class="result-label">Hit Rate</div>
      </div>
      <div class="result-card">
        <div class="result-value">${bestPerformance.averageMatches.toFixed(2)}</div>
        <div class="result-label">Avg Matches</div>
      </div>
      <div class="result-card">
        <div class="result-value">${bestPerformance.maxMatches}</div>
        <div class="result-label">Max Matches</div>
      </div>
      <div class="result-card">
        <div class="result-value">${(bestPerformance.consistency * 100).toFixed(1)}%</div>
        <div class="result-label">Consistency</div>
      </div>
    </div>
  `;

  // Create parameter display
  let parametersHtml = '<h4>Optimized Parameters:</h4>';
  
  if (bestParams.offsets) {
    parametersHtml += `
      <div class="parameter-display">
        <strong>ML Offsets:</strong> [${bestParams.offsets.join(', ')}]
      </div>
    `;
  }
  
  if (bestParams.weights) {
    parametersHtml += `
      <div class="parameter-display">
        <strong>Energy Weights:</strong><br>
        Prime: ${bestParams.weights.prime.toFixed(3)}<br>
        Digital Root: ${bestParams.weights.digitalRoot.toFixed(3)}<br>
        Mod5: ${bestParams.weights.mod5.toFixed(3)}<br>
        Grid Position: ${bestParams.weights.gridPosition.toFixed(3)}
      </div>
    `;
  }

  // Add apply button
  const applyButton = `
    <button id="apply-optimized-params" class="optimization-btn" style="margin-top: 1rem;">
      Apply Optimized Parameters
    </button>
  `;

  resultsContainer.innerHTML = summaryHtml + metricsHtml + parametersHtml + applyButton;

  // Add event listener for apply button
  const applyBtn = document.getElementById('apply-optimized-params');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      applyOptimizedParameters(bestParams);
      showSuccess('Parameters Applied', 'Optimized parameters have been applied to the prediction models');
    });
  }
}

/**
 * Apply optimized parameters to the models
 */
function applyOptimizedParameters(params) {
  // Update ML model with optimized offsets
  if (params.offsets) {
    state.publish('ml:setOffsets', params.offsets);
  }
  
  // Update energy calculation with optimized weights
  if (params.weights) {
    state.publish('energy:setWeights', params.weights);
  }
  
  console.log('[Optimization UI] Applied optimized parameters:', params);
}

/**
 * Get human-readable label for optimization type
 */
function getOptimizationTypeLabel(type) {
  switch (type) {
    case 'offsets': return 'ML Offset';
    case 'weights': return 'Energy Weight';
    case 'hybrid': return 'Hybrid';
    default: return 'Unknown';
  }
}

/**
 * Get optimization status
 */
export function getOptimizationStatus() {
  return {
    isRunning: currentOptimization !== null,
    currentType: currentOptimization?.type || null,
    startTime: currentOptimization?.startTime || null,
    settings: currentOptimization?.settings || null
  };
}

export default {
  initOptimizationUI,
  getOptimizationStatus
};