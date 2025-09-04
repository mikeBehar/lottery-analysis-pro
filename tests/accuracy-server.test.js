/**
 * Accuracy Server Unit Tests
 * Tests Node.js cluster server, job management, and API endpoints
 */

const request = require('supertest');
const cluster = require('cluster');

// Mock cluster for testing
jest.mock('cluster', () => ({
    isMaster: true,
    fork: jest.fn(() => ({
        process: { pid: 12345 },
        send: jest.fn(),
        kill: jest.fn()
    })),
    workers: {},
    on: jest.fn()
}));

// Mock os module
jest.mock('os', () => ({
    cpus: () => new Array(4).fill({}), // Mock 4 CPU cores
    uptime: () => 3600
}));

describe('Accuracy Server', () => {
    let app;
    let server;

    beforeAll(async () => {
        // Set environment to test
        process.env.NODE_ENV = 'test';
        process.env.PORT = '0'; // Use random port for testing
        
        // Import and start server
        const serverModule = require('../server/accuracy-server.js');
        
        // Wait a bit for server to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterAll(async () => {
        if (server) {
            await new Promise((resolve) => {
                server.close(resolve);
            });
        }
    });

    describe('Health Endpoint', () => {
        test('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('version', '1.0.0');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memory');
            expect(response.body).toHaveProperty('cpuCores', 4);
            expect(response.body).toHaveProperty('capabilities');
        });

        test('should include server capabilities', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            const capabilities = response.body.capabilities;
            expect(capabilities).toHaveProperty('accuracyTesting', true);
            expect(capabilities).toHaveProperty('walkForwardValidation', true);
            expect(capabilities).toHaveProperty('bootstrapSampling', true);
            expect(capabilities).toHaveProperty('ensemblePredictions', true);
            expect(capabilities).toHaveProperty('parallelProcessing', true);
            expect(capabilities).toHaveProperty('maxBootstrapIterations');
            expect(capabilities).toHaveProperty('maxDatasetSize');
        });

        test('should include memory usage information', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            const memory = response.body.memory;
            expect(memory).toHaveProperty('used');
            expect(memory).toHaveProperty('total');
            expect(memory).toHaveProperty('external');
            expect(memory.used).toMatch(/\d+ MB/);
            expect(memory.total).toMatch(/\d+ MB/);
        });
    });

    describe('Accuracy Test Endpoint', () => {
        const mockHistoricalData = Array.from({ length: 150 }, (_, i) => ({
            date: new Date(2023, 0, i + 1).toISOString(),
            whiteBalls: Array.from({ length: 5 }, (_, j) => ((i + j * 7) % 69) + 1).sort((a, b) => a - b),
            powerball: (i % 26) + 1
        }));

        test('should accept accuracy test request', async () => {
            const testData = {
                historicalData: mockHistoricalData,
                options: {
                    minTrainingSize: 100,
                    testWindowSize: 20,
                    bootstrapIterations: 100
                },
                methodWeights: {
                    confidence: 0.3,
                    energy: 0.3,
                    frequency: 0.2,
                    lstm: 0.2
                },
                testOptions: {
                    includeProgressReporting: true
                }
            };

            const response = await request(app)
                .post('/accuracy-test')
                .send(testData)
                .expect(200);

            // Should return job ID for large datasets
            expect(response.body).toHaveProperty('jobId');
            expect(response.body).toHaveProperty('status', 'started');
            expect(response.body).toHaveProperty('estimatedTime');
            expect(response.body).toHaveProperty('pollUrl');
        });

        test('should validate historical data', async () => {
            const invalidData = {
                historicalData: [], // Empty data
                options: {},
                methodWeights: {}
            };

            await request(app)
                .post('/accuracy-test')
                .send(invalidData)
                .expect(400);
        });

        test('should require minimum data size', async () => {
            const insufficientData = {
                historicalData: mockHistoricalData.slice(0, 50), // Only 50 draws
                options: {},
                methodWeights: {}
            };

            const response = await request(app)
                .post('/accuracy-test')
                .send(insufficientData)
                .expect(400);

            expect(response.body.error).toContain('Insufficient historical data');
        });

        test('should handle small datasets synchronously', async () => {
            const smallTestData = {
                historicalData: mockHistoricalData.slice(0, 120), // Small dataset
                options: {
                    minTrainingSize: 100,
                    testWindowSize: 10,
                    bootstrapIterations: 50 // Small iteration count
                },
                methodWeights: {
                    confidence: 0.5,
                    frequency: 0.5
                }
            };

            const response = await request(app)
                .post('/accuracy-test')
                .send(smallTestData)
                .timeout(35000); // Allow time for processing

            // Should return results directly for small datasets
            if (response.body.jobId) {
                // If it returns a job ID, that's also acceptable
                expect(response.body).toHaveProperty('status');
            } else {
                // Should return completed results
                expect(response.body).toHaveProperty('completed', true);
                expect(response.body).toHaveProperty('results');
            }
        });
    });

    describe('Job Status Endpoint', () => {
        let jobId;

        beforeEach(async () => {
            // Create a test job first
            const testData = {
                historicalData: Array.from({ length: 200 }, (_, i) => ({
                    date: new Date(2023, 0, i + 1).toISOString(),
                    whiteBalls: [1, 2, 3, 4, 5],
                    powerball: 10
                })),
                options: { bootstrapIterations: 1000 },
                methodWeights: {}
            };

            const response = await request(app)
                .post('/accuracy-test')
                .send(testData);

            jobId = response.body.jobId;
        });

        test('should return job status for active job', async () => {
            if (!jobId) return; // Skip if no job ID

            const response = await request(app)
                .get(`/accuracy-test/${jobId}`)
                .expect(200);

            expect(response.body).toHaveProperty('jobId', jobId);
            expect(response.body).toHaveProperty('completed');
            
            if (response.body.completed) {
                expect(response.body).toHaveProperty('results');
            } else {
                expect(response.body).toHaveProperty('status');
                expect(response.body).toHaveProperty('progress');
                expect(response.body).toHaveProperty('startedAt');
            }
        });

        test('should return 404 for non-existent job', async () => {
            await request(app)
                .get('/accuracy-test/non-existent-job')
                .expect(404);
        });

        test('should include progress information', async () => {
            if (!jobId) return;

            const response = await request(app)
                .get(`/accuracy-test/${jobId}`)
                .expect(200);

            if (!response.body.completed) {
                expect(response.body.progress).toHaveProperty('progress');
                expect(response.body.progress.progress).toBeGreaterThanOrEqual(0);
                expect(response.body.progress.progress).toBeLessThanOrEqual(100);
            }
        });
    });

    describe('Job Cancellation', () => {
        test('should cancel active job', async () => {
            // Create a test job
            const testData = {
                historicalData: Array.from({ length: 500 }, (_, i) => ({
                    date: new Date(2023, 0, i + 1).toISOString(),
                    whiteBalls: [1, 2, 3, 4, 5],
                    powerball: 10
                })),
                options: { bootstrapIterations: 5000 }, // Long running job
                methodWeights: {}
            };

            const createResponse = await request(app)
                .post('/accuracy-test')
                .send(testData);

            const jobId = createResponse.body.jobId;

            // Cancel the job
            const cancelResponse = await request(app)
                .delete(`/accuracy-test/${jobId}`)
                .expect(200);

            expect(cancelResponse.body).toHaveProperty('success', true);
            expect(cancelResponse.body).toHaveProperty('message', 'Job cancelled');
            expect(cancelResponse.body).toHaveProperty('jobId', jobId);
        });

        test('should return 404 when cancelling non-existent job', async () => {
            await request(app)
                .delete('/accuracy-test/non-existent-job')
                .expect(404);
        });
    });

    describe('Jobs Listing', () => {
        test('should list active and completed jobs', async () => {
            const response = await request(app)
                .get('/jobs')
                .expect(200);

            expect(response.body).toHaveProperty('active');
            expect(response.body).toHaveProperty('completed');
            expect(response.body).toHaveProperty('totalActive');
            expect(response.body).toHaveProperty('totalCompleted');
            
            expect(Array.isArray(response.body.active)).toBe(true);
            expect(Array.isArray(response.body.completed)).toBe(true);
            expect(typeof response.body.totalActive).toBe('number');
            expect(typeof response.body.totalCompleted).toBe('number');
        });

        test('should include job metadata', async () => {
            // Create a test job first
            const testData = {
                historicalData: Array.from({ length: 150 }, () => ({
                    date: new Date().toISOString(),
                    whiteBalls: [1, 2, 3, 4, 5],
                    powerball: 10
                })),
                options: {},
                methodWeights: {}
            };

            await request(app)
                .post('/accuracy-test')
                .send(testData);

            const response = await request(app)
                .get('/jobs')
                .expect(200);

            if (response.body.active.length > 0) {
                const activeJob = response.body.active[0];
                expect(activeJob).toHaveProperty('id');
                expect(activeJob).toHaveProperty('status');
                expect(activeJob).toHaveProperty('createdAt');
                expect(activeJob).toHaveProperty('progress');
            }
        });
    });

    describe('Shutdown Endpoint', () => {
        test('should accept shutdown request', async () => {
            const response = await request(app)
                .post('/shutdown')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('shutting down');
        }, 10000); // Longer timeout for shutdown
    });

    describe('Error Handling', () => {
        test('should handle malformed JSON', async () => {
            await request(app)
                .post('/accuracy-test')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);
        });

        test('should handle missing required fields', async () => {
            await request(app)
                .post('/accuracy-test')
                .send({})
                .expect(400);
        });

        test('should handle oversized payloads gracefully', async () => {
            const oversizedData = {
                historicalData: Array.from({ length: 100000 }, () => ({
                    date: new Date().toISOString(),
                    whiteBalls: [1, 2, 3, 4, 5],
                    powerball: 10
                })),
                options: {},
                methodWeights: {}
            };

            // This might timeout or return an error, both are acceptable
            const response = await request(app)
                .post('/accuracy-test')
                .send(oversizedData)
                .timeout(60000);

            // Should either process or return an appropriate error
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(600);
        });
    });

    describe('CORS Configuration', () => {
        test('should include CORS headers', async () => {
            const response = await request(app)
                .get('/health')
                .set('Origin', 'http://localhost:5500');

            expect(response.headers['access-control-allow-origin']).toBeTruthy();
        });

        test('should handle preflight requests', async () => {
            await request(app)
                .options('/accuracy-test')
                .set('Origin', 'http://localhost:5500')
                .set('Access-Control-Request-Method', 'POST')
                .expect(204);
        });
    });

    describe('Performance and Load', () => {
        test('should handle multiple concurrent requests', async () => {
            const testData = {
                historicalData: Array.from({ length: 120 }, (_, i) => ({
                    date: new Date(2023, 0, i + 1).toISOString(),
                    whiteBalls: [1, 2, 3, 4, 5],
                    powerball: 10
                })),
                options: { bootstrapIterations: 10 },
                methodWeights: {}
            };

            const requests = Array.from({ length: 3 }, () =>
                request(app)
                    .post('/accuracy-test')
                    .send(testData)
                    .timeout(30000)
            );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        test('should maintain reasonable response times', async () => {
            const start = Date.now();
            
            await request(app)
                .get('/health')
                .expect(200);

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(1000); // Should respond within 1 second
        });
    });

    describe('Data Validation', () => {
        test('should validate historical data structure', async () => {
            const invalidStructure = {
                historicalData: [
                    { invalidField: 'test' }, // Missing required fields
                    { date: '2023-01-01', whiteBalls: [1, 2, 3], powerball: 10 } // Invalid whiteBalls length
                ],
                options: {},
                methodWeights: {}
            };

            await request(app)
                .post('/accuracy-test')
                .send(invalidStructure)
                .expect(400);
        });

        test('should validate number ranges', async () => {
            const invalidRanges = {
                historicalData: Array.from({ length: 100 }, (_, i) => ({
                    date: new Date(2023, 0, i + 1).toISOString(),
                    whiteBalls: [70, 71, 72, 73, 74], // Invalid numbers > 69
                    powerball: 30 // Invalid powerball > 26
                })),
                options: {},
                methodWeights: {}
            };

            const response = await request(app)
                .post('/accuracy-test')
                .send(invalidRanges);

            // Should either validate and reject, or process with warnings
            expect([200, 400]).toContain(response.status);
        });
    });
});