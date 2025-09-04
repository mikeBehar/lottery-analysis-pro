/**
 * CONFIDENCE PREDICTOR UNIT TESTS
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * Comprehensive unit tests for position-based confidence interval prediction system
 */

import { 
  PositionBasedPredictor, 
  AdvancedConfidenceAnalysis, 
  StatisticalUtils 
} from '../js/confidence-predictor.js';

describe('StatisticalUtils', () => {
  describe('Basic statistical functions', () => {
    const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    it('should calculate mean correctly', () => {
      expect(StatisticalUtils.mean(testData)).toBe(5.5);
      expect(StatisticalUtils.mean([1, 1, 1])).toBe(1);
      expect(StatisticalUtils.mean([10])).toBe(10);
    });
    
    it('should calculate median correctly', () => {
      expect(StatisticalUtils.median(testData)).toBe(5.5);
      expect(StatisticalUtils.median([1, 2, 3])).toBe(2);
      expect(StatisticalUtils.median([1, 2, 3, 4])).toBe(2.5);
      expect(StatisticalUtils.median([5])).toBe(5);
    });
    
    it('should calculate standard deviation correctly', () => {
      const result = StatisticalUtils.standardDeviation(testData);
      expect(result).toBeCloseTo(2.87, 2); // Correct std dev for 1-10
      
      expect(StatisticalUtils.standardDeviation([5, 5, 5])).toBe(0);
    });
    
    it('should calculate weighted mean correctly', () => {
      const values = [1, 2, 3, 4];
      const weights = [1, 2, 3, 4]; // Higher weight on larger values
      
      const weightedMean = StatisticalUtils.weightedMean(values, weights);
      expect(weightedMean).toBe(3); // (1*1 + 2*2 + 3*3 + 4*4) / (1+2+3+4) = 30/10 = 3
    });
    
    it('should return correct z-scores for confidence levels', () => {
      expect(StatisticalUtils.getZScore(0.90)).toBe(1.645);
      expect(StatisticalUtils.getZScore(0.95)).toBe(1.96);
      expect(StatisticalUtils.getZScore(0.99)).toBe(2.576);
      expect(StatisticalUtils.getZScore(0.85)).toBe(1.96); // Default fallback
    });
    
    it('should resample data correctly', () => {
      const originalData = [1, 2, 3, 4, 5];
      const sample = StatisticalUtils.resample(originalData);
      
      expect(sample.length).toBe(originalData.length);
      sample.forEach(value => {
        expect(originalData).toContain(value);
      });
    });
  });
});

describe('AdvancedConfidenceAnalysis', () => {
  let analyzer;
  let samplePositionData;
  
  beforeEach(() => {
    analyzer = new AdvancedConfidenceAnalysis();
    
    // Create realistic lottery position data (e.g., ball1 typically ranges 1-20)
    samplePositionData = [];
    for (let i = 0; i < 100; i++) {
      samplePositionData.push(Math.floor(Math.random() * 20) + 1);
    }
  });
  
  describe('Bootstrap confidence intervals', () => {
    it('should generate bootstrap confidence intervals', () => {
      const result = analyzer.bootstrapConfidenceInterval(samplePositionData, 0.95, 100);
      
      expect(result).toHaveProperty('lower');
      expect(result).toHaveProperty('upper');
      expect(result).toHaveProperty('method', 'bootstrap');
      expect(result).toHaveProperty('iterations', 100);
      
      expect(result.upper).toBeGreaterThan(result.lower);
      expect(result.lower).toBeGreaterThanOrEqual(1);
      expect(result.upper).toBeLessThanOrEqual(21);
    });
    
    it('should handle different confidence levels', () => {
      const result90 = analyzer.bootstrapConfidenceInterval(samplePositionData, 0.90);
      const result95 = analyzer.bootstrapConfidenceInterval(samplePositionData, 0.95);
      const result99 = analyzer.bootstrapConfidenceInterval(samplePositionData, 0.99);
      
      // Higher confidence should give wider intervals
      const range90 = result90.upper - result90.lower;
      const range95 = result95.upper - result95.lower;
      const range99 = result99.upper - result99.lower;
      
      expect(range99).toBeGreaterThanOrEqual(range95);
      expect(range95).toBeGreaterThanOrEqual(range90);
    });
  });
  
  describe('Time-weighted confidence intervals', () => {
    it('should generate time-weighted confidence intervals', () => {
      const result = analyzer.timeWeightedConfidence(samplePositionData, 0.95, 0.95);
      
      expect(result).toHaveProperty('prediction');
      expect(result).toHaveProperty('lower');
      expect(result).toHaveProperty('upper');
      expect(result).toHaveProperty('method', 'time-weighted');
      expect(result).toHaveProperty('effectiveSampleSize');
      
      expect(result.upper).toBeGreaterThan(result.lower);
      expect(result.effectiveSampleSize).toBeGreaterThan(0);
      expect(result.effectiveSampleSize).toBeLessThanOrEqual(samplePositionData.length);
    });
    
    it('should handle different decay rates', () => {
      const fastDecay = analyzer.timeWeightedConfidence(samplePositionData, 0.95, 0.8);
      const slowDecay = analyzer.timeWeightedConfidence(samplePositionData, 0.95, 0.98);
      
      // Fast decay should have smaller effective sample size
      expect(fastDecay.effectiveSampleSize).toBeLessThan(slowDecay.effectiveSampleSize);
    });
  });
  
  describe('Normal confidence intervals', () => {
    it('should generate normal confidence intervals', () => {
      const result = analyzer.normalConfidenceInterval(samplePositionData, 0.95);
      
      expect(result).toHaveProperty('prediction');
      expect(result).toHaveProperty('lower');
      expect(result).toHaveProperty('upper');
      expect(result).toHaveProperty('method', 'normal');
      expect(result).toHaveProperty('sampleSize', samplePositionData.length);
      
      expect(result.upper).toBeGreaterThan(result.lower);
    });
  });
});

describe('PositionBasedPredictor', () => {
  let predictor;
  let mockHistoricalData;
  
  beforeEach(() => {
    // Create realistic mock lottery data
    mockHistoricalData = [];
    for (let i = 0; i < 150; i++) {
      const whiteBalls = [];
      
      // Generate realistic position-based numbers
      whiteBalls.push(Math.floor(Math.random() * 15) + 1);  // ball1: 1-15
      whiteBalls.push(Math.floor(Math.random() * 20) + 10); // ball2: 10-30
      whiteBalls.push(Math.floor(Math.random() * 25) + 20); // ball3: 20-45
      whiteBalls.push(Math.floor(Math.random() * 25) + 30); // ball4: 30-55
      whiteBalls.push(Math.floor(Math.random() * 15) + 55); // ball5: 55-69
      
      whiteBalls.sort((a, b) => a - b);
      
      mockHistoricalData.push({
        whiteBalls,
        powerball: Math.floor(Math.random() * 26) + 1,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // Daily draws going back
      });
    }
    
    predictor = new PositionBasedPredictor(mockHistoricalData);
  });
  
  describe('Constructor and initialization', () => {
    it('should initialize with valid historical data', () => {
      expect(predictor.data.length).toBe(150);
      expect(predictor.positionStats).toBeDefined();
      expect(predictor.positionStats).toHaveProperty('ball1');
      expect(predictor.positionStats).toHaveProperty('ball5');
      expect(predictor.positionStats).toHaveProperty('powerball');
    });
    
    it('should filter out invalid draw data', () => {
      const invalidData = [
        { whiteBalls: [1, 2, 3], powerball: 5 }, // Only 3 white balls
        { whiteBalls: null, powerball: 10 },      // Null white balls
        { powerball: 15 },                       // Missing white balls
        { whiteBalls: [1, 2, 3, 4, 5], powerball: 20 } // Valid
      ];
      
      const testPredictor = new PositionBasedPredictor(invalidData);
      expect(testPredictor.data.length).toBe(1); // Only 1 valid draw
    });
  });
  
  describe('Position statistics calculation', () => {
    it('should calculate comprehensive statistics for each position', () => {
      const stats = predictor.positionStats;
      
      Object.values(stats).forEach(posStats => {
        expect(posStats).toHaveProperty('mean');
        expect(posStats).toHaveProperty('median');
        expect(posStats).toHaveProperty('std');
        expect(posStats).toHaveProperty('min');
        expect(posStats).toHaveProperty('max');
        expect(posStats).toHaveProperty('sampleSize', 150);
        expect(posStats).toHaveProperty('distribution');
        expect(posStats).toHaveProperty('recent');
        
        expect(posStats.mean).toBeGreaterThan(0);
        expect(posStats.std).toBeGreaterThanOrEqual(0);
        expect(posStats.max).toBeGreaterThanOrEqual(posStats.min);
        expect(posStats.recent.length).toBe(20);
      });
    });
    
    it('should maintain position ordering constraints', () => {
      const stats = predictor.positionStats;
      
      // ball1 should have lowest mean, ball5 highest
      expect(stats.ball1.mean).toBeLessThan(stats.ball2.mean);
      expect(stats.ball2.mean).toBeLessThan(stats.ball3.mean);
      expect(stats.ball3.mean).toBeLessThan(stats.ball4.mean);
      expect(stats.ball4.mean).toBeLessThan(stats.ball5.mean);
    });
  });
  
  describe('Position data extraction', () => {
    it('should extract correct position data', () => {
      const ball1Data = predictor.getPositionData('ball1');
      const ball5Data = predictor.getPositionData('ball5');
      const powerballData = predictor.getPositionData('powerball');
      
      expect(ball1Data.length).toBe(150);
      expect(ball5Data.length).toBe(150);
      expect(powerballData.length).toBe(150);
      
      // ball1 values should be smaller than ball5 values on average
      const avgBall1 = ball1Data.reduce((sum, val) => sum + val, 0) / ball1Data.length;
      const avgBall5 = ball5Data.reduce((sum, val) => sum + val, 0) / ball5Data.length;
      expect(avgBall1).toBeLessThan(avgBall5);
      
      // Powerball should be in valid range
      powerballData.forEach(val => {
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(26);
      });
    });
  });
  
  describe('Confidence interval generation', () => {
    it('should generate predictions with confidence intervals', async () => {
      const predictions = await predictor.generatePredictionWithConfidenceIntervals({
        confidenceLevel: 0.95,
        method: 'bootstrap'
      });
      
      expect(predictions.length).toBe(6); // 5 white balls + 1 powerball
      
      predictions.forEach(pred => {
        expect(pred).toHaveProperty('position');
        expect(pred).toHaveProperty('prediction');
        expect(pred).toHaveProperty('confidenceInterval');
        expect(pred).toHaveProperty('statistics');
        
        const ci = pred.confidenceInterval;
        expect(ci).toHaveProperty('lower');
        expect(ci).toHaveProperty('upper');
        expect(ci).toHaveProperty('display');
        expect(ci).toHaveProperty('confidenceLevel', 0.95);
        expect(ci).toHaveProperty('method', 'bootstrap');
        
        expect(ci.upper).toBeGreaterThan(ci.lower);
        expect(pred.prediction).toBeGreaterThanOrEqual(ci.lower);
        expect(pred.prediction).toBeLessThanOrEqual(ci.upper);
      });
    });
    
    it('should handle different statistical methods', async () => {
      const methods = ['bootstrap', 'normal', 'time-weighted'];
      
      for (const method of methods) {
        const predictions = await predictor.generatePredictionWithConfidenceIntervals({
          confidenceLevel: 0.95,
          method
        });
        
        expect(predictions.length).toBe(6);
        predictions.forEach(pred => {
          expect(pred.confidenceInterval.method).toBe(method);
        });
      }
    });
    
    it('should respect lottery number constraints', async () => {
      const predictions = await predictor.generatePredictionWithConfidenceIntervals({
        confidenceLevel: 0.95,
        method: 'bootstrap'
      });
      
      predictions.forEach(pred => {
        if (pred.position === 'powerball') {
          expect(pred.prediction).toBeGreaterThanOrEqual(1);
          expect(pred.prediction).toBeLessThanOrEqual(26);
          expect(pred.confidenceInterval.lower).toBeGreaterThanOrEqual(1);
          expect(pred.confidenceInterval.upper).toBeLessThanOrEqual(26);
        } else {
          expect(pred.prediction).toBeGreaterThanOrEqual(1);
          expect(pred.prediction).toBeLessThanOrEqual(69);
          expect(pred.confidenceInterval.lower).toBeGreaterThanOrEqual(1);
          expect(pred.confidenceInterval.upper).toBeLessThanOrEqual(69);
        }
      });
    });
  });
  
  describe('Position constraint adjustment', () => {
    it('should maintain position ordering when adjusting for constraints', async () => {
      const predictions = await predictor.generatePredictionWithConfidenceIntervals({
        confidenceLevel: 0.95,
        method: 'normal',
        includeCorrelations: true
      });
      
      const whiteBallPredictions = predictions.slice(0, 5);
      
      // Check that predictions are in ascending order
      for (let i = 1; i < whiteBallPredictions.length; i++) {
        expect(whiteBallPredictions[i].prediction)
          .toBeGreaterThanOrEqual(whiteBallPredictions[i-1].prediction);
      }
    });
    
    it('should mark constraint-adjusted predictions', async () => {
      const predictions = await predictor.generatePredictionWithConfidenceIntervals({
        confidenceLevel: 0.95,
        method: 'normal',
        includeCorrelations: true
      });
      
      // Some predictions might be marked as constraint adjusted
      const adjustedPredictions = predictions.filter(pred => pred.constraintAdjusted);
      
      // Constraint adjustments should only happen to white balls, not powerball
      adjustedPredictions.forEach(pred => {
        expect(pred.position).not.toBe('powerball');
      });
    });
  });
  
  describe('System statistics and data quality', () => {
    it('should provide comprehensive system statistics', () => {
      const systemStats = predictor.getSystemStats();
      
      expect(systemStats).toHaveProperty('totalDraws', 150);
      expect(systemStats).toHaveProperty('positionStats');
      expect(systemStats).toHaveProperty('dataQuality');
      
      const dataQuality = systemStats.dataQuality;
      expect(dataQuality).toHaveProperty('sufficient');
      expect(dataQuality).toHaveProperty('drawCount', 150);
      expect(dataQuality).toHaveProperty('recommendation');
      
      expect(dataQuality.sufficient).toBe(true); // 150 > 100 minimum
    });
    
    it('should identify insufficient data', () => {
      const smallData = mockHistoricalData.slice(0, 50); // Only 50 draws
      const smallPredictor = new PositionBasedPredictor(smallData);
      
      const systemStats = smallPredictor.getSystemStats();
      expect(systemStats.dataQuality.sufficient).toBe(false);
      expect(systemStats.dataQuality.drawCount).toBe(50);
    });
  });
  
  describe('Confidence display formatting', () => {
    it('should format confidence intervals correctly', () => {
      const testDisplay = predictor.formatConfidenceDisplay(25, 20, 30);
      
      expect(testDisplay).toHaveProperty('range', '25 {-5, +5}');
      expect(testDisplay).toHaveProperty('interval', '[20, 30]');
      expect(testDisplay).toHaveProperty('symmetric', true);
      expect(testDisplay).toHaveProperty('precision', '±5');
    });
    
    it('should handle asymmetric intervals', () => {
      const testDisplay = predictor.formatConfidenceDisplay(25, 22, 30);
      
      expect(testDisplay).toHaveProperty('range', '25 {-3, +5}');
      expect(testDisplay).toHaveProperty('interval', '[22, 30]');
      expect(testDisplay).toHaveProperty('symmetric', false);
      expect(testDisplay).toHaveProperty('precision', '{-3, +5}');
    });
  });
});

describe('Integration tests', () => {
  it('should handle edge cases gracefully', async () => {
    // Test with minimal valid data
    const minimalData = [
      { whiteBalls: [1, 2, 3, 4, 5], powerball: 10, date: new Date() },
      { whiteBalls: [10, 20, 30, 40, 50], powerball: 15, date: new Date() }
    ];
    
    const predictor = new PositionBasedPredictor(minimalData);
    
    const predictions = await predictor.generatePredictionWithConfidenceIntervals({
      confidenceLevel: 0.90,
      method: 'normal'
    });
    
    expect(predictions.length).toBe(6);
    expect(predictor.getSystemStats().dataQuality.sufficient).toBe(false);
  });
  
  it('should handle identical numbers in positions', async () => {
    // Create data where some positions have identical values
    const identicalData = [];
    for (let i = 0; i < 50; i++) {
      identicalData.push({
        whiteBalls: [5, 15, 25, 35, 45], // Same numbers every time
        powerball: 10,
        date: new Date()
      });
    }
    
    const predictor = new PositionBasedPredictor(identicalData);
    const predictions = await predictor.generatePredictionWithConfidenceIntervals();
    
    expect(predictions.length).toBe(6);
    
    // Standard deviations should be 0 for identical data
    predictions.forEach(pred => {
      expect(pred.statistics.std).toBe(0);
    });
  });
});