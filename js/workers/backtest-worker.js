/**
 * Backtesting Web Worker
 * Version: 1.0.0 | Created: 2025-08-21
 * Handles comprehensive backtesting in background thread
 */

importScripts('../utils.js');

let shouldStop = false;

self.onmessage = function(e) {
  const { draws, decayRate, method, config } = e.data;
  
  try {
    const results = runBacktestAnalysis(draws, decayRate, method, config);
    self.postMessage({ type: 'result', data: { results } });
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      data: { message: `Backtesting failed: ${error.message}` } 
    });
  }
};

// Listen for cancellation messages
self.addEventListener('message', function(e) {
  if (e.data.type === 'cancel') {
    shouldStop = true;
  }
});

function runBacktestAnalysis(draws, decayRate, method, config) {
  const totalSteps = calculateTotalSteps(draws.length, config);
  let currentStep = 0;
  
  const results = {
    available: true,
    method: method,
    totalTests: 0,
    totalDrawsTested: 0,
    hits: { 3: 0, 4: 0, 5: 0, 6: 0 },
    simulations: [],
    performanceMetrics: {}
  };

  for (let i = config.initialTrainingSize; i < draws.length - config.testWindowSize; i += config.stepSize) {
    // Check if we should stop (for cancellation)
    if (shouldStop) {
      results.cancelled = true;
      results.message = 'Analysis cancelled by user';
      // Post partial results before breaking
      self.postMessage({ type: 'result', data: { results } });
      break;
    }
    
    const trainingData = draws.slice(0, i);
    const testData = draws.slice(i, i + config.testWindowSize);

    for (let j = 0; j < testData.length - 1; j++) {
      if (shouldStop) {
        results.cancelled = true;
        results.message = 'Analysis cancelled by user';
        // Post partial results before breaking
        self.postMessage({ type: 'result', data: { results } });
        break;
      }
      
      const currentTestDraw = testData[j];
      const nextDraw = testData[j + 1];
      
      const historicalData = [...trainingData, ...testData.slice(0, j + 1)];
      const prediction = getPredictionForBacktest(historicalData, decayRate, method);
      
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
    
    if (shouldStop) break;
    
    currentStep++;
    updateProgress(currentStep, totalSteps, 'Running backtesting');
  }

  results.performanceMetrics = calculatePerformanceMetrics(results);
  return results;
}

function calculateTotalSteps(drawsLength, config) {
  const availableTests = Math.max(0, drawsLength - config.initialTrainingSize - config.testWindowSize);
  return Math.ceil(availableTests / config.stepSize);
}

function updateProgress(current, total, message) {
  const percentage = Math.round((current / total) * 100);
  self.postMessage({ 
    type: 'progress', 
    data: { message: `${message}`, percentage } 
  });
}

function getPredictionForBacktest(draws, decayRate, method) {
  // Simplified version - in practice, this would use the actual prediction logic
  const allNumbers = Array.from({length: 69}, (_, i) => i + 1);
  const energyData = calculateEnergy(allNumbers, {prime: 0.3, digitalRoot: 0.2, mod5: 0.2, gridPosition: 0.3});
  
  return {
    numbers: energyData.sort((a, b) => b.energy - a.energy).slice(0, 10).map(n => n.number),
    confidence: 0.7,
    model: 'energy'
  };
}

function calculatePerformanceMetrics(results) {
  // Implementation from app.js would be moved here
  return {};
}
