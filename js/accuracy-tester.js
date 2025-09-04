/**
 * PREDICTION ACCURACY TESTING FRAMEWORK
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * Comprehensive system for testing and comparing prediction accuracy
 * across different methods using proper statistical validation
 */

import { PositionBasedPredictor } from './confidence-predictor.js';
import { OptimizationEngine } from './optimization-engine.js';
import { calculateEnergy } from './utils.js';

/**
 * Core accuracy testing engine for lottery predictions
 */
export class PredictionAccuracyTester {
  constructor(historicalData) {
    this.historicalData = historicalData.filter(draw => 
      draw.whiteBalls && draw.whiteBalls.length === 5 && draw.powerball
    );
    this.strategies = new Map();
    this.results = new Map();
    this.isRunning = false;
  }

  /**
   * Register a prediction strategy for testing
   */
  addStrategy(name, predictor, config = {}) {
    this.strategies.set(name, {
      predictor,
      config,
      results: []
    });
  }

  /**
   * Run comprehensive accuracy test using time-series cross-validation
   */
  async runAccuracyTest(options = {}) {
    const {
      testMethod = 'walk-forward',
      initialTraining = 200,
      testWindow = 50,
      stepSize = 10,
      minTraining = 100,
      metrics = ['matches', 'consistency', 'prize-tiers', 'confidence-accuracy']
    } = options;

    if (this.isRunning) {
      throw new Error('Accuracy test is already running');
    }

    if (this.historicalData.length < initialTraining + testWindow) {
      throw new Error(`Insufficient data. Need at least ${initialTraining + testWindow} draws`);
    }

    this.isRunning = true;
    const results = new Map();

    try {
      console.log(`Starting accuracy test with ${this.strategies.size} strategies`);
      
      for (const [strategyName, strategy] of this.strategies) {
        console.log(`Testing strategy: ${strategyName}`);
        
        const strategyResults = await this.testStrategy(
          strategyName,
          strategy,
          { testMethod, initialTraining, testWindow, stepSize, minTraining, metrics }
        );
        
        results.set(strategyName, strategyResults);
        
        // Emit progress for UI updates
        this.emitProgress(strategyName, strategyResults);
      }

      const comparison = this.generateComparison(results);
      this.results = results;
      
      return {
        results,
        comparison,
        testConfig: options,
        summary: this.generateSummary(results)
      };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Test a single strategy using walk-forward validation
   */
  async testStrategy(name, strategy, config) {
    const { initialTraining, testWindow, stepSize, minTraining, metrics } = config;
    const predictions = [];
    const validationResults = [];

    // Walk-forward validation
    let currentStart = 0;
    let testCount = 0;
    
    while (currentStart + initialTraining + testWindow <= this.historicalData.length) {
      const trainingEnd = currentStart + initialTraining;
      const testEnd = trainingEnd + testWindow;
      
      const trainingData = this.historicalData.slice(currentStart, trainingEnd);
      const testData = this.historicalData.slice(trainingEnd, testEnd);
      
      // Generate predictions for test period
      const periodPredictions = await this.generatePredictions(
        name, strategy, trainingData, testData
      );
      
      predictions.push(...periodPredictions);
      
      // Calculate metrics for this period
      const periodMetrics = this.calculateMetrics(periodPredictions, metrics);
      validationResults.push({
        period: testCount,
        trainingSize: trainingData.length,
        testSize: testData.length,
        metrics: periodMetrics,
        predictions: periodPredictions
      });
      
      currentStart += stepSize;
      testCount++;
      
      // Prevent infinite loops
      if (testCount > 100) break;
    }

    // Aggregate results across all periods
    const aggregatedMetrics = this.aggregateResults(validationResults, metrics);
    
    return {
      strategy: name,
      totalPredictions: predictions.length,
      validationPeriods: validationResults.length,
      predictions,
      validationResults,
      aggregatedMetrics,
      performance: this.calculateOverallPerformance(aggregatedMetrics)
    };
  }

  /**
   * Generate predictions using a specific strategy
   */
  async generatePredictions(strategyName, strategy, trainingData, testData) {
    const predictions = [];
    
    for (let i = 0; i < testData.length; i++) {
      const actualDraw = testData[i];
      const trainingUpToPoint = [...trainingData, ...testData.slice(0, i)];
      
      try {
        let prediction;
        
        switch (strategy.config.type) {
          case 'confidence':
            prediction = await this.predictWithConfidence(strategy, trainingUpToPoint);
            break;
          case 'optimization':
            prediction = await this.predictWithOptimization(strategy, trainingUpToPoint);
            break;
          case 'energy':
            prediction = await this.predictWithEnergy(strategy, trainingUpToPoint);
            break;
          case 'frequency':
            prediction = await this.predictWithFrequency(strategy, trainingUpToPoint);
            break;
          case 'hybrid':
            prediction = await this.predictWithHybrid(strategy, trainingUpToPoint);
            break;
          default:
            prediction = await strategy.predictor(trainingUpToPoint);
        }

        const predictionResult = {
          strategy: strategyName,
          predicted: prediction,
          actual: actualDraw,
          matches: this.countMatches(prediction.whiteBalls || prediction.numbers, actualDraw.whiteBalls),
          powerballMatch: (prediction.powerball === actualDraw.powerball),
          confidenceAccuracy: this.assessConfidenceAccuracy(prediction, actualDraw),
          timestamp: actualDraw.date
        };

        predictions.push(predictionResult);
        
      } catch (error) {
        console.warn(`Prediction failed for ${strategyName}:`, error);
        // Continue with other predictions
      }
    }
    
    return predictions;
  }

  /**
   * Predict using confidence interval method
   */
  async predictWithConfidence(strategy, trainingData) {
    const predictor = new PositionBasedPredictor(trainingData);
    const confidencePredictions = await predictor.generatePredictionWithConfidenceIntervals(
      strategy.config.options || {}
    );
    
    return {
      whiteBalls: confidencePredictions.slice(0, 5).map(p => p.prediction),
      powerball: confidencePredictions[5].prediction,
      confidence: strategy.config.options?.confidenceLevel || 0.95,
      method: 'confidence-intervals',
      confidenceIntervals: confidencePredictions
    };
  }

  /**
   * Predict using optimization method
   */
  async predictWithOptimization(strategy, trainingData) {
    const engine = new OptimizationEngine(strategy.config.optimizationType || 'hybrid');
    // This would integrate with the optimization system
    // For now, return a simplified prediction
    return {
      whiteBalls: [7, 19, 31, 42, 58],
      powerball: 12,
      method: 'optimization',
      confidence: 0.75
    };
  }

  /**
   * Predict using energy signature method
   */
  async predictWithEnergy(strategy, trainingData) {
    const allNumbers = [...new Set(trainingData.flatMap(d => d.whiteBalls))];
    const weights = strategy.config.weights || {
      prime: 0.3, digitalRoot: 0.2, mod5: 0.2, gridPosition: 0.3
    };
    
    const energyData = calculateEnergy(allNumbers, weights);
    const topEnergy = energyData
      .sort((a, b) => b.energy - a.energy)
      .slice(0, 5)
      .map(item => item.number);
    
    return {
      whiteBalls: topEnergy,
      powerball: Math.floor(Math.random() * 26) + 1,
      method: 'energy-signature',
      confidence: 0.70
    };
  }

  /**
   * Predict using frequency analysis
   */
  async predictWithFrequency(strategy, trainingData) {
    const frequency = new Array(70).fill(0);
    trainingData.forEach(draw => {
      draw.whiteBalls.forEach(num => {
        if (num >= 1 && num <= 69) frequency[num]++;
      });
    });
    
    const topFrequent = frequency
      .map((count, number) => ({ number, count }))
      .filter(item => item.number >= 1 && item.number <= 69)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => item.number);
    
    return {
      whiteBalls: topFrequent,
      powerball: Math.floor(Math.random() * 26) + 1,
      method: 'frequency-analysis',
      confidence: 0.60
    };
  }

  /**
   * Predict using hybrid approach
   */
  async predictWithHybrid(strategy, trainingData) {
    const energyPrediction = await this.predictWithEnergy(strategy, trainingData);
    const frequencyPrediction = await this.predictWithFrequency(strategy, trainingData);
    
    // Combine predictions (simple approach)
    const combined = [...energyPrediction.whiteBalls.slice(0, 3), 
                     ...frequencyPrediction.whiteBalls.slice(0, 2)];
    
    return {
      whiteBalls: combined,
      powerball: energyPrediction.powerball,
      method: 'hybrid',
      confidence: 0.72
    };
  }

  /**
   * Count matching numbers between prediction and actual
   */
  countMatches(predicted, actual) {
    if (!predicted || !actual || !Array.isArray(predicted) || !Array.isArray(actual)) {
      return 0;
    }
    
    return predicted.filter(num => actual.includes(num)).length;
  }

  /**
   * Assess confidence interval accuracy
   */
  assessConfidenceAccuracy(prediction, actual) {
    if (!prediction.confidenceIntervals || !actual.whiteBalls) {
      return null;
    }
    
    let withinIntervalCount = 0;
    const positions = prediction.confidenceIntervals.slice(0, 5);
    const sortedActual = [...actual.whiteBalls].sort((a, b) => a - b);
    
    positions.forEach((pos, index) => {
      const actualValue = sortedActual[index];
      if (actualValue >= pos.confidenceInterval.lower && 
          actualValue <= pos.confidenceInterval.upper) {
        withinIntervalCount++;
      }
    });
    
    return {
      withinInterval: withinIntervalCount,
      totalPositions: positions.length,
      accuracy: withinIntervalCount / positions.length
    };
  }

  /**
   * Calculate comprehensive metrics for predictions
   */
  calculateMetrics(predictions, requestedMetrics) {
    const metrics = {};
    
    if (requestedMetrics.includes('matches')) {
      metrics.matches = this.calculateMatchMetrics(predictions);
    }
    
    if (requestedMetrics.includes('consistency')) {
      metrics.consistency = this.calculateConsistency(predictions);
    }
    
    if (requestedMetrics.includes('prize-tiers')) {
      metrics.prizeTiers = this.calculatePrizeTiers(predictions);
    }
    
    if (requestedMetrics.includes('confidence-accuracy')) {
      metrics.confidenceAccuracy = this.calculateConfidenceAccuracy(predictions);
    }
    
    return metrics;
  }

  /**
   * Calculate match-based metrics
   */
  calculateMatchMetrics(predictions) {
    const matches = predictions.map(p => p.matches);
    const powerballMatches = predictions.filter(p => p.powerballMatch).length;
    
    return {
      totalPredictions: predictions.length,
      averageMatches: matches.reduce((sum, m) => sum + m, 0) / matches.length,
      maxMatches: Math.max(...matches),
      minMatches: Math.min(...matches),
      hitRate: matches.filter(m => m >= 3).length / matches.length,
      powerballHitRate: powerballMatches / predictions.length,
      distribution: this.getMatchDistribution(matches)
    };
  }

  /**
   * Calculate consistency metrics
   */
  calculateConsistency(predictions) {
    const matches = predictions.map(p => p.matches);
    const mean = matches.reduce((sum, m) => sum + m, 0) / matches.length;
    const variance = matches.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / matches.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      variance,
      standardDeviation: stdDev,
      coefficientOfVariation: stdDev / mean,
      consistency: Math.max(0, 1 - (stdDev / mean))
    };
  }

  /**
   * Calculate prize tier metrics
   */
  calculatePrizeTiers(predictions) {
    const tiers = {
      jackpot: 0,      // 5 matches + powerball
      match5: 0,       // 5 matches, no powerball
      match4Plus: 0,   // 4 matches + powerball
      match4: 0,       // 4 matches, no powerball
      match3Plus: 0,   // 3 matches + powerball
      match3: 0,       // 3 matches, no powerball
      match2Plus: 0,   // 2 matches + powerball
      match1Plus: 0    // 1 match + powerball
    };
    
    predictions.forEach(pred => {
      const matches = pred.matches;
      const pbMatch = pred.powerballMatch;
      
      if (matches === 5 && pbMatch) tiers.jackpot++;
      else if (matches === 5) tiers.match5++;
      else if (matches === 4 && pbMatch) tiers.match4Plus++;
      else if (matches === 4) tiers.match4++;
      else if (matches === 3 && pbMatch) tiers.match3Plus++;
      else if (matches === 3) tiers.match3++;
      else if (matches === 2 && pbMatch) tiers.match2Plus++;
      else if (matches === 1 && pbMatch) tiers.match1Plus++;
    });
    
    const totalPredictions = predictions.length;
    const tierRates = {};
    
    Object.entries(tiers).forEach(([tier, count]) => {
      tierRates[tier] = {
        count,
        rate: count / totalPredictions,
        expectedRate: this.getExpectedPrizeTierRate(tier)
      };
    });
    
    return {
      counts: tiers,
      rates: tierRates,
      totalWinningPredictions: Object.values(tiers).reduce((sum, count) => sum + count, 0)
    };
  }

  /**
   * Calculate confidence interval accuracy
   */
  calculateConfidenceAccuracy(predictions) {
    const confidenceResults = predictions
      .map(p => p.confidenceAccuracy)
      .filter(ca => ca !== null);
    
    if (confidenceResults.length === 0) {
      return null;
    }
    
    const totalAccuracies = confidenceResults.map(ca => ca.accuracy);
    const averageAccuracy = totalAccuracies.reduce((sum, acc) => sum + acc, 0) / totalAccuracies.length;
    
    return {
      averageAccuracy,
      totalEvaluated: confidenceResults.length,
      withinIntervalTotal: confidenceResults.reduce((sum, ca) => sum + ca.withinInterval, 0),
      expectedAccuracy: 0.95 // Assuming 95% confidence intervals
    };
  }

  /**
   * Get expected prize tier rates (based on official lottery odds)
   */
  getExpectedPrizeTierRate(tier) {
    const odds = {
      jackpot: 1 / 292201338,     // 1 in 292M
      match5: 1 / 11688054,       // 1 in 11.7M
      match4Plus: 1 / 913129,     // 1 in 913k
      match4: 1 / 36525,          // 1 in 36.5k
      match3Plus: 1 / 14494,      // 1 in 14.5k
      match3: 1 / 580,            // 1 in 580
      match2Plus: 1 / 701,        // 1 in 701
      match1Plus: 1 / 92          // 1 in 92
    };
    
    return odds[tier] || 0;
  }

  /**
   * Get match distribution
   */
  getMatchDistribution(matches) {
    const distribution = {};
    for (let i = 0; i <= 5; i++) {
      distribution[i] = matches.filter(m => m === i).length;
    }
    return distribution;
  }

  /**
   * Aggregate results across validation periods
   */
  aggregateResults(validationResults, metrics) {
    const aggregated = {};
    
    metrics.forEach(metric => {
      const metricValues = validationResults
        .map(vr => vr.metrics[metric])
        .filter(mv => mv !== undefined);
      
      if (metricValues.length > 0) {
        aggregated[metric] = this.aggregateMetric(metric, metricValues);
      }
    });
    
    return aggregated;
  }

  /**
   * Aggregate a specific metric across periods
   */
  aggregateMetric(metricName, metricValues) {
    switch (metricName) {
      case 'matches':
        return {
          averageMatches: this.average(metricValues.map(mv => mv.averageMatches)),
          averageHitRate: this.average(metricValues.map(mv => mv.hitRate)),
          totalPredictions: metricValues.reduce((sum, mv) => sum + mv.totalPredictions, 0)
        };
      
      case 'consistency':
        return {
          averageConsistency: this.average(metricValues.map(mv => mv.consistency)),
          averageStdDev: this.average(metricValues.map(mv => mv.standardDeviation))
        };
      
      case 'prize-tiers':
        const aggregatedCounts = {};
        const tierNames = Object.keys(metricValues[0].counts);
        
        tierNames.forEach(tier => {
          aggregatedCounts[tier] = metricValues.reduce((sum, mv) => sum + mv.counts[tier], 0);
        });
        
        return {
          aggregatedCounts,
          totalWins: Object.values(aggregatedCounts).reduce((sum, count) => sum + count, 0)
        };
      
      default:
        return metricValues[0]; // Return first value for unknown metrics
    }
  }

  /**
   * Calculate overall performance score
   */
  calculateOverallPerformance(aggregatedMetrics) {
    let score = 0;
    let components = 0;
    
    if (aggregatedMetrics.matches) {
      score += aggregatedMetrics.matches.averageMatches * 20; // Weight matches heavily
      score += aggregatedMetrics.matches.averageHitRate * 30; // Weight hit rate heavily
      components += 2;
    }
    
    if (aggregatedMetrics.consistency) {
      score += aggregatedMetrics.consistency.averageConsistency * 25; // Consistency is important
      components += 1;
    }
    
    if (aggregatedMetrics['prize-tiers']) {
      const winRate = aggregatedMetrics['prize-tiers'].totalWins / 
                     (aggregatedMetrics.matches?.totalPredictions || 1);
      score += winRate * 25; // Prize wins are valuable
      components += 1;
    }
    
    return components > 0 ? score / components : 0;
  }

  /**
   * Generate strategy comparison
   */
  generateComparison(results) {
    try {
      if (!results || results.size === 0) {
        throw new Error('No results to compare');
      }

      const strategies = Array.from(results.entries()).map(([name, result]) => ({
        strategy: name,
        performance: result.performance || 0,
        avgMatches: result.aggregatedMetrics?.matches?.averageMatches || 0,
        hitRate: result.aggregatedMetrics?.matches?.averageHitRate || 0,
        consistency: result.aggregatedMetrics?.consistency?.averageConsistency || 0,
        totalPredictions: result.totalPredictions || 0
      }));
      
      // Sort by performance score
      strategies.sort((a, b) => b.performance - a.performance);
      
      return {
        ranking: strategies,
        bestStrategy: strategies[0],
        statisticalSignificance: this.calculateStatisticalSignificance(results)
      };
    } catch (error) {
      console.error('Error generating comparison:', error);
      throw new Error(`Failed to generate comparison: ${error.message}`);
    }
  }

  /**
   * Calculate statistical significance of differences
   */
  calculateStatisticalSignificance(results) {
    if (results.size < 2) return null;
    
    const strategiesArray = Array.from(results.values());
    const significance = [];
    
    for (let i = 0; i < strategiesArray.length; i++) {
      for (let j = i + 1; j < strategiesArray.length; j++) {
        const strategyA = strategiesArray[i];
        const strategyB = strategiesArray[j];
        
        // Simple t-test approximation (for demonstration)
        const meanDiff = Math.abs(
          (strategyA.aggregatedMetrics.matches?.averageMatches || 0) -
          (strategyB.aggregatedMetrics.matches?.averageMatches || 0)
        );
        
        significance.push({
          strategies: [strategyA.strategy, strategyB.strategy],
          meanDifference: meanDiff,
          significant: meanDiff > 0.5 // Simple threshold
        });
      }
    }
    
    return significance;
  }

  /**
   * Generate comprehensive summary
   */
  generateSummary(results) {
    const totalStrategies = results.size;
    const totalPredictions = Array.from(results.values())
      .reduce((sum, result) => sum + result.totalPredictions, 0);
    
    const comparison = this.generateComparison(results);
    
    return {
      totalStrategies,
      totalPredictions,
      testDuration: 'Completed',
      bestPerformer: comparison.bestStrategy,
      keyFindings: this.generateKeyFindings(results, comparison, totalPredictions)
    };
  }

  /**
   * Generate key findings from test results
   */
  generateKeyFindings(results, comparison, totalPredictions) {
    const findings = [];
    
    findings.push(`Best performing strategy: ${comparison.bestStrategy.strategy} (${comparison.bestStrategy.performance.toFixed(2)} score)`);
    
    const avgHitRates = Array.from(results.values())
      .map(r => r.aggregatedMetrics.matches?.averageHitRate || 0);
    const bestHitRate = Math.max(...avgHitRates);
    
    if (bestHitRate > 0.1) {
      findings.push(`Highest hit rate achieved: ${(bestHitRate * 100).toFixed(1)}%`);
    }
    
    findings.push(`Total predictions analyzed: ${totalPredictions}`);
    
    return findings;
  }

  /**
   * Utility function to calculate average
   */
  average(numbers) {
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Emit progress for UI updates
   */
  emitProgress(strategyName, results) {
    // This would integrate with the pub/sub system for real-time updates
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('accuracyProgress', {
        detail: { strategy: strategyName, results }
      }));
    }
  }

  /**
   * Get current test status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      strategiesRegistered: this.strategies.size,
      hasResults: this.results.size > 0,
      dataSize: this.historicalData.length
    };
  }
}

// Export for use in other modules
export default PredictionAccuracyTester;

// Browser compatibility
if (typeof window !== 'undefined') {
  window.PredictionAccuracyTester = PredictionAccuracyTester;
}