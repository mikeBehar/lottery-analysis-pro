import { displayEnergyResults as displayEnergyResultsFromUtils } from './utils.js';
import { showError, showSuccess, showInfo } from './notifications.js';
import state from './state.js';

export function displayEnergyResults(energyData, container) {
  displayEnergyResultsFromUtils(energyData, container);
}

// Listen for drawsUpdated event (future: update UI, enable analysis, show draw count, etc.)
state.subscribe('drawsUpdated', (draws) => {
  // Example: log or update UI with draw count
  console.log(`[PubSub] Draws updated: ${draws.length} draws loaded.`);
  // You can add UI updates here as needed
});
// Centralized DOM elements object
export const elements = (() => {
  const panelsContainer = document.querySelector('.panels') || document.body;
  const makePanel = (id, className) => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = className;
      panelsContainer.appendChild(el);
    }
    return el;
  };
  return {
    methodSelector: document.createElement('select'),
    temporalDecaySelector: document.createElement('select'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    uploadInput: document.getElementById('csvUpload'),
    progressIndicator: document.createElement('div'),
    backtestResults: document.createElement('div'),
    recommendations: document.getElementById('recommendations'),
    energyResults: document.getElementById('energy-results') || makePanel('energy-results', 'energy-panel'),
    mlResults: document.getElementById('ml-results') || makePanel('ml-results', 'ml-panel'),
    // Analytics panels
    hotColdPanel: makePanel('hot-cold-panel', 'analytics-panel'),
    overduePanel: makePanel('overdue-panel', 'analytics-panel'),
    frequencyPanel: makePanel('frequency-panel', 'analytics-panel'),
    pairsPanel: makePanel('pairs-panel', 'analytics-panel'),
    gapsPanel: makePanel('gaps-panel', 'analytics-panel'),
    // ...existing code...
  };
})();

// --- Analytics event subscriptions ---
state.subscribe('analytics:hotCold', (hotCold) => displayHotCold(hotCold, elements.hotColdPanel));
state.subscribe('analytics:overdue', (overdue) => displayOverdue(overdue, elements.overduePanel));
state.subscribe('analytics:frequency', (frequency) => displayFrequency(frequency, elements.frequencyPanel));
state.subscribe('analytics:pairs', (pairs) => displayPairs(pairs, elements.pairsPanel));
state.subscribe('analytics:gaps', (gaps) => displayGaps(gaps, elements.gapsPanel));

// --- Analytics display functions ---
export function displayHotCold(hotCold, container) {
  container.innerHTML = `
    <h3>🔥 Hot & Cold Numbers</h3>
    <div><strong>Hot:</strong> ${hotCold.hot.map(n => `<span class="number hot">${n}</span>`).join(' ')}</div>
    <div><strong>Cold:</strong> ${hotCold.cold.map(n => `<span class="number cold">${n}</span>`).join(' ')}</div>
  `;
}

export function displayOverdue(overdue, container) {
  container.innerHTML = `
    <h3>⏳ Overdue Numbers</h3>
    <div>${overdue.map(n => `<span class="number overdue">${n}</span>`).join(' ')}</div>
  `;
}

export function displayFrequency(frequency, container) {
  container.innerHTML = `
    <h3>📊 Number Frequency</h3>
    <div class="frequency-grid">
      ${frequency.whiteBalls.map((count, idx) => `<span class="number freq">${idx + 1}: ${count}</span>`).join(' ')}
    </div>
  `;
}

export function displayPairs(pairs, container) {
  // Show top 10 pairs
  const sorted = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 10);
  container.innerHTML = `
    <h3>🔗 Common Number Pairs</h3>
    <ul>${sorted.map(([pair, count]) => `<li>${pair}: ${count}</li>`).join('')}</ul>
  `;
}

export function displayGaps(gaps, container) {
  // Show all gaps sorted by frequency
  const sorted = Object.entries(gaps).sort((a, b) => b[1] - a[1]);
  container.innerHTML = `
    <h3>📏 Gap Analysis</h3>
    <ul>${sorted.map(([gap, count]) => `<li>Gap ${gap}: ${count} times</li>`).join('')}</ul>
  `;
}

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

// Subscribe to pub/sub events for analysis workflow
state.subscribe('progress', (msg) => showProgress(msg));
state.subscribe('hideProgress', () => hideProgress());
state.subscribe('analyzeBtnState', (enabled) => setAnalyzeBtnState(enabled));
state.subscribe('error', ({ title, message }) => showErrorOld(title, message));
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

export function showErrorOld(title, error) {
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
  showError(title, msg);
}
