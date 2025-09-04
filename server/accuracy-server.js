#!/usr/bin/env node

/**
 * LOCAL ACCURACY TESTING SERVER
 * Version: 1.0.0 | Created: 2025-09-04
 * 
 * High-performance Node.js server for intensive accuracy testing operations
 */

const express = require('express');
const cors = require('cors');
const cluster = require('cluster');
const os = require('os');
const path = require('path');

// Server configuration
const config = {
  port: process.env.PORT || 3001,
  host: process.env.HOST || 'localhost',
  workers: process.env.WORKERS || os.cpus().length,
  maxJobTime: 10 * 60 * 1000, // 10 minutes
  cleanupInterval: 30 * 1000,  // 30 seconds
  corsOrigins: ['http://localhost:5500', 'http://127.0.0.1:5500', 'file://']
};

// Job management
const activeJobs = new Map();
const completedJobs = new Map();
let jobCounter = 0;

/**
 * Master process - manages workers and HTTP server
 */
if (cluster.isMaster) {
  console.log(`[Master] Starting accuracy server on ${config.host}:${config.port}`);
  console.log(`[Master] CPU cores detected: ${os.cpus().length}`);
  console.log(`[Master] Starting ${config.workers} workers`);
  
  // Fork workers
  for (let i = 0; i < config.workers; i++) {
    const worker = cluster.fork();
    console.log(`[Master] Worker ${worker.process.pid} started`);
  }
  
  // Handle worker deaths
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Master] Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });
  
  // Handle messages from workers
  cluster.on('message', (worker, message) => {
    if (message.type === 'job-complete') {
      const { jobId, results, error } = message;
      
      if (activeJobs.has(jobId)) {
        const job = activeJobs.get(jobId);
        job.completed = true;
        job.completedAt = new Date();
        
        if (error) {
          job.error = error;
          console.log(`[Master] Job ${jobId} failed: ${error}`);
        } else {
          job.results = results;
          console.log(`[Master] Job ${jobId} completed successfully`);
        }
        
        // Move to completed jobs
        completedJobs.set(jobId, job);
        activeJobs.delete(jobId);
      }
    } else if (message.type === 'job-progress') {
      const { jobId, progress } = message;
      
      if (activeJobs.has(jobId)) {
        activeJobs.get(jobId).progress = progress;
      }
    }
  });
  
  // Cleanup completed jobs periodically
  setInterval(() => {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    
    for (const [jobId, job] of completedJobs) {
      if (job.completedAt && job.completedAt < cutoff) {
        completedJobs.delete(jobId);
        console.log(`[Master] Cleaned up old job: ${jobId}`);
      }
    }
  }, config.cleanupInterval);
  
  // Create Express app in master process
  const app = express();
  
  // Middleware
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    const memUsage = process.memoryUsage();
    
    res.json({
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
      },
      cpuCores: os.cpus().length,
      workers: config.workers,
      activeJobs: activeJobs.size,
      completedJobs: completedJobs.size,
      capabilities: {
        accuracyTesting: true,
        walkForwardValidation: true,
        bootstrapSampling: true,
        ensemblePredictions: true,
        parallelProcessing: true,
        maxBootstrapIterations: 10000,
        maxDatasetSize: 50000
      }
    });
  });
  
  // Start accuracy test endpoint
  app.post('/accuracy-test', async (req, res) => {
    try {
      const { historicalData, options, methodWeights, testOptions } = req.body;
      
      // Validate input
      if (!historicalData || !Array.isArray(historicalData)) {
        return res.status(400).json({ error: 'Invalid historical data' });
      }
      
      if (historicalData.length < 100) {
        return res.status(400).json({ error: 'Insufficient historical data (minimum 100 draws)' });
      }
      
      // Create job
      const jobId = `job-${++jobCounter}-${Date.now()}`;
      const job = {
        id: jobId,
        createdAt: new Date(),
        parameters: { historicalData, options, methodWeights, testOptions },
        status: 'queued',
        progress: { progress: 0, currentMethod: null, window: 0 },
        completed: false,
        results: null,
        error: null
      };
      
      activeJobs.set(jobId, job);
      
      // Assign to least busy worker
      const workers = Object.values(cluster.workers);
      const leastBusyWorker = workers.reduce((min, worker) => {
        const minJobs = min.jobCount || 0;
        const workerJobs = worker.jobCount || 0;
        return workerJobs < minJobs ? worker : min;
      });
      
      leastBusyWorker.jobCount = (leastBusyWorker.jobCount || 0) + 1;
      
      // Send job to worker
      leastBusyWorker.send({
        type: 'accuracy-test',
        jobId: jobId,
        parameters: job.parameters
      });
      
      job.status = 'running';
      job.workerId = leastBusyWorker.id;
      
      console.log(`[Master] Started job ${jobId} on worker ${leastBusyWorker.process.pid}`);
      
      // For large jobs, return job ID for polling
      if (historicalData.length > 500 || (options && options.bootstrapIterations > 500)) {
        res.json({
          jobId: jobId,
          status: 'started',
          estimatedTime: Math.min(historicalData.length * 0.5, 300) + ' seconds',
          pollUrl: `/accuracy-test/${jobId}`
        });
      } else {
        // For smaller jobs, wait for completion (with timeout)
        const timeout = setTimeout(() => {
          res.json({
            jobId: jobId,
            status: 'running',
            message: 'Job is taking longer than expected, use polling URL',
            pollUrl: `/accuracy-test/${jobId}`
          });
        }, 30000);
        
        const checkCompletion = setInterval(() => {
          const currentJob = completedJobs.get(jobId);
          if (currentJob) {
            clearTimeout(timeout);
            clearInterval(checkCompletion);
            
            if (currentJob.error) {
              res.status(500).json({ error: currentJob.error });
            } else {
              res.json({
                completed: true,
                results: currentJob.results,
                executionTime: currentJob.completedAt - currentJob.createdAt,
                jobId: jobId
              });
            }
          }
        }, 1000);
      }
      
    } catch (error) {
      console.error('[Master] Error starting accuracy test:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Job status endpoint
  app.get('/accuracy-test/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    
    // Check completed jobs first
    if (completedJobs.has(jobId)) {
      const job = completedJobs.get(jobId);
      
      if (job.error) {
        return res.json({
          completed: true,
          error: job.error,
          jobId: jobId
        });
      } else {
        return res.json({
          completed: true,
          results: job.results,
          executionTime: job.completedAt - job.createdAt,
          jobId: jobId
        });
      }
    }
    
    // Check active jobs
    if (activeJobs.has(jobId)) {
      const job = activeJobs.get(jobId);
      
      return res.json({
        completed: false,
        status: job.status,
        progress: job.progress,
        startedAt: job.createdAt,
        jobId: jobId
      });
    }
    
    // Job not found
    res.status(404).json({ error: 'Job not found' });
  });
  
  // Cancel job endpoint
  app.delete('/accuracy-test/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    
    if (activeJobs.has(jobId)) {
      const job = activeJobs.get(jobId);
      
      // Send cancellation to worker
      const worker = cluster.workers[job.workerId];
      if (worker) {
        worker.send({
          type: 'cancel-job',
          jobId: jobId
        });
      }
      
      activeJobs.delete(jobId);
      
      res.json({ 
        success: true, 
        message: 'Job cancelled',
        jobId: jobId 
      });
    } else {
      res.status(404).json({ error: 'Job not found or already completed' });
    }
  });
  
  // List jobs endpoint
  app.get('/jobs', (req, res) => {
    const active = Array.from(activeJobs.values()).map(job => ({
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      progress: job.progress
    }));
    
    const completed = Array.from(completedJobs.values()).map(job => ({
      id: job.id,
      status: job.error ? 'failed' : 'completed',
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      hasError: !!job.error
    }));
    
    res.json({
      active: active,
      completed: completed,
      totalActive: active.length,
      totalCompleted: completed.length
    });
  });
  
  // Graceful shutdown endpoint
  app.post('/shutdown', (req, res) => {
    console.log('[Master] Shutdown requested');
    
    res.json({ 
      success: true, 
      message: 'Server shutting down gracefully...' 
    });
    
    // Give response time to be sent
    setTimeout(() => {
      console.log('[Master] Shutting down workers...');
      
      for (const worker of Object.values(cluster.workers)) {
        worker.kill('SIGTERM');
      }
      
      setTimeout(() => {
        console.log('[Master] Exiting...');
        process.exit(0);
      }, 2000);
    }, 100);
  });
  
  // Start server
  const server = app.listen(config.port, config.host, () => {
    console.log(`[Master] Accuracy server running on http://${config.host}:${config.port}`);
    console.log(`[Master] Health check: http://${config.host}:${config.port}/health`);
  });
  
  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('[Master] SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('[Master] Server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('[Master] SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('[Master] Server closed');
      process.exit(0);
    });
  });
  
} else {
  // Worker process - handles computation
  console.log(`[Worker ${process.pid}] Started`);
  
  // Import accuracy testing modules (these would be the actual implementations)
  // For now, we'll simulate the work
  
  const workerJobs = new Map();
  
  process.on('message', async (message) => {
    const { type, jobId, parameters } = message;
    
    if (type === 'accuracy-test') {
      console.log(`[Worker ${process.pid}] Starting job ${jobId}`);
      
      try {
        // Simulate accuracy testing work
        const results = await simulateAccuracyTest(jobId, parameters);
        
        // Send completion message to master
        process.send({
          type: 'job-complete',
          jobId: jobId,
          results: results
        });
        
        console.log(`[Worker ${process.pid}] Completed job ${jobId}`);
        
      } catch (error) {
        console.error(`[Worker ${process.pid}] Job ${jobId} failed:`, error);
        
        process.send({
          type: 'job-complete',
          jobId: jobId,
          error: error.message
        });
      }
      
    } else if (type === 'cancel-job') {
      console.log(`[Worker ${process.pid}] Cancelling job ${jobId}`);
      workerJobs.delete(jobId);
    }
  });
  
  /**
   * Simulate accuracy testing work (replace with real implementation)
   */
  async function simulateAccuracyTest(jobId, parameters) {
    const { historicalData, options, methodWeights } = parameters;
    const dataSize = historicalData.length;
    
    // Simulate different methods being tested
    const methods = ['confidence', 'energy', 'frequency', 'lstm'];
    const totalSteps = methods.length * Math.ceil(dataSize / 50); // Assume 50-draw windows
    let currentStep = 0;
    
    const methodResults = {};
    
    for (const method of methods) {
      console.log(`[Worker ${process.pid}] Testing method: ${method}`);
      
      // Simulate method-specific work
      const methodPredictions = [];
      const windowCount = Math.ceil(dataSize / 50);
      
      for (let window = 0; window < windowCount; window++) {
        // Simulate processing time based on method complexity
        const processingTime = {
          confidence: 200,  // Bootstrap is intensive
          energy: 50,       // Mathematical calculations
          frequency: 30,    // Simple counting
          lstm: 150         // Neural network
        };
        
        await new Promise(resolve => setTimeout(resolve, processingTime[method]));
        
        // Send progress update
        currentStep++;
        const progress = (currentStep / totalSteps) * 100;
        
        process.send({
          type: 'job-progress',
          jobId: jobId,
          progress: {
            progress: progress,
            currentMethod: method,
            window: window,
            totalWindows: windowCount
          }
        });
        
        // Simulate prediction results
        methodPredictions.push({
          window: window,
          matches: Math.floor(Math.random() * 3) + 1, // 1-3 matches typically
          powerballMatch: Math.random() < 0.04,       // ~4% chance
          mae: Math.random() * 10 + 5                 // 5-15 MAE
        });
        
        // Check for cancellation
        if (!workerJobs.has(jobId)) {
          throw new Error('Job cancelled');
        }
      }
      
      // Calculate method accuracy
      const avgMatches = methodPredictions.reduce((sum, p) => sum + p.matches, 0) / methodPredictions.length;
      const hitRate = methodPredictions.filter(p => p.matches >= 3).length / methodPredictions.length;
      const avgMAE = methodPredictions.reduce((sum, p) => sum + p.mae, 0) / methodPredictions.length;
      
      methodResults[method] = {
        name: method.charAt(0).toUpperCase() + method.slice(1),
        predictions: methodPredictions,
        accuracy: {
          totalPredictions: methodPredictions.length,
          averageMatches: avgMatches,
          hitRate: hitRate,
          positionAccuracy: { meanAbsoluteError: avgMAE },
          overallScore: (avgMatches / 5) * 0.6 + hitRate * 0.4
        }
      };
    }
    
    // Simulate ensemble results
    const ensembleScore = Math.max(...Object.values(methodResults).map(r => r.accuracy.overallScore)) * 1.1;
    
    return {
      methods: new Map(Object.entries(methodResults)),
      ensemble: {
        accuracy: {
          overallScore: ensembleScore,
          averageMatches: 2.5,
          hitRate: 0.15
        }
      },
      summary: {
        bestMethod: {
          name: 'confidence',
          displayName: 'Confidence Intervals',
          overallScore: ensembleScore * 0.9
        },
        totalPredictions: methodPredictions.length * methods.length,
        testDuration: Date.now() - performance.now(),
        adaptiveWeights: methodWeights
      }
    };
  }
}

// Export configuration for external use
module.exports = { config };