(() => {
  // js/utils.js
  function applyTemporalWeighting(draws, decayRate = 0.1) {
    const validDraws = draws.filter((d) => d.date && typeof d.date.getTime === "function");
    if (!validDraws.length) return [];
    const mostRecentDate = new Date(Math.max(...validDraws.map((d) => d.date.getTime())));
    const maxAgeDays = (mostRecentDate - new Date(Math.min(...validDraws.map((d) => d.date.getTime())))) / (1e3 * 60 * 60 * 24);
    return validDraws.map((draw) => {
      const ageDays = (mostRecentDate - draw.date) / (1e3 * 60 * 60 * 24);
      const normalizedAge = ageDays / maxAgeDays;
      const weight = Math.exp(-decayRate * normalizedAge * 10);
      return {
        ...draw,
        temporalWeight: weight,
        weightedNumbers: (draw.whiteBalls || []).map((num) => ({
          number: num,
          weight
        }))
      };
    });
  }
  function calculateTemporalFrequency(weightedDraws) {
    const frequency = new Array(70).fill(0);
    weightedDraws.forEach((draw) => {
      draw.weightedNumbers.forEach((weightedNum) => {
        if (weightedNum.number >= 1 && weightedNum.number <= 69) {
          frequency[weightedNum.number] += weightedNum.weight;
        }
      });
    });
    return frequency;
  }
  if (typeof window !== "undefined") {
    window.applyTemporalWeighting = applyTemporalWeighting;
    window.calculateTemporalFrequency = calculateTemporalFrequency;
  }

  // js/workers/backtest-worker.js
  var shouldStop = false;
  self.onmessage = function(e) {
    const { draws, decayRate, method, config } = e.data.data;
    try {
      const results = runBacktestAnalysis(draws, decayRate, method, config);
      self.postMessage({ type: "result", data: { results } });
    } catch (error) {
      self.postMessage({
        type: "error",
        data: { message: `Backtesting failed: ${error.message}` }
      });
    }
  };
  self.addEventListener("message", function(e) {
    if (e.data.type === "cancel") {
      shouldStop = true;
    }
  });
  function runBacktestAnalysis(draws, decayRate, method, config) {
    const totalSteps = calculateTotalSteps(draws.length, config);
    let currentStep = 0;
    const results = {
      available: true,
      method,
      totalTests: 0,
      totalDrawsTested: 0,
      hits: { 3: 0, 4: 0, 5: 0, 6: 0 },
      simulations: [],
      performanceMetrics: {}
    };
    for (let i = config.initialTrainingSize; i < draws.length - config.testWindowSize; i += config.stepSize) {
      if (shouldStop) {
        results.cancelled = true;
        results.message = "Analysis cancelled by user";
        self.postMessage({ type: "result", data: { results } });
        break;
      }
      const trainingData = draws.slice(0, i);
      const testData = draws.slice(i, i + config.testWindowSize);
      for (let j = 0; j < testData.length - 1; j++) {
        if (shouldStop) {
          results.cancelled = true;
          results.message = "Analysis cancelled by user";
          self.postMessage({ type: "result", data: { results } });
          break;
        }
        const currentTestDraw = testData[j];
        const nextDraw = testData[j + 1];
        const historicalData = [...trainingData, ...testData.slice(0, j + 1)];
        const prediction = getPredictionForBacktest(historicalData, decayRate, method);
        const matchedNumbers = nextDraw.whiteBalls.filter((num) => prediction.numbers.includes(num));
        const hitCount = matchedNumbers.length;
        if (hitCount >= 3) {
          results.hits[hitCount]++;
        }
        results.simulations.push({
          drawDate: nextDraw.date,
          predicted: prediction.numbers,
          actual: nextDraw.whiteBalls,
          matched: matchedNumbers,
          hitCount,
          confidence: prediction.confidence
        });
        results.totalTests++;
        results.totalDrawsTested++;
      }
      if (shouldStop) break;
      currentStep++;
      updateProgress(currentStep, totalSteps, "Running backtesting");
    }
    results.performanceMetrics = calculatePerformanceMetrics(results);
    return results;
  }
  function calculateTotalSteps(drawsLength, config) {
    const availableTests = Math.max(0, drawsLength - config.initialTrainingSize - config.testWindowSize);
    return Math.ceil(availableTests / config.stepSize);
  }
  function updateProgress(current, total, message) {
    const percentage = Math.round(current / total * 100);
    self.postMessage({
      type: "progress",
      data: { message: `${message}`, percentage }
    });
  }
  function getPredictionForBacktest(draws, decayRate, method) {
    const allNumbers = Array.from({ length: 69 }, (_, i) => i + 1);
    const energyData = calculateEnergy(allNumbers, { prime: 0.3, digitalRoot: 0.2, mod5: 0.2, gridPosition: 0.3 });
    return {
      numbers: energyData.sort((a, b) => b.energy - a.energy).slice(0, 10).map((n) => n.number),
      confidence: 0.7,
      model: "energy"
    };
  }
  function calculatePerformanceMetrics(results) {
    const totalHits = Object.values(results.hits).reduce((sum, count) => sum + count, 0);
    const hitRate = results.totalTests > 0 ? totalHits / results.totalTests : 0;
    let totalPredictedNumbers = 0;
    let correctPredictions = 0;
    results.simulations.forEach((sim) => {
      totalPredictedNumbers += sim.predicted.length;
      correctPredictions += sim.matched.length;
    });
    const precision = totalPredictedNumbers > 0 ? correctPredictions / totalPredictedNumbers : 0;
    const ticketCost = 2;
    const prizeMap = { 3: 10, 4: 100, 5: 1e3, 6: 1e4 };
    let totalSpent = results.totalTests * ticketCost;
    let totalWon = 0;
    Object.entries(results.hits).forEach(([hitCount, count]) => {
      if (prizeMap[hitCount]) {
        totalWon += count * prizeMap[hitCount];
      }
    });
    const roi = totalSpent > 0 ? (totalWon - totalSpent) / totalSpent * 100 : 0;
    return {
      hitRate,
      precision,
      totalSpent,
      totalWon,
      roi,
      hitDistribution: results.hits
    };
  }
})();
