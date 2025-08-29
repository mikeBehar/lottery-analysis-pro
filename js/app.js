// LOTTERY ANALYSIS PRO - CORE APPLICATION
// Version: 2.4.2 | Last Updated: 2025-08-21 02:45 PM EST
//
// NOTE: For the correct CSV draw format, see the top of task_list/task_tracking.md


import { setAnalyzeBtnState, showError, showProgress, updateProgress, hideProgress, showCancelButton, hideCancelButton, elements, initUIElements, displayMLResults, displayRecommendations, displayBacktestResults } from './ui.js';

// ==================== EVENT LISTENERS ==================== //
document.addEventListener('DOMContentLoaded', () => {
  initUIElements();
  initEventListeners();
  });

  // ==================== COMPREHENSIVE BACKTESTING ==================== //
  async function runComprehensiveBacktesting(decayRate) {
    if (state.draws.length < CONFIG.backtestSettings.initialTrainingSize + CONFIG.backtestSettings.testWindowSize) {
      return createInsufficientDataResponse();
    }
    updateProgress('Initializing backtesting worker...');
    return new Promise((resolve, reject) => {
      let backtestWorker;
      try {
        backtestWorker = new Worker('js/workers/backtest-worker.js');
      } catch (err) {
        console.error('[App] Failed to instantiate backtest-worker.js:', err);
        showError('Worker Error', 'Failed to load backtest-worker.js. Check file path and server setup.');
        reject(new Error('Failed to instantiate backtest-worker.js'));
        return;
      }
      state.activeWorkers = state.activeWorkers || new Map();
      state.activeWorkers.set('backtest', backtestWorker);
      let responded = false;
      backtestWorker.onmessage = function(e) {
        const { type, data } = e.data;
        switch (type) {
          case 'progress':
            updateProgress(data.message, data.percentage);
            break;
          case 'result':
            responded = true;
            state.activeWorkers.delete('backtest');
            resolve(data.results);
            break;
          case 'error':
            responded = true;
            state.activeWorkers.delete('backtest');
            showError('Backtest Worker Error', data.message);
            reject(new Error(data.message));
            break;
        }
      };
      backtestWorker.onerror = function(error) {
        responded = true;
        state.activeWorkers.delete('backtest');
        console.error('[App] backtestWorker.onerror:', error);
  showError('Worker Error', error?.message || 'Unknown worker error');
  reject(new Error(error?.message || 'Unknown worker error'));
      };
      // Ensure a message is always posted back, even if worker is terminated
      backtestWorker.onclose = function() {
        if (!responded) {
          state.activeWorkers.delete('backtest');
          showError('Worker Error', 'Backtest worker terminated before response.');
          reject(new Error('Worker terminated before response.'));
        }
      };
      try {
        backtestWorker.postMessage({
          draws: state.draws,
          decayRate: decayRate,
          method: state.currentMethod,
          config: CONFIG.backtestSettings
        });
      } catch (err) {
        console.error('[App] Failed to postMessage to backtest-worker.js:', err);
        showError('Worker Error', 'Failed to communicate with backtest-worker.js.');
        reject(new Error('Failed to postMessage to backtest-worker.js'));
      }
    });
  }

  async function getPredictionForBacktest(draws, decayRate) {
    // STUB: Placeholder for future implementation
    console.warn('getPredictionForBacktest() called: stub function, not yet implemented.');
    return null;
  }
  // Removed unused function getPredictionForBacktest
  // STUB: Placeholder for future implementation
  function calculatePerformanceMetrics(results) {
    console.warn('calculatePerformanceMetrics() called: stub function, not yet implemented.');
    return null;
  }
  // Removed unused function calculatePerformanceMetrics
  // ==================== ML & PREDICTION FUNCTIONS ==================== //
  async function getMLPrediction(draws = state.draws, decayRate = state.decayRate) {
    if (draws.length < 50) {
      return getFrequencyFallback(draws, decayRate);
    }
    updateProgress('Running ML prediction...');
    // Predict white balls and powerball independently
    return new Promise((resolve, reject) => {
      let mlWorker;
      let timeoutId;
      let finished = false;
      function finish(result, isError) {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        if (isError) {
          showError('ML Worker Timeout', 'ML prediction did not respond in time.');
        }
        hideProgress();
        resolve(result);
      }
      try {
        mlWorker = new Worker('js/workers/ml-worker.js');
      } catch (err) {
        console.error('[App] Failed to instantiate ml-worker.js:', err);
        showError('Worker Error', 'Failed to load ml-worker.js. Check file path and server setup.');
        finish(getFrequencyFallback(draws, decayRate), true);
        return;
      }
      state.activeWorkers = state.activeWorkers || new Map();
      state.activeWorkers.set('ml', mlWorker);
      mlWorker.onmessage = function(e) {
        const { type, data } = e.data;
        console.log('[App] mlWorker.onmessage:', type, data);
        switch (type) {
          case 'progress':
            updateProgress(data.message);
            break;
          case 'result':
            state.activeWorkers.delete('ml');
            finish(data.prediction, false);
            break;
          case 'error':
            state.activeWorkers.delete('ml');
            showError('ML Worker Error', data.message);
            finish(getFrequencyFallback(draws, decayRate), true);
            break;
        }
      };
      mlWorker.onerror = function(error) {
        state.activeWorkers.delete('ml');
        console.error('[App] ML worker onerror:', error);
        showError('Worker Error', error.message || error);
        finish(getFrequencyFallback(draws, decayRate), true);
      };
      timeoutId = setTimeout(() => {
        state.activeWorkers.delete('ml');
        if (mlWorker) mlWorker.terminate();
        finish(getFrequencyFallback(draws, decayRate), true);
      }, 10000); // 10 seconds
      try {
        mlWorker.postMessage({
          draws: draws,
          decayRate: decayRate
        });
      } catch (err) {
        console.error('[App] Failed to postMessage to ml-worker.js:', err);
        showError('Worker Error', 'Failed to communicate with ml-worker.js.');
        finish(getFrequencyFallback(draws, decayRate), true);
      }
    });
  }

  function getFrequencyFallback(draws = state.draws, decayRate = state.decayRate) {
    // Use the new temporal functions for a better fallback
    const weightedDraws = applyTemporalWeighting(draws, decayRate);
    // Predict white balls (1-69, no repeats)
    const whiteFreq = Array(70).fill(0);
    weightedDraws.forEach(draw => {
      if (draw.whiteBalls && Array.isArray(draw.whiteBalls)) {
        draw.whiteBalls.forEach(n => { if (n >= 1 && n <= 69) whiteFreq[n] += 1; });
      }
    });
    const predictedWhiteBalls = whiteFreq
      .map((count, number) => ({ number, count }))
      .filter(item => item.number >= 1 && item.number <= 69)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => item.number);

    // Predict powerball (1-26)
    const redFreq = Array(27).fill(0);
    weightedDraws.forEach(draw => {
      if (draw.powerball && draw.powerball >= 1 && draw.powerball <= 26) {
        redFreq[draw.powerball] += 1;
      }
    });
    const predictedPowerball = redFreq
      .map((count, number) => ({ number, count }))
      .filter(item => item.number >= 1 && item.number <= 26)
      .sort((a, b) => b.count - a.count)[0]?.number || 1;

    return {
      whiteBalls: predictedWhiteBalls,
      powerball: predictedPowerball,
      confidence: 0.65,
      model: 'fallback_temporal_frequency',
      warning: 'Using temporal frequency-based fallback'
    };
  }

  // ==================== DISPLAY FUNCTIONS ==================== //
  // STUB: Placeholder for future implementation
  function displayResults(energyData, mlPrediction, backtestResults) {
    console.warn('displayResults() called: stub function, not yet implemented.');
    return null;
  }
  // Removed unused function displayResults
 
function generateRecommendations(energyData, mlPrediction) {
  // Use white balls only for recommendations
  const topEnergy = [...energyData].sort((a, b) => b.energy - a.energy).slice(0, 5);
  const mlNumbers = (mlPrediction.whiteBalls || []).slice(0, 5);
  return {
    highConfidence: findOverlap(topEnergy, mlNumbers),
    energyBased: topEnergy.map(n => n.number),
    mlBased: mlNumbers,
    powerball: mlPrediction.powerball,
    summary: `Based on ${state.draws.length} historical draws`
  };
}
  function findOverlap(energyArray, mlArray) {
    const energyNumbers = energyArray.map(item => item.number);
    return mlArray.filter(num => energyNumbers.includes(num));
  }

  function displayMLResults(mlPrediction, container) {
  if (DEBUG) console.log('displayMLResults called', mlPrediction, container);
  console.log('[Debug] displayMLResults: mlPrediction =', mlPrediction);
  console.log('[Debug] displayMLResults: container =', container);
    // Show white balls and powerball separately
    const whiteBalls = (mlPrediction.whiteBalls || []).map(num => num.toString().padStart(2, '0')).join(' ');
    const powerball = mlPrediction.powerball ? mlPrediction.powerball.toString().padStart(2, '0') : '';
    container.innerHTML = `
      <div class="ml-prediction">
        <div class="confidence">Confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%</div>
        <div class="ml-numbers"><strong>White Balls:</strong> ${whiteBalls}</div>
        <div class="ml-numbers"><strong>Powerball:</strong> <span class="powerball-number">${powerball}</span></div>
        <div class="model-info">Model: ${mlPrediction.model}</div>
        ${mlPrediction.warning ? `<div class="warning">${mlPrediction.warning}</div>` : ''}
      </div>
    `;
    // Also show in dedicated powerball section if present
    if (elements.powerballResults) {
      elements.powerballResults.innerHTML = `
        <div class="powerball-section">
          <h3>🔴 Powerball Prediction</h3>
          <div class="powerball-prediction">
            <span class="powerball-number">${powerball}</span>
          </div>
          <div class="confidence">Confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%</div>
          <div class="model-info">Model: ${mlPrediction.model}</div>
        </div>
      `;
    }
  }

  function displayBacktestResults(results) {
    if (!results.available) {
      elements.backtestResults.innerHTML = `<p class="no-backtest">${results.message}</p>`;
      return;
    }

    const metrics = results.performanceMetrics;
    elements.backtestResults.innerHTML = `
      <div class="backtest-header">
        <h3>📊 Backtesting Results (${results.totalTests} tests)</h3>
        <p>Method: ${results.method.toUpperCase()} | Draws Tested: ${results.totalDrawsTested} | Time: ${results.analysisTime || 'N/A'} seconds</p>
      </div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <h4>Hit Rate</h4>
          <div class="metric-value">${(metrics.hitRate * 100).toFixed(1)}%</div>
          <p>Percentage of tests with ≥3 correct numbers</p>
        </div>
        
        <div class="metric-card">
          <h4>Precision</h4>
          <div class="metric-value">${(metrics.precision * 100).toFixed(1)}%</div>
          <p>Accuracy of individual number predictions</p>
        </div>
        
        <div class="metric-card">
          <h4>ROI</h4>
          <div class="metric-value ${metrics.roi >= 0 ? 'positive' : 'negative'}">${metrics.roi >= 0 ? '+' : ''}${metrics.roi.toFixed(1)}%</div>
          <p>Simulated return on investment</p>
        </div>
        
        <div class="metric-card">
          <h4>Hit Distribution</h4>
          <div class="hit-distribution">
            ${Object.entries(metrics.hitDistribution).map(([hitCount, count]) => `
              <div class="hit-item">
                <span class="hit-count">${hitCount} numbers:</span>
                <span class="hit-value">${count} hits</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <div class="financial-summary">
        <h4>Financial Simulation</h4>
        <p>Total Spent: $${metrics.totalSpent} | Total Won: $${metrics.totalWon}</p>
        <p>Net: $${(metrics.totalWon - metrics.totalSpent).toFixed(2)}</p>
      </div>
    `;
  }

  // ==================== ERROR FILTERING ==================== //
  const originalError = console.error;
  console.error = function() {
    const errorMsg = String(arguments[0] || '');
    const isExternal = !errorMsg.includes('app.js') && 
                       !errorMsg.includes('utils.js') &&
                       !errorMsg.includes('lottery');
    if (isExternal && !errorMsg.includes('PapaParse')) return;
    originalError.apply(console, arguments);
  };

  // Expose runAnalysis to global scope for event handlers
  window.runAnalysis = runAnalysis;