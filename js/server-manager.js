/**
 * SERVER DETECTION AND AUTO-LAUNCH SYSTEM
 * Version: 1.0.0 | Created: 2025-09-04
 * 
 * Smart detection and management of local Node.js server for performance-intensive operations
 */

import { showError, showSuccess, showInfo, showWarning } from './notifications.js';

/**
 * Manages local server detection, launch, and communication
 */
export class ServerManager {
  constructor(options = {}) {
    this.options = {
      serverPort: options.serverPort || 3001,
      serverHost: options.serverHost || 'localhost',
      detectionTimeout: options.detectionTimeout || 5000,
      launchTimeout: options.launchTimeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      autoLaunch: options.autoLaunch || true,
      ...options
    };
    
    this.serverStatus = 'unknown'; // unknown, available, unavailable, starting, running, error
    this.serverProcess = null;
    this.serverCapabilities = {};
    this.lastHealthCheck = null;
    this.performanceMetrics = {
      detectionTime: 0,
      launchTime: 0,
      avgResponseTime: 0,
      successfulRequests: 0,
      failedRequests: 0
    };
  }

  /**
   * Get server base URL
   */
  get serverUrl() {
    return `http://${this.options.serverHost}:${this.options.serverPort}`;
  }

  /**
   * Detect if server is available and get capabilities
   */
  async detectServer() {
    const startTime = performance.now();
    
    try {
      console.log('[ServerManager] Detecting local server...');
      
      const response = await this.makeRequest('/health', {
        method: 'GET',
        timeout: this.options.detectionTimeout
      });
      
      if (response.ok) {
        const healthData = await response.json();
        
        this.serverStatus = 'available';
        this.serverCapabilities = healthData.capabilities || {};
        this.lastHealthCheck = new Date();
        this.performanceMetrics.detectionTime = performance.now() - startTime;
        
        console.log('[ServerManager] Server detected and available:', healthData);
        
        return {
          available: true,
          capabilities: this.serverCapabilities,
          version: healthData.version,
          performance: {
            responseTime: this.performanceMetrics.detectionTime,
            memoryUsage: healthData.memory,
            cpuCores: healthData.cpuCores
          }
        };
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
    } catch (error) {
      console.log('[ServerManager] Server not detected:', error.message);
      
      this.serverStatus = 'unavailable';
      this.performanceMetrics.detectionTime = performance.now() - startTime;
      
      return {
        available: false,
        error: error.message,
        canLaunch: await this.canLaunchServer()
      };
    }
  }

  /**
   * Check if we can launch a local server
   */
  async canLaunchServer() {
    // Check if we're in an environment that supports server launch
    if (typeof window === 'undefined') return false; // Not in browser
    if (!window.location.protocol.startsWith('http')) return false; // File protocol
    
    // Check for Node.js availability (would need to be implemented based on deployment)
    // This is a placeholder - in real implementation, this would check for:
    // - Electron environment with Node.js access
    // - Bundled server executable
    // - System Node.js installation
    
    return false; // For now, disable auto-launch until server is implemented
  }

  /**
   * Launch local server
   */
  async launchServer() {
    if (this.serverStatus === 'starting' || this.serverStatus === 'running') {
      console.log('[ServerManager] Server is already starting or running');
      return { success: true, status: this.serverStatus };
    }
    
    const startTime = performance.now();
    
    try {
      this.serverStatus = 'starting';
      
      showInfo('Starting Performance Server', 'Launching local server for enhanced performance...');
      
      // In a real implementation, this would:
      // 1. Check for bundled server executable
      // 2. Launch Node.js process with server script
      // 3. Wait for server to be ready
      // 4. Verify health endpoint
      
      // Placeholder implementation
      console.log('[ServerManager] Server launch not implemented in browser environment');
      
      // Simulate server launch for testing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if server is now available
      const detection = await this.detectServer();
      
      if (detection.available) {
        this.serverStatus = 'running';
        this.performanceMetrics.launchTime = performance.now() - startTime;
        
        showSuccess('Server Ready', 'Performance server is now available for enhanced accuracy testing');
        
        return {
          success: true,
          status: 'running',
          launchTime: this.performanceMetrics.launchTime,
          capabilities: this.serverCapabilities
        };
      } else {
        throw new Error('Server failed to start or become available');
      }
      
    } catch (error) {
      console.error('[ServerManager] Server launch failed:', error);
      
      this.serverStatus = 'error';
      
      showError('Server Launch Failed', `Could not start performance server: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        fallbackAvailable: true
      };
    }
  }

  /**
   * Stop local server
   */
  async stopServer() {
    if (this.serverStatus !== 'running' && this.serverStatus !== 'starting') {
      console.log('[ServerManager] No server to stop');
      return { success: true, status: 'stopped' };
    }
    
    try {
      console.log('[ServerManager] Stopping local server...');
      
      // Attempt graceful shutdown
      await this.makeRequest('/shutdown', {
        method: 'POST',
        timeout: 5000
      });
      
      this.serverStatus = 'unavailable';
      this.serverProcess = null;
      
      showInfo('Server Stopped', 'Performance server has been stopped');
      
      return { success: true, status: 'stopped' };
      
    } catch (error) {
      console.warn('[ServerManager] Graceful shutdown failed:', error.message);
      
      // Force stop if available
      if (this.serverProcess) {
        try {
          this.serverProcess.kill();
          this.serverProcess = null;
        } catch (killError) {
          console.error('[ServerManager] Force stop failed:', killError);
        }
      }
      
      this.serverStatus = 'unavailable';
      
      return { 
        success: false, 
        error: error.message,
        forceStopped: this.serverProcess === null
      };
    }
  }

  /**
   * Make HTTP request to server with timeout and error handling
   */
  async makeRequest(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      timeout = 10000
    } = options;
    
    const url = `${this.serverUrl}${endpoint}`;
    const requestStart = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method,
        body: body ? JSON.stringify(body) : null,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = performance.now() - requestStart;
      this.updatePerformanceMetrics(responseTime, response.ok);
      
      return response;
      
    } catch (error) {
      const responseTime = performance.now() - requestStart;
      this.updatePerformanceMetrics(responseTime, false);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(responseTime, success) {
    if (success) {
      this.performanceMetrics.successfulRequests++;
    } else {
      this.performanceMetrics.failedRequests++;
    }
    
    const totalRequests = this.performanceMetrics.successfulRequests + this.performanceMetrics.failedRequests;
    this.performanceMetrics.avgResponseTime = (
      (this.performanceMetrics.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests
    );
  }

  /**
   * Run accuracy test with automatic server management
   */
  async runAccuracyTestWithServerManager(accuracyTester, options = {}) {
    const {
      preferServer = true,
      fallbackToBrowser = true,
      progressCallback = null
    } = options;
    
    let useServer = false;
    let serverInfo = null;
    
    // Try to use server if preferred
    if (preferServer) {
      console.log('[ServerManager] Attempting to use server for accuracy testing...');
      
      // Detect existing server
      const detection = await this.detectServer();
      
      if (detection.available) {
        useServer = true;
        serverInfo = detection;
        showSuccess('Using Performance Server', 'Enhanced accuracy testing with server acceleration');
      } else if (this.options.autoLaunch && detection.canLaunch) {
        // Try to launch server
        const launch = await this.launchServer();
        if (launch.success) {
          useServer = true;
          serverInfo = launch;
        }
      }
      
      if (!useServer && !fallbackToBrowser) {
        throw new Error('Server not available and browser fallback disabled');
      } else if (!useServer) {
        showWarning('Using Browser Mode', 'Server not available, falling back to browser-based testing');
      }
    }
    
    try {
      let results;
      
      if (useServer) {
        // Run server-accelerated testing
        results = await this.runServerAccuracyTest(accuracyTester, options, progressCallback);
      } else {
        // Run browser-based testing
        results = await accuracyTester.runAccuracyTest(progressCallback);
      }
      
      // Add performance metadata
      results.performanceInfo = {
        usedServer: useServer,
        serverInfo: serverInfo,
        executionEnvironment: useServer ? 'server' : 'browser',
        performanceMetrics: { ...this.performanceMetrics }
      };
      
      return results;
      
    } catch (error) {
      // If server test failed and we have fallback, try browser
      if (useServer && fallbackToBrowser) {
        console.warn('[ServerManager] Server test failed, falling back to browser:', error.message);
        showWarning('Server Failed, Using Browser', 'Falling back to browser-based accuracy testing');
        
        const results = await accuracyTester.runAccuracyTest(progressCallback);
        results.performanceInfo = {
          usedServer: false,
          serverFallback: true,
          serverError: error.message,
          executionEnvironment: 'browser'
        };
        
        return results;
      }
      
      throw error;
    }
  }

  /**
   * Run accuracy test using server
   */
  async runServerAccuracyTest(accuracyTester, options, progressCallback) {
    console.log('[ServerManager] Running server-accelerated accuracy test...');
    
    try {
      // Prepare test configuration
      const testConfig = {
        historicalData: accuracyTester.historicalData,
        options: accuracyTester.options,
        methodWeights: accuracyTester.methodWeights,
        testOptions: options
      };
      
      // Start server-side accuracy test
      const response = await this.makeRequest('/accuracy-test', {
        method: 'POST',
        body: testConfig,
        timeout: 300000 // 5 minute timeout for large tests
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.jobId) {
        // Long-running job, poll for results
        return await this.pollForResults(result.jobId, progressCallback);
      } else {
        // Immediate result
        return result;
      }
      
    } catch (error) {
      console.error('[ServerManager] Server accuracy test failed:', error);
      throw error;
    }
  }

  /**
   * Poll server for long-running test results
   */
  async pollForResults(jobId, progressCallback) {
    const maxPollTime = 600000; // 10 minutes max
    const pollInterval = 2000;   // 2 second intervals
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxPollTime) {
      try {
        const response = await this.makeRequest(`/accuracy-test/${jobId}`, {
          method: 'GET',
          timeout: 10000
        });
        
        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }
        
        const status = await response.json();
        
        if (status.completed) {
          return status.results;
        } else if (status.error) {
          throw new Error(status.error);
        } else if (status.progress && progressCallback) {
          progressCallback({
            ...status.progress,
            source: 'server',
            jobId: jobId
          });
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error('[ServerManager] Polling error:', error);
        throw error;
      }
    }
    
    throw new Error('Server accuracy test timed out');
  }

  /**
   * Get server status and capabilities
   */
  async getServerInfo() {
    if (this.serverStatus === 'unknown' || this.serverStatus === 'unavailable') {
      const detection = await this.detectServer();
      return detection;
    }
    
    return {
      available: this.serverStatus === 'running' || this.serverStatus === 'available',
      status: this.serverStatus,
      capabilities: this.serverCapabilities,
      lastHealthCheck: this.lastHealthCheck,
      performanceMetrics: { ...this.performanceMetrics }
    };
  }

  /**
   * Recommend performance mode based on dataset size and capabilities
   */
  recommendPerformanceMode(datasetSize, testComplexity = 'medium') {
    const recommendations = {
      useServer: false,
      reason: '',
      expectedSpeedup: 1,
      memoryRecommendation: 'sufficient',
      alternatives: []
    };
    
    // Dataset size thresholds
    const LARGE_DATASET = 500;
    const VERY_LARGE_DATASET = 1000;
    
    // Complexity factors
    const complexityMultipliers = {
      'low': 1,
      'medium': 2,
      'high': 4,
      'maximum': 8
    };
    
    const complexityFactor = complexityMultipliers[testComplexity] || 2;
    const effectiveComplexity = datasetSize * complexityFactor;
    
    if (effectiveComplexity > VERY_LARGE_DATASET * 4) {
      recommendations.useServer = true;
      recommendations.reason = 'Very large dataset with high complexity requires server acceleration';
      recommendations.expectedSpeedup = 5;
    } else if (effectiveComplexity > LARGE_DATASET * 2) {
      recommendations.useServer = true;
      recommendations.reason = 'Large dataset benefits significantly from server processing';
      recommendations.expectedSpeedup = 3;
    } else if (datasetSize > LARGE_DATASET) {
      recommendations.useServer = true;
      recommendations.reason = 'Moderate dataset size, server provides better performance';
      recommendations.expectedSpeedup = 2;
    } else {
      recommendations.reason = 'Dataset size suitable for browser processing';
      recommendations.alternatives.push('Consider server for faster results on repeated testing');
    }
    
    // Memory recommendations
    if (effectiveComplexity > VERY_LARGE_DATASET * 2) {
      recommendations.memoryRecommendation = 'high'; // 8GB+ recommended
    } else if (effectiveComplexity > LARGE_DATASET) {
      recommendations.memoryRecommendation = 'medium'; // 4GB+ recommended
    }
    
    return recommendations;
  }

  /**
   * Get performance comparison between browser and server
   */
  getPerformanceComparison() {
    return {
      browser: {
        pros: [
          'No setup required',
          'Works offline',
          'Data stays local',
          'No additional dependencies'
        ],
        cons: [
          'Limited CPU utilization',
          'Memory constraints',
          'May block UI on large datasets',
          'Slower bootstrap iterations'
        ],
        recommendedFor: 'Datasets under 500 draws, casual testing'
      },
      server: {
        pros: [
          'Full CPU utilization (all cores)',
          'No memory constraints',
          'Background processing',
          'Faster bootstrap sampling',
          'Parallel method testing'
        ],
        cons: [
          'Requires server setup',
          'Additional complexity',
          'May require Node.js installation'
        ],
        recommendedFor: 'Datasets over 500 draws, intensive testing, repeated analysis'
      }
    };
  }
}

// Export for use in other modules
export default ServerManager;

// Browser compatibility
if (typeof window !== 'undefined') {
  window.ServerManager = ServerManager;
}