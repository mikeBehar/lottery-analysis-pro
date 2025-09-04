/**
 * ACCURACY TESTING UI CONTROLLER
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * User interface for split testing and prediction accuracy analysis
 */

import state from './state.js';
import PredictionAccuracyTester from './accuracy-tester.js';
import { showError, showSuccess, showInfo } from './notifications.js';

let currentTester = null;
let isTestingRunning = false;

/**
 * Initialize accuracy testing UI
 */
export function initAccuracyUI() {
  const runTestBtn = document.getElementById('run-accuracy-test');
  const addStrategyBtn = document.getElementById('add-strategy');
  
  if (runTestBtn) {
    runTestBtn.addEventListener('click', runAccuracyTest);
  }
  
  if (addStrategyBtn) {
    addStrategyBtn.addEventListener('click', addCustomStrategy);
  }
  
  // Subscribe to data updates
  state.subscribe('drawsUpdated', (draws) => {
    if (draws && draws.length > 0) {
      currentTester = new PredictionAccuracyTester(draws);
      setupDefaultStrategies();
      updateTestDataInfo(draws.length);
    }
  });
  
  // Listen for progress updates
  if (typeof window !== 'undefined') {
    window.addEventListener('accuracyProgress', handleProgressUpdate);
  }
  
  console.log('[Accuracy UI] Initialized successfully');
}

/**
 * Setup default prediction strategies for testing
 */
function setupDefaultStrategies() {
  if (!currentTester) return;
  
  // Clear existing strategies
  currentTester.strategies.clear();
  
  // Add confidence interval strategy
  currentTester.addStrategy('Confidence Intervals (95%)', null, {
    type: 'confidence',
    options: {
      confidenceLevel: 0.95,
      method: 'bootstrap',
      includeCorrelations: true
    }
  });
  
  // Add confidence interval strategy with different settings
  currentTester.addStrategy('Confidence Intervals (90%)', null, {
    type: 'confidence',
    options: {
      confidenceLevel: 0.90,
      method: 'time-weighted',
      includeCorrelations: true
    }
  });
  
  // Add energy signature strategy
  currentTester.addStrategy('Energy Signature', null, {
    type: 'energy',
    weights: {
      prime: 0.3,
      digitalRoot: 0.2,
      mod5: 0.2,
      gridPosition: 0.3
    }
  });
  
  // Add frequency analysis strategy
  currentTester.addStrategy('Frequency Analysis', null, {
    type: 'frequency'
  });
  
  // Add hybrid strategy
  currentTester.addStrategy('Hybrid (Energy + Frequency)', null, {
    type: 'hybrid'
  });
  
  // Update strategy list in UI
  updateStrategyList();
}

/**
 * Run comprehensive accuracy test
 */
async function runAccuracyTest() {
  if (isTestingRunning) return;
  
  if (!state.draws || state.draws.length === 0) {
    showError('No Data', 'Please upload a CSV file with lottery data first');
    return;
  }
  
  if (state.draws.length < 250) {
    showError('Insufficient Data', 'At least 250 historical draws are required for reliable accuracy testing');
    return;
  }
  
  if (!currentTester || currentTester.strategies.size === 0) {
    showError('No Strategies', 'Please add at least one prediction strategy to test');
    return;
  }
  
  isTestingRunning = true;
  setTestingState(true);
  
  try {
    const testConfig = getTestConfiguration();
    
    showInfo('Starting Accuracy Test', `Testing ${currentTester.strategies.size} strategies with walk-forward validation`);
    
    const results = await currentTester.runAccuracyTest(testConfig);
    
    displayTestResults(results);
    displayStrategyComparison(results.comparison);
    displayDetailedAnalysis(results);
    
    showSuccess('Test Complete', 'Accuracy analysis completed successfully');
    
  } catch (error) {
    console.error('Accuracy test failed:', error);
    showError('Test Failed', error.message || 'An error occurred during accuracy testing');
  } finally {
    isTestingRunning = false;
    setTestingState(false);
  }
}

/**
 * Get test configuration from UI controls
 */
function getTestConfiguration() {
  return {
    testMethod: document.getElementById('test-method')?.value || 'walk-forward',
    initialTraining: parseInt(document.getElementById('initial-training')?.value) || 200,
    testWindow: parseInt(document.getElementById('test-window')?.value) || 50,
    stepSize: parseInt(document.getElementById('step-size')?.value) || 10,
    metrics: ['matches', 'consistency', 'prize-tiers', 'confidence-accuracy']
  };
}

/**
 * Set testing state in UI
 */
function setTestingState(testing) {
  const runBtn = document.getElementById('run-accuracy-test');
  const addBtn = document.getElementById('add-strategy');
  
  if (runBtn) {
    runBtn.disabled = testing;
    runBtn.textContent = testing ? 'Testing...' : 'Run Accuracy Test';
  }
  
  if (addBtn) {
    addBtn.disabled = testing;
  }
  
  // Show/hide progress container
  const progressContainer = document.getElementById('accuracy-progress');
  if (progressContainer) {
    progressContainer.style.display = testing ? 'block' : 'none';
  }
}

/**
 * Handle progress updates from accuracy testing
 */
function handleProgressUpdate(event) {
  const { strategy, results } = event.detail;
  
  const progressContainer = document.getElementById('accuracy-progress');
  if (!progressContainer) return;
  
  const progressItem = document.createElement('div');
  progressItem.className = 'progress-item';
  progressItem.innerHTML = `
    <div class="progress-strategy">${strategy}</div>
    <div class="progress-stats">
      ${results.totalPredictions} predictions • 
      ${results.validationPeriods} validation periods • 
      Score: ${results.performance.toFixed(2)}
    </div>
  `;
  
  progressContainer.appendChild(progressItem);
}

/**
 * Display test results overview
 */
function displayTestResults(results) {
  const resultsContainer = document.getElementById('accuracy-results');
  if (!resultsContainer) return;
  
  // Clear previous results
  while (resultsContainer.firstChild) {
    resultsContainer.removeChild(resultsContainer.firstChild);
  }
  
  const summary = results.summary;
  
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'test-summary';
  summaryDiv.innerHTML = `
    <h3>🎯 Accuracy Test Results</h3>
    <div class="summary-stats">
      <div class="summary-stat">
        <div class="stat-value">${summary.totalStrategies}</div>
        <div class="stat-label">Strategies Tested</div>
      </div>
      <div class="summary-stat">
        <div class="stat-value">${summary.totalPredictions.toLocaleString()}</div>
        <div class="stat-label">Total Predictions</div>
      </div>
      <div class="summary-stat">
        <div class="stat-value">${summary.bestPerformer.performance.toFixed(2)}</div>
        <div class="stat-label">Best Score</div>
      </div>
    </div>
    <div class="key-findings">
      <h4>Key Findings:</h4>
      <ul>
        ${summary.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
      </ul>
    </div>
  `;
  
  resultsContainer.appendChild(summaryDiv);
}

/**
 * Display strategy comparison table
 */
function displayStrategyComparison(comparison) {
  const comparisonContainer = document.getElementById('strategy-comparison');
  if (!comparisonContainer) return;
  
  // Clear previous comparison
  while (comparisonContainer.firstChild) {
    comparisonContainer.removeChild(comparisonContainer.firstChild);
  }
  
  const table = document.createElement('table');
  table.className = 'comparison-table';
  
  const header = document.createElement('thead');
  header.innerHTML = `
    <tr>
      <th>Rank</th>
      <th>Strategy</th>
      <th>Performance Score</th>
      <th>Avg Matches</th>
      <th>Hit Rate</th>
      <th>Consistency</th>
      <th>Total Predictions</th>
    </tr>
  `;
  table.appendChild(header);
  
  const tbody = document.createElement('tbody');
  
  comparison.ranking.forEach((strategy, index) => {
    const row = document.createElement('tr');
    row.className = index === 0 ? 'best-strategy' : '';
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="strategy-name">${strategy.strategy}</div>
        ${index === 0 ? '<span class="best-badge">🏆 Best</span>' : ''}
      </td>
      <td class="score-cell">${strategy.performance.toFixed(2)}</td>
      <td>${strategy.avgMatches.toFixed(2)}</td>
      <td>${(strategy.hitRate * 100).toFixed(1)}%</td>
      <td>${(strategy.consistency * 100).toFixed(1)}%</td>
      <td>${strategy.totalPredictions.toLocaleString()}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  comparisonContainer.appendChild(table);
}

/**
 * Display detailed analysis
 */
function displayDetailedAnalysis(results) {
  const detailsContainer = document.getElementById('detailed-analysis');
  if (!detailsContainer) return;
  
  // Clear previous details
  while (detailsContainer.firstChild) {
    detailsContainer.removeChild(detailsContainer.firstChild);
  }
  
  // Create detailed analysis for each strategy
  results.results.forEach(([strategyName, strategyResult]) => {
    const strategyDiv = document.createElement('div');
    strategyDiv.className = 'strategy-analysis';
    
    const metrics = strategyResult.aggregatedMetrics;
    
    strategyDiv.innerHTML = `
      <h4>${strategyName}</h4>
      <div class="analysis-grid">
        ${metrics.matches ? `
          <div class="analysis-card">
            <h5>Match Performance</h5>
            <p>Average Matches: ${metrics.matches.averageMatches.toFixed(2)}</p>
            <p>Hit Rate (≥3 matches): ${(metrics.matches.averageHitRate * 100).toFixed(1)}%</p>
            <p>Total Predictions: ${metrics.matches.totalPredictions}</p>
          </div>
        ` : ''}
        
        ${metrics.consistency ? `
          <div class="analysis-card">
            <h5>Consistency</h5>
            <p>Consistency Score: ${(metrics.consistency.averageConsistency * 100).toFixed(1)}%</p>
            <p>Average Std Dev: ${metrics.consistency.averageStdDev.toFixed(2)}</p>
          </div>
        ` : ''}
        
        ${metrics['prize-tiers'] ? `
          <div class="analysis-card">
            <h5>Prize Tiers</h5>
            <p>Total Wins: ${metrics['prize-tiers'].totalWins}</p>
            <p>Win Rate: ${(metrics['prize-tiers'].totalWins / metrics.matches.totalPredictions * 100).toFixed(2)}%</p>
          </div>
        ` : ''}
        
        ${metrics.confidenceAccuracy ? `
          <div class="analysis-card">
            <h5>Confidence Accuracy</h5>
            <p>Interval Accuracy: ${(metrics.confidenceAccuracy.averageAccuracy * 100).toFixed(1)}%</p>
            <p>Expected: ${(metrics.confidenceAccuracy.expectedAccuracy * 100)}%</p>
          </div>
        ` : ''}
      </div>
    `;
    
    detailsContainer.appendChild(strategyDiv);
  });
}

/**
 * Add custom strategy
 */
function addCustomStrategy() {
  const strategyName = prompt('Enter strategy name:');
  if (!strategyName || !currentTester) return;
  
  const strategyType = prompt('Enter strategy type (confidence, energy, frequency, hybrid):');
  if (!strategyType) return;
  
  try {
    currentTester.addStrategy(strategyName, null, {
      type: strategyType,
      options: {} // Could be expanded with more options
    });
    
    updateStrategyList();
    showSuccess('Strategy Added', `${strategyName} strategy added successfully`);
    
  } catch (error) {
    showError('Failed to Add Strategy', error.message);
  }
}

/**
 * Update strategy list display
 */
function updateStrategyList() {
  const listContainer = document.getElementById('strategy-list');
  if (!listContainer || !currentTester) return;
  
  // Clear current list
  while (listContainer.firstChild) {
    listContainer.removeChild(listContainer.firstChild);
  }
  
  if (currentTester.strategies.size === 0) {
    const noStrategies = document.createElement('div');
    noStrategies.className = 'no-strategies';
    noStrategies.textContent = 'No strategies configured';
    listContainer.appendChild(noStrategies);
    return;
  }
  
  currentTester.strategies.forEach((strategy, name) => {
    const strategyItem = document.createElement('div');
    strategyItem.className = 'strategy-item';
    
    strategyItem.innerHTML = `
      <div class="strategy-info">
        <div class="strategy-name">${name}</div>
        <div class="strategy-type">Type: ${strategy.config.type}</div>
      </div>
      <button class="remove-strategy" onclick="removeStrategy('${name}')">Remove</button>
    `;
    
    listContainer.appendChild(strategyItem);
  });
}

/**
 * Remove a strategy
 */
function removeStrategy(strategyName) {
  if (!currentTester) return;
  
  currentTester.strategies.delete(strategyName);
  updateStrategyList();
  showInfo('Strategy Removed', `${strategyName} strategy removed`);
}

/**
 * Update test data information
 */
function updateTestDataInfo(drawCount) {
  const infoContainer = document.getElementById('test-data-info');
  if (!infoContainer) return;
  
  const sufficient = drawCount >= 250;
  
  infoContainer.className = `test-data-info ${sufficient ? 'sufficient' : 'insufficient'}`;
  infoContainer.innerHTML = `
    <div class="data-count">${drawCount.toLocaleString()} draws available</div>
    <div class="data-status">
      ${sufficient 
        ? '✅ Sufficient data for accuracy testing' 
        : '⚠️ At least 250 draws recommended for reliable results'
      }
    </div>
  `;
}

/**
 * Export test results
 */
export function exportTestResults() {
  if (!currentTester || !currentTester.results || currentTester.results.size === 0) {
    showError('No Results', 'Run an accuracy test first before exporting');
    return;
  }
  
  const exportData = {
    timestamp: new Date().toISOString(),
    testConfig: getTestConfiguration(),
    results: Array.from(currentTester.results.entries()),
    summary: currentTester.generateSummary(currentTester.results)
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `accuracy-test-results-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showSuccess('Export Complete', 'Accuracy test results exported successfully');
}

// Export functions
export { removeStrategy };

// Browser compatibility
if (typeof window !== 'undefined') {
  window.initAccuracyUI = initAccuracyUI;
  window.exportTestResults = exportTestResults;
  window.removeStrategy = removeStrategy;
}