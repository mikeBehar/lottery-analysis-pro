/**
 * Server Manager Unit Tests
 * Tests server detection, auto-launch, and communication management
 */

import { ServerManager } from '../js/server-manager.js';

// Mock fetch for testing
global.fetch = jest.fn();

describe('ServerManager', () => {
    let serverManager;
    let mockProgressCallback;

    beforeEach(() => {
        serverManager = new ServerManager({
            serverPort: 3001,
            serverHost: 'localhost',
            detectionTimeout: 1000,
            launchTimeout: 5000,
            autoLaunch: true
        });
        
        mockProgressCallback = jest.fn();
        
        // Reset fetch mock
        fetch.mockClear();
    });

    describe('Constructor and Configuration', () => {
        test('should initialize with default options', () => {
            const defaultManager = new ServerManager();
            
            expect(defaultManager.options.serverPort).toBe(3001);
            expect(defaultManager.options.serverHost).toBe('localhost');
            expect(defaultManager.options.detectionTimeout).toBe(5000);
            expect(defaultManager.options.autoLaunch).toBe(true);
        });

        test('should initialize with custom options', () => {
            const customOptions = {
                serverPort: 4001,
                serverHost: '127.0.0.1',
                detectionTimeout: 2000,
                autoLaunch: false
            };
            
            const customManager = new ServerManager(customOptions);
            
            expect(customManager.options.serverPort).toBe(4001);
            expect(customManager.options.serverHost).toBe('127.0.0.1');
            expect(customManager.options.detectionTimeout).toBe(2000);
            expect(customManager.options.autoLaunch).toBe(false);
        });

        test('should initialize performance metrics', () => {
            expect(serverManager.performanceMetrics.detectionTime).toBe(0);
            expect(serverManager.performanceMetrics.successfulRequests).toBe(0);
            expect(serverManager.performanceMetrics.failedRequests).toBe(0);
        });

        test('should generate correct server URL', () => {
            expect(serverManager.serverUrl).toBe('http://localhost:3001');
        });
    });

    describe('Server Detection', () => {
        test('should detect available server successfully', async () => {
            const mockHealthData = {
                status: 'healthy',
                version: '1.0.0',
                capabilities: {
                    accuracyTesting: true,
                    parallelProcessing: true
                },
                memory: { used: '50 MB' },
                cpuCores: 4
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockHealthData)
            });

            const result = await serverManager.detectServer();

            expect(result.available).toBe(true);
            expect(result.capabilities).toEqual(mockHealthData.capabilities);
            expect(result.version).toBe('1.0.0');
            expect(serverManager.serverStatus).toBe('available');
        });

        test('should handle server unavailable', async () => {
            fetch.mockRejectedValueOnce(new Error('Connection refused'));

            const result = await serverManager.detectServer();

            expect(result.available).toBe(false);
            expect(result.error).toContain('Connection refused');
            expect(serverManager.serverStatus).toBe('unavailable');
        });

        test('should handle server error response', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const result = await serverManager.detectServer();

            expect(result.available).toBe(false);
            expect(result.error).toContain('500');
            expect(serverManager.serverStatus).toBe('unavailable');
        });

        test('should update performance metrics on detection', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ status: 'healthy' })
            });

            await serverManager.detectServer();

            expect(serverManager.performanceMetrics.detectionTime).toBeGreaterThan(0);
        });
    });

    describe('HTTP Request Management', () => {
        test('should make successful HTTP requests', async () => {
            const mockData = { result: 'success' };
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockData)
            });

            const response = await serverManager.makeRequest('/test', {
                method: 'GET',
                timeout: 5000
            });

            expect(response.ok).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:3001/test',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    }),
                    signal: expect.any(AbortSignal)
                })
            );
        });

        test('should handle request timeouts', async () => {
            fetch.mockImplementationOnce(() => 
                new Promise((resolve, reject) => {
                    setTimeout(() => {
                        const error = new Error('Request timeout');
                        error.name = 'AbortError';
                        reject(error);
                    }, 100);
                })
            );

            await expect(
                serverManager.makeRequest('/test', { timeout: 50 })
            ).rejects.toThrow('Request timeout after 50ms');
        });

        test('should make POST requests with body', async () => {
            const requestBody = { data: 'test' };
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({})
            });

            await serverManager.makeRequest('/test', {
                method: 'POST',
                body: requestBody
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:3001/test',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(requestBody),
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );
        });

        test('should update performance metrics on requests', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({})
            });

            await serverManager.makeRequest('/test');

            expect(serverManager.performanceMetrics.successfulRequests).toBe(1);
            expect(serverManager.performanceMetrics.avgResponseTime).toBeGreaterThan(0);
        });
    });

    describe('Server Launch Management', () => {
        test('should handle server already running', async () => {
            serverManager.serverStatus = 'running';

            const result = await serverManager.launchServer();

            expect(result.success).toBe(true);
            expect(result.status).toBe('running');
        });

        test('should handle launch failure gracefully', async () => {
            // Mock failed detection after launch attempt
            fetch.mockRejectedValueOnce(new Error('Launch failed'));

            const result = await serverManager.launchServer();

            expect(result.success).toBe(false);
            expect(result.error).toBeTruthy();
            expect(serverManager.serverStatus).toBe('error');
        });
    });

    describe('Server Stop Management', () => {
        test('should handle graceful server shutdown', async () => {
            serverManager.serverStatus = 'running';
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({})
            });

            const result = await serverManager.stopServer();

            expect(result.success).toBe(true);
            expect(result.status).toBe('stopped');
            expect(serverManager.serverStatus).toBe('unavailable');
        });

        test('should handle no server to stop', async () => {
            serverManager.serverStatus = 'unavailable';

            const result = await serverManager.stopServer();

            expect(result.success).toBe(true);
            expect(result.status).toBe('stopped');
        });

        test('should handle shutdown failure', async () => {
            serverManager.serverStatus = 'running';
            
            fetch.mockRejectedValueOnce(new Error('Shutdown failed'));

            const result = await serverManager.stopServer();

            expect(result.success).toBe(false);
            expect(serverManager.serverStatus).toBe('unavailable');
        });
    });

    describe('Server Accuracy Testing', () => {
        test('should run server-accelerated accuracy test', async () => {
            const mockAccuracyTester = {
                historicalData: [{ date: '2023-01-01', whiteBalls: [1, 2, 3, 4, 5], powerball: 10 }],
                options: { testType: 'full' },
                methodWeights: { confidence: 0.4, frequency: 0.3, energy: 0.3 }
            };

            const mockResults = {
                methods: new Map([['confidence', { accuracy: { overallScore: 0.8 } }]]),
                ensemble: { accuracy: { overallScore: 0.85 } }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResults)
            });

            const results = await serverManager.runServerAccuracyTest(mockAccuracyTester, {}, mockProgressCallback);

            expect(results).toEqual(mockResults);
            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:3001/accuracy-test',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('historicalData')
                })
            );
        });

        test('should handle server test failure', async () => {
            const mockAccuracyTester = {
                historicalData: [],
                options: {},
                methodWeights: {}
            };

            fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: 'Invalid data' })
            });

            await expect(
                serverManager.runServerAccuracyTest(mockAccuracyTester, {})
            ).rejects.toThrow('Invalid data');
        });
    });

    describe('Job Polling', () => {
        test('should poll for long-running job results', async () => {
            const jobId = 'job-123';
            const mockResults = { completed: true, results: { accuracy: 0.8 } };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResults)
            });

            const results = await serverManager.pollForResults(jobId, mockProgressCallback);

            expect(results).toEqual(mockResults.results);
        });

        test('should handle job polling errors', async () => {
            const jobId = 'job-456';

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ error: 'Job failed' })
            });

            await expect(
                serverManager.pollForResults(jobId)
            ).rejects.toThrow('Job failed');
        });

        test('should report progress during polling', async () => {
            const jobId = 'job-789';
            
            // First call returns progress
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ 
                    completed: false, 
                    progress: { progress: 50, currentMethod: 'confidence' }
                })
            });

            // Second call returns completion
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ 
                    completed: true, 
                    results: { accuracy: 0.9 }
                })
            });

            await serverManager.pollForResults(jobId, mockProgressCallback);

            expect(mockProgressCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    progress: 50,
                    currentMethod: 'confidence',
                    source: 'server',
                    jobId: jobId
                })
            );
        });
    });

    describe('Accuracy Test with Server Management', () => {
        test('should use server when available', async () => {
            const mockAccuracyTester = {
                historicalData: [],
                options: {},
                methodWeights: {}
            };

            // Mock server detection success
            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'healthy' })
                })
            );

            // Mock accuracy test success
            fetch.mockImplementationOnce(() => 
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ accuracy: 0.8 })
                })
            );

            const results = await serverManager.runAccuracyTestWithServerManager(mockAccuracyTester, {
                preferServer: true,
                fallbackToBrowser: false
            });

            expect(results.performanceInfo.usedServer).toBe(true);
            expect(results.performanceInfo.executionEnvironment).toBe('server');
        });

        test('should fallback to browser when server unavailable', async () => {
            const mockAccuracyTester = {
                runAccuracyTest: jest.fn().mockResolvedValue({ accuracy: 0.7 })
            };

            // Mock server detection failure
            fetch.mockRejectedValueOnce(new Error('Server unavailable'));

            const results = await serverManager.runAccuracyTestWithServerManager(mockAccuracyTester, {
                preferServer: true,
                fallbackToBrowser: true
            });

            expect(results.performanceInfo.usedServer).toBe(false);
            expect(results.performanceInfo.executionEnvironment).toBe('browser');
            expect(mockAccuracyTester.runAccuracyTest).toHaveBeenCalled();
        });

        test('should throw error when server unavailable and no fallback', async () => {
            const mockAccuracyTester = {};

            // Mock server detection failure
            fetch.mockRejectedValueOnce(new Error('Server unavailable'));

            await expect(
                serverManager.runAccuracyTestWithServerManager(mockAccuracyTester, {
                    preferServer: true,
                    fallbackToBrowser: false
                })
            ).rejects.toThrow('Server not available and browser fallback disabled');
        });
    });

    describe('Performance Recommendations', () => {
        test('should recommend server for large datasets', () => {
            const recommendation = serverManager.recommendPerformanceMode(1000, 'high');

            expect(recommendation.useServer).toBe(true);
            expect(recommendation.expectedSpeedup).toBeGreaterThan(1);
            expect(recommendation.reason).toContain('large dataset');
        });

        test('should recommend browser for small datasets', () => {
            const recommendation = serverManager.recommendPerformanceMode(100, 'low');

            expect(recommendation.useServer).toBe(false);
            expect(recommendation.reason).toContain('suitable for browser');
        });

        test('should account for test complexity', () => {
            const lowComplexity = serverManager.recommendPerformanceMode(600, 'low');
            const highComplexity = serverManager.recommendPerformanceMode(600, 'high');

            expect(highComplexity.expectedSpeedup).toBeGreaterThanOrEqual(lowComplexity.expectedSpeedup);
        });

        test('should provide memory recommendations', () => {
            const recommendation = serverManager.recommendPerformanceMode(2000, 'maximum');

            expect(recommendation.memoryRecommendation).toBe('high');
        });
    });

    describe('Server Info Management', () => {
        test('should return server info when available', async () => {
            serverManager.serverStatus = 'running';
            serverManager.serverCapabilities = { accuracyTesting: true };
            serverManager.lastHealthCheck = new Date();

            const info = await serverManager.getServerInfo();

            expect(info.available).toBe(true);
            expect(info.status).toBe('running');
            expect(info.capabilities).toEqual({ accuracyTesting: true });
        });

        test('should detect server when status unknown', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ status: 'healthy' })
            });

            const info = await serverManager.getServerInfo();

            expect(info.available).toBe(true);
        });
    });

    describe('Performance Comparison', () => {
        test('should provide performance comparison data', () => {
            const comparison = serverManager.getPerformanceComparison();

            expect(comparison).toHaveProperty('browser');
            expect(comparison).toHaveProperty('server');
            expect(comparison.browser).toHaveProperty('pros');
            expect(comparison.browser).toHaveProperty('cons');
            expect(comparison.browser).toHaveProperty('recommendedFor');
            expect(comparison.server).toHaveProperty('pros');
            expect(comparison.server).toHaveProperty('cons');
            expect(comparison.server).toHaveProperty('recommendedFor');
        });
    });
});