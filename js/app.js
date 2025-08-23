/**
 * LOTTERY ANALYSIS PRO - CORE APPLICATION
 * Version: 2.4.2 | Last Updated: 2025-08-21 02:45 PM EST
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
    temporalDecayRates: {
      none: 0.0,
      low: 0.05,
      medium: 0.1,
      high: 0.2,
      very_high: 0.3
    },
    analysisMethods: ['energy', 'frequency', 'ml', 'combined'],
    backtestSettings: {
      initialTrainingSize: 100,
      testWindowSize: 20,
      stepSize: 1,
      confidenceLevel: 0.95
    }
  };

  // ==================== STATE ==================== //
  const state = {
    draws: [],
    strategies: [],
    currentStrategy: null,
    currentMethod: 'combined',
    analysisHistory: [],
    isAnalyzing: false,
    temporalDecay: 'medium',
    decayRate: CONFIG.temporalDecayRates.medium,
    backtestResults: null
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
    temporalDecaySelector: document.createElement('select'),
    progressIndicator: document.createElement('div'),
    backtestResults: document.createElement('div')
  };

  // ==================== UTILITY FUNCTIONS ==================== //
  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  function validateAndGetFile(event) {
    const file = event.target.files[0];
    if (!file) {
      logError('No file selected for upload');
    }
    return file;
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

  // ==================== CSV PARSING ==================== //
  async function parseCSVWithPapaParse(content) {
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
          if (results.errors.length > 0) {
            reject(new Error(`CSV errors: ${results.errors.map(e => e.message).join(', ')}`));
            return;
          }

          try {
            state.draws = results.data
              .filter(row => row.length >= 10)
              .map(row => {
                const [mm, dd, yyyy, n1, n2, n3, n4, n5, n6, powerball] = row;
                
                const numbers = [n1, n2, n3, n4, n5, n6].map(Number);
                if (numbers.some(isNaN)) {
                  throw new Error('Invalid number format in CSV');
                }

                const date = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
                if (isNaN(date.getTime())) {
                  throw new Error(`Invalid date: ${yyyy}-${mm}-${dd}`);
                }

                return {
                  date: date,
                  numbers: numbers,
                  powerball: Number(powerball)
                };
              })
              .filter(draw => !isNaN(draw.powerball));

            elements.analyzeBtn.disabled = false;
            console.log(`Successfully parsed ${state.draws.length} draws`);
            resolve(state.draws);
            
          } catch (error) {
            reject(error);
          }
        },
        error: function(error) {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  }

  // ==================== INITIALIZATION FUNCTIONS ==================== //
  function initUIElements() {
    elements.methodSelector.id = 'method-selector';
    CONFIG.analysisMethods.forEach(method => {
      const option = document.createElement('option');
      option.value = method;
      option.textContent = method.charAt(0).toUpperCase() + method.slice(1);
      elements.methodSelector.appendChild(option);
    });
    elements.methodSelector.value = state.currentMethod;
    
    const energyPanel = document.getElementById('energy-panel');
    if (energyPanel) {
      const label = document.createElement('label');
      label.htmlFor = 'method-selector';
      label.textContent = 'Analysis Method: ';
      energyPanel.insertBefore(label, energyPanel.firstChild);
      energyPanel.insertBefore(elements.methodSelector, energyPanel.firstChild);
    }

    // Create and add temporal decay selector to control panel
    elements.temporalDecaySelector.id = 'temporal-decay';
    elements.temporalDecaySelector.className = 'temporal-selector';
    
    Object.entries(CONFIG.temporalDecayRates).forEach(([key, value]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
      if (key === 'medium') option.selected = true;
      elements.temporalDecaySelector.appendChild(option);
    });
    
    const temporalLabel = document.createElement('label');
    temporalLabel.htmlFor = 'temporal-decay';
    temporalLabel.textContent = 'Time Weighting: ';
    temporalLabel.className = 'temporal-label';
    
    // Add to control panel
    const controlPanel = document.querySelector('.control-panel');
    controlPanel.appendChild(temporalLabel);
    controlPanel.appendChild(elements.temporalDecaySelector);

    elements.progressIndicator.className = 'progress-indicator';
    elements.progressIndicator.style.display = 'none';
    document.body.appendChild(elements.progressIndicator);

    elements.backtestResults.id = 'backtest-results';
    elements.backtestResults.className = 'backtest-panel';
    document.body.appendChild(elements.backtestResults);
  }

  function initStrategies() {
    try {
      const saved = localStorage.getItem('lotteryStrategies');
      if (saved) {
        state.strategies = JSON.parse(saved);
        console.log(`Loaded ${state.strategies.length} strategies`);
      }
    } catch (error) {
      console.warn('Strategy loading failed:', error);
    }
  }

  function initEventListeners() {
    if (!elements.uploadInput || !elements.analyzeBtn) {
      console.error('Required elements missing');
      return;
    }

    elements.uploadInput.addEventListener('change', handleFileUpload);
    elements.analyzeBtn.addEventListener('click', runAnalysis);
    
    elements.temporalDecaySelector.addEventListener('change', (e) => {
      if (!CONFIG.temporalDecayRates[e.target.value]) {
        console.warn('Invalid temporal decay value:', e.target.value);
        e.target.value = 'medium';
        return;
      }
      
      state.temporalDecay = e.target.value;
      state.decayRate = CONFIG.temporalDecayRates[e.target.value];
      console.log(`Temporal decay set to: ${state.temporalDecay} (rate: ${state.decayRate})`);
    });
    elements.methodSelector.addEventListener('change', (e) => {
      state.currentMethod = e.target.value;
    });
  }

  // ==================== EVENT LISTENERS ==================== //
  document.addEventListener('DOMContentLoaded', () => {
    initUIElements();
    initEventListeners();
    initStrategies();
    console.log('App initialized successfully');
  });

  // ==================== CORE FUNCTIONS ==================== //
  function showProgress(message) {
    elements.progressIndicator.style.display = 'block';
    elements.progressIndicator.innerHTML = `
      <div class="progress-content">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
    elements.analyzeBtn.disabled = true;
    state.isAnalyzing = true;
  }

  function hideProgress() {
    elements.progressIndicator.style.display = 'none';
    elements.analyzeBtn.disabled = false;
    state.isAnalyzing = false;
  }

  async function handleFileUpload(event) {
    try {
      const file = validateAndGetFile(event);
      if (!file) return;

      if (!file.name.endsWith('.csv')) {
        throw new Error('Please upload a CSV file');
      }

      showProgress('Parsing CSV file...');
      const content = await readFileContent(file);
      await parseCSVWithPapaParse(content);
      hideProgress();
      
    } catch (error) {
      hideProgress();
      logError('File upload failed', error);
      resetFileInput();
    }
  }

  async function runAnalysis() {
    if (state.isAnalyzing) return;
    
    try {
      if (state.draws.length === 0) {
        throw new Error('Please upload CSV file first');
      }

      const analysisResults = await executeCompleteAnalysis();
      displayAnalysisResults(analysisResults);
      hideProgress();

    } catch (error) {
      hideProgress();
      logError('Analysis failed', error);
    }
  }

  async function executeCompleteAnalysis() {
    const analysisStartTime = Date.now();
    showProgress('Analyzing data...');
    console.log('Running', state.currentMethod, 'analysis on', state.draws.length, 'draws...');
    
    const allNumbers = Array.from({length: 69}, (_, i) => i + 1);
    const energyData = calculateEnergy(allNumbers, CONFIG.energyWeights);

    const mlPrediction = await getMLPrediction(state.draws, state.decayRate);
    const backtestResults = await runComprehensiveBacktesting(state.decayRate);
    state.backtestResults = backtestResults;

    // Calculate and add timing information
    const analysisTime = calculateAnalysisTime(analysisStartTime);
    if (state.backtestResults.available) {
      state.backtestResults.analysisTime = analysisTime.seconds;
    }

    return { energyData, mlPrediction, backtestResults, analysisTime };
  }

  function calculateAnalysisTime(startTime) {
    const analysisTime = Date.now() - startTime;
    const analysisTimeSeconds = (analysisTime / 1000).toFixed(1);
    console.log(`Analysis completed in ${analysisTimeSeconds} seconds`);
    return { milliseconds: analysisTime, seconds: analysisTimeSeconds };
  }

  function logError(title, error = null) {
    const timestamp = new Date().toISOString();
    if (error) {
      console.error(`[${timestamp}] Lottery Analysis Error: ${title}`, error);
    } else {
      console.error(`[${timestamp}] Lottery Analysis Error: ${title}`);
    }
  }

  // ==================== COMPREHENSIVE BACKTESTING ==================== //
  async function runComprehensiveBacktesting(decayRate) {
    if (state.draws.length < CONFIG.backtestSettings.initialTrainingSize + CONFIG.backtestSettings.testWindowSize) {
      return {
        available: false,
        message: `Need at least ${CONFIG.backtestSettings.initialTrainingSize + CONFIG.backtestSettings.testWindowSize} draws for backtesting`
      };
    }

    showProgress('Running comprehensive backtesting...');

    const results = {
      available: true,
      method: state.currentMethod,
      totalTests: 0,
      totalDrawsTested: 0,
      hits: { 3: 0, 4: 0, 5: 0, 6: 0 },
      simulations: [],
      performanceMetrics: {}
    };

    for (let i = CONFIG.backtestSettings.initialTrainingSize; i < state.draws.length - CONFIG.backtestSettings.testWindowSize; i += CONFIG.backtestSettings.stepSize) {
      const trainingData = state.draws.slice(0, i);
      const testData = state.draws.slice(i, i + CONFIG.backtestSettings.testWindowSize);

      for (let j = 0; j < testData.length - 1; j++) {
        const currentTestDraw = testData[j];
        const nextDraw = testData[j + 1];
        
        const historicalData = [...trainingData, ...testData.slice(0, j + 1)];
        const prediction = await getPredictionForBacktest(historicalData, decayRate);
        
        const matchedNumbers = nextDraw.numbers.filter(num => prediction.numbers.includes(num));
        const hitCount = matchedNumbers.length;
        
        if (hitCount >= 3) {
          results.hits[hitCount]++;
        }
        
        results.simulations.push({
          drawDate: nextDraw.date,
          predicted: prediction.numbers,
          actual: nextDraw.numbers,
          matched: matchedNumbers,
          hitCount: hitCount,
          confidence: prediction.confidence
        });
        
        results.totalTests++;
        results.totalDrawsTested++;
      }
    }

    results.performanceMetrics = calculatePerformanceMetrics(results);
    return results;
  }

  async function getPredictionForBacktest(draws, decayRate) {
    const allNumbers = Array.from({length: 69}, (_, i) => i + 1);
    const energyData = calculateEnergy(allNumbers, CONFIG.energyWeights);

    switch (state.currentMethod) {
      case 'energy':
        return { 
          numbers: energyData.sort((a, b) => b.energy - a.energy).slice(0, 10).map(n => n.number),
          confidence: 0.7, 
          model: 'energy' 
        };
      case 'frequency':
        return getFrequencyFallback(draws, decayRate);
      case 'ml':
        return await getMLPrediction(draws, decayRate);
      case 'combined':
      default:
        const mlResult = await getMLPrediction(draws, decayRate);
        return {
          numbers: [...new Set([...mlResult.numbers, ...energyData.sort((a, b) => b.energy - a.energy).slice(0, 5).map(n => n.number)])].slice(0, 10),
          confidence: (mlResult.confidence + 0.7) / 2,
          model: 'combined'
        };
    }
  }

  function calculatePerformanceMetrics(results) {
    const totalHits = Object.values(results.hits).reduce((sum, count) => sum + count, 0);
    const hitRate = results.totalTests > 0 ? totalHits / results.totalTests : 0;
    
    let totalPredictedNumbers = 0;
    let correctPredictions = 0;
    
    results.simulations.forEach(sim => {
      totalPredictedNumbers += sim.predicted.length;
      correctPredictions += sim.matched.length;
    });
    
    const precision = totalPredictedNumbers > 0 ? correctPredictions / totalPredictedNumbers : 0;
    
    let totalActualNumbers = 0;
    results.simulations.forEach(sim => {
      totalActualNumbers += sim.actual.length;
    });
    
    const recall = totalActualNumbers > 0 ? correctPredictions / totalActualNumbers : 0;
    
    const ticketCost = 2;
    const prizeMap = { 3: 10, 4: 100, 5: 1000, 6: 10000 };
    let totalSpent = results.totalTests * ticketCost;
    let totalWon = 0;
    
    Object.entries(results.hits).forEach(([hitCount, count]) => {
      if (prizeMap[hitCount]) {
        totalWon += count * prizeMap[hitCount];
      }
    });
    
    const roi = totalSpent > 0 ? ((totalWon - totalSpent) / totalSpent) * 100 : 0;
    
    return {
      hitRate: hitRate,
      precision: precision,
      recall: recall,
      totalSpent: totalSpent,
      totalWon: totalWon,
      roi: roi,
      hitDistribution: results.hits
    };
  }

  // ==================== ML & PREDICTION FUNCTIONS ==================== //
  async function getMLPrediction(draws = state.draws, decayRate = state.decayRate) {
    try {
      if (!window.lotteryML) {
        throw new Error('Machine Learning module not available');
      }
      
      if (draws.length >= 50 && window.lotteryML.status !== 'trained') {
        console.log('Training ML model with available data...');
        await window.lotteryML.trainLSTM(draws);
      }
      
      const prediction = await window.lotteryML.predictNextNumbers(draws, decayRate);
      return prediction;
      
    } catch (error) {
      console.warn('ML prediction failed, using fallback:', error);
      return getFrequencyFallback(draws, decayRate);
    }
  }

  function getFrequencyFallback(draws = state.draws, decayRate = state.decayRate) {
    // Use the new temporal functions for a better fallback
    const weightedDraws = applyTemporalWeighting(draws, decayRate);
    const frequencyMap = calculateTemporalFrequency(weightedDraws);
    
    const predictedNumbers = frequencyMap
      .map((count, number) => ({ number, count }))
      .filter(item => item.number >= 1 && item.number <= 69)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => item.number);

    return {
      numbers: predictedNumbers,
      confidence: 0.65,
      model: 'fallback_temporal_frequency',
      warning: 'Using temporal frequency-based fallback'
    };
  }

  // ==================== DISPLAY FUNCTIONS ==================== //
  function displayResults(energyData, mlPrediction, backtestResults) {
    try {
      displayEnergyResults(energyData, elements.energyResults);
      displayMLResults(mlPrediction, elements.mlResults);
      
      const recommendations = generateRecommendations(energyData, mlPrediction);
      displayRecommendations(recommendations);
      
      displayBacktestResults(backtestResults);
      
    } catch (error) {
      console.error('Display failed:', error);
    }
  }

  function generateRecommendations(energyData, mlPrediction) {
    const topEnergy = [...energyData].sort((a, b) => b.energy - a.energy).slice(0, 6);
    const mlNumbers = mlPrediction.numbers.slice(0, 6);
    
    return {
      highConfidence: findOverlap(topEnergy, mlNumbers),
      energyBased: topEnergy.map(n => n.number),
      mlBased: mlNumbers,
      summary: `Based on ${state.draws.length} historical draws`
    };
  }

  function findOverlap(energyArray, mlArray) {
    const energyNumbers = energyArray.map(item => item.number);
    return mlArray.filter(num => energyNumbers.includes(num));
  }

  function displayMLResults(mlPrediction, container) {
    const numbersWithSpaces = mlPrediction.numbers.map(num => 
      num.toString().padStart(2, '0')
    ).join(' ');
    
    container.innerHTML = `
      <div class="ml-prediction">
        <div class="confidence">Confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%</div>
        <div class="ml-numbers">${numbersWithSpaces}</div>
        <div class="model-info">Model: ${mlPrediction.model}</div>
        ${mlPrediction.warning ? `<div class="warning">${mlPrediction.warning}</div>` : ''}
      </div>
    `;
  }

  function displayRecommendations(recommendations) {
    if (!elements.recommendations) return;
    
    elements.recommendations.innerHTML = `
      <div class="recommendation-section">
        <h3>🎯 High Confidence Numbers</h3>
        <div class="number-grid">
          ${recommendations.highConfidence.map(num => 
            `<span class="number high-confidence">${num}</span>`
          ).join(' ')}
          ${recommendations.highConfidence.length === 0 ? 
            '<span class="no-data">No strong matches found</span>' : ''}
        </div>
      </div>
      
      <div class="recommendation-section">
        <h3>⚡ Energy-Based Numbers</h3>
        <div class="number-grid">
          ${recommendations.energyBased.map(num => 
            `<span class="number energy-based">${num}</span>`
          ).join(' ')}
        </div>
      </div>
      
      <div class="recommendation-section">
        <h3>🤖 ML-Based Numbers</h3>
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

})();