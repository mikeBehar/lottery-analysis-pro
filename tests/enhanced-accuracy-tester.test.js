/**
 * Enhanced Accuracy Tester Unit Tests
 * Tests walk-forward validation, method accuracy calculation, and ensemble weighting
 */

import { EnhancedAccuracyTester } from '../js/enhanced-accuracy-tester.js';

// Mock data for testing
const mockHistoricalData = [
    { date: new Date('2023-01-01'), whiteBalls: [5, 15, 25, 35, 45], powerball: 10 },
    { date: new Date('2023-01-02'), whiteBalls: [8, 18, 28, 38, 48], powerball: 15 },
    { date: new Date('2023-01-03'), whiteBalls: [3, 13, 23, 33, 43], powerball: 8 },
    { date: new Date('2023-01-04'), whiteBalls: [7, 17, 27, 37, 47], powerball: 12 },
    { date: new Date('2023-01-05'), whiteBalls: [2, 12, 22, 32, 42], powerball: 5 },
    ...Array.from({ length: 95 }, (_, i) => ({
        date: new Date(2023, 0, 6 + i),
        whiteBalls: Array.from({ length: 5 }, (_, j) => (i + j * 7) % 69 + 1).sort((a, b) => a - b),
        powerball: (i % 26) + 1
    }))
];

describe('EnhancedAccuracyTester', () => {
    let tester;
    let mockProgressCallback;

    beforeEach(() => {
        tester = new EnhancedAccuracyTester(mockHistoricalData);
        mockProgressCallback = jest.fn();
    });

    describe('Constructor and Initialization', () => {
        test('should initialize with default options', () => {
            expect(tester.historicalData).toEqual(mockHistoricalData);
            expect(tester.options.minTrainingSize).toBe(100);
            expect(tester.options.testWindowSize).toBe(50);
            expect(tester.options.bootstrapIterations).toBe(1000);
            expect(tester.options.confidenceLevel).toBe(0.95);
        });

        test('should accept custom options', () => {
            const customOptions = {
                minTrainingSize: 150,
                testWindowSize: 30,
                bootstrapIterations: 500
            };
            
            const customTester = new EnhancedAccuracyTester(mockHistoricalData, customOptions);
            
            expect(customTester.options.minTrainingSize).toBe(150);
            expect(customTester.options.testWindowSize).toBe(30);
            expect(customTester.options.bootstrapIterations).toBe(500);
        });

        test('should initialize method weights', () => {
            expect(tester.methodWeights.confidence).toBeGreaterThan(0);
            expect(tester.methodWeights.energy).toBeGreaterThan(0);
            expect(tester.methodWeights.frequency).toBeGreaterThan(0);
            expect(tester.methodWeights.lstm).toBeGreaterThan(0);
        });
    });

    describe('Walk-Forward Validation', () => {
        test('should create proper training and test windows', () => {
            const windows = tester.createWalkForwardWindows();
            
            expect(windows.length).toBeGreaterThan(0);
            
            // Check first window
            const firstWindow = windows[0];
            expect(firstWindow.trainingStart).toBe(0);
            expect(firstWindow.trainingEnd).toBe(tester.options.minTrainingSize - 1);
            expect(firstWindow.testStart).toBe(tester.options.minTrainingSize);
            expect(firstWindow.testEnd).toBe(tester.options.minTrainingSize + tester.options.testWindowSize - 1);
        });

        test('should handle insufficient data gracefully', () => {
            const smallDataset = mockHistoricalData.slice(0, 50);
            const smallTester = new EnhancedAccuracyTester(smallDataset);
            
            const windows = smallTester.createWalkForwardWindows();
            expect(windows.length).toBe(0);
        });

        test('should create non-overlapping test windows', () => {
            const windows = tester.createWalkForwardWindows();
            
            for (let i = 1; i < windows.length; i++) {
                expect(windows[i].testStart).toBeGreaterThanOrEqual(windows[i-1].testEnd + 1);
            }
        });
    });

    describe('Method Testing', () => {
        test('should test confidence interval method', async () => {
            const trainingData = mockHistoricalData.slice(0, 100);
            const testData = mockHistoricalData.slice(100, 150);
            
            const results = await tester.testConfidenceMethod(trainingData, testData);
            
            expect(results).toHaveProperty('predictions');
            expect(results).toHaveProperty('accuracy');
            expect(results.predictions.length).toBe(testData.length);
            expect(results.accuracy.totalPredictions).toBe(testData.length);
            expect(results.accuracy.averageMatches).toBeGreaterThanOrEqual(0);
            expect(results.accuracy.hitRate).toBeGreaterThanOrEqual(0);
            expect(results.accuracy.hitRate).toBeLessThanOrEqual(1);
        });

        test('should test frequency analysis method', async () => {
            const trainingData = mockHistoricalData.slice(0, 100);
            const testData = mockHistoricalData.slice(100, 150);
            
            const results = await tester.testFrequencyMethod(trainingData, testData);
            
            expect(results).toHaveProperty('predictions');
            expect(results).toHaveProperty('accuracy');
            expect(results.predictions.length).toBe(testData.length);
            expect(results.accuracy.overallScore).toBeGreaterThanOrEqual(0);
            expect(results.accuracy.overallScore).toBeLessThanOrEqual(1);
        });

        test('should test energy signature method', async () => {
            const trainingData = mockHistoricalData.slice(0, 100);
            const testData = mockHistoricalData.slice(100, 150);
            
            const results = await tester.testEnergyMethod(trainingData, testData);
            
            expect(results).toHaveProperty('predictions');
            expect(results).toHaveProperty('accuracy');
            expect(results.name).toBe('Energy Signatures');
            expect(results.accuracy.positionAccuracy).toHaveProperty('meanAbsoluteError');
        });
    });

    describe('Accuracy Calculations', () => {
        test('should calculate white ball matches correctly', () => {
            const predicted = [5, 15, 25, 35, 45];
            const actual = [5, 15, 25, 30, 40];
            
            const matches = tester.calculateWhiteBallMatches(predicted, actual);
            expect(matches).toBe(3);
        });

        test('should calculate powerball matches correctly', () => {
            expect(tester.calculatePowerballMatch(10, 10)).toBe(true);
            expect(tester.calculatePowerballMatch(10, 15)).toBe(false);
        });

        test('should calculate prize tiers correctly', () => {
            const whiteBallMatches = 3;
            const powerballMatch = true;
            
            const tier = tester.calculatePrizeTier(whiteBallMatches, powerballMatch);
            expect(tier.name).toBe('Match 3 + PB');
            expect(tier.payout).toBeGreaterThan(0);
        });

        test('should calculate ROI correctly', () => {
            const predictions = [
                { payout: 100, cost: 2 },
                { payout: 50, cost: 2 },
                { payout: 0, cost: 2 }
            ];
            
            const roi = tester.calculateROI(predictions);
            expect(roi.totalPayout).toBe(150);
            expect(roi.totalCost).toBe(6);
            expect(roi.netProfit).toBe(144);
            expect(roi.roiPercentage).toBe(2400); // 2400%
        });
    });

    describe('Bootstrap Confidence Intervals', () => {
        test('should calculate confidence intervals for accuracy metrics', () => {
            const accuracyValues = Array.from({ length: 100 }, () => Math.random());
            
            const ci = tester.calculateBootstrapConfidenceInterval(accuracyValues, 0.95);
            
            expect(ci).toHaveProperty('lower');
            expect(ci).toHaveProperty('upper');
            expect(ci).toHaveProperty('mean');
            expect(ci.lower).toBeLessThanOrEqual(ci.upper);
            expect(ci.mean).toBeGreaterThanOrEqual(ci.lower);
            expect(ci.mean).toBeLessThanOrEqual(ci.upper);
        });

        test('should handle edge cases in confidence intervals', () => {
            const constantValues = new Array(100).fill(0.5);
            
            const ci = tester.calculateBootstrapConfidenceInterval(constantValues, 0.95);
            
            expect(ci.lower).toBeCloseTo(0.5, 2);
            expect(ci.upper).toBeCloseTo(0.5, 2);
            expect(ci.mean).toBeCloseTo(0.5, 2);
        });
    });

    describe('Ensemble Weighting', () => {
        test('should update method weights based on performance', () => {
            const mockResults = new Map([
                ['confidence', { accuracy: { overallScore: 0.8 } }],
                ['frequency', { accuracy: { overallScore: 0.6 } }],
                ['energy', { accuracy: { overallScore: 0.7 } }],
                ['lstm', { accuracy: { overallScore: 0.9 } }]
            ]);
            
            tester.updateAdaptiveWeights(mockResults);
            
            // LSTM should have highest weight due to best performance
            expect(tester.methodWeights.lstm).toBeGreaterThan(tester.methodWeights.confidence);
            expect(tester.methodWeights.lstm).toBeGreaterThan(tester.methodWeights.energy);
            expect(tester.methodWeights.lstm).toBeGreaterThan(tester.methodWeights.frequency);
            
            // Weights should sum to approximately 1
            const weightSum = Object.values(tester.methodWeights).reduce((sum, weight) => sum + weight, 0);
            expect(weightSum).toBeCloseTo(1, 2);
        });

        test('should create ensemble predictions from method results', () => {
            const mockResults = new Map([
                ['confidence', { 
                    predictions: [{ whiteBalls: [1, 2, 3, 4, 5], powerball: 10 }],
                    accuracy: { overallScore: 0.8 }
                }],
                ['frequency', { 
                    predictions: [{ whiteBalls: [2, 3, 4, 5, 6], powerball: 12 }],
                    accuracy: { overallScore: 0.6 }
                }]
            ]);
            
            const ensemble = tester.createEnsemblePredictions(mockResults);
            
            expect(ensemble).toHaveProperty('predictions');
            expect(ensemble).toHaveProperty('accuracy');
            expect(ensemble.predictions.length).toBeGreaterThan(0);
            expect(ensemble.accuracy.overallScore).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Progress Reporting', () => {
        test('should report progress during testing', async () => {
            // Use small dataset for faster testing
            const smallTester = new EnhancedAccuracyTester(mockHistoricalData.slice(0, 120), {
                minTrainingSize: 100,
                testWindowSize: 10,
                bootstrapIterations: 10
            });
            
            await smallTester.runAccuracyTest(mockProgressCallback);
            
            expect(mockProgressCallback).toHaveBeenCalled();
            
            // Check that progress values are reasonable
            const progressCalls = mockProgressCallback.mock.calls;
            const progressValues = progressCalls.map(call => call[0].progress);
            
            expect(Math.max(...progressValues)).toBeLessThanOrEqual(100);
            expect(Math.min(...progressValues)).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Full Accuracy Test Integration', () => {
        test('should run complete accuracy test with small dataset', async () => {
            // Use minimal settings for faster testing
            const fastTester = new EnhancedAccuracyTester(mockHistoricalData.slice(0, 120), {
                minTrainingSize: 100,
                testWindowSize: 10,
                bootstrapIterations: 50,
                enableLSTM: false // Disable LSTM for faster testing
            });
            
            const results = await fastTester.runAccuracyTest(mockProgressCallback);
            
            expect(results).toHaveProperty('methods');
            expect(results).toHaveProperty('ensemble');
            expect(results).toHaveProperty('summary');
            
            expect(results.methods).toBeInstanceOf(Map);
            expect(results.methods.size).toBeGreaterThan(0);
            
            expect(results.summary).toHaveProperty('bestMethod');
            expect(results.summary).toHaveProperty('totalPredictions');
            expect(results.summary).toHaveProperty('testDuration');
            
            expect(results.ensemble.accuracy.overallScore).toBeGreaterThanOrEqual(0);
        });

        test('should handle errors gracefully', async () => {
            const badData = []; // Empty dataset
            const badTester = new EnhancedAccuracyTester(badData);
            
            await expect(badTester.runAccuracyTest()).rejects.toThrow();
        });
    });

    describe('Performance Validation', () => {
        test('should complete testing within reasonable time', async () => {
            const startTime = Date.now();
            
            const fastTester = new EnhancedAccuracyTester(mockHistoricalData.slice(0, 110), {
                minTrainingSize: 100,
                testWindowSize: 5,
                bootstrapIterations: 10,
                enableLSTM: false
            });
            
            await fastTester.runAccuracyTest();
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete within 30 seconds for small dataset
            expect(duration).toBeLessThan(30000);
        });
    });
});