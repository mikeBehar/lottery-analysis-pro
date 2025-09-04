/**
 * ENHANCED ACCURACY TESTING FRAMEWORK
 * Version: 1.0.0 | Created: 2025-09-04
 * 
 * Advanced split testing with walk-forward validation and adaptive learning
 */

import { PositionBasedPredictor } from './confidence-predictor.js';
import { calculateEnergy } from './utils.js';
import state from './state.js';

/**
 * Enhanced accuracy tester with walk-forward validation and adaptive learning
 */
export class EnhancedAccuracyTester {
  constructor(historicalData, options = {}) {
    this.historicalData = historicalData.filter(draw => 
      draw.whiteBalls && draw.whiteBalls.length === 5 && draw.powerball
    );
    
    this.options = {
      minTrainingSize: options.minTrainingSize || 100,
      testWindowSize: options.testWindowSize || 50,
      stepSize: options.stepSize || 10,
      maxValidationPeriods: options.maxValidationPeriods || 20,
      bootstrapIterations: options.bootstrapIterations || 200,
      confidenceLevel: options.confidenceLevel || 0.95,
      includeEnsemble: options.includeEnsemble || true,
      adaptiveWeighting: options.adaptiveWeighting || true,
      ...options
    };
    
    this.methods = new Map();
    this.accuracyHistory = [];
    this.methodWeights = {
      confidence: 0.25,
      energy: 0.25, 
      frequency: 0.25,
      lstm: 0.25
    };
    
    this.isRunning = false;
    this.currentProgress = 0;
    
    this.initializeMethods();
  }

  /**
   * Initialize prediction methods for testing
   */
  initializeMethods() {
    // Confidence interval method
    this.methods.set('confidence', {
      name: 'Confidence Intervals',
      predict: async (trainingData, options = {}) => {
        const predictor = new PositionBasedPredictor(trainingData);
        const predictions = await predictor.generatePredictionWithConfidenceIntervals({
          confidenceLevel: options.confidenceLevel || 0.95,
          method: 'bootstrap'
        });
        
        return {
          whiteBalls: predictions.slice(0, 5).map(p => p.prediction),
          powerball: predictions[5].prediction,
          confidence: options.confidenceLevel || 0.95,
          method: 'confidence',
          intervals: predictions
        };
      },
      weight: this.methodWeights.confidence,
      accuracy: 0.5 // Initial placeholder
    });

    // Energy signature method  
    this.methods.set('energy', {
      name: 'Energy Signature',
      predict: async (trainingData, options = {}) => {
        const weights = options.energyWeights || {
          prime: 0.3, digitalRoot: 0.2, mod5: 0.2, gridPosition: 0.3
        };
        
        const allNumbers = [...new Set(trainingData.flatMap(d => d.whiteBalls))];
        const energyData = calculateEnergy(allNumbers, weights);
        
        const topEnergy = energyData
          .sort((a, b) => b.energy - a.energy)
          .slice(0, 5)
          .map(item => item.number);
          
        return {
          whiteBalls: topEnergy,
          powerball: this.predictPowerball(trainingData),
          confidence: 0.70,
          method: 'energy',
          energyScores: energyData
        };
      },
      weight: this.methodWeights.energy,
      accuracy: 0.5
    });

    // Frequency analysis method
    this.methods.set('frequency', {
      name: 'Frequency Analysis',
      predict: async (trainingData, options = {}) => {
        const lookbackPeriod = options.lookbackPeriod || 100;
        const recentData = trainingData.slice(-lookbackPeriod);
        
        const frequency = new Array(70).fill(0);
        recentData.forEach(draw => {
          draw.whiteBalls.forEach(num => {
            if (num >= 1 && num <= 69) frequency[num]++;
          });
        });
        
        const topFrequent = frequency
          .map((count, number) => ({ number, count, frequency: count / recentData.length }))
          .filter(item => item.number >= 1 && item.number <= 69)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(item => item.number);
          
        return {
          whiteBalls: topFrequent,
          powerball: this.predictPowerball(trainingData),
          confidence: 0.60,
          method: 'frequency',
          frequencies: frequency
        };
      },
      weight: this.methodWeights.frequency,
      accuracy: 0.5
    });

    // LSTM placeholder (would integrate with existing ML worker)
    this.methods.set('lstm', {
      name: 'LSTM Neural Network',
      predict: async (trainingData, options = {}) => {
        // This would integrate with the existing ML worker
        // For now, return a simple pattern-based prediction
        const recent = trainingData.slice(-10);
        const avgNumbers = [0, 0, 0, 0, 0];
        
        recent.forEach(draw => {
          const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
          sorted.forEach((num, idx) => {
            avgNumbers[idx] += num;
          });
        });
        
        const predicted = avgNumbers.map(sum => 
          Math.round(sum / recent.length)
        ).sort((a, b) => a - b);
        
        return {
          whiteBalls: predicted,
          powerball: this.predictPowerball(trainingData),
          confidence: 0.65,
          method: 'lstm',
          neuralPattern: 'temporal-average'
        };
      },
      weight: this.methodWeights.lstm,
      accuracy: 0.5
    });
  }

  /**
   * Simple powerball prediction helper
   */
  predictPowerball(trainingData) {
    const recentPowerballs = trainingData.slice(-20).map(d => d.powerball);
    const frequency = new Array(27).fill(0);
    recentPowerballs.forEach(pb => frequency[pb]++);
    
    const maxFreq = Math.max(...frequency);
    const mostFrequent = frequency.findIndex(f => f === maxFreq);
    
    return mostFrequent || Math.floor(Math.random() * 26) + 1;
  }

  /**
   * Run comprehensive walk-forward validation
   */
  async runAccuracyTest(progressCallback = null) {
    if (this.isRunning) {
      throw new Error('Accuracy test is already running');
    }

    if (this.historicalData.length < this.options.minTrainingSize + this.options.testWindowSize) {
      throw new Error(`Insufficient data. Need at least ${this.options.minTrainingSize + this.options.testWindowSize} draws`);
    }

    this.isRunning = true;
    this.currentProgress = 0;
    
    const results = {
      methods: new Map(),
      ensemble: null,
      summary: {},
      validationPeriods: [],
      totalPredictions: 0,
      startTime: new Date(),
      endTime: null
    };

    try {
      console.log(`Starting enhanced accuracy test with ${this.methods.size} methods`);
      
      // Calculate validation windows
      const validationWindows = this.generateValidationWindows();
      const totalSteps = validationWindows.length * this.methods.size;
      let currentStep = 0;

      // Test each method across all validation windows
      for (const [methodName, method] of this.methods) {
        console.log(`Testing method: ${methodName}`);
        
        const methodResults = {
          name: method.name,
          predictions: [],
          accuracy: {},
          performance: {},
          validationWindows: validationWindows.length
        };

        // Walk-forward validation for this method
        for (const window of validationWindows) {
          const windowPredictions = await this.testMethodOnWindow(
            method, window, methodName
          );
          methodResults.predictions.push(...windowPredictions);
          
          currentStep++;
          this.currentProgress = (currentStep / totalSteps) * 100;
          
          if (progressCallback) {
            progressCallback({
              progress: this.currentProgress,
              currentMethod: methodName,
              window: window.period,
              totalWindows: validationWindows.length
            });
          }
          
          // Yield control to prevent UI blocking
          await new Promise(resolve => setTimeout(resolve, 1));
        }

        // Calculate comprehensive accuracy metrics for this method
        methodResults.accuracy = this.calculateComprehensiveAccuracy(methodResults.predictions);
        methodResults.performance = this.calculatePerformanceMetrics(methodResults.predictions);
        
        results.methods.set(methodName, methodResults);
        results.totalPredictions += methodResults.predictions.length;

        // Update method weights based on performance (adaptive learning)
        if (this.options.adaptiveWeighting) {
          this.updateMethodWeight(methodName, methodResults.accuracy.overallScore);
        }
      }

      // Generate ensemble predictions if enabled
      if (this.options.includeEnsemble) {
        results.ensemble = await this.generateEnsembleResults(validationWindows);
      }

      // Generate comprehensive summary
      results.summary = this.generateComprehensiveSummary(results);
      results.endTime = new Date();
      
      // Store results for future adaptive learning
      this.accuracyHistory.push({
        timestamp: new Date(),
        results: results.summary,
        methodWeights: { ...this.methodWeights }
      });

      console.log('Enhanced accuracy test completed successfully');
      return results;

    } catch (error) {
      console.error('Enhanced accuracy test failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Generate validation windows for walk-forward testing
   */
  generateValidationWindows() {
    const windows = [];
    const { minTrainingSize, testWindowSize, stepSize, maxValidationPeriods } = this.options;
    
    let currentStart = 0;
    let period = 0;
    
    while (
      currentStart + minTrainingSize + testWindowSize <= this.historicalData.length &&
      period < maxValidationPeriods
    ) {
      const trainingEnd = currentStart + minTrainingSize;
      const testEnd = trainingEnd + testWindowSize;
      
      windows.push({
        period,
        trainingStart: currentStart,
        trainingEnd,
        testStart: trainingEnd,
        testEnd,
        trainingData: this.historicalData.slice(currentStart, trainingEnd),
        testData: this.historicalData.slice(trainingEnd, testEnd)
      });
      
      currentStart += stepSize;
      period++;
    }
    
    return windows;
  }

  /**
   * Test a specific method on a validation window
   */
  async testMethodOnWindow(method, window, methodName) {
    const predictions = [];
    
    // Generate predictions for each draw in the test window
    for (let i = 0; i < window.testData.length; i++) {
      const actualDraw = window.testData[i];
      const trainingUpToPoint = [
        ...window.trainingData,
        ...window.testData.slice(0, i)
      ];
      
      try {
        const prediction = await method.predict(trainingUpToPoint, {
          confidenceLevel: this.options.confidenceLevel,
          bootstrapIterations: this.options.bootstrapIterations
        });

        const predictionResult = {
          period: window.period,
          drawIndex: i,
          method: methodName,
          predicted: prediction,
          actual: actualDraw,
          metrics: this.calculateDrawMetrics(prediction, actualDraw),
          timestamp: actualDraw.date
        };

        predictions.push(predictionResult);
        
      } catch (error) {
        console.warn(`Prediction failed for ${methodName} on draw ${i}:`, error);
        // Continue with other predictions
      }
    }
    
    return predictions;
  }

  /**
   * Calculate metrics for a single prediction vs actual draw
   */
  calculateDrawMetrics(prediction, actual) {
    const whiteBallMatches = this.countMatches(prediction.whiteBalls, actual.whiteBalls);
    const powerballMatch = prediction.powerball === actual.powerball;
    
    // Prize tier calculation (Powerball rules)
    const prizeTier = this.calculatePrizeTier(whiteBallMatches, powerballMatch);
    
    // Position accuracy (for sorted balls)
    const sortedPredicted = [...prediction.whiteBalls].sort((a, b) => a - b);
    const sortedActual = [...actual.whiteBalls].sort((a, b) => a - b);
    const positionErrors = sortedPredicted.map((pred, idx) => 
      Math.abs(pred - sortedActual[idx])
    );
    
    // Confidence interval accuracy (if available)
    let confidenceAccuracy = null;
    if (prediction.intervals) {
      confidenceAccuracy = this.assessConfidenceAccuracy(prediction.intervals, actual);
    }
    
    return {
      whiteBallMatches,
      powerballMatch,
      prizeTier,
      positionErrors,
      meanAbsoluteError: positionErrors.reduce((sum, err) => sum + err, 0) / 5,
      confidenceAccuracy,
      isWinningTicket: prizeTier !== null
    };
  }

  /**
   * Count matching numbers between predicted and actual
   */
  countMatches(predicted, actual) {
    return predicted.filter(num => actual.includes(num)).length;
  }

  /**
   * Calculate Powerball prize tier
   */
  calculatePrizeTier(whiteBallMatches, powerballMatch) {
    if (whiteBallMatches === 5 && powerballMatch) return 'jackpot';
    if (whiteBallMatches === 5) return 'match5';
    if (whiteBallMatches === 4 && powerballMatch) return 'match4plus';
    if (whiteBallMatches === 4) return 'match4';
    if (whiteBallMatches === 3 && powerballMatch) return 'match3plus';
    if (whiteBallMatches === 3) return 'match3';
    if (whiteBallMatches === 2 && powerballMatch) return 'match2plus';
    if (whiteBallMatches === 1 && powerballMatch) return 'match1plus';
    if (powerballMatch) return 'powerball';
    return null; // No prize
  }

  /**
   * Assess confidence interval accuracy
   */
  assessConfidenceAccuracy(intervals, actual) {
    const sortedActual = [...actual.whiteBalls].sort((a, b) => a - b);
    let withinInterval = 0;
    
    intervals.slice(0, 5).forEach((interval, idx) => {
      const actualValue = sortedActual[idx];
      if (actualValue >= interval.confidenceInterval.lower && 
          actualValue <= interval.confidenceInterval.upper) {
        withinInterval++;
      }
    });
    
    return {
      withinInterval,
      totalPositions: 5,
      accuracy: withinInterval / 5,
      expectedAccuracy: this.options.confidenceLevel
    };
  }

  /**
   * Calculate comprehensive accuracy metrics
   */
  calculateComprehensiveAccuracy(predictions) {
    if (predictions.length === 0) return {};
    
    const metrics = predictions.map(p => p.metrics);
    
    // Match-based accuracy
    const matchCounts = metrics.map(m => m.whiteBallMatches);
    const powerballHits = metrics.filter(m => m.powerballMatch).length;
    
    // Prize tier distribution
    const prizeTiers = {};
    metrics.forEach(m => {
      if (m.prizeTier) {
        prizeTiers[m.prizeTier] = (prizeTiers[m.prizeTier] || 0) + 1;
      }
    });
    
    // Position accuracy
    const allPositionErrors = metrics.flatMap(m => m.positionErrors);
    const meanAbsoluteErrors = metrics.map(m => m.meanAbsoluteError);
    
    // Confidence interval accuracy
    const confidenceAccuracies = metrics
      .map(m => m.confidenceAccuracy)
      .filter(ca => ca !== null);
    
    // Overall performance score
    const hitRate = metrics.filter(m => m.whiteBallMatches >= 3).length / metrics.length;
    const avgMatches = matchCounts.reduce((sum, matches) => sum + matches, 0) / matchCounts.length;
    const winRate = metrics.filter(m => m.isWinningTicket).length / metrics.length;
    const avgMAE = meanAbsoluteErrors.reduce((sum, mae) => sum + mae, 0) / meanAbsoluteErrors.length;
    
    // Weighted overall score (higher is better)
    const overallScore = (
      (avgMatches / 5) * 0.4 +        // 40% weight on average matches
      hitRate * 0.3 +                 // 30% weight on hit rate (3+ matches)
      winRate * 0.2 +                 // 20% weight on any prize wins
      (1 - avgMAE / 35) * 0.1         // 10% weight on position accuracy
    );
    
    return {
      totalPredictions: predictions.length,
      averageMatches: avgMatches,
      hitRate: hitRate,
      powerballHitRate: powerballHits / predictions.length,
      winRate: winRate,
      prizeTierDistribution: prizeTiers,
      positionAccuracy: {
        meanAbsoluteError: avgMAE,
        allErrors: allPositionErrors
      },
      confidenceCalibration: confidenceAccuracies.length > 0 ? {
        averageAccuracy: confidenceAccuracies.reduce((sum, ca) => sum + ca.accuracy, 0) / confidenceAccuracies.length,
        expectedAccuracy: this.options.confidenceLevel,
        calibrationError: Math.abs(
          (confidenceAccuracies.reduce((sum, ca) => sum + ca.accuracy, 0) / confidenceAccuracies.length) - 
          this.options.confidenceLevel
        )
      } : null,
      overallScore: overallScore,
      consistency: this.calculateConsistency(matchCounts)
    };
  }

  /**
   * Calculate consistency metrics
   */
  calculateConsistency(values) {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      variance,
      standardDeviation: stdDev,
      coefficientOfVariation: stdDev / mean,
      consistencyScore: Math.max(0, 1 - (stdDev / mean))
    };
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(predictions) {
    // Expected value calculation based on prize tiers
    const prizeValues = {
      'jackpot': 100000000,    // $100M average
      'match5': 1000000,       // $1M
      'match4plus': 50000,     // $50K
      'match4': 100,           // $100
      'match3plus': 100,       // $100
      'match3': 7,             // $7
      'match2plus': 7,         // $7
      'match1plus': 4,         // $4
      'powerball': 4           // $4
    };
    
    let totalExpectedValue = 0;
    let totalCost = predictions.length * 2; // $2 per ticket
    
    predictions.forEach(pred => {
      const tier = pred.metrics.prizeTier;
      if (tier && prizeValues[tier]) {
        totalExpectedValue += prizeValues[tier];
      }
    });
    
    const roi = (totalExpectedValue - totalCost) / totalCost;
    const profitability = totalExpectedValue / totalCost;
    
    return {
      totalCost,
      totalExpectedValue,
      roi,
      profitability,
      averageTicketValue: totalExpectedValue / predictions.length,
      breakEvenRate: totalCost / totalExpectedValue
    };
  }

  /**
   * Generate ensemble predictions
   */
  async generateEnsembleResults(validationWindows) {
    // This would combine predictions from all methods using adaptive weighting
    const ensemblePredictions = [];
    
    for (const window of validationWindows) {
      for (let i = 0; i < window.testData.length; i++) {
        const actualDraw = window.testData[i];
        const trainingUpToPoint = [...window.trainingData, ...window.testData.slice(0, i)];
        
        // Get predictions from all methods
        const methodPredictions = [];
        for (const [methodName, method] of this.methods) {
          try {
            const prediction = await method.predict(trainingUpToPoint);
            methodPredictions.push({
              method: methodName,
              weight: method.weight,
              prediction
            });
          } catch (error) {
            console.warn(`Ensemble prediction failed for ${methodName}:`, error);
          }
        }
        
        // Combine using weighted voting
        const ensemblePrediction = this.combineWeightedPredictions(methodPredictions);
        
        ensemblePredictions.push({
          period: window.period,
          drawIndex: i,
          method: 'ensemble',
          predicted: ensemblePrediction,
          actual: actualDraw,
          metrics: this.calculateDrawMetrics(ensemblePrediction, actualDraw),
          contributingMethods: methodPredictions.length
        });
      }
    }
    
    return {
      predictions: ensemblePredictions,
      accuracy: this.calculateComprehensiveAccuracy(ensemblePredictions),
      weights: { ...this.methodWeights }
    };
  }

  /**
   * Combine predictions using weighted voting
   */
  combineWeightedPredictions(methodPredictions) {
    // Weighted voting for white balls
    const ballVotes = new Array(70).fill(0).map(() => new Map());
    const powerballVotes = new Map();
    
    methodPredictions.forEach(({ prediction, weight }) => {
      // Vote for white balls
      prediction.whiteBalls.forEach(ball => {
        ballVotes[ball] = (ballVotes[ball] || 0) + weight;
      });
      
      // Vote for powerball
      powerballVotes.set(prediction.powerball, 
        (powerballVotes.get(prediction.powerball) || 0) + weight
      );
    });
    
    // Select top 5 voted white balls
    const whiteBallScores = ballVotes
      .map((votes, ball) => ({ ball, votes }))
      .filter(item => item.votes > 0 && item.ball >= 1 && item.ball <= 69)
      .sort((a, b) => b.votes - a.votes);
    
    const selectedWhiteBalls = whiteBallScores
      .slice(0, 5)
      .map(item => item.ball)
      .sort((a, b) => a - b);
    
    // Select highest voted powerball
    const selectedPowerball = Array.from(powerballVotes.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 1;
    
    return {
      whiteBalls: selectedWhiteBalls,
      powerball: selectedPowerball,
      confidence: 0.75,
      method: 'ensemble',
      votingWeights: { ...this.methodWeights }
    };
  }

  /**
   * Update method weight based on performance (adaptive learning)
   */
  updateMethodWeight(methodName, accuracyScore) {
    const currentWeight = this.methodWeights[methodName];
    const learningRate = 0.1;
    
    // Adjust weight based on performance relative to average
    const avgScore = Object.values(this.methodWeights).reduce((sum, w) => sum + w, 0) / 4;
    const adjustment = (accuracyScore - avgScore) * learningRate;
    
    const newWeight = Math.max(0.05, Math.min(0.7, currentWeight + adjustment));
    this.methodWeights[methodName] = newWeight;
    
    // Normalize weights to sum to 1
    const totalWeight = Object.values(this.methodWeights).reduce((sum, w) => sum + w, 0);
    Object.keys(this.methodWeights).forEach(method => {
      this.methodWeights[method] /= totalWeight;
    });
    
    // Update method weight in the methods map
    if (this.methods.has(methodName)) {
      this.methods.get(methodName).weight = this.methodWeights[methodName];
      this.methods.get(methodName).accuracy = accuracyScore;
    }
  }

  /**
   * Generate comprehensive summary
   */
  generateComprehensiveSummary(results) {
    const methodSummaries = [];
    let bestMethod = null;
    let bestScore = 0;
    
    for (const [methodName, methodResult] of results.methods) {
      const summary = {
        name: methodName,
        displayName: methodResult.name,
        overallScore: methodResult.accuracy.overallScore || 0,
        averageMatches: methodResult.accuracy.averageMatches || 0,
        hitRate: methodResult.accuracy.hitRate || 0,
        winRate: methodResult.accuracy.winRate || 0,
        consistency: methodResult.accuracy.consistency?.consistencyScore || 0,
        weight: this.methodWeights[methodName] || 0,
        totalPredictions: methodResult.predictions.length
      };
      
      methodSummaries.push(summary);
      
      if (summary.overallScore > bestScore) {
        bestScore = summary.overallScore;
        bestMethod = summary;
      }
    }
    
    // Sort by overall score
    methodSummaries.sort((a, b) => b.overallScore - a.overallScore);
    
    return {
      bestMethod,
      methodRanking: methodSummaries,
      ensemble: results.ensemble ? {
        overallScore: results.ensemble.accuracy.overallScore || 0,
        averageMatches: results.ensemble.accuracy.averageMatches || 0,
        hitRate: results.ensemble.accuracy.hitRate || 0
      } : null,
      totalPredictions: results.totalPredictions,
      validationPeriods: results.validationPeriods?.length || 0,
      testDuration: results.endTime ? results.endTime - results.startTime : 0,
      adaptiveWeights: { ...this.methodWeights },
      keyFindings: this.generateKeyFindings(methodSummaries, results.ensemble)
    };
  }

  /**
   * Generate key findings from results
   */
  generateKeyFindings(methodSummaries, ensemble) {
    const findings = [];
    
    if (methodSummaries.length > 0) {
      const best = methodSummaries[0];
      findings.push(`Best method: ${best.displayName} (${(best.overallScore * 100).toFixed(1)}% score)`);
      findings.push(`Hit rate: ${(best.hitRate * 100).toFixed(1)}% (3+ matches)`);
      findings.push(`Average matches: ${best.averageMatches.toFixed(2)} per draw`);
    }
    
    if (ensemble && ensemble.overallScore > 0) {
      findings.push(`Ensemble method achieved ${(ensemble.overallScore * 100).toFixed(1)}% overall score`);
    }
    
    const totalPredictions = methodSummaries.reduce((sum, m) => sum + m.totalPredictions, 0);
    findings.push(`Analysis based on ${totalPredictions} total predictions`);
    
    return findings;
  }

  /**
   * Get current test status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      progress: this.currentProgress,
      methodsRegistered: this.methods.size,
      dataSize: this.historicalData.length,
      adaptiveWeights: { ...this.methodWeights },
      hasHistoricalResults: this.accuracyHistory.length > 0
    };
  }

  /**
   * Export results for external use
   */
  exportResults(results) {
    return {
      summary: results.summary,
      methodDetails: Array.from(results.methods.entries()).map(([name, data]) => ({
        method: name,
        accuracy: data.accuracy,
        sampleSize: data.predictions.length
      })),
      ensemble: results.ensemble?.accuracy || null,
      exportTimestamp: new Date().toISOString(),
      testParameters: this.options
    };
  }
}

// Export for use in other modules
export default EnhancedAccuracyTester;

// Browser compatibility
if (typeof window !== 'undefined') {
  window.EnhancedAccuracyTester = EnhancedAccuracyTester;
}