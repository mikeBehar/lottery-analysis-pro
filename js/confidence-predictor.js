/**
 * POSITION-BASED CONFIDENCE INTERVAL PREDICTOR
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * Provides sophisticated statistical analysis for position-specific
 * lottery predictions with confidence intervals and uncertainty quantification
 */

/**
 * Statistical utilities for confidence interval calculations
 */
class StatisticalUtils {
  
  static mean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  static median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }
  
  static standardDeviation(values) {
    const avg = this.mean(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const variance = this.mean(squaredDiffs);
    return Math.sqrt(variance);
  }
  
  static weightedMean(values, weights) {
    const weightedSum = values.reduce((sum, val, i) => sum + val * weights[i], 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    return weightedSum / totalWeight;
  }
  
  static weightedVariance(values, weights, weightedMean) {
    const weightedSquaredDiffs = values.reduce((sum, val, i) => 
      sum + weights[i] * Math.pow(val - weightedMean, 2), 0
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    return weightedSquaredDiffs / totalWeight;
  }
  
  static getZScore(confidenceLevel) {
    const zScores = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    return zScores[confidenceLevel] || 1.96;
  }
  
  static resample(data) {
    const sample = [];
    for (let i = 0; i < data.length; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      sample.push(data[randomIndex]);
    }
    return sample;
  }
}

/**
 * Advanced confidence interval analysis methods
 */
class AdvancedConfidenceAnalysis {
  
  /**
   * Bootstrap confidence intervals - more robust than normal approximation
   */
  bootstrapConfidenceInterval(positionData, confidenceLevel = 0.95, iterations = 1000) {
    const bootstrapMeans = [];
    
    for (let i = 0; i < iterations; i++) {
      const sample = StatisticalUtils.resample(positionData);
      bootstrapMeans.push(StatisticalUtils.mean(sample));
    }
    
    bootstrapMeans.sort((a, b) => a - b);
    const alpha = 1 - confidenceLevel;
    const lowerIndex = Math.floor(alpha / 2 * iterations);
    const upperIndex = Math.floor((1 - alpha / 2) * iterations);
    
    return {
      lower: Math.round(bootstrapMeans[lowerIndex]),
      upper: Math.round(bootstrapMeans[upperIndex]),
      method: 'bootstrap',
      iterations
    };
  }

  /**
   * Time-weighted confidence intervals - recent data weighted more heavily
   */
  timeWeightedConfidence(positionData, confidenceLevel = 0.95, decayRate = 0.95) {
    const weights = positionData.map((_, index) => 
      Math.pow(decayRate, positionData.length - index - 1)
    );
    
    const weightedMean = StatisticalUtils.weightedMean(positionData, weights);
    const weightedVariance = StatisticalUtils.weightedVariance(positionData, weights, weightedMean);
    const effectiveSampleSize = Math.pow(weights.reduce((a, b) => a + b), 2) / 
                                weights.reduce((a, b) => a + b * b);
    
    const standardError = Math.sqrt(weightedVariance / effectiveSampleSize);
    const zScore = StatisticalUtils.getZScore(confidenceLevel);
    const marginOfError = zScore * standardError;
    
    return {
      prediction: Math.round(weightedMean),
      lower: Math.round(weightedMean - marginOfError),
      upper: Math.round(weightedMean + marginOfError),
      method: 'time-weighted',
      effectiveSampleSize: Math.round(effectiveSampleSize)
    };
  }

  /**
   * Normal approximation confidence interval
   */
  normalConfidenceInterval(positionData, confidenceLevel = 0.95) {
    const mean = StatisticalUtils.mean(positionData);
    const std = StatisticalUtils.standardDeviation(positionData);
    const n = positionData.length;
    const zScore = StatisticalUtils.getZScore(confidenceLevel);
    const marginOfError = zScore * (std / Math.sqrt(n));
    
    return {
      prediction: Math.round(mean),
      lower: Math.round(mean - marginOfError),
      upper: Math.round(mean + marginOfError),
      method: 'normal',
      sampleSize: n
    };
  }
}

/**
 * Position-specific lottery number predictor with confidence intervals
 */
class PositionBasedPredictor {
  constructor(historicalData) {
    this.data = historicalData.filter(draw => 
      draw.whiteBalls && draw.whiteBalls.length === 5 && draw.powerball
    );
    this.positionStats = this.calculatePositionStatistics();
    this.advancedStats = new AdvancedConfidenceAnalysis();
  }

  /**
   * Calculate statistical properties for each ball position
   */
  calculatePositionStatistics() {
    const positions = {
      ball1: [], ball2: [], ball3: [], ball4: [], ball5: [], powerball: []
    };

    // Extract position-specific data
    this.data.forEach(draw => {
      const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
      positions.ball1.push(sorted[0]);  // Lowest number
      positions.ball2.push(sorted[1]);  // Second lowest  
      positions.ball3.push(sorted[2]);  // Middle
      positions.ball4.push(sorted[3]);  // Second highest
      positions.ball5.push(sorted[4]);  // Highest number
      positions.powerball.push(draw.powerball);
    });

    // Calculate comprehensive statistics for each position
    return Object.entries(positions).reduce((stats, [pos, values]) => {
      stats[pos] = {
        mean: StatisticalUtils.mean(values),
        median: StatisticalUtils.median(values),
        std: StatisticalUtils.standardDeviation(values),
        min: Math.min(...values),
        max: Math.max(...values),
        sampleSize: values.length,
        distribution: this.buildDistribution(values),
        recent: values.slice(-20) // Last 20 draws for trend analysis
      };
      return stats;
    }, {});
  }

  /**
   * Build frequency distribution for a position
   */
  buildDistribution(values) {
    const distribution = {};
    values.forEach(val => {
      distribution[val] = (distribution[val] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Get historical data for a specific position
   */
  getPositionData(position) {
    const positionIndex = {
      'ball1': 0, 'ball2': 1, 'ball3': 2, 'ball4': 3, 'ball5': 4
    };

    if (position === 'powerball') {
      return this.data.map(draw => draw.powerball);
    } else {
      return this.data.map(draw => {
        const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
        return sorted[positionIndex[position]];
      });
    }
  }

  /**
   * Generate predictions with confidence intervals for all positions
   */
  async generatePredictionWithConfidenceIntervals(options = {}) {
    const {
      confidenceLevel = 0.95,
      method = 'bootstrap', // 'normal', 'bootstrap', 'time-weighted'
      includeCorrelations = true
    } = options;

    const positions = ['ball1', 'ball2', 'ball3', 'ball4', 'ball5', 'powerball'];
    const predictions = [];

    for (const position of positions) {
      const positionData = this.getPositionData(position);
      const stats = this.positionStats[position];
      
      let confidenceResult;
      switch (method) {
        case 'bootstrap':
          confidenceResult = this.advancedStats.bootstrapConfidenceInterval(positionData, confidenceLevel);
          break;
        case 'time-weighted':
          confidenceResult = this.advancedStats.timeWeightedConfidence(positionData, confidenceLevel);
          break;
        case 'normal':
        default:
          confidenceResult = this.advancedStats.normalConfidenceInterval(positionData, confidenceLevel);
      }

      // Apply position-specific constraints
      const maxValue = position === 'powerball' ? 26 : 69;
      const minValue = 1;
      
      const prediction = confidenceResult.prediction || Math.round(stats.mean);
      const lower = Math.max(minValue, confidenceResult.lower);
      const upper = Math.min(maxValue, confidenceResult.upper);

      predictions.push({
        position,
        prediction,
        confidenceInterval: {
          lower,
          upper,
          method,
          confidenceLevel,
          display: this.formatConfidenceDisplay(prediction, lower, upper)
        },
        statistics: {
          mean: Math.round(stats.mean * 100) / 100,
          median: stats.median,
          std: Math.round(stats.std * 100) / 100,
          sampleSize: stats.sampleSize
        }
      });
    }

    // Adjust for position correlations if requested
    if (includeCorrelations) {
      return this.adjustForPositionConstraints(predictions);
    }

    return predictions;
  }

  /**
   * Format confidence interval display
   */
  formatConfidenceDisplay(prediction, lower, upper) {
    const lowerDiff = prediction - lower;
    const upperDiff = upper - prediction;
    
    return {
      range: `${prediction} {-${lowerDiff}, +${upperDiff}}`,
      interval: `[${lower}, ${upper}]`,
      symmetric: lowerDiff === upperDiff,
      precision: lowerDiff !== upperDiff ? `{-${lowerDiff}, +${upperDiff}}` : `±${lowerDiff}`
    };
  }

  /**
   * Adjust predictions to ensure they follow position constraints
   * (e.g., ball1 < ball2 < ball3 < ball4 < ball5)
   */
  adjustForPositionConstraints(predictions) {
    const whiteBallPredictions = predictions.slice(0, 5); // First 5 are white balls
    const powerballPrediction = predictions[5];

    // Sort white ball predictions by their values to maintain order
    whiteBallPredictions.sort((a, b) => a.prediction - b.prediction);
    
    // Ensure minimum gaps between positions
    const minGap = 2;
    for (let i = 1; i < whiteBallPredictions.length; i++) {
      if (whiteBallPredictions[i].prediction - whiteBallPredictions[i-1].prediction < minGap) {
        whiteBallPredictions[i].prediction = whiteBallPredictions[i-1].prediction + minGap;
        
        // Adjust confidence intervals accordingly
        const adjustment = whiteBallPredictions[i].prediction - 
          (whiteBallPredictions[i].confidenceInterval.lower + whiteBallPredictions[i].confidenceInterval.upper) / 2;
        
        whiteBallPredictions[i].confidenceInterval.lower += adjustment;
        whiteBallPredictions[i].confidenceInterval.upper += adjustment;
        
        // Re-format display
        whiteBallPredictions[i].confidenceInterval.display = this.formatConfidenceDisplay(
          whiteBallPredictions[i].prediction,
          whiteBallPredictions[i].confidenceInterval.lower,
          whiteBallPredictions[i].confidenceInterval.upper
        );
        
        whiteBallPredictions[i].constraintAdjusted = true;
      }
    }

    return [...whiteBallPredictions, powerballPrediction];
  }

  /**
   * Get summary statistics for the prediction system
   */
  getSystemStats() {
    return {
      totalDraws: this.data.length,
      positionStats: Object.entries(this.positionStats).reduce((summary, [pos, stats]) => {
        summary[pos] = {
          mean: Math.round(stats.mean * 100) / 100,
          range: `${stats.min}-${stats.max}`,
          std: Math.round(stats.std * 100) / 100
        };
        return summary;
      }, {}),
      dataQuality: this.assessDataQuality()
    };
  }

  /**
   * Assess the quality and sufficiency of historical data
   */
  assessDataQuality() {
    const minRecommendedDraws = 100;
    const quality = {
      sufficient: this.data.length >= minRecommendedDraws,
      drawCount: this.data.length,
      recommendation: this.data.length >= minRecommendedDraws 
        ? 'Sufficient data for reliable confidence intervals'
        : `Consider collecting more data. Current: ${this.data.length}, Recommended: ${minRecommendedDraws}+`
    };

    return quality;
  }
}

// Export for use in other modules
export { 
  PositionBasedPredictor, 
  AdvancedConfidenceAnalysis, 
  StatisticalUtils 
};

// Browser compatibility
if (typeof window !== 'undefined') {
  window.PositionBasedPredictor = PositionBasedPredictor;
  window.AdvancedConfidenceAnalysis = AdvancedConfidenceAnalysis;
  window.StatisticalUtils = StatisticalUtils;
}