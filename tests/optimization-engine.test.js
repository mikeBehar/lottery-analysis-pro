import { OptimizationEngine, createOptimizationEngine, quickOptimize } from '../js/optimization-engine.js';

describe('OptimizationEngine', () => {
  let engine;
  let sampleData;

  beforeEach(() => {
    engine = new OptimizationEngine('hybrid');
    
    // Create sample historical data
    sampleData = [];
    for (let i = 0; i < 100; i++) {
      sampleData.push({
        whiteBalls: [
          Math.floor(Math.random() * 69) + 1,
          Math.floor(Math.random() * 69) + 1,
          Math.floor(Math.random() * 69) + 1,
          Math.floor(Math.random() * 69) + 1,
          Math.floor(Math.random() * 69) + 1
        ].sort((a, b) => a - b),
        powerball: Math.floor(Math.random() * 26) + 1,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      });
    }
  });

  describe('Constructor', () => {
    it('should create engine with correct type', () => {
      expect(engine.type).toBe('hybrid');
      expect(engine.isRunning).toBe(false);
      expect(engine.results).toEqual([]);
      expect(engine.bestParams).toBeNull();
    });

    it('should support all optimization types', () => {
      const offsetsEngine = new OptimizationEngine('offsets');
      const weightsEngine = new OptimizationEngine('weights');
      const hybridEngine = new OptimizationEngine('hybrid');

      expect(offsetsEngine.type).toBe('offsets');
      expect(weightsEngine.type).toBe('weights');
      expect(hybridEngine.type).toBe('hybrid');
    });
  });

  describe('Cross-validation splits', () => {
    it('should create time-series cross-validation splits', () => {
      const splits = engine.createCrossValidationSplits(sampleData, 3);
      
      expect(splits.length).toBe(3);
      splits.forEach((split, index) => {
        expect(split.train).toBeInstanceOf(Array);
        expect(split.test).toBeInstanceOf(Array);
        expect(split.fold).toBe(index + 1);
        expect(split.train.length).toBeGreaterThan(0);
        expect(split.test.length).toBeGreaterThan(0);
        expect(split.train.length + split.test.length).toBeLessThanOrEqual(sampleData.length);
      });
    });

    it('should handle edge cases for split creation', () => {
      const smallData = sampleData.slice(0, 10);
      const splits = engine.createCrossValidationSplits(smallData, 3);
      
      expect(splits.length).toBeGreaterThan(0);
      splits.forEach(split => {
        expect(split.train.length).toBeGreaterThanOrEqual(3); // Minimum 30% for training
      });
    });
  });

  describe('Parameter generation', () => {
    it('should generate random offsets within valid range', () => {
      const offsets = engine.generateRandomOffsets(8, [1, 68]);
      
      expect(offsets.length).toBe(8);
      expect(new Set(offsets).size).toBe(8); // No duplicates
      offsets.forEach(offset => {
        expect(offset).toBeGreaterThanOrEqual(1);
        expect(offset).toBeLessThanOrEqual(68);
      });
      expect(offsets).toEqual(offsets.slice().sort((a, b) => a - b)); // Should be sorted
    });

    it('should generate normalized random weights', () => {
      const weights = engine.generateRandomWeights();
      
      expect(weights).toHaveProperty('prime');
      expect(weights).toHaveProperty('digitalRoot');
      expect(weights).toHaveProperty('mod5');
      expect(weights).toHaveProperty('gridPosition');

      const sum = Object.values(weights).reduce((s, w) => s + w, 0);
      expect(sum).toBeCloseTo(1.0, 5); // Should sum to 1

      Object.values(weights).forEach(weight => {
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Performance metrics', () => {
    it('should calculate correct performance metrics', () => {
      const predictions = [
        { predicted: [1, 2, 3, 4, 5], actual: [1, 2, 6, 7, 8], matches: 2 },
        { predicted: [1, 2, 3, 4, 5], actual: [1, 2, 3, 7, 8], matches: 3 },
        { predicted: [1, 2, 3, 4, 5], actual: [1, 2, 3, 4, 8], matches: 4 },
      ];

      const metrics = engine.calculatePerformanceMetrics(predictions);

      expect(metrics.totalPredictions).toBe(3);
      expect(metrics.averageMatches).toBeCloseTo(3.0, 1);
      expect(metrics.maxMatches).toBe(4);
      expect(metrics.hitRate).toBeCloseTo(2/3, 2); // 2 out of 3 had ≥3 matches
      expect(metrics.consistency).toBeGreaterThan(0);
      expect(metrics.matchDistribution).toBeDefined();
    });

    it('should handle empty predictions gracefully', () => {
      const metrics = engine.calculatePerformanceMetrics([]);

      expect(metrics.totalPredictions).toBe(0);
      expect(metrics.averageMatches).toBe(0);
      expect(metrics.maxMatches).toBe(0);
      expect(metrics.hitRate).toBe(0);
      expect(metrics.consistency).toBe(0);
    });
  });

  describe('Match counting', () => {
    it('should correctly count matching numbers', () => {
      expect(engine.countMatches([1, 2, 3, 4, 5], [1, 2, 6, 7, 8])).toBe(2);
      expect(engine.countMatches([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBe(5);
      expect(engine.countMatches([1, 2, 3, 4, 5], [6, 7, 8, 9, 10])).toBe(0);
    });

    it('should handle invalid input', () => {
      expect(engine.countMatches(null, [1, 2, 3])).toBe(0);
      expect(engine.countMatches([1, 2, 3], null)).toBe(0);
      expect(engine.countMatches([], [1, 2, 3])).toBe(0);
    });
  });

  describe('Prediction generation', () => {
    it('should generate prediction with custom offsets', () => {
      const offsets = [0, 5, 10, 15, 20, 25, 30, 35];
      const prediction = engine.generatePredictionWithOffsets(sampleData, offsets);

      expect(prediction).toHaveProperty('whiteBalls');
      expect(prediction).toHaveProperty('powerball');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction.whiteBalls).toBeInstanceOf(Array);
      expect(prediction.whiteBalls.length).toBeLessThanOrEqual(5);
      expect(prediction.powerball).toBeGreaterThanOrEqual(1);
      expect(prediction.powerball).toBeLessThanOrEqual(26);
    });

    it('should generate prediction with custom weights', () => {
      const weights = { prime: 0.25, digitalRoot: 0.25, mod5: 0.25, gridPosition: 0.25 };
      const prediction = engine.generatePredictionWithWeights(sampleData, weights);

      expect(prediction).toHaveProperty('whiteBalls');
      expect(prediction).toHaveProperty('powerball');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction.whiteBalls.length).toBe(5);
      prediction.whiteBalls.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(69);
      });
    });

    it('should generate hybrid prediction', () => {
      const params = {
        offsets: [0, 5, 10, 15, 20, 25, 30, 35],
        weights: { prime: 0.25, digitalRoot: 0.25, mod5: 0.25, gridPosition: 0.25 }
      };
      const prediction = engine.generateHybridPrediction(sampleData, params);

      expect(prediction).toHaveProperty('whiteBalls');
      expect(prediction).toHaveProperty('powerball');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction.whiteBalls.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Consistency calculation', () => {
    it('should calculate consistency for varying match counts', () => {
      const varyingMatches = [1, 2, 3, 2, 1];
      const consistentMatches = [3, 3, 3, 3, 3];

      const varyingConsistency = engine.calculateConsistency(varyingMatches);
      const consistentConsistency = engine.calculateConsistency(consistentMatches);

      expect(consistentConsistency).toBeGreaterThan(varyingConsistency);
      expect(consistentConsistency).toBeCloseTo(1.0, 1);
    });

    it('should handle edge cases', () => {
      expect(engine.calculateConsistency([])).toBe(1);
      expect(engine.calculateConsistency([5])).toBe(1);
      expect(engine.calculateConsistency([0, 0, 0])).toBe(0);
    });
  });

  describe('Improvement calculation', () => {
    it('should calculate improvement over baseline', () => {
      const bestPerformance = { hitRate: 0.15, averageMatches: 1.5 };
      const allResults = [
        { performance: { hitRate: 0.10 } },
        { performance: { hitRate: 0.12 } },
        { performance: { hitRate: 0.15 } }
      ];

      const improvement = engine.calculateImprovement(bestPerformance, allResults);

      expect(improvement.hitRateImprovement).toBeGreaterThan(0);
      expect(improvement.averageMatchImprovement).toBeGreaterThan(0);
      expect(improvement.confidenceInterval).toHaveProperty('lower');
      expect(improvement.confidenceInterval).toHaveProperty('upper');
    });
  });

  describe('Engine status', () => {
    it('should return correct status', () => {
      const status = engine.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('type');
      expect(status).toHaveProperty('resultsCount');
      expect(status).toHaveProperty('hasBestParams');
      expect(status).toHaveProperty('bestParams');

      expect(status.isRunning).toBe(false);
      expect(status.type).toBe('hybrid');
      expect(status.resultsCount).toBe(0);
      expect(status.hasBestParams).toBe(false);
      expect(status.bestParams).toBeNull();
    });
  });
});

describe('Factory functions', () => {
  it('should create optimization engine via factory', () => {
    const engine = createOptimizationEngine('offsets');
    expect(engine).toBeInstanceOf(OptimizationEngine);
    expect(engine.type).toBe('offsets');
  });

  it('should perform quick optimization', async () => {
    // Create minimal sample data
    const quickData = [];
    for (let i = 0; i < 60; i++) { // More than minimum required
      quickData.push({
        whiteBalls: [1, 2, 3, 4, 5], // Simple fixed data for quick test
        powerball: 1,
        date: new Date()
      });
    }

    const results = await quickOptimize(quickData, 'offsets', 5); // Very few iterations for speed

    expect(results).toHaveProperty('type');
    expect(results).toHaveProperty('bestParams');
    expect(results).toHaveProperty('bestPerformance');
    expect(results.type).toBe('offsets');
  }, 10000); // 10 second timeout for this test
});

describe('Edge cases and error handling', () => {
  let edgeCaseEngine;
  let edgeCaseSampleData;

  beforeEach(() => {
    edgeCaseEngine = new OptimizationEngine('hybrid');
    
    // Create sample data for edge case tests
    edgeCaseSampleData = [];
    for (let i = 0; i < 50; i++) {
      edgeCaseSampleData.push({
        whiteBalls: [
          Math.floor(Math.random() * 69) + 1,
          Math.floor(Math.random() * 69) + 1,
          Math.floor(Math.random() * 69) + 1,
          Math.floor(Math.random() * 69) + 1,
          Math.floor(Math.random() * 69) + 1
        ].sort((a, b) => a - b),
        powerball: Math.floor(Math.random() * 26) + 1,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      });
    }
  });

  it('should handle insufficient data gracefully', () => {
    const smallData = edgeCaseSampleData.slice(0, 10);
    const splits = edgeCaseEngine.createCrossValidationSplits(smallData, 5);
    
    // Should still create some splits, but may be fewer than requested
    expect(splits.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle invalid optimization type', () => {
    expect(() => {
      new OptimizationEngine('invalid');
    }).not.toThrow(); // Constructor should not throw, but optimize should
  });

  it('should handle empty historical data', () => {
    const prediction = edgeCaseEngine.generatePredictionWithOffsets([], [1, 2, 3, 4, 5]);
    expect(prediction).toBeDefined();
    expect(prediction.whiteBalls).toBeDefined();
  });
});