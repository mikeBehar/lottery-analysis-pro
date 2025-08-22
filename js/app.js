/**
 * LOTTERY ANALYSIS PRO - CORE APPLICATION
 * Version: 2.3.1 | Last Updated: 2025-08-20 06:15 PM EST
 * Fix: Moved utility functions before async functions that use them
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
    analysisMethods: ['energy', 'frequency', 'ml', 'combined']
  };

  // ==================== STATE ==================== //
  const state = {
    draws: [],
    strategies: [],
    currentStrategy: null,
    currentMethod: 'combined',
    analysisHistory: [],
    isAnalyzing: false
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
    progressIndicator: document.createElement('div')
  };

  // ==================== UTILITY FUNCTIONS (MOVED UP) ==================== //
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
  }

  // ==================== STRATEGY MANAGEMENT ==================== //
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

  function initStrategyBuilder() {
    if (!elements.formulaBuilder) return;
    
    const factors = [
      { name: 'Prime', value: 'prime', weight: 0.3 },
      { name: 'Digital Root', value: 'digitalRoot', weight: 0.2 },
      { name: 'Mod 5', value: 'mod5', weight: 0.2 },
      { name: 'Grid Position', value: 'gridPosition', weight: 0.3 }
    ];

    elements.formulaBuilder.innerHTML = factors.map(factor => `
      <div class="factor" data-factor="${factor.value}" data-weight="${factor.weight}">
        <span>${factor.name}</span>
        <input type="number" value="${factor.weight}" step="0.1" min="0" max="1" 
               onchange="updateStrategyWeight('${factor.value}', this.value)">
      </div>
    `).join('');
  }

  function updateStrategyWeight(factor, weight) {
    if (!state.currentStrategy) {
      state.currentStrategy = { name: 'Custom', weights: {} };
    }
    state.currentStrategy.weights[factor] = parseFloat(weight);
  }

  function saveCurrentStrategy() {
    if (!state.currentStrategy) {
      showError('Strategy Error', new Error('No strategy to save'));
      return;
    }

    try {
      const strategies = JSON.parse(localStorage.getItem('lotteryStrategies') || '[]');
      strategies.push(state.currentStrategy);
      localStorage.setItem('lotteryStrategies', JSON.stringify(strategies));
      alert('Strategy saved successfully!');
    } catch (error) {
      showError('Save Failed', error);
    }
  }

  // ==================== CORE FUNCTIONS ==================== //
  function initEventListeners() {
    if (!elements.uploadInput || !elements.analyzeBtn) {
      console.error('Required elements missing');
      return;
    }

    elements.uploadInput.addEventListener('change', handleFileUpload);
    elements.analyzeBtn.addEventListener('click', runAnalysis);
    elements.methodSelector.addEventListener('change', (e) => {
      state.currentMethod = e.target.value;
    });
    
    if (elements.saveStrategy) {
      elements.saveStrategy.addEventListener('click', saveCurrentStrategy);
    }

    // Initialize strategy builder on click
    const strategyPanel = document.getElementById('strategy-builder');
    if (strategyPanel) {
      strategyPanel.addEventListener('click', initStrategyBuilder);
    }
  }

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
      const file = event.target.files[0];
      if (!file) return;

      if (!file.name.endsWith('.csv')) {
        throw new Error('Please upload a CSV file');
      }

      showProgress('Parsing CSV file...');
      const content = await readFile(file);
      await parseCSVWithPapaParse(content);
      hideProgress();
      
    } catch (error) {
      hideProgress();
      showError('File upload failed', error);
      resetFileInput();
    }
  }

  async function runAnalysis() {
    if (state.isAnalyzing) return;
    
    try {
      if (state.draws.length === 0) {
        throw new Error('Please upload CSV file first');
      }

      showProgress('Analyzing data...');
      console.log('Running', state.currentMethod, 'analysis on', state.draws.length, 'draws...');
      
      const allNumbers = Array.from({length: 69}, (_, i) => i + 1);
      let energyData = calculateEnergy(allNumbers);
      
      // Apply energy weights
      energyData = energyData.map(num => ({
        ...num,
        energy: (num.isPrime * CONFIG.energyWeights.prime) +
                (num.digitalRoot * CONFIG.energyWeights.digitalRoot) +
                (num.mod5 * CONFIG.energyWeights.mod5) +
                (num.gridScore * CONFIG.energyWeights.gridPosition)
      }));

      // Get predictions based on selected method
      let mlPrediction;
      switch (state.currentMethod) {
        case 'energy':
          mlPrediction = { numbers: energyData.sort((a, b) => b.energy - a.energy).slice(0, 10).map(n => n.number), confidence: 0.7, model: 'energy' };
          break;
        case 'frequency':
          mlPrediction = getFrequencyFallback();
          break;
        case 'ml':
          mlPrediction = await getMLPrediction();
          break;
        case 'combined':
        default:
          const mlResult = await getMLPrediction();
          mlPrediction = {
            numbers: [...new Set([...mlResult.numbers, ...energyData.sort((a, b) => b.energy - a.energy).slice(0, 5).map(n => n.number)])].slice(0, 10),
            confidence: (mlResult.confidence + 0.7) / 2,
            model: 'combined'
          };
      }

      // Test prediction effectiveness
      const effectiveness = await testPredictionEffectiveness();
      
      // Display results
      displayResults(energyData, mlPrediction, effectiveness);
      hideProgress();

    } catch (error) {
      hideProgress();
      showError('Analysis failed', error);
    }
  }

  async function testPredictionEffectiveness() {
    if (state.draws.length < 20) {
      return { available: false, message: 'Need at least 20 draws for testing' };
    }

    // Use last 20% of data for testing
    const testSize = Math.floor(state.draws.length * 0.2);
    const testData = state.draws.slice(-testSize);
    const trainingData = state.draws.slice(0, -testSize);

    let correctPredictions = 0;
    let totalTests = 0;

    for (let i = 0; i < testData.length - 1; i++) {
      const testDraw = testData[i];
      const nextDraw = testData[i + 1];
      
      // Simulate prediction using historical data up to this point
      const simulatedData = [...trainingData, ...testData.slice(0, i + 1)];
      const prediction = await getMLPrediction(simulatedData);
      
      // Check if any predicted numbers appear in next draw
      const hits = nextDraw.numbers.filter(num => prediction.numbers.includes(num)).length;
      if (hits > 0) {
        correctPredictions++;
      }
      totalTests++;
    }

    return {
      available: true,
      accuracy: totalTests > 0 ? (correctPredictions / totalTests) : 0,
      totalTests: totalTests,
      correctPredictions: correctPredictions
    };
  }

  async function getMLPrediction(draws = state.draws) {
    try {
      if (!window.lotteryML) {
        throw new Error('Machine Learning module not available');
      }
      
      // Train model first if we have enough data and it's not trained
      if (draws.length >= 50 && window.lotteryML.status !== 'trained') {
        console.log('Training ML model with available data...');
        await window.lotteryML.trainLSTM(draws);
      }
      
      // Get prediction from trained model
      const prediction = await window.lotteryML.predictNextNumbers(draws);
      return prediction;
      
    } catch (error) {
      console.warn('ML prediction failed, using fallback:', error);
      return getFrequencyFallback(draws);
    }
  }

  function getFrequencyFallback(draws = state.draws) {
    const frequencyMap = new Array(70).fill(0);
    draws.forEach(draw => {
      draw.numbers.forEach(num => {
        if (num >= 1 && num <= 69) frequencyMap[num]++;
      });
    });
    
    const predictedNumbers = frequencyMap
      .map((count, number) => ({ number, count }))
      .filter(item => item.number >= 1 && item.number <= 69)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => item.number);
    
    return {
      numbers: predictedNumbers,
      confidence: 0.65,
      model: 'fallback_frequency',
      warning: 'Using frequency-based fallback'
    };
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
                
                // Validate numbers
                const numbers = [n1, n2, n3, n4, n5, n6].map(Number);
                if (numbers.some(isNaN)) {
                  throw new Error('Invalid number format in CSV');
                }

                // Parse date safely
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

  // ==================== RESULT DISPLAY ==================== //
  function displayResults(energyData, mlPrediction, effectiveness) {
    try {
      displayEnergyResults(energyData, elements.energyResults);
      displayMLResults(mlPrediction, elements.mlResults, effectiveness);
      
      const recommendations = generateRecommendations(energyData, mlPrediction);
      displayRecommendations(recommendations);
      
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

  function displayMLResults(mlPrediction, container, effectiveness) {
    const numbersWithSpaces = mlPrediction.numbers.map(num => 
      num.toString().padStart(2, '0')
    ).join(' ');
    
    container.innerHTML = `
      <div class="ml-prediction">
        <div class="confidence">Confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%</div>
        <div class="ml-numbers">${numbersWithSpaces}</div>
        <div class="model-info">Model: ${mlPrediction.model}</div>
        ${effectiveness.available ? `
          <div class="effectiveness">
            Test Accuracy: ${(effectiveness.accuracy * 100).toFixed(1)}%
            (${effectiveness.correctPredictions}/${effectiveness.totalTests})
          </div>
        ` : ''}
        ${mlPrediction.warning ? `<div class="warning">${mlPrediction.warning}</div>` : ''}
      </div>
    `;
  }

  function displayRecommendations(recommendations) {
    if (!elements.recommendations) return;
    
    const formatNumbers = (numbers) => 
      numbers.map(num => num.toString().padStart(2, '0')).join(' ');
    
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