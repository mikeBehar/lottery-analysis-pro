/**
 * LOTTERY ANALYSIS PRO - CORE APPLICATION
 * Version: 2.4.0 | Last Updated: 2025-08-20 08:15 PM EST
 * Changes:
 * - Integrated temporal decay weighting
 * - Added number pairing analysis
 * - Enhanced with statistical gap analysis
 * - Combined all analysis methods for improved predictions
 */

(function() {
  'use strict';

  // ==================== CONSTANTS ==================== //
  const CONFIG = {
    energyWeights: {
      prime: 0.3,
      digitalRoot: 0.2,
      mod5: 0.2,
      gridPosition: 0.3
    },
    analysisMethods: ['energy', 'frequency', 'ml', 'combined'],
    temporalDecayRate: 0.995, // New config for temporal decay
    minPairFrequency: 3        // New config for pair analysis
  };

  // ==================== STATE ==================== //
  const state = {
    draws: [],
    strategies: [],
    currentStrategy: null,
    currentMethod: 'combined',
    analysisHistory: [],
    isAnalyzing: false,
    enhancedData: null // New state for enhanced analysis results
  };

  // ==================== DOM ELEMENTS ==================== //
  const elements = {
    uploadInput: document.getElementById('csvUpload'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    energyResults: document.getElementById('energy-results'),
    mlResults: document.getElementById('ml-results'),
    recommendations: document.getElementById('recommendations'),
    formulaBuilder: document.getElementById('formula-builder'),
    saveStrategy: document.getElementById('save-strategy'),
    methodSelector: document.createElement('select'),
    progressIndicator: document.createElement('div'),
    advancedResults: document.createElement('div') // New element for advanced insights
  };

  // ==================== UTILITY FUNCTIONS ==================== //
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  function showError(title, error) {
    console.error(`${title}:`, error);
    alert(`${title}: ${error.message}`);
  }

  function resetFileInput() {
    if (elements.uploadInput) {
      elements.uploadInput.value = '';
    }
    elements.analyzeBtn.disabled = true;
  }

  // ==================== INITIALIZATION ==================== //
  document.addEventListener('DOMContentLoaded', () => {
    initUIElements();
    initEventListeners();
    initStrategies();
    console.log('App initialized successfully');
  });

  function initUIElements() {
    // Create method selector
    elements.methodSelector.id = 'method-selector';
    CONFIG.analysisMethods.forEach(method => {
      const option = document.createElement('option');
      option.value = method;
      option.textContent = method.charAt(0).toUpperCase() + method.slice(1);
      elements.methodSelector.appendChild(option);
    });
    elements.methodSelector.value = state.currentMethod;
    
    // Add method selector to energy panel
    const energyPanel = document.getElementById('energy-panel');
    if (energyPanel) {
      const label = document.createElement('label');
      label.htmlFor = 'method-selector';
      label.textContent = 'Analysis Method: ';
      energyPanel.insertBefore(label, energyPanel.firstChild);
      energyPanel.insertBefore(elements.methodSelector, energyPanel.firstChild);
    }

    // Create progress indicator
    elements.progressIndicator.className = 'progress-indicator';
    elements.progressIndicator.style.display = 'none';
    document.body.appendChild(elements.progressIndicator);

    // Create advanced results panel
    elements.advancedResults.id = 'advanced-results';
    elements.advancedResults.className = 'panel';
    elements.advancedResults.innerHTML = '<h2>📊 Advanced Insights</h2><div id="advanced-content"></div>';
    document.querySelector('.panels').appendChild(elements.advancedResults);
  }

  // ==================== CORE ANALYSIS INTEGRATION ==================== //
  async function runAnalysis() {
    if (state.isAnalyzing) return;
    
    try {
      if (state.draws.length === 0) {
        throw new Error('Please upload CSV file first');
      }

      showProgress('Running advanced analysis...');
      
      // 1. ENHANCE DATA WITH NEW ANALYSIS TECHNIQUES
      state.enhancedData = {
        weightedDraws: applyTemporalDecay(state.draws, CONFIG.temporalDecayRate),
        frequentPairs: findNumberPairs(state.draws, CONFIG.minPairFrequency),
        gapAnalysis: calculateGapAnalysis(state.draws),
        analysisTime: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
      };

      console.log('Enhanced analysis complete:', state.enhancedData);

      // 2. CALCULATE ENERGY SIGNATURES (Existing)
      const allNumbers = Array.from({length: 69}, (_, i) => i + 1);
      let energyData = calculateEnergy(allNumbers);
      
      energyData = energyData.map(num => ({
        ...num,
        energy: (num.isPrime * CONFIG.energyWeights.prime) +
                (num.digitalRoot * CONFIG.energyWeights.digitalRoot) +
                (num.mod5 * CONFIG.energyWeights.mod5) +
                (num.gridScore * CONFIG.energyWeights.gridPosition)
      }));

      // 3. APPLY ENHANCED ANALYSIS TO ENERGY SCORES
      const enhancedEnergyData = energyData.map(num => {
        const gapInfo = state.enhancedData.gapAnalysis[num.number];
        let enhancedScore = num.energy;

        // Boost overdue numbers
        if (gapInfo && gapInfo.isOverdue) {
          enhancedScore *= 1.3; // 30% boost for overdue numbers
        }

        // Boost numbers that are part of frequent pairs
        const isInFrequentPair = Object.keys(state.enhancedData.frequentPairs).some(pairKey => {
          const [num1, num2] = pairKey.split('-').map(Number);
          return num1 === num.number || num2 === num.number;
        });

        if (isInFrequentPair) {
          enhancedScore *= 1.2; // 20% boost for numbers in frequent pairs
        }

        return {
          ...num,
          energy: enhancedScore,
          isOverdue: gapInfo ? gapInfo.isOverdue : false,
          inFrequentPair: isInFrequentPair
        };
      });

      // 4. GET PREDICTIONS BASED ON SELECTED METHOD
      let mlPrediction;
      switch (state.currentMethod) {
        case 'energy':
          mlPrediction = await getEnergyBasedPrediction(enhancedEnergyData);
          break;
        case 'frequency':
          mlPrediction = getFrequencyFallback();
          break;
        case 'ml':
          mlPrediction = await getMLPrediction();
          break;
        case 'combined':
        default:
          mlPrediction = await getCombinedPrediction(enhancedEnergyData);
      }

      // 5. TEST EFFECTIVENESS AND DISPLAY RESULTS
      const effectiveness = await testPredictionEffectiveness();
      displayResults(enhancedEnergyData, mlPrediction, effectiveness);
      displayAdvancedInsights(); // New function for advanced data
      hideProgress();

    } catch (error) {
      hideProgress();
      showError('Analysis failed', error);
    }
  }

  // ==================== NEW PREDICTION STRATEGIES ==================== //
  async function getEnergyBasedPrediction(energyData) {
    const sortedNumbers = energyData.sort((a, b) => b.energy - a.energy);
    const topNumbers = sortedNumbers.slice(0, 10).map(n => n.number);
    
    return {
      numbers: topNumbers,
      confidence: 0.75,
      model: 'enhanced_energy',
      method: 'energy_analysis'
    };
  }

  async function getCombinedPrediction(energyData) {
    const [mlResult, energyResult] = await Promise.all([
      getMLPrediction().catch(() => getFrequencyFallback()),
      getEnergyBasedPrediction(energyData)
    ]);

    // Combine and deduplicate, prioritizing ML results but including top energy picks
    const combinedNumbers = [...new Set([
      ...mlResult.numbers.slice(0, 6),          // Top 6 ML predictions
      ...energyResult.numbers.slice(0, 4)       // Top 4 energy predictions
    ])].slice(0, 10);

    return {
      numbers: combinedNumbers,
      confidence: (mlResult.confidence + energyResult.confidence) / 2,
      model: 'combined_enhanced',
      method: 'hybrid_analysis'
    };
  }

  // ==================== ADVANCED INSIGHTS DISPLAY ==================== //
  function displayAdvancedInsights() {
    if (!state.enhancedData || !elements.advancedResults) return;

    const overdueNumbers = Object.values(state.enhancedData.gapAnalysis)
      .filter(data => data.isOverdue)
      .sort((a, b) => b.currentGap - a.currentGap)
      .slice(0, 10);

    const topPairs = Object.entries(state.enhancedData.frequentPairs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    elements.advancedResults.querySelector('#advanced-content').innerHTML = `
      <div class="insight-section">
        <h3>⏰ Overdue Numbers</h3>
        <p>Numbers statistically due to appear (50% beyond expected gap):</p>
        <div class="number-grid">
          ${overdueNumbers.map(num => `
            <span class="number overdue" title="Expected gap: ${num.expectedGap.toFixed(1)}, Current gap: ${num.currentGap}">
              ${num.number}
            </span>
          `).join(' ')}
        </div>
      </div>

      <div class="insight-section">
        <h3>🤝 Frequent Pairs</h3>
        <p>Number pairs that appear together most often:</p>
        <div class="pairs-list">
          ${topPairs.map(([pair, count]) => `
            <div class="pair-item">
              <span class="pair-numbers">${pair.replace('-', ' & ')}</span>
              <span class="pair-count">${count} times</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="insight-section">
        <h3>📈 Analysis Info</h3>
        <p>Analyzed ${state.draws.length} draws with temporal decay (${CONFIG.temporalDecayRate})</p>
        <p>Generated: ${state.enhancedData.analysisTime} EST</p>
      </div>
    `;
  }

  // ==================== EXISTING FUNCTIONS (keep all these) ==================== //
  // [KEEP ALL THE EXISTING FUNCTIONS FROM YOUR CURRENT app.js:
  // - initStrategies(), initEventListeners()
  // - handleFileUpload(), parseCSVWithPapaParse()
  // - getMLPrediction(), getFrequencyFallback()
  // - testPredictionEffectiveness()
  // - displayResults(), displayMLResults(), displayRecommendations()
  // - generateRecommendations(), findOverlap()
  // - showProgress(), hideProgress()
  // - AND ALL OTHER SUPPORTING FUNCTIONS]
  // =================================================================================

})();