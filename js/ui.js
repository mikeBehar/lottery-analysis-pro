// Listen for drawsUpdated event (future: update UI, enable analysis, show draw count, etc.)
state.subscribe('drawsUpdated', (draws) => {
  // Example: log or update UI with draw count
  console.log(`[PubSub] Draws updated: ${draws.length} draws loaded.`);
  // You can add UI updates here as needed
});
// Centralized DOM elements object
export const elements = {
  methodSelector: document.createElement('select'),
  temporalDecaySelector: document.createElement('select'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  uploadInput: document.getElementById('csvUpload'),
  progressIndicator: document.createElement('div'),
  backtestResults: document.createElement('div'),
  recommendations: document.getElementById('recommendations'),
  energyResults: document.getElementById('energy-results') || (() => {
    const div = document.createElement('div');
    div.id = 'energy-results';
    div.className = 'energy-panel';
    document.body.appendChild(div);
    return div;
  })(),
  mlResults: document.getElementById('ml-results') || (() => {
    const div = document.createElement('div');
    div.id = 'ml-results';
    div.className = 'ml-panel';
    document.body.appendChild(div);
    return div;
  })(),
  // Add more as needed for your UI
};

/**
 * Initialize UI elements and dynamic DOM structure.
 * @param {object} CONFIG - App config object (for method options)
 * @param {object} state - App state object (for current method)
 */
export function initUIElements(CONFIG, state) {
  // Create and add Powerball results container if not present
  if (!elements.powerballResults) {
    elements.powerballResults = document.getElementById('powerball-results');
    if (!elements.powerballResults) {
      elements.powerballResults = document.createElement('div');
      elements.powerballResults.id = 'powerball-results';
      elements.powerballResults.className = 'powerball-panel';
      // Insert after recommendations if present, else at end of body
      if (elements.recommendations?.parentNode) {
        elements.recommendations.parentNode.insertBefore(elements.powerballResults, elements.recommendations.nextSibling);
      } else {
        document.body.appendChild(elements.powerballResults);
      }
    }
  }
  elements.methodSelector.id = 'method-selector';
  CONFIG.analysisMethods.forEach(method => {
    const option = document.createElement('option');
    option.value = method;
    option.textContent = method.charAt(0).toUpperCase() + method.slice(1);
    elements.methodSelector.appendChild(option);
  });
  elements.methodSelector.value = state.currentMethod;
  // ...add more UI initialization as needed...
}

import state from './state.js';

// Subscribe to pub/sub events for analysis workflow
state.subscribe('progress', (msg) => showProgress(msg));
state.subscribe('hideProgress', () => hideProgress());
state.subscribe('analyzeBtnState', (enabled) => setAnalyzeBtnState(enabled));
state.subscribe('error', ({ title, message }) => showError(title, message));
state.subscribe('energyResults', (energyData) => displayEnergyResults(energyData, elements.energyResults));
state.subscribe('mlResults', (mlPrediction) => displayMLResults(mlPrediction, elements.mlResults, elements));
state.subscribe('recommendations', (recommendations) => displayRecommendations(recommendations, elements));

export function displayMLResults(mlPrediction, container, elements) {
  if (typeof DEBUG !== 'undefined' && DEBUG) console.log('displayMLResults called', mlPrediction, container);
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
  elements?.powerballResults && (elements.powerballResults.innerHTML = `
    <div class="powerball-section">
      <h3>🔴 Powerball Prediction</h3>
      <div class="powerball-prediction">
        <span class="powerball-number">${powerball}</span>
      </div>
      <div class="confidence">Confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%</div>
      <div class="model-info">Model: ${mlPrediction.model}</div>
    </div>
  `);
}

export function displayRecommendations(recommendations, elements) {
  if (typeof DEBUG !== 'undefined' && DEBUG) console.log('displayRecommendations called', recommendations);
  console.log('[Debug] displayRecommendations: recommendations =', recommendations);
  console.log('[Debug] displayRecommendations: elements.recommendations =', elements.recommendations);
  if (!elements.recommendations) return;
  // Show white ball recommendations
  elements.recommendations.innerHTML = `
    <div class="recommendation-section">
      <h3>🎯 High Confidence White Balls</h3>
      <div class="number-grid">
        ${recommendations.highConfidence.map(num => 
          `<span class="number high-confidence">${num}</span>`
        ).join(' ')}
        ${recommendations.highConfidence.length === 0 ? 
          '<span class="no-data">No strong matches found</span>' : ''}
      </div>
    </div>
    <div class="recommendation-section">
      <h3>⚡ Energy-Based White Balls</h3>
      <div class="number-grid">
        ${recommendations.energyBased.map(num => 
          `<span class="number energy-based">${num}</span>`
        ).join(' ')}
      </div>
    </div>
    <div class="recommendation-section">
      <h3>🤖 ML-Based White Balls</h3>
      <div class="number-grid">
        ${recommendations.mlBased.map(num => 
          `<span class="number ml-based">${num}</span>`
        ).join(' ')}
      </div>
    </div>
    <div class="recommendation-summary">
      <p>${recommendations.summary}</p>
    </div>
  `;
  // Show Powerball recommendation in dedicated section if present
  if (elements.powerballResults && recommendations.powerball) {
    elements.powerballResults.innerHTML += `
      <div class="powerball-recommendation-section">
        <h3>🔴 Powerball Recommendation</h3>
        <div class="powerball-recommendation">
          <span class="powerball-number">${recommendations.powerball}</span>
        </div>
      </div>
    `;
  }
}

export function displayBacktestResults(results, elements) {
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

/**
 * Query and initialize all main UI elements.
 * @returns {object} elements
 */

export function setAnalyzeBtnState(enabled) {
  const btn = document.getElementById('analyzeBtn');
  if (btn) {
    btn.disabled = !enabled;
    btn.classList.toggle('ready', enabled);
  }
}

export function showProgress(message) {
  const indicator = document.getElementById('progress-indicator');
  if (indicator) {
    indicator.style.display = 'block';
    indicator.innerHTML = `
      <div class="progress-content">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
  }
  setAnalyzeBtnState(false);
  showCancelButton();
  updateProgress(message);
}

export function updateProgress(message, percent) {
  const progressText = document.getElementById('progress-text');
  if (progressText) {
    progressText.textContent = percent !== undefined ? `${message} (${percent}%)` : message;
  }
  const indicator = document.getElementById('progress-indicator');
  if (indicator && message) {
    const p = indicator.querySelector('p');
    if (p) p.textContent = percent !== undefined ? `${message} (${percent}%)` : message;
  }
}

export function hideProgress() {
  const indicator = document.getElementById('progress-indicator');
  const cancelBtn = document.getElementById('cancel-btn');
  const progressText = document.getElementById('progress-text');
  const analyzeBtn = document.getElementById('analyze-btn');
  if (indicator) indicator.style.display = 'none';
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (progressText) progressText.textContent = '';
  if (analyzeBtn) analyzeBtn.disabled = false;
}

export function showCancelButton() {
  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

export function hideCancelButton() {
  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

export function showError(title, error) {
  let msg = '';
  if (error && typeof error.message === 'string') {
    msg = error.message;
  } else if (typeof error === 'string') {
    msg = error;
  } else if (error) {
    msg = JSON.stringify(error);
  } else {
    msg = 'Unknown error';
  }
  console.error(`${title}:`, error);
  alert(`${title}: ${msg}`);
}
