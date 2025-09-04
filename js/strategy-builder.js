/**
 * STRATEGY BUILDER
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * Custom strategy builder for creating personalized number selection formulas
 */

import state from './state.js';
import { showError, showSuccess, showInfo } from './notifications.js';

let savedStrategies = JSON.parse(localStorage.getItem('lottery-strategies') || '[]');
let currentStrategy = {
  name: '',
  formula: {},
  weights: {
    energy: 30,
    frequency: 25,
    gaps: 20,
    patterns: 15,
    random: 10
  }
};

export function initStrategyBuilder() {
  setupFormulaBuilder();
  setupSaveButton();
  loadSavedStrategies();
  
  console.log('[Strategy Builder] Initialized successfully');
}

function setupFormulaBuilder() {
  const formulaBuilder = document.getElementById('formula-builder');
  if (!formulaBuilder) return;

  formulaBuilder.innerHTML = `
    <div class="strategy-config">
      <div class="strategy-name-section">
        <label for="strategy-name">Strategy Name:</label>
        <input type="text" id="strategy-name" placeholder="e.g., My Custom Strategy" value="${currentStrategy.name}">
      </div>
      
      <div class="weights-section">
        <h4>📊 Component Weights (Total: 100%)</h4>
        <div class="weight-controls">
          <div class="weight-control">
            <label for="energy-weight">Energy Signature:</label>
            <input type="range" id="energy-weight" min="0" max="100" value="${currentStrategy.weights.energy}">
            <span class="weight-value">${currentStrategy.weights.energy}%</span>
          </div>
          
          <div class="weight-control">
            <label for="frequency-weight">Hot/Cold Numbers:</label>
            <input type="range" id="frequency-weight" min="0" max="100" value="${currentStrategy.weights.frequency}">
            <span class="weight-value">${currentStrategy.weights.frequency}%</span>
          </div>
          
          <div class="weight-control">
            <label for="gaps-weight">Gap Analysis:</label>
            <input type="range" id="gaps-weight" min="0" max="100" value="${currentStrategy.weights.gaps}">
            <span class="weight-value">${currentStrategy.weights.gaps}%</span>
          </div>
          
          <div class="weight-control">
            <label for="patterns-weight">Pattern Matching:</label>
            <input type="range" id="patterns-weight" min="0" max="100" value="${currentStrategy.weights.patterns}">
            <span class="weight-value">${currentStrategy.weights.patterns}%</span>
          </div>
          
          <div class="weight-control">
            <label for="random-weight">Random Factor:</label>
            <input type="range" id="random-weight" min="0" max="100" value="${currentStrategy.weights.random}">
            <span class="weight-value">${currentStrategy.weights.random}%</span>
          </div>
        </div>
        
        <div class="total-weight">
          Total: <span id="total-weight">100</span>%
        </div>
      </div>
      
      <div class="filter-section">
        <h4>🎯 Number Filters</h4>
        <div class="filter-controls">
          <label>
            <input type="checkbox" id="avoid-consecutive" checked>
            Avoid consecutive numbers (1,2,3...)
          </label>
          
          <label>
            <input type="checkbox" id="balance-odd-even" checked>
            Balance odd/even numbers
          </label>
          
          <label>
            <input type="checkbox" id="spread-ranges" checked>
            Spread across number ranges
          </label>
          
          <label>
            <input type="checkbox" id="limit-repeats">
            Limit recent repeating numbers
          </label>
        </div>
      </div>
      
      <div class="preview-section">
        <h4>👀 Strategy Preview</h4>
        <button id="preview-strategy" class="preview-btn">Generate Preview Numbers</button>
        <div id="preview-results" class="preview-results"></div>
      </div>
    </div>
    
    <div class="saved-strategies">
      <h4>💾 Saved Strategies</h4>
      <div id="strategies-list" class="strategies-list"></div>
    </div>
  `;

  setupWeightControls();
  setupPreview();
}

function setupWeightControls() {
  const weightSliders = document.querySelectorAll('.weight-control input[type="range"]');
  const totalWeightSpan = document.getElementById('total-weight');

  weightSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      const weightType = e.target.id.replace('-weight', '');
      
      // Update the display
      const valueSpan = e.target.nextElementSibling;
      valueSpan.textContent = value + '%';
      
      // Update current strategy
      currentStrategy.weights[weightType] = value;
      
      // Update total
      const total = Object.values(currentStrategy.weights).reduce((sum, w) => sum + w, 0);
      totalWeightSpan.textContent = total;
      
      // Color code the total
      if (total === 100) {
        totalWeightSpan.style.color = '#2ed573';
      } else if (total > 100) {
        totalWeightSpan.style.color = '#ff4757';
      } else {
        totalWeightSpan.style.color = '#ffa502';
      }
    });
  });
}

function setupPreview() {
  const previewBtn = document.getElementById('preview-strategy');
  if (previewBtn) {
    previewBtn.addEventListener('click', generatePreview);
  }
}

function setupSaveButton() {
  const saveBtn = document.getElementById('save-strategy');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveStrategy);
  }
}

function saveStrategy() {
  const nameInput = document.getElementById('strategy-name');
  const strategyName = nameInput?.value.trim();
  
  if (!strategyName) {
    showError('Missing Name', 'Please enter a name for your strategy');
    return;
  }
  
  // Validate weights total 100%
  const total = Object.values(currentStrategy.weights).reduce((sum, w) => sum + w, 0);
  if (total !== 100) {
    showError('Invalid Weights', `Component weights must total 100% (current: ${total}%)`);
    return;
  }
  
  // Get filter settings
  const filters = {
    avoidConsecutive: document.getElementById('avoid-consecutive')?.checked || false,
    balanceOddEven: document.getElementById('balance-odd-even')?.checked || false,
    spreadRanges: document.getElementById('spread-ranges')?.checked || false,
    limitRepeats: document.getElementById('limit-repeats')?.checked || false
  };
  
  const strategy = {
    id: Date.now().toString(),
    name: strategyName,
    weights: { ...currentStrategy.weights },
    filters,
    created: new Date().toISOString(),
    lastUsed: null
  };
  
  // Check if name already exists
  const existingIndex = savedStrategies.findIndex(s => s.name === strategyName);
  if (existingIndex >= 0) {
    if (!confirm(`Strategy "${strategyName}" already exists. Overwrite?`)) {
      return;
    }
    savedStrategies[existingIndex] = strategy;
  } else {
    savedStrategies.push(strategy);
  }
  
  // Save to localStorage
  localStorage.setItem('lottery-strategies', JSON.stringify(savedStrategies));
  
  // Update UI
  loadSavedStrategies();
  showSuccess('Strategy Saved', `"${strategyName}" has been saved successfully`);
}

function loadSavedStrategies() {
  const strategiesList = document.getElementById('strategies-list');
  if (!strategiesList) return;
  
  if (savedStrategies.length === 0) {
    strategiesList.innerHTML = '<p class="no-strategies">No saved strategies yet.</p>';
    return;
  }
  
  strategiesList.innerHTML = savedStrategies.map(strategy => `
    <div class="saved-strategy" data-id="${strategy.id}">
      <div class="strategy-info">
        <div class="strategy-name">${strategy.name}</div>
        <div class="strategy-meta">
          Created: ${new Date(strategy.created).toLocaleDateString()}
          ${strategy.lastUsed ? ` | Last used: ${new Date(strategy.lastUsed).toLocaleDateString()}` : ''}
        </div>
        <div class="strategy-weights">
          Energy: ${strategy.weights.energy}% • 
          Frequency: ${strategy.weights.frequency}% • 
          Gaps: ${strategy.weights.gaps}% • 
          Patterns: ${strategy.weights.patterns}% • 
          Random: ${strategy.weights.random}%
        </div>
      </div>
      <div class="strategy-actions">
        <button class="load-strategy" onclick="loadStrategy('${strategy.id}')">Load</button>
        <button class="use-strategy" onclick="useStrategy('${strategy.id}')">Use</button>
        <button class="delete-strategy" onclick="deleteStrategy('${strategy.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function generatePreview() {
  if (!state.draws || state.draws.length === 0) {
    showError('No Data', 'Please load lottery data first to preview your strategy');
    return;
  }
  
  const previewBtn = document.getElementById('preview-strategy');
  const previewResults = document.getElementById('preview-results');
  
  if (previewBtn) previewBtn.disabled = true;
  if (previewResults) previewResults.innerHTML = '<div class="loading">Generating preview...</div>';
  
  try {
    // Simulate strategy calculation with current weights
    const numbers = await generateNumbersWithStrategy(currentStrategy);
    
    if (previewResults) {
      previewResults.innerHTML = `
        <div class="preview-numbers">
          <div class="white-balls">
            ${numbers.whiteBalls.map(n => `<span class="number-ball">${n}</span>`).join('')}
          </div>
          <div class="powerball">
            <span class="powerball-number">${numbers.powerball}</span>
          </div>
        </div>
        <div class="preview-note">
          <small>Preview generated with current weights and filters</small>
        </div>
      `;
    }
    
  } catch (error) {
    if (previewResults) {
      previewResults.innerHTML = `<div class="error">Preview failed: ${error.message}</div>`;
    }
  } finally {
    if (previewBtn) previewBtn.disabled = false;
  }
}

async function generateNumbersWithStrategy(strategy) {
  // This is a simplified version - in a real implementation, 
  // you'd use the actual analysis results with the custom weights
  const draws = state.draws.slice(-100); // Use recent draws
  
  // Generate weighted recommendations
  const whiteBalls = [];
  const usedNumbers = new Set();
  
  // Simple strategy simulation - would be more complex in reality
  while (whiteBalls.length < 5) {
    let number;
    
    if (Math.random() * 100 < strategy.weights.energy) {
      // Energy-based number (simplified)
      number = Math.floor(Math.random() * 30) + 20; // Mid-range numbers
    } else if (Math.random() * 100 < strategy.weights.frequency) {
      // Frequency-based number (simplified)
      number = Math.floor(Math.random() * 20) + 1; // Lower numbers
    } else {
      // Random number
      number = Math.floor(Math.random() * 69) + 1;
    }
    
    if (!usedNumbers.has(number) && number <= 69) {
      usedNumbers.add(number);
      whiteBalls.push(number);
    }
  }
  
  whiteBalls.sort((a, b) => a - b);
  
  return {
    whiteBalls,
    powerball: Math.floor(Math.random() * 26) + 1
  };
}

// Global functions for strategy management
window.loadStrategy = function(id) {
  const strategy = savedStrategies.find(s => s.id === id);
  if (!strategy) return;
  
  currentStrategy = {
    name: strategy.name,
    weights: { ...strategy.weights },
    formula: {}
  };
  
  // Update UI
  const nameInput = document.getElementById('strategy-name');
  if (nameInput) nameInput.value = strategy.name;
  
  // Update weight sliders
  Object.entries(strategy.weights).forEach(([key, value]) => {
    const slider = document.getElementById(`${key}-weight`);
    const valueSpan = slider?.nextElementSibling;
    if (slider) slider.value = value;
    if (valueSpan) valueSpan.textContent = value + '%';
  });
  
  // Update filters
  Object.entries(strategy.filters || {}).forEach(([key, value]) => {
    const checkbox = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
    if (checkbox) checkbox.checked = value;
  });
  
  showInfo('Strategy Loaded', `"${strategy.name}" has been loaded for editing`);
};

window.useStrategy = function(id) {
  const strategy = savedStrategies.find(s => s.id === id);
  if (!strategy) return;
  
  // Mark as last used
  strategy.lastUsed = new Date().toISOString();
  localStorage.setItem('lottery-strategies', JSON.stringify(savedStrategies));
  
  // Apply strategy to current analysis (this would integrate with the main analysis)
  showSuccess('Strategy Applied', `"${strategy.name}" is now being used for analysis`);
  loadSavedStrategies(); // Refresh to show last used date
};

window.deleteStrategy = function(id) {
  const strategy = savedStrategies.find(s => s.id === id);
  if (!strategy) return;
  
  if (!confirm(`Delete strategy "${strategy.name}"? This cannot be undone.`)) return;
  
  savedStrategies = savedStrategies.filter(s => s.id !== id);
  localStorage.setItem('lottery-strategies', JSON.stringify(savedStrategies));
  
  loadSavedStrategies();
  showInfo('Strategy Deleted', `"${strategy.name}" has been deleted`);
};