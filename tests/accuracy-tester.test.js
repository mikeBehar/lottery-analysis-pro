/**
 * ACCURACY TESTER UNIT TESTS
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * Unit tests for the prediction accuracy testing framework
 */

import PredictionAccuracyTester from '../js/accuracy-tester.js';

// Mock the confidence predictor
jest.mock('../js/confidence-predictor.js', () => ({
  PositionBasedPredictor: jest.fn().mockImplementation(() => ({
    generatePredictionWithConfidenceIntervals: jest.fn().mockResolvedValue([
      { position: 'ball1', prediction: 7 },
      { position: 'ball2', prediction: 19 },
      { position: 'ball3', prediction: 31 },
      { position: 'ball4', prediction: 42 },
      { position: 'ball5', prediction: 55 },
      { position: 'powerball', prediction: 12 }
    ])
  }))
}));

describe('PredictionAccuracyTester', () => {
  let tester;
  let mockDraws;

  beforeEach(() => {
    // Create mock historical draws
    mockDraws = [];
    for (let i = 0; i < 300; i++) {
      mockDraws.push({
        whiteBalls: [
          Math.floor(Math.random() * 10) + 1 + (i % 10),
          Math.floor(Math.random() * 10) + 15 + (i % 8),
          Math.floor(Math.random() * 10) + 30 + (i % 7),
          Math.floor(Math.random() * 10) + 45 + (i % 6),
          Math.floor(Math.random() * 10) + 60 + (i % 5)
        ].sort((a, b) => a - b),
        powerball: Math.floor(Math.random() * 26) + 1,
        date: new Date(Date.now() - (300 - i) * 24 * 60 * 60 * 1000)
      });
    }

    tester = new PredictionAccuracyTester(mockDraws);
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with historical draws', () => {
      expect(tester.draws).toEqual(mockDraws);
      expect(tester.draws.length).toBe(300);
    });

    it('should initialize with empty strategies map', () => {
      expect(tester.strategies).toBeInstanceOf(Map);
      expect(tester.strategies.size).toBe(0);
    });

    it('should initialize with empty results map', () => {
      expect(tester.results).toBeInstanceOf(Map);
      expect(tester.results.size).toBe(0);
    });
  });

  describe('Strategy Management', () => {
    it('should add strategies correctly', () => {
      const mockStrategy = jest.fn();
      const config = { type: 'confidence', options: { confidenceLevel: 0.95 } };

      tester.addStrategy('Test Strategy', mockStrategy, config);

      expect(tester.strategies.size).toBe(1);
      expect(tester.strategies.has('Test Strategy')).toBe(true);
      
      const strategy = tester.strategies.get('Test Strategy');
      expect(strategy.fn).toBe(mockStrategy);
      expect(strategy.config).toEqual(config);
    });

    it('should handle multiple strategies', () => {
      tester.addStrategy('Strategy 1', jest.fn(), { type: 'confidence' });
      tester.addStrategy('Strategy 2', jest.fn(), { type: 'energy' });
      tester.addStrategy('Strategy 3', jest.fn(), { type: 'frequency' });

      expect(tester.strategies.size).toBe(3);
      expect(tester.strategies.has('Strategy 1')).toBe(true);
      expect(tester.strategies.has('Strategy 2')).toBe(true);
      expect(tester.strategies.has('Strategy 3')).toBe(true);
    });

    it('should overwrite existing strategies with same name', () => {
      const strategy1 = jest.fn();
      const strategy2 = jest.fn();

      tester.addStrategy('Test', strategy1, { type: 'confidence' });
      tester.addStrategy('Test', strategy2, { type: 'energy' });

      expect(tester.strategies.size).toBe(1);
      expect(tester.strategies.get('Test').fn).toBe(strategy2);
      expect(tester.strategies.get('Test').config.type).toBe('energy');
    });
  });

  describe('Prediction Methods', () => {
    beforeEach(() => {
      // Add default strategies for testing
      tester.addStrategy('Confidence', null, {
        type: 'confidence',
        options: { confidenceLevel: 0.95 }
      });
      tester.addStrategy('Energy', null, { type: 'energy' });
    });

    it('should generate confidence predictions', async () => {
      const predictions = await tester.generateConfidencePrediction(
        mockDraws.slice(0, 100),
        { confidenceLevel: 0.95 }
      );

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(6); // 5 white balls + powerball
      
      predictions.forEach(pred => {
        expect(pred).toHaveProperty('position');
        expect(pred).toHaveProperty('prediction');
        expect(typeof pred.prediction).toBe('number');
      });
    });

    it('should generate energy signature predictions', async () => {
      const predictions = await tester.generateEnergyPrediction(
        mockDraws.slice(0, 100),
        { weights: { prime: 0.3, digitalRoot: 0.2 } }
      );

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(6);
      
      predictions.forEach((pred, index) => {
        expect(pred).toHaveProperty('position');
        expect(pred).toHaveProperty('prediction');
        expect(typeof pred.prediction).toBe('number');
        
        if (index < 5) {
          expect(pred.position).toBe(`ball${index + 1}`);
        } else {
          expect(pred.position).toBe('powerball');
        }
      });
    });

    it('should generate frequency analysis predictions', async () => {
      const predictions = await tester.generateFrequencyPrediction(
        mockDraws.slice(0, 100)
      );

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(6);
      
      predictions.forEach(pred => {
        expect(pred).toHaveProperty('position');
        expect(pred).toHaveProperty('prediction');
        expect(typeof pred.prediction).toBe('number');
      });
    });

    it('should generate hybrid predictions', async () => {
      const predictions = await tester.generateHybridPrediction(
        mockDraws.slice(0, 100)
      );

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(6);
      
      predictions.forEach(pred => {
        expect(pred).toHaveProperty('position');
        expect(pred).toHaveProperty('prediction');
        expect(typeof pred.prediction).toBe('number');
      });
    });
  });

  describe('Accuracy Metrics', () => {
    const samplePredictions = [
      { position: 'ball1', prediction: 7 },
      { position: 'ball2', prediction: 19 },
      { position: 'ball3', prediction: 31 },
      { position: 'ball4', prediction: 42 },
      { position: 'ball5', prediction: 55 },
      { position: 'powerball', prediction: 12 }
    ];

    const sampleActual = {
      whiteBalls: [7, 20, 31, 43, 55],
      powerball: 12
    };

    it('should calculate match metrics correctly', () => {
      const metrics = tester.calculateMatchMetrics(samplePredictions, sampleActual);

      expect(metrics).toHaveProperty('totalMatches');
      expect(metrics).toHaveProperty('whiteMatches');
      expect(metrics).toHaveProperty('powerballMatch');
      expect(metrics).toHaveProperty('hitRate');
      
      expect(metrics.whiteMatches).toBe(3); // 7, 31, 55 match
      expect(metrics.powerballMatch).toBe(1); // 12 matches
      expect(metrics.totalMatches).toBe(4);
      expect(metrics.hitRate).toBe(true); // >= 3 matches
    });

    it('should calculate prize tier metrics', () => {
      const metrics = tester.calculatePrizeTierMetrics(samplePredictions, sampleActual);

      expect(metrics).toHaveProperty('tier');
      expect(metrics).toHaveProperty('prize');
      expect(metrics).toHaveProperty('isWinner');
      
      // 3 white matches + powerball = tier 5
      expect(metrics.tier).toBe(5);
      expect(metrics.isWinner).toBe(true);
      expect(typeof metrics.prize).toBe('number');
    });

    it('should calculate consistency metrics', () => {
      const multipleResults = [
        { totalMatches: 3, whiteMatches: 3, powerballMatch: 0 },
        { totalMatches: 2, whiteMatches: 2, powerballMatch: 0 },
        { totalMatches: 4, whiteMatches: 3, powerballMatch: 1 },
        { totalMatches: 1, whiteMatches: 1, powerballMatch: 0 },
        { totalMatches: 3, whiteMatches: 3, powerballMatch: 0 }
      ];

      const metrics = tester.calculateConsistencyMetrics(multipleResults);

      expect(metrics).toHaveProperty('averageMatches');
      expect(metrics).toHaveProperty('standardDeviation');
      expect(metrics).toHaveProperty('consistency');
      expect(metrics).toHaveProperty('minMatches');
      expect(metrics).toHaveProperty('maxMatches');

      expect(metrics.averageMatches).toBeCloseTo(2.6, 1);
      expect(metrics.standardDeviation).toBeGreaterThan(0);
      expect(metrics.consistency).toBeGreaterThan(0);
      expect(metrics.minMatches).toBe(1);
      expect(metrics.maxMatches).toBe(4);
    });

    it('should handle edge case with no matches', () => {
      const noMatchPredictions = [
        { position: 'ball1', prediction: 1 },
        { position: 'ball2', prediction: 2 },
        { position: 'ball3', prediction: 3 },
        { position: 'ball4', prediction: 4 },
        { position: 'ball5', prediction: 5 },
        { position: 'powerball', prediction: 1 }
      ];

      const metrics = tester.calculateMatchMetrics(noMatchPredictions, sampleActual);
      
      expect(metrics.totalMatches).toBe(0);
      expect(metrics.whiteMatches).toBe(0);
      expect(metrics.powerballMatch).toBe(0);
      expect(metrics.hitRate).toBe(false);
    });
  });

  describe('Walk-Forward Validation', () => {
    beforeEach(() => {
      tester.addStrategy('Test Strategy', null, { type: 'confidence' });
    });

    it('should perform walk-forward validation', async () => {
      const options = {
        initialTraining: 200,
        testWindow: 50,
        stepSize: 10
      };

      const results = await tester.performWalkForwardValidation('Test Strategy', options);

      expect(results).toHaveProperty('strategyName', 'Test Strategy');
      expect(results).toHaveProperty('validationPeriods');
      expect(results).toHaveProperty('totalPredictions');
      expect(results).toHaveProperty('aggregatedMetrics');
      expect(results).toHaveProperty('performance');

      expect(results.validationPeriods).toBeGreaterThan(0);
      expect(results.totalPredictions).toBeGreaterThan(0);
      expect(results.performance).toBeGreaterThanOrEqual(0);
    });

    it('should handle insufficient data gracefully', async () => {
      const smallTester = new PredictionAccuracyTester(mockDraws.slice(0, 50));
      smallTester.addStrategy('Test', null, { type: 'confidence' });

      const options = {
        initialTraining: 100,
        testWindow: 20,
        stepSize: 5
      };

      await expect(
        smallTester.performWalkForwardValidation('Test', options)
      ).rejects.toThrow('Insufficient data');
    });
  });

  describe('Full Accuracy Testing', () => {
    beforeEach(() => {
      tester.addStrategy('Confidence', null, { 
        type: 'confidence', 
        options: { confidenceLevel: 0.95 } 
      });
      tester.addStrategy('Energy', null, { type: 'energy' });
    });

    it('should run complete accuracy test', async () => {
      const options = {
        testMethod: 'walk-forward',
        initialTraining: 200,
        testWindow: 30,
        stepSize: 10,
        metrics: ['matches', 'consistency', 'prize-tiers']
      };

      const results = await tester.runAccuracyTest(options);

      expect(results).toHaveProperty('results');
      expect(results).toHaveProperty('summary');
      expect(results).toHaveProperty('comparison');

      expect(results.results).toBeInstanceOf(Map);
      expect(results.results.size).toBe(2); // Two strategies

      expect(results.summary).toHaveProperty('totalStrategies', 2);
      expect(results.summary).toHaveProperty('totalPredictions');
      expect(results.summary).toHaveProperty('bestPerformer');
      expect(results.summary).toHaveProperty('keyFindings');

      expect(results.comparison).toHaveProperty('ranking');
      expect(Array.isArray(results.comparison.ranking)).toBe(true);
      expect(results.comparison.ranking.length).toBe(2);
    });

    it('should handle empty strategy list', async () => {
      const emptyTester = new PredictionAccuracyTester(mockDraws);

      await expect(
        emptyTester.runAccuracyTest()
      ).rejects.toThrow('No strategies configured');
    });

    it('should validate test configuration', async () => {
      const invalidOptions = {
        testMethod: 'walk-forward',
        initialTraining: 50, // Too small
        testWindow: 30,
        stepSize: 10
      };

      await expect(
        tester.runAccuracyTest(invalidOptions)
      ).rejects.toThrow('Initial training size too small');
    });
  });

  describe('Summary Generation', () => {
    it('should generate comprehensive summary', () => {
      // Mock results data
      const mockResults = new Map([
        ['Strategy A', {
          strategyName: 'Strategy A',
          totalPredictions: 100,
          performance: 0.75,
          aggregatedMetrics: {
            matches: { averageMatches: 2.5, averageHitRate: 0.6 }
          }
        }],
        ['Strategy B', {
          strategyName: 'Strategy B',
          totalPredictions: 95,
          performance: 0.68,
          aggregatedMetrics: {
            matches: { averageMatches: 2.2, averageHitRate: 0.55 }
          }
        }]
      ]);

      const summary = tester.generateSummary(mockResults);

      expect(summary).toHaveProperty('totalStrategies', 2);
      expect(summary).toHaveProperty('totalPredictions', 195);
      expect(summary).toHaveProperty('bestPerformer');
      expect(summary).toHaveProperty('keyFindings');

      expect(summary.bestPerformer.strategy).toBe('Strategy A');
      expect(summary.bestPerformer.performance).toBe(0.75);
      
      expect(Array.isArray(summary.keyFindings)).toBe(true);
      expect(summary.keyFindings.length).toBeGreaterThan(0);
    });
  });

  describe('Comparison Generation', () => {
    it('should generate strategy comparison', () => {
      const mockResults = new Map([
        ['High Performance', {
          strategyName: 'High Performance',
          totalPredictions: 100,
          performance: 0.85,
          aggregatedMetrics: {
            matches: { 
              averageMatches: 3.2, 
              averageHitRate: 0.75,
              totalPredictions: 100
            },
            consistency: { averageConsistency: 0.8 }
          }
        }],
        ['Medium Performance', {
          strategyName: 'Medium Performance',
          totalPredictions: 100,
          performance: 0.65,
          aggregatedMetrics: {
            matches: { 
              averageMatches: 2.1, 
              averageHitRate: 0.45,
              totalPredictions: 100
            },
            consistency: { averageConsistency: 0.6 }
          }
        }]
      ]);

      const comparison = tester.generateComparison(mockResults);

      expect(comparison).toHaveProperty('ranking');
      expect(Array.isArray(comparison.ranking)).toBe(true);
      expect(comparison.ranking.length).toBe(2);

      // Should be ranked by performance (highest first)
      expect(comparison.ranking[0].strategy).toBe('High Performance');
      expect(comparison.ranking[0].performance).toBe(0.85);
      expect(comparison.ranking[1].strategy).toBe('Medium Performance');
      expect(comparison.ranking[1].performance).toBe(0.65);

      // Check required properties
      comparison.ranking.forEach(rank => {
        expect(rank).toHaveProperty('strategy');
        expect(rank).toHaveProperty('performance');
        expect(rank).toHaveProperty('avgMatches');
        expect(rank).toHaveProperty('hitRate');
        expect(rank).toHaveProperty('consistency');
        expect(rank).toHaveProperty('totalPredictions');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle prediction generation errors', async () => {
      // Mock a failing strategy
      const failingStrategy = jest.fn().mockRejectedValue(new Error('Prediction failed'));
      tester.addStrategy('Failing Strategy', failingStrategy, { type: 'custom' });

      const options = {
        testMethod: 'walk-forward',
        initialTraining: 200,
        testWindow: 30,
        stepSize: 10
      };

      await expect(
        tester.performWalkForwardValidation('Failing Strategy', options)
      ).rejects.toThrow('Prediction failed');
    });

    it('should validate draw data format', () => {
      const invalidDraws = [
        { whiteBalls: [1, 2, 3], powerball: 'invalid' }, // Invalid powerball
        { whiteBalls: 'invalid', powerball: 10 } // Invalid white balls
      ];

      expect(() => {
        new PredictionAccuracyTester(invalidDraws);
      }).toThrow('Invalid draw data format');
    });

    it('should handle missing strategy', async () => {
      await expect(
        tester.performWalkForwardValidation('Non-existent Strategy', {})
      ).rejects.toThrow('Strategy not found: Non-existent Strategy');
    });
  });
});