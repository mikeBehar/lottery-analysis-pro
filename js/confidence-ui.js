/**
 * CONFIDENCE INTERVAL UI CONTROLLER
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * Manages the user interface for position-based confidence interval predictions
 */

import state from './state.js';
import { PositionBasedPredictor } from './confidence-predictor.js';
import { showError, showSuccess, showInfo } from './notifications.js';

let currentPredictor = null;
let isGeneratingPrediction = false;

/**
 * Initialize confidence interval UI
 */
export function initConfidenceUI() {
  const generateBtn = document.getElementById('generate-confidence-prediction');
  
  if (generateBtn) {
    generateBtn.addEventListener('click', generateConfidencePrediction);
  }
  
  // Subscribe to state changes
  state.subscribe('drawsUpdated', (draws) => {
    if (draws && draws.length > 0) {
      currentPredictor = new PositionBasedPredictor(draws);
      updateDataQualityDisplay(currentPredictor.getSystemStats());
    }
  });
  
  console.log('[Confidence UI] Initialized successfully');
}

/**
 * Generate confidence interval prediction
 */
async function generateConfidencePrediction() {
  if (isGeneratingPrediction) return;
  
  if (!state.draws || state.draws.length === 0) {
    showError('No Data', 'Please upload a CSV file with lottery data first');
    return;
  }
  
  if (state.draws.length < 20) {
    showError('Insufficient Data', 'At least 20 historical draws are required for confidence intervals');
    return;
  }
  
  const confidenceLevel = parseFloat(document.getElementById('confidence-level').value);
  const method = document.getElementById('confidence-method').value;
  
  isGeneratingPrediction = true;
  setGeneratingState(true);
  
  try {
    showInfo('Generating Prediction', `Calculating ${(confidenceLevel * 100)}% confidence intervals using ${method} method`);
    
    // Ensure we have a current predictor
    if (!currentPredictor) {
      currentPredictor = new PositionBasedPredictor(state.draws);
    }
    
    const predictions = await currentPredictor.generatePredictionWithConfidenceIntervals({
      confidenceLevel,
      method,
      includeCorrelations: true
    });
    
    displayConfidencePredictions(predictions, confidenceLevel, method);
    displaySystemStatistics(currentPredictor.getSystemStats());
    
    showSuccess('Prediction Complete', `Generated position-based predictions with ${(confidenceLevel * 100)}% confidence intervals`);
    
  } catch (error) {
    console.error('Confidence prediction failed:', error);
    showError('Prediction Failed', error.message || 'An error occurred while generating confidence intervals');
  } finally {
    isGeneratingPrediction = false;
    setGeneratingState(false);
  }
}

/**
 * Set the generating state UI
 */
function setGeneratingState(generating) {
  const generateBtn = document.getElementById('generate-confidence-prediction');
  
  if (generateBtn) {
    generateBtn.disabled = generating;
    generateBtn.textContent = generating ? 'Generating...' : 'Generate Prediction';
  }
}

/**
 * Display confidence interval predictions in the UI
 */
function displayConfidencePredictions(predictions, confidenceLevel, method) {
  const resultsContainer = document.getElementById('confidence-results');
  if (!resultsContainer) return;
  
  // Clear previous results
  while (resultsContainer.firstChild) {
    resultsContainer.removeChild(resultsContainer.firstChild);
  }
  
  predictions.forEach((pred, index) => {
    const ballDiv = document.createElement('div');
    ballDiv.className = `confidence-ball ${pred.position}${pred.constraintAdjusted ? ' constraint-adjusted' : ''}`;
    
    const positionLabel = getPositionLabel(pred.position, index);
    const range = pred.confidenceInterval.upper - pred.confidenceInterval.lower;
    const rangeWidth = Math.min(100, (range / 10) * 100); // Scale for visualization
    
    ballDiv.innerHTML = `
      <div class="position-label">${positionLabel}</div>
      <div class="ball-prediction">
        <div class="main-number">${pred.prediction}</div>
        <div class="confidence-range">${pred.confidenceInterval.display.range}</div>
        <div class="confidence-level">${(confidenceLevel * 100)}% confident</div>
        <div class="method-used">${capitalizeFirst(method)} method</div>
      </div>
      <div class="confidence-visualization">
        ${createConfidenceVisualization(pred, rangeWidth)}
      </div>
      <div class="prediction-details">
        <small>Mean: ${pred.statistics.mean} | Median: ${pred.statistics.median} | StdDev: ${pred.statistics.std}</small>
      </div>
    `;
    
    resultsContainer.appendChild(ballDiv);
  });
}

/**
 * Create visual representation of confidence intervals
 */
function createConfidenceVisualization(prediction, rangeWidth) {
  return `
    <div class="confidence-bar">
      <div class="range-bar" style="width: ${rangeWidth}%">
        <div class="prediction-point"></div>
        <div class="confidence-area"></div>
      </div>
      <div class="range-labels">
        <span class="lower">${prediction.confidenceInterval.lower}</span>
        <span class="upper">${prediction.confidenceInterval.upper}</span>
      </div>
    </div>
  `;
}

/**
 * Display system statistics
 */
function displaySystemStatistics(systemStats) {
  const statsContainer = document.getElementById('confidence-stats');
  if (!statsContainer) return;
  
  // Clear previous stats
  while (statsContainer.firstChild) {
    statsContainer.removeChild(statsContainer.firstChild);
  }
  
  const statsHeader = document.createElement('h3');
  statsHeader.textContent = '📊 Statistical Summary';
  statsContainer.appendChild(statsHeader);
  
  // Data quality indicator
  const qualityDiv = document.createElement('div');
  qualityDiv.className = systemStats.dataQuality.sufficient ? 'data-quality-good' : 'data-quality-warning';
  qualityDiv.innerHTML = `
    <strong>Data Quality:</strong> ${systemStats.dataQuality.recommendation}
    <br><small>Analysis based on ${systemStats.totalDraws} historical draws</small>
  `;
  statsContainer.appendChild(qualityDiv);
  
  // Position statistics grid
  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';
  
  Object.entries(systemStats.positionStats).forEach(([position, stats]) => {
    const statCard = document.createElement('div');
    statCard.className = 'stat-card';
    
    const positionName = getPositionLabel(position);
    
    statCard.innerHTML = `
      <div class="stat-value">${stats.mean}</div>
      <div class="stat-label">${positionName} Average</div>
      <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #95a5a6;">
        Range: ${stats.range}<br>
        StdDev: ${stats.std}
      </div>
    `;
    
    statsGrid.appendChild(statCard);
  });
  
  statsContainer.appendChild(statsGrid);
}

/**
 * Update data quality display when new data is loaded
 */
function updateDataQualityDisplay(systemStats) {
  const statsContainer = document.getElementById('confidence-stats');
  if (!statsContainer) return;
  
  // Show basic data info even before generating predictions
  if (statsContainer.children.length === 0) {
    const infoDiv = document.createElement('div');
    infoDiv.className = systemStats.dataQuality.sufficient ? 'data-quality-good' : 'data-quality-warning';
    infoDiv.innerHTML = `
      <strong>Data Loaded:</strong> ${systemStats.totalDraws} historical draws available
      <br><small>${systemStats.dataQuality.recommendation}</small>
    `;
    statsContainer.appendChild(infoDiv);
  }
}

/**
 * Get human-readable position label
 */
function getPositionLabel(position, index = null) {
  const labels = {
    ball1: 'Ball 1 (Lowest)',
    ball2: 'Ball 2',
    ball3: 'Ball 3 (Middle)', 
    ball4: 'Ball 4',
    ball5: 'Ball 5 (Highest)',
    powerball: 'Powerball'
  };
  
  return labels[position] || `Ball ${index + 1}`;
}

/**
 * Capitalize first letter of string
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Export selected prediction for use in other systems
 */
export function exportConfidencePrediction() {
  const predictions = getCurrentPredictions();
  
  if (!predictions || predictions.length === 0) {
    showError('No Predictions', 'Generate a prediction first before exporting');
    return;
  }
  
  const exportData = {
    timestamp: new Date().toISOString(),
    predictions,
    method: document.getElementById('confidence-method').value,
    confidenceLevel: parseFloat(document.getElementById('confidence-level').value),
    dataQuality: currentPredictor?.getSystemStats()?.dataQuality
  };
  
  // Create downloadable JSON
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `confidence-prediction-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showSuccess('Export Complete', 'Confidence prediction exported successfully');
}

/**
 * Get current predictions from the UI (for integration with other systems)
 */
function getCurrentPredictions() {
  const results = document.getElementById('confidence-results');
  if (!results || !results.children.length) return null;
  
  const predictions = [];
  Array.from(results.children).forEach((ballDiv, index) => {
    const mainNumber = ballDiv.querySelector('.main-number')?.textContent;
    const confidenceRange = ballDiv.querySelector('.confidence-range')?.textContent;
    const position = ballDiv.classList.contains('powerball') ? 'powerball' : `ball${index + 1}`;
    
    if (mainNumber) {
      predictions.push({
        position,
        prediction: parseInt(mainNumber),
        confidenceRange,
        constraintAdjusted: ballDiv.classList.contains('constraint-adjusted')
      });
    }
  });
  
  return predictions;
}

// Export functions for external use
export { getCurrentPredictions };

// Browser compatibility
if (typeof window !== 'undefined') {
  window.initConfidenceUI = initConfidenceUI;
  window.exportConfidencePrediction = exportConfidencePrediction;
}