/**
 * Performance UI Unit Tests
 * Tests UI controller, mode selection, and accuracy testing integration
 */

import { PerformanceUI } from '../js/performance-ui.js';

// Mock DOM elements and dependencies
global.document = {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    createElement: jest.fn(),
    addEventListener: jest.fn()
};

global.window = {
    location: { protocol: 'http:' }
};

// Mock notifications
const mockNotifications = {
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
    showWarning: jest.fn()
};

// Mock server manager
const mockServerManager = {
    detectServer: jest.fn(),
    getServerInfo: jest.fn(),
    recommendPerformanceMode: jest.fn(),
    runAccuracyTestWithServerManager: jest.fn(),
    getPerformanceComparison: jest.fn()
};

// Mock enhanced accuracy tester
const mockEnhancedAccuracyTester = {
    runAccuracyTest: jest.fn()
};

describe('PerformanceUI', () => {
    let performanceUI;
    let mockElements;

    beforeEach(() => {
        // Mock DOM elements
        mockElements = {
            performancePanel: { style: {}, classList: { add: jest.fn(), remove: jest.fn() } },
            modeSelector: { value: 'auto', addEventListener: jest.fn() },
            serverStatus: { textContent: '', className: '' },
            serverCapabilities: { innerHTML: '' },
            performanceMetrics: { innerHTML: '' },
            recommendationPanel: { innerHTML: '', style: {} },
            accuracyProgress: { style: {}, innerHTML: '' },
            accuracyResults: { innerHTML: '', style: {} },
            runAccuracyBtn: { disabled: false, addEventListener: jest.fn() },
            cancelAccuracyBtn: { style: {}, addEventListener: jest.fn() },
            serverToggle: { checked: true, addEventListener: jest.fn() }
        };

        document.getElementById.mockImplementation((id) => mockElements[id]);
        document.querySelector.mockImplementation((selector) => {
            if (selector === '.performance-panel') return mockElements.performancePanel;
            return null;
        });

        performanceUI = new PerformanceUI({
            serverManager: mockServerManager,
            notifications: mockNotifications
        });

        // Clear mock calls
        Object.values(mockNotifications).forEach(mock => mock.mockClear());
        Object.values(mockServerManager).forEach(mock => mock.mockClear());
    });

    describe('Initialization', () => {
        test('should initialize with default options', () => {
            const defaultUI = new PerformanceUI();
            expect(defaultUI.options.autoDetectServer).toBe(true);
            expect(defaultUI.options.defaultMode).toBe('auto');
            expect(defaultUI.options.enableProgressReporting).toBe(true);
        });

        test('should initialize DOM elements', () => {
            performanceUI.init();

            expect(document.getElementById).toHaveBeenCalledWith('performancePanel');
            expect(document.getElementById).toHaveBeenCalledWith('modeSelector');
            expect(document.getElementById).toHaveBeenCalledWith('serverStatus');
            expect(document.getElementById).toHaveBeenCalledWith('runAccuracyBtn');
        });

        test('should set up event listeners', () => {
            performanceUI.init();

            expect(mockElements.modeSelector.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
            expect(mockElements.runAccuracyBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockElements.cancelAccuracyBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockElements.serverToggle.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        });

        test('should auto-detect server if enabled', async () => {
            mockServerManager.getServerInfo.mockResolvedValue({
                available: true,
                status: 'running',
                capabilities: { accuracyTesting: true }
            });

            await performanceUI.init();

            expect(mockServerManager.getServerInfo).toHaveBeenCalled();
        });
    });

    describe('Server Status Management', () => {
        test('should update server status display when available', async () => {
            const serverInfo = {
                available: true,
                status: 'running',
                capabilities: { 
                    accuracyTesting: true,
                    parallelProcessing: true,
                    maxBootstrapIterations: 10000
                },
                performanceMetrics: {
                    avgResponseTime: 150,
                    successfulRequests: 10,
                    failedRequests: 0
                }
            };

            mockServerManager.getServerInfo.mockResolvedValue(serverInfo);

            await performanceUI.updateServerStatus();

            expect(mockElements.serverStatus.textContent).toContain('Available');
            expect(mockElements.serverStatus.className).toContain('status-available');
            expect(mockElements.serverCapabilities.innerHTML).toContain('Accuracy Testing');
            expect(mockElements.performanceMetrics.innerHTML).toContain('150ms');
        });

        test('should update server status display when unavailable', async () => {
            const serverInfo = {
                available: false,
                error: 'Connection refused'
            };

            mockServerManager.getServerInfo.mockResolvedValue(serverInfo);

            await performanceUI.updateServerStatus();

            expect(mockElements.serverStatus.textContent).toContain('Unavailable');
            expect(mockElements.serverStatus.className).toContain('status-unavailable');
        });

        test('should handle server status update errors', async () => {
            mockServerManager.getServerInfo.mockRejectedValue(new Error('Network error'));

            await performanceUI.updateServerStatus();

            expect(mockElements.serverStatus.textContent).toContain('Error');
            expect(mockElements.serverStatus.className).toContain('status-error');
        });
    });

    describe('Performance Mode Selection', () => {
        test('should handle auto mode selection', async () => {
            const mockRecommendation = {
                useServer: true,
                reason: 'Large dataset benefits from server processing',
                expectedSpeedup: 3,
                memoryRecommendation: 'medium'
            };

            mockServerManager.recommendPerformanceMode.mockReturnValue(mockRecommendation);

            await performanceUI.handleModeChange('auto');

            expect(mockServerManager.recommendPerformanceMode).toHaveBeenCalled();
            expect(mockElements.recommendationPanel.innerHTML).toContain('Server Recommended');
            expect(mockElements.recommendationPanel.innerHTML).toContain('3x faster');
        });

        test('should handle browser mode selection', async () => {
            await performanceUI.handleModeChange('browser');

            expect(performanceUI.currentMode).toBe('browser');
            expect(mockElements.recommendationPanel.innerHTML).toContain('Browser Mode');
        });

        test('should handle server mode selection', async () => {
            await performanceUI.handleModeChange('server');

            expect(performanceUI.currentMode).toBe('server');
            expect(mockElements.recommendationPanel.innerHTML).toContain('Server Mode');
        });
    });

    describe('Performance Recommendations', () => {
        test('should display server recommendation', () => {
            const recommendation = {
                useServer: true,
                reason: 'Large dataset with high complexity',
                expectedSpeedup: 5,
                memoryRecommendation: 'high',
                alternatives: []
            };

            performanceUI.displayPerformanceRecommendation(recommendation, 1000, 'high');

            expect(mockElements.recommendationPanel.innerHTML).toContain('Server Recommended');
            expect(mockElements.recommendationPanel.innerHTML).toContain('5x faster');
            expect(mockElements.recommendationPanel.innerHTML).toContain('high complexity');
        });

        test('should display browser recommendation', () => {
            const recommendation = {
                useServer: false,
                reason: 'Dataset suitable for browser processing',
                expectedSpeedup: 1,
                alternatives: ['Consider server for repeated testing']
            };

            performanceUI.displayPerformanceRecommendation(recommendation, 200, 'low');

            expect(mockElements.recommendationPanel.innerHTML).toContain('Browser Processing');
            expect(mockElements.recommendationPanel.innerHTML).toContain('suitable for browser');
        });

        test('should include memory recommendations', () => {
            const recommendation = {
                useServer: true,
                reason: 'High memory requirements',
                memoryRecommendation: 'high',
                alternatives: []
            };

            performanceUI.displayPerformanceRecommendation(recommendation, 2000, 'maximum');

            expect(mockElements.recommendationPanel.innerHTML).toContain('8GB+ recommended');
        });
    });

    describe('Accuracy Testing Integration', () => {
        test('should run accuracy test with server', async () => {
            const mockResults = {
                methods: new Map([['confidence', { accuracy: { overallScore: 0.8 } }]]),
                ensemble: { accuracy: { overallScore: 0.85 } },
                performanceInfo: { usedServer: true, executionEnvironment: 'server' }
            };

            mockServerManager.runAccuracyTestWithServerManager.mockResolvedValue(mockResults);

            // Mock historical data
            performanceUI.historicalData = [
                { date: new Date(), whiteBalls: [1, 2, 3, 4, 5], powerball: 10 }
            ];

            await performanceUI.runAccuracyTest();

            expect(mockServerManager.runAccuracyTestWithServerManager).toHaveBeenCalled();
            expect(mockElements.accuracyResults.innerHTML).toContain('Server Accelerated');
            expect(mockElements.accuracyResults.innerHTML).toContain('85%');
        });

        test('should run accuracy test with browser fallback', async () => {
            const mockResults = {
                methods: new Map([['frequency', { accuracy: { overallScore: 0.7 } }]]),
                ensemble: { accuracy: { overallScore: 0.75 } },
                performanceInfo: { usedServer: false, executionEnvironment: 'browser' }
            };

            mockServerManager.runAccuracyTestWithServerManager.mockResolvedValue(mockResults);

            performanceUI.historicalData = [
                { date: new Date(), whiteBalls: [1, 2, 3, 4, 5], powerball: 10 }
            ];

            await performanceUI.runAccuracyTest();

            expect(mockElements.accuracyResults.innerHTML).toContain('Browser Processing');
            expect(mockElements.accuracyResults.innerHTML).toContain('75%');
        });

        test('should handle accuracy test errors', async () => {
            mockServerManager.runAccuracyTestWithServerManager.mockRejectedValue(
                new Error('Test failed')
            );

            performanceUI.historicalData = [
                { date: new Date(), whiteBalls: [1, 2, 3, 4, 5], powerball: 10 }
            ];

            await performanceUI.runAccuracyTest();

            expect(mockNotifications.showError).toHaveBeenCalledWith(
                'Accuracy Test Failed',
                'Test failed'
            );
        });

        test('should validate historical data before testing', async () => {
            performanceUI.historicalData = null;

            await performanceUI.runAccuracyTest();

            expect(mockNotifications.showError).toHaveBeenCalledWith(
                'No Data Available',
                expect.any(String)
            );
        });

        test('should require minimum data for testing', async () => {
            performanceUI.historicalData = [
                { date: new Date(), whiteBalls: [1, 2, 3, 4, 5], powerball: 10 }
            ]; // Only 1 draw

            await performanceUI.runAccuracyTest();

            expect(mockNotifications.showError).toHaveBeenCalledWith(
                'Insufficient Data',
                expect.stringContaining('minimum 100 draws')
            );
        });
    });

    describe('Progress Reporting', () => {
        test('should update progress during testing', () => {
            const progressData = {
                progress: 45,
                currentMethod: 'confidence',
                window: 5,
                totalWindows: 20,
                source: 'server'
            };

            performanceUI.updateProgress(progressData);

            expect(mockElements.accuracyProgress.innerHTML).toContain('45%');
            expect(mockElements.accuracyProgress.innerHTML).toContain('confidence');
            expect(mockElements.accuracyProgress.innerHTML).toContain('5/20');
        });

        test('should show progress panel during testing', () => {
            performanceUI.showProgress();

            expect(mockElements.accuracyProgress.style.display).toBe('block');
        });

        test('should hide progress panel when complete', () => {
            performanceUI.hideProgress();

            expect(mockElements.accuracyProgress.style.display).toBe('none');
        });
    });

    describe('Results Display', () => {
        test('should display method comparison results', () => {
            const results = {
                methods: new Map([
                    ['confidence', { 
                        name: 'Confidence Intervals',
                        accuracy: { 
                            overallScore: 0.82,
                            averageMatches: 2.3,
                            hitRate: 0.15
                        }
                    }],
                    ['frequency', { 
                        name: 'Frequency Analysis',
                        accuracy: { 
                            overallScore: 0.68,
                            averageMatches: 2.1,
                            hitRate: 0.12
                        }
                    }]
                ]),
                ensemble: {
                    accuracy: {
                        overallScore: 0.85,
                        averageMatches: 2.4,
                        hitRate: 0.16
                    }
                }
            };

            performanceUI.displayResults(results);

            expect(mockElements.accuracyResults.innerHTML).toContain('Confidence Intervals');
            expect(mockElements.accuracyResults.innerHTML).toContain('82%');
            expect(mockElements.accuracyResults.innerHTML).toContain('Ensemble');
            expect(mockElements.accuracyResults.innerHTML).toContain('85%');
        });

        test('should highlight best performing method', () => {
            const results = {
                methods: new Map([
                    ['confidence', { accuracy: { overallScore: 0.9 } }],
                    ['frequency', { accuracy: { overallScore: 0.7 } }]
                ]),
                ensemble: { accuracy: { overallScore: 0.88 } }
            };

            performanceUI.displayResults(results);

            expect(mockElements.accuracyResults.innerHTML).toContain('best-method');
        });

        test('should show performance metadata', () => {
            const results = {
                methods: new Map(),
                ensemble: { accuracy: { overallScore: 0.8 } },
                performanceInfo: {
                    usedServer: true,
                    executionEnvironment: 'server',
                    performanceMetrics: {
                        avgResponseTime: 120,
                        successfulRequests: 5
                    }
                }
            };

            performanceUI.displayResults(results);

            expect(mockElements.accuracyResults.innerHTML).toContain('Server Accelerated');
        });
    });

    describe('Test Cancellation', () => {
        test('should cancel running test', () => {
            performanceUI.isTestRunning = true;

            performanceUI.cancelAccuracyTest();

            expect(performanceUI.isTestRunning).toBe(false);
            expect(mockElements.runAccuracyBtn.disabled).toBe(false);
        });

        test('should show cancel button during test', () => {
            performanceUI.showProgress();

            expect(mockElements.cancelAccuracyBtn.style.display).toBe('inline-block');
        });

        test('should hide cancel button when test complete', () => {
            performanceUI.hideProgress();

            expect(mockElements.cancelAccuracyBtn.style.display).toBe('none');
        });
    });

    describe('Data Integration', () => {
        test('should set historical data from state', () => {
            const mockData = [
                { date: new Date(), whiteBalls: [1, 2, 3, 4, 5], powerball: 10 },
                { date: new Date(), whiteBalls: [6, 7, 8, 9, 10], powerball: 15 }
            ];

            performanceUI.setHistoricalData(mockData);

            expect(performanceUI.historicalData).toEqual(mockData);
        });

        test('should validate data format', () => {
            const invalidData = [
                { whiteBalls: [1, 2, 3, 4, 5] }, // Missing powerball
                { powerball: 10 }, // Missing whiteBalls
                { date: 'invalid', whiteBalls: [1, 2, 3, 4, 5], powerball: 10 } // Invalid date
            ];

            performanceUI.setHistoricalData(invalidData);

            expect(performanceUI.historicalData).toEqual([]);
        });
    });

    describe('Performance Comparison', () => {
        test('should display performance comparison', () => {
            const comparison = {
                browser: {
                    pros: ['No setup required', 'Works offline'],
                    cons: ['Limited CPU utilization', 'Memory constraints'],
                    recommendedFor: 'Small datasets'
                },
                server: {
                    pros: ['Full CPU utilization', 'No memory constraints'],
                    cons: ['Requires setup', 'Additional complexity'],
                    recommendedFor: 'Large datasets'
                }
            };

            mockServerManager.getPerformanceComparison.mockReturnValue(comparison);

            performanceUI.displayPerformanceComparison();

            expect(mockElements.recommendationPanel.innerHTML).toContain('No setup required');
            expect(mockElements.recommendationPanel.innerHTML).toContain('Full CPU utilization');
        });
    });

    describe('Error Handling', () => {
        test('should handle missing DOM elements gracefully', () => {
            document.getElementById.mockReturnValue(null);

            expect(() => performanceUI.init()).not.toThrow();
        });

        test('should handle server manager errors', async () => {
            mockServerManager.getServerInfo.mockRejectedValue(new Error('Server error'));

            await performanceUI.updateServerStatus();

            expect(mockNotifications.showError).toHaveBeenCalled();
        });
    });
});