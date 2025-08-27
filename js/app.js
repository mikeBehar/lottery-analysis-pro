


// LOTTERY ANALYSIS PRO - CORE APPLICATION
// Version: 2.4.2 | Last Updated: 2025-08-21 02:45 PM EST
//
// NOTE: For the correct CSV draw format, see the top of task_list/task_tracking.md

(function() {
  // ==================== DOM ELEMENTS ==================== //
  const elements = {
    methodSelector: document.createElement('select'),
    temporalDecaySelector: document.createElement('select'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    uploadInput: document.getElementById('csvUpload'),
    progressIndicator: document.createElement('div'),
    backtestResults: document.createElement('div'),
    recommendations: document.getElementById('recommendations'),
    // Add more as needed for your UI
  };
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
  backtestResults: null,
  isCancelled: false,
  activeWorkers: null
};

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
  const DEBUG = true;

  function readFileContent(file) {
    if (DEBUG) console.log('readFileContent: called', file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (DEBUG) console.log('readFileContent: onload', e);
        resolve(e.target.result);
      };
      reader.onerror = (e) => {
        if (DEBUG) console.log('readFileContent: onerror', e);
        reject(e);
      };
      reader.readAsText(file);
    });
  }

  async function parseCSVWithPapaParse(content) {
    if (DEBUG) console.log('parseCSVWithPapaParse: called');
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
          if (DEBUG) console.log('parseCSVWithPapaParse: Papa.parse complete', results);
          if (results.errors.length > 0) {
            reject(new Error(`CSV errors: ${results.errors.map(e => e.message).join(', ')}`));
            return;
          }
          try {
            state.draws = results.data
              .filter(row => row.length >= 10)
              .map(row => {
                // mm, dd, yyyy, n1, n2, n3, n4, n5, powerball, multiplier
                const [mm, dd, yyyy, n1, n2, n3, n4, n5, powerball, multiplier] = row;
                const whiteBalls = [n1, n2, n3, n4, n5].map(Number);
                const redBall = Number(powerball);
                // Validate white balls
                if (whiteBalls.some(isNaN) || new Set(whiteBalls).size !== 5 || whiteBalls.some(n => n < 1 || n > 69)) {
                  throw new Error('Invalid white ball numbers in CSV');
                }
                // Validate red ball
                if (isNaN(redBall) || redBall < 1 || redBall > 26) {
                  throw new Error('Invalid Powerball (red ball) number in CSV');
                }
                const date = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
                if (isNaN(date.getTime())) {
                  throw new Error(`Invalid date: ${yyyy}-${mm}-${dd}`);
                }
                return {
                  date: date,
                  whiteBalls: whiteBalls,
                  powerball: redBall
                  // multiplier: Number(multiplier) // present but ignored
                };
              })
              .filter(draw => !isNaN(draw.powerball));
            setAnalyzeBtnState(true); // enable and turn green
            if (DEBUG) console.log(`Successfully parsed ${state.draws.length} draws`);
            resolve(state.draws);
          } catch (error) {
            reject(error);
          }
        },
        error: function(error) {
          if (DEBUG) console.log('parseCSVWithPapaParse: Papa.parse error', error);
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  }
// ==================== INITIALIZATION FUNCTIONS ==================== //
  function initUIElements() {
  // ==================== INITIALIZATION FUNCTIONS ==================== //
    // Create and add Powerball results container if not present
    if (!elements.powerballResults) {
      elements.powerballResults = document.getElementById('powerball-results');
      if (!elements.powerballResults) {
        elements.powerballResults = document.createElement('div');
        elements.powerballResults.id = 'powerball-results';
        elements.powerballResults.className = 'powerball-panel';
        // Insert after recommendations if present, else at end of body
        if (elements.recommendations && elements.recommendations.parentNode) {
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
    
    // Create cancel button
    elements.cancelBtn = document.createElement('button');
    elements.cancelBtn.id = 'cancel-analysis';
    elements.cancelBtn.textContent = 'Cancel Analysis';
    elements.cancelBtn.className = 'cancel-btn';
    elements.cancelBtn.style.display = 'none';
    controlPanel.appendChild(elements.cancelBtn);
    
    // Create progress text element
    elements.progressText = document.createElement('div');
    elements.progressText.id = 'progress-text';
    elements.progressText.className = 'progress-text';
    document.querySelector('header').appendChild(elements.progressText);

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


  function cancelAnalysis() {
    state.isCancelled = true;
    cancelAllWorkers();
    hideProgress();
    updateProgress('Analysis cancelled');
    setTimeout(() => {
      elements.progressText.textContent = '';
    }, 2000);
  }

  function initEventListeners() {
    console.log('initEventListeners:');
    console.log('  uploadInput:', elements.uploadInput);
    console.log('  analyzeBtn:', elements.analyzeBtn);
    if (!elements.uploadInput || !elements.analyzeBtn) {
      console.error('Required elements missing');
      return;
    }

    elements.uploadInput.addEventListener('change', (e) => {
      console.log('uploadInput change event fired');
      handleFileUpload(e);
    });
    elements.analyzeBtn.addEventListener('click', (e) => {
      console.log('analyzeBtn click event fired');
      runAnalysis(e);
    });

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
    elements.cancelBtn.addEventListener('click', cancelAnalysis);
  }

  // ==================== EVENT LISTENERS ==================== //
  document.addEventListener('DOMContentLoaded', () => {
    initUIElements();
    initEventListeners();
    initStrategies();
    console.log('App initialized successfully');
    setAnalyzeBtnState(false); // Ensure initial state and text is 'Waiting'
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
    showCancelButton();
  }

  function hideProgress() {
    elements.progressIndicator.style.display = 'none';
    elements.cancelBtn.style.display = 'none';
    elements.progressText.textContent = '';
    elements.analyzeBtn.disabled = false;
    state.isAnalyzing = false;
    cancelAllWorkers();
  }

  async function handleFileUpload(event) {
    try {
      console.log('handleFileUpload: event', event);
      if (!event || !event.target || !event.target.files) {
        console.log('handleFileUpload: event missing target/files');
        return;
      }
      const file = event.target.files[0];
      console.log('handleFileUpload: file from event', file);
      if (!file) {
        console.log('handleFileUpload: no file found');
        return;
      }
      if (!file.name.endsWith('.csv')) {
        console.log('handleFileUpload: file is not .csv');
        throw new Error('Please upload a CSV file');
      }
      showProgress('Parsing CSV file...');
      const content = await readFileContent(file);
      // CSV parsing and state.draws assignment is handled in parseCSVWithPapaParse
      await parseCSVWithPapaParse(content);
    } catch (error) {
      console.error('handleFileUpload error:', error);
      showError('File Upload Error', error);
    }
  // Add debug logging to analysis flow
  async function runAnalysis() {
    if (DEBUG) console.log('runAnalysis called');
    if (state.isAnalyzing) return;
    // Clear previous results and reset state
    if (elements.mlResults) elements.mlResults.innerHTML = '';
    if (elements.recommendations) elements.recommendations.innerHTML = '';
    if (elements.backtestResults) elements.backtestResults.innerHTML = '';
    state.isCancelled = false;
    try {
      if (state.draws.length === 0) {
        throw new Error('Please upload CSV file first');
      }
      if (DEBUG) console.log('runAnalysis: executing complete analysis');
      const analysisResults = await executeCompleteAnalysis();
      if (DEBUG) console.log('runAnalysis: analysisResults', analysisResults);
      console.log('[Debug] runAnalysis: about to call displayAnalysisResults with:', analysisResults);
      displayAnalysisResults(analysisResults);
      if (DEBUG) console.log('runAnalysis: displayAnalysisResults called');
      hideProgress();
    }
    catch (error) {
      console.error('[Debug] runAnalysis: caught error:', error);
      hideProgress();
      logError('Analysis failed', error);
      // Show placeholder if cancelled or failed
      if (elements.mlResults) elements.mlResults.innerHTML = '<div class="ml-prediction warning">No predictions available.</div>';
      if (elements.recommendations) elements.recommendations.innerHTML = '<div class="recommendation-section warning">No recommendations available.</div>';
    }
  }

  async function executeCompleteAnalysis() {
    const analysisStartTime = Date.now();
    showProgress('Analyzing data...');
                console.log(`Successfully parsed ${state.draws.length} draws`);
    console.log('Running', state.currentMethod, 'analysis on', state.draws.length, 'draws...');
    
    const allNumbers = Array.from({length: 69}, (_, i) => i + 1);
    const energyData = calculateEnergy(allNumbers, CONFIG.energyWeights);

  const mlPrediction = await getMLPrediction(state.draws, state.decayRate);
  // Removed stray reference to undefined 'error' variable
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
      return createInsufficientDataResponse();
    }
    updateProgress('Initializing backtesting worker...');
    return new Promise((resolve, reject) => {
      const backtestWorker = new Worker('js/workers/backtest-worker.js');
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
            reject(new Error(data.message));
            break;
        }
      };
      backtestWorker.onerror = function(error) {
        responded = true;
        state.activeWorkers.delete('backtest');
        reject(error);
      };
      // Ensure a message is always posted back, even if worker is terminated
      backtestWorker.onclose = function() {
        if (!responded) {
          state.activeWorkers.delete('backtest');
          reject(new Error('Worker terminated before response.'));
        }
      };
      backtestWorker.postMessage({
        draws: state.draws,
        decayRate: decayRate,
        method: state.currentMethod,
        config: CONFIG.backtestSettings
      });
    });
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
    if (draws.length < 50) {
      return getFrequencyFallback(draws, decayRate);
    }
    updateProgress('Running ML prediction...');
    // Predict white balls and powerball independently
    return new Promise((resolve, reject) => {
      const mlWorker = new Worker('js/workers/ml-worker.js');
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
            // Expect data.prediction = { whiteBalls: [...], powerball: n, confidence, model }
            resolve(data.prediction);
            break;
          case 'error':
            state.activeWorkers.delete('ml');
            console.warn('[App] ML worker error:', data.message);
            resolve(getFrequencyFallback(draws, decayRate));
            break;
        }
      };
      mlWorker.onerror = function(error) {
        state.activeWorkers.delete('ml');
        console.error('[App] ML worker onerror:', error);
        resolve(getFrequencyFallback(draws, decayRate));
      };
      mlWorker.postMessage({
        draws: draws,
        decayRate: decayRate
      });
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

  function displayRecommendations(recommendations) {
  if (DEBUG) console.log('displayRecommendations called', recommendations);
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

  function cancelAnalysis() {
    state.isCancelled = true;
    cancelAllWorkers();
    hideProgress();
    updateProgress('Analysis cancelled');
    setTimeout(() => {
      elements.progressText.textContent = '';
    }, 2000);
  }

  function updateProgress(message, percentage = null) {
    if (elements.progressText) {
      elements.progressText.textContent = message;
      if (percentage !== null) {
        elements.progressText.textContent += ` (${percentage}%)`;
      }
    }
  }

  function cancelAllWorkers() {
    if (!state.activeWorkers) return;
    state.activeWorkers.forEach((worker, key) => {
      worker.terminate();
      if (key === 'backtest' || key === 'ml') {
        // Also send cancel message for graceful shutdown
        try { worker.postMessage({ type: 'cancel' }); } catch (e) {}
      }
      console.log(`Terminated ${key} worker`);
    });
    state.activeWorkers.clear();
  }



// --- Analyze Button Visual State ---
function setAnalyzeBtnState(enabled) {
  if (!elements.analyzeBtn) return;
  elements.analyzeBtn.disabled = !enabled;
  if (enabled) {
    elements.analyzeBtn.style.backgroundColor = '#27ae60'; // green
    elements.analyzeBtn.style.color = '#fff';
    elements.analyzeBtn.textContent = 'Analyze Now';
  } else {
    elements.analyzeBtn.style.backgroundColor = '#c0392b'; // red
    elements.analyzeBtn.style.color = '#fff';
    elements.analyzeBtn.textContent = 'Waiting';
  }
}

  // --- Analyze Button Visual State ---
  // Set initial button color to red (disabled)
  if (elements.analyzeBtn) {
    elements.analyzeBtn.style.backgroundColor = '#c0392b'; // red
    elements.analyzeBtn.style.color = '#fff';
  }

  // --- Cancel Button Display ---
  function showCancelButton() {
    if (elements.cancelBtn) {
      elements.cancelBtn.style.display = 'inline-block';
    }
  }
  function hideCancelButton() {
    if (elements.cancelBtn) {
      elements.cancelBtn.style.display = 'none';
    }
  }

  // --- Always Display Current Predictions ---
  // In displayAnalysisResults or after analysis, ensure predictions are shown:
  function displayAnalysisResults(analysisResults) {
  if (DEBUG) console.log('displayAnalysisResults called', analysisResults);
  console.log('[Debug] displayAnalysisResults: called with', analysisResults);
  if (!analysisResults) {
    console.warn('[Debug] displayAnalysisResults: analysisResults is null or undefined');
    return;
  }
  const keys = Object.keys(analysisResults);
  console.log('[Debug] displayAnalysisResults: analysisResults keys:', keys);
  if (!analysisResults.mlPrediction) {
    console.warn('[Debug] displayAnalysisResults: analysisResults.mlPrediction is missing or falsy');
  }
  if (!elements.mlResults) {
    console.warn('[Debug] displayAnalysisResults: elements.mlResults is missing or falsy');
  }

  if (analysisResults && analysisResults.mlPrediction && elements.mlResults) {
    displayMLResults(analysisResults.mlPrediction, elements.mlResults);
    if (analysisResults.energyData && elements.recommendations) {
      const recommendations = generateRecommendations(analysisResults.energyData, analysisResults.mlPrediction);
      displayRecommendations(recommendations);
    } else {
      if (!analysisResults.energyData) {
        console.warn('[Debug] displayAnalysisResults: analysisResults.energyData is missing or falsy');
      }
      if (!elements.recommendations) {
        console.warn('[Debug] displayAnalysisResults: elements.recommendations is missing or falsy');
      }
    }
  } else {
    console.warn('[Debug] displayAnalysisResults: condition for displaying ML results not met');
  }
}
  }
})();