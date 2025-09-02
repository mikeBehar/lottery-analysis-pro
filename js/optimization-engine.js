/**
 * PARAMETER OPTIMIZATION ENGINE
 * Systematic optimization of ML offsets and energy weights using data-driven methods
 * Version: 1.0.0 | Created: 2025-09-02
 */

import { calculateEnergy } from './utils.js';
import LotteryML from './ml.js';

/**
 * Core optimization engine for parameter tuning
 */
export class OptimizationEngine {
  constructor(type = 'hybrid') {
    this.type = type; // 'offsets', 'weights', 'hybrid'
    this.results = [];
    this.bestParams = null;
    this.isRunning = false;
  }

  /**
   * Main optimization entry point
   * @param {Array} historicalData - Historical draw data
   * @param {Object} searchParams - Search configuration
   * @returns {Promise<Object>} Optimization results
   */
  async optimize(historicalData, searchParams = {}) {
    if (this.isRunning) {
      throw new Error('Optimization already in progress');
    }

    this.isRunning = true;
    this.results = [];
    
    try {
      const config = {
        method: searchParams.method || 'random',
        iterations: searchParams.iterations || 100,
        crossValidationFolds: searchParams.crossValidationFolds || 5,
        testSize: searchParams.testSize || 0.2,
        ...searchParams
      };

      console.log(`Starting ${this.type} optimization with ${config.method} search...`);
      
      // Create cross-validation splits
      const cvSplits = this.createCrossValidationSplits(historicalData, config.crossValidationFolds);
      
      // Run optimization based on type
      let optimizationResults;
      switch (this.type) {
        case 'offsets':
          optimizationResults = await this.optimizeOffsets(cvSplits, config);
          break;
        case 'weights':
          optimizationResults = await this.optimizeWeights(cvSplits, config);
          break;
        case 'hybrid':
          optimizationResults = await this.optimizeHybrid(cvSplits, config);
          break;
        default:
          throw new Error(`Unknown optimization type: ${this.type}`);
      }

      this.bestParams = optimizationResults.bestParams;
      return optimizationResults;
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Create time-series cross-validation splits
   * @param {Array} data - Historical data
   * @param {number} folds - Number of CV folds
   * @returns {Array} Array of {train, test} splits
   */
  createCrossValidationSplits(data, folds = 5) {
    const splits = [];
    const minTrainingSize = Math.floor(data.length * 0.3); // Minimum 30% for training
    const stepSize = Math.floor((data.length - minTrainingSize) / folds);

    for (let i = 0; i < folds; i++) {
      const trainEnd = minTrainingSize + (i * stepSize);
      const testStart = trainEnd;
      const testEnd = Math.min(testStart + stepSize, data.length);

      if (testEnd > testStart) {
        splits.push({
          train: data.slice(0, trainEnd),
          test: data.slice(testStart, testEnd),
          fold: i + 1
        });
      }
    }

    return splits;
  }

  /**
   * Optimize ML offset parameters
   */
  async optimizeOffsets(cvSplits, config) {
    const searchSpace = this.generateOffsetSearchSpace(config);
    const results = [];

    for (let i = 0; i < config.iterations; i++) {
      const offsets = this.sampleFromSearchSpace(searchSpace, config.method, i);
      const performance = await this.evaluateOffsets(offsets, cvSplits);
      
      results.push({
        params: { offsets },
        performance,
        iteration: i + 1
      });

      if (i % 10 === 0) {
        console.log(`Offset optimization progress: ${i + 1}/${config.iterations}`);
      }
    }

    // Find best parameters
    const bestResult = results.reduce((best, current) => 
      current.performance.hitRate > best.performance.hitRate ? current : best
    );

    return {
      type: 'offsets',
      bestParams: bestResult.params,
      bestPerformance: bestResult.performance,
      allResults: results,
      improvement: this.calculateImprovement(bestResult.performance, results)
    };
  }

  /**
   * Optimize energy weight parameters
   */
  async optimizeWeights(cvSplits, config) {
    const results = [];

    for (let i = 0; i < config.iterations; i++) {
      const weights = this.generateRandomWeights();
      const performance = await this.evaluateWeights(weights, cvSplits);
      
      results.push({
        params: { weights },
        performance,
        iteration: i + 1
      });

      if (i % 10 === 0) {
        console.log(`Weight optimization progress: ${i + 1}/${config.iterations}`);
      }
    }

    // Find best parameters
    const bestResult = results.reduce((best, current) => 
      current.performance.hitRate > best.performance.hitRate ? current : best
    );

    return {
      type: 'weights',
      bestParams: bestResult.params,
      bestPerformance: bestResult.performance,
      allResults: results,
      improvement: this.calculateImprovement(bestResult.performance, results)
    };
  }

  /**
   * Optimize both offsets and weights simultaneously
   */
  async optimizeHybrid(cvSplits, config) {
    const results = [];

    for (let i = 0; i < config.iterations; i++) {
      const offsets = this.generateRandomOffsets();
      const weights = this.generateRandomWeights();
      const performance = await this.evaluateHybrid({ offsets, weights }, cvSplits);
      
      results.push({
        params: { offsets, weights },
        performance,
        iteration: i + 1
      });

      if (i % 10 === 0) {
        console.log(`Hybrid optimization progress: ${i + 1}/${config.iterations}`);
      }
    }

    // Find best parameters
    const bestResult = results.reduce((best, current) => 
      current.performance.hitRate > best.performance.hitRate ? current : best
    );

    return {
      type: 'hybrid',
      bestParams: bestResult.params,
      bestPerformance: bestResult.performance,
      allResults: results,
      improvement: this.calculateImprovement(bestResult.performance, results)
    };
  }

  /**
   * Generate search space for offsets
   */
  generateOffsetSearchSpace(config) {
    return {
      offsetRange: [1, 68],
      numOffsets: config.numOffsets || 8,
      minSpread: config.minSpread || 3,
      maxSpread: config.maxSpread || 15
    };
  }

  /**
   * Sample from search space based on method
   */
  sampleFromSearchSpace(searchSpace, method, iteration) {
    switch (method) {
      case 'random':
        return this.generateRandomOffsets(searchSpace.numOffsets, searchSpace.offsetRange);
      case 'grid':
        return this.generateGridOffsets(searchSpace, iteration);
      default:
        return this.generateRandomOffsets();
    }
  }

  /**
   * Generate random offset combination
   */
  generateRandomOffsets(numOffsets = 8, range = [1, 68]) {
    const offsets = [];
    const used = new Set();

    while (offsets.length < numOffsets) {
      const offset = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      if (!used.has(offset)) {
        offsets.push(offset);
        used.add(offset);
      }
    }

    return offsets.sort((a, b) => a - b);
  }

  /**
   * Generate random weight combination (normalized to sum = 1)
   */
  generateRandomWeights() {
    const weights = {
      prime: Math.random(),
      digitalRoot: Math.random(),
      mod5: Math.random(),
      gridPosition: Math.random()
    };

    // Normalize to sum = 1
    const sum = Object.values(weights).reduce((s, w) => s + w, 0);
    Object.keys(weights).forEach(key => {
      weights[key] /= sum;
    });

    return weights;
  }

  /**
   * Evaluate offset parameters against cross-validation splits
   */
  async evaluateOffsets(offsets, cvSplits) {
    const foldResults = [];

    for (const split of cvSplits) {
      const ml = new LotteryML();
      const predictions = [];

      // Generate predictions for test period
      for (let i = 0; i < split.test.length - 1; i++) {
        const trainData = [...split.train, ...split.test.slice(0, i)];
        const actualDraw = split.test[i + 1];
        
        try {
          // Use fallback prediction with custom offsets
          const prediction = this.generatePredictionWithOffsets(trainData, offsets);
          const matches = this.countMatches(prediction.whiteBalls, actualDraw.whiteBalls);
          
          predictions.push({
            predicted: prediction.whiteBalls,
            actual: actualDraw.whiteBalls,
            matches
          });
        } catch (error) {
          console.warn('Prediction failed:', error.message);
        }
      }

      const foldPerformance = this.calculatePerformanceMetrics(predictions);
      foldResults.push(foldPerformance);
    }

    // Average performance across folds
    return this.averagePerformance(foldResults);
  }

  /**
   * Evaluate weight parameters against cross-validation splits
   */
  async evaluateWeights(weights, cvSplits) {
    const foldResults = [];

    for (const split of cvSplits) {
      const predictions = [];

      // Generate predictions for test period
      for (let i = 0; i < split.test.length - 1; i++) {
        const trainData = [...split.train, ...split.test.slice(0, i)];
        const actualDraw = split.test[i + 1];
        
        try {
          // Use energy-based prediction with custom weights
          const prediction = this.generatePredictionWithWeights(trainData, weights);
          const matches = this.countMatches(prediction.whiteBalls, actualDraw.whiteBalls);
          
          predictions.push({
            predicted: prediction.whiteBalls,
            actual: actualDraw.whiteBalls,
            matches
          });
        } catch (error) {
          console.warn('Prediction failed:', error.message);
        }
      }

      const foldPerformance = this.calculatePerformanceMetrics(predictions);
      foldResults.push(foldPerformance);
    }

    return this.averagePerformance(foldResults);
  }

  /**
   * Evaluate hybrid parameters
   */
  async evaluateHybrid(params, cvSplits) {
    const foldResults = [];

    for (const split of cvSplits) {
      const predictions = [];

      for (let i = 0; i < split.test.length - 1; i++) {
        const trainData = [...split.train, ...split.test.slice(0, i)];
        const actualDraw = split.test[i + 1];
        
        try {
          const prediction = this.generateHybridPrediction(trainData, params);
          const matches = this.countMatches(prediction.whiteBalls, actualDraw.whiteBalls);
          
          predictions.push({
            predicted: prediction.whiteBalls,
            actual: actualDraw.whiteBalls,
            matches
          });
        } catch (error) {
          console.warn('Prediction failed:', error.message);
        }
      }

      const foldPerformance = this.calculatePerformanceMetrics(predictions);
      foldResults.push(foldPerformance);
    }

    return this.averagePerformance(foldResults);
  }

  /**
   * Generate prediction with custom offsets
   */
  generatePredictionWithOffsets(trainData, offsets) {
    // Simplified frequency-based prediction with custom offsets
    const frequency = new Array(70).fill(0);
    trainData.forEach(draw => {
      (draw.whiteBalls || []).forEach(num => {
        if (num >= 1 && num <= 69) frequency[num]++;
      });
    });

    const avgValue = frequency.reduce((sum, freq, idx) => sum + (freq * idx), 0) / 
                    frequency.reduce((sum, freq) => sum + freq, 0) || 35;

    const base = Math.round(avgValue);
    const numbers = offsets.map(offset => {
      const num = (base + offset) % 69 + 1;
      return Math.max(1, Math.min(69, num));
    });

    return {
      whiteBalls: [...new Set(numbers)].slice(0, 5), // Remove duplicates, take 5
      powerball: Math.floor(Math.random() * 26) + 1,
      confidence: 0.7
    };
  }

  /**
   * Generate prediction with custom weights
   */
  generatePredictionWithWeights(trainData, weights) {
    const allNumbers = Array.from({length: 69}, (_, i) => i + 1);
    const energyData = calculateEnergy(allNumbers, weights);
    
    return {
      whiteBalls: energyData
        .sort((a, b) => b.energy - a.energy)
        .slice(0, 5)
        .map(item => item.number),
      powerball: Math.floor(Math.random() * 26) + 1,
      confidence: 0.75
    };
  }

  /**
   * Generate hybrid prediction
   */
  generateHybridPrediction(trainData, params) {
    const offsetPred = this.generatePredictionWithOffsets(trainData, params.offsets);
    const weightPred = this.generatePredictionWithWeights(trainData, params.weights);
    
    // Combine predictions (simple average)
    const combined = [...offsetPred.whiteBalls, ...weightPred.whiteBalls];
    const unique = [...new Set(combined)].slice(0, 5);
    
    return {
      whiteBalls: unique,
      powerball: Math.floor(Math.random() * 26) + 1,
      confidence: 0.8
    };
  }

  /**
   * Count matching numbers between prediction and actual
   */
  countMatches(predicted, actual) {
    if (!predicted || !actual) return 0;
    return predicted.filter(num => actual.includes(num)).length;
  }

  /**
   * Calculate performance metrics for a set of predictions
   */
  calculatePerformanceMetrics(predictions) {
    if (predictions.length === 0) {
      return {
        hitRate: 0,
        averageMatches: 0,
        maxMatches: 0,
        consistency: 0,
        totalPredictions: 0
      };
    }

    const matches = predictions.map(p => p.matches);
    const hits = matches.filter(m => m >= 3).length;
    
    return {
      hitRate: hits / predictions.length,
      averageMatches: matches.reduce((sum, m) => sum + m, 0) / predictions.length,
      maxMatches: Math.max(...matches),
      consistency: this.calculateConsistency(matches),
      totalPredictions: predictions.length,
      matchDistribution: this.calculateMatchDistribution(matches)
    };
  }

  /**
   * Calculate consistency score (1 - coefficient of variation)
   */
  calculateConsistency(matches) {
    if (matches.length <= 1) return 1;
    
    const mean = matches.reduce((sum, m) => sum + m, 0) / matches.length;
    const variance = matches.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / matches.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? Math.max(0, 1 - (stdDev / mean)) : 0;
  }

  /**
   * Calculate match distribution
   */
  calculateMatchDistribution(matches) {
    const distribution = {};
    for (let i = 0; i <= 5; i++) {
      distribution[i] = matches.filter(m => m === i).length;
    }
    return distribution;
  }

  /**
   * Average performance across CV folds
   */
  averagePerformance(foldResults) {
    if (foldResults.length === 0) return this.calculatePerformanceMetrics([]);

    const avgPerformance = {
      hitRate: foldResults.reduce((sum, r) => sum + r.hitRate, 0) / foldResults.length,
      averageMatches: foldResults.reduce((sum, r) => sum + r.averageMatches, 0) / foldResults.length,
      maxMatches: Math.max(...foldResults.map(r => r.maxMatches)),
      consistency: foldResults.reduce((sum, r) => sum + r.consistency, 0) / foldResults.length,
      totalPredictions: foldResults.reduce((sum, r) => sum + r.totalPredictions, 0),
      foldVariance: this.calculateFoldVariance(foldResults)
    };

    return avgPerformance;
  }

  /**
   * Calculate variance between CV folds
   */
  calculateFoldVariance(foldResults) {
    const hitRates = foldResults.map(r => r.hitRate);
    const mean = hitRates.reduce((sum, hr) => sum + hr, 0) / hitRates.length;
    const variance = hitRates.reduce((sum, hr) => sum + Math.pow(hr - mean, 2), 0) / hitRates.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate improvement over baseline
   */
  calculateImprovement(bestPerformance, allResults) {
    const baseline = {
      hitRate: 0.1, // Typical baseline hit rate
      averageMatches: 1.2 // Typical baseline average matches
    };

    return {
      hitRateImprovement: ((bestPerformance.hitRate - baseline.hitRate) / baseline.hitRate) * 100,
      averageMatchImprovement: ((bestPerformance.averageMatches - baseline.averageMatches) / baseline.averageMatches) * 100,
      confidenceInterval: this.calculateConfidenceInterval(allResults)
    };
  }

  /**
   * Calculate 95% confidence interval for results
   */
  calculateConfidenceInterval(results) {
    const hitRates = results.map(r => r.performance.hitRate);
    const mean = hitRates.reduce((sum, hr) => sum + hr, 0) / hitRates.length;
    const stdDev = Math.sqrt(hitRates.reduce((sum, hr) => sum + Math.pow(hr - mean, 2), 0) / hitRates.length);
    const marginOfError = 1.96 * (stdDev / Math.sqrt(hitRates.length));
    
    return {
      lower: mean - marginOfError,
      upper: mean + marginOfError,
      mean,
      stdDev
    };
  }

  /**
   * Get optimization status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      type: this.type,
      resultsCount: this.results.length,
      hasBestParams: this.bestParams !== null,
      bestParams: this.bestParams
    };
  }
}

/**
 * Factory function to create optimization engine
 */
export function createOptimizationEngine(type) {
  return new OptimizationEngine(type);
}

/**
 * Quick optimization utility for common use cases
 */
export async function quickOptimize(historicalData, type = 'hybrid', iterations = 50) {
  const engine = new OptimizationEngine(type);
  
  return await engine.optimize(historicalData, {
    method: 'random',
    iterations,
    crossValidationFolds: 3
  });
}

export default OptimizationEngine;