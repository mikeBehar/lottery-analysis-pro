/**
 * PERFORMANCE MODE UI CONTROLLER
 * Version: 1.0.0 | Created: 2025-09-04
 * 
 * User interface for performance mode selection and server management
 */

import ServerManager from './server-manager.js';
import EnhancedAccuracyTester from './enhanced-accuracy-tester.js';
import state from './state.js';
import { showError, showSuccess, showInfo, showWarning } from './notifications.js';

/**
 * Performance UI controller
 */
export class PerformanceUI {
  constructor() {
    this.serverManager = new ServerManager();
    this.currentAccuracyTest = null;
    this.performanceMode = 'auto'; // auto, browser, server
    this.isTestRunning = false;
    
    this.elements = {
      performancePanel: null,
      modeSelector: null,
      serverStatus: null,
      launchServerBtn: null,
      stopServerBtn: null,
      runAccuracyTestBtn: null,
      testProgress: null,
      testResults: null,
      performanceRecommendation: null
    };
    
    this.init();
  }

  /**
   * Initialize performance UI
   */
  init() {
    this.createPerformancePanel();
    this.bindEvents();
    this.subscribeToState();
    
    // Initial server detection
    this.detectServerAsync();
    
    console.log('[PerformanceUI] Initialized successfully');
  }

  /**
   * Create performance panel HTML
   */
  createPerformancePanel() {
    // Find or create performance panel
    let panel = document.getElementById('performance-panel');
    
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'performance-panel';
      panel.className = 'panel';
      
      // Insert after optimization panel
      const optimizationPanel = document.getElementById('optimization-panel');
      if (optimizationPanel) {
        optimizationPanel.parentNode.insertBefore(panel, optimizationPanel.nextSibling);
      } else {
        // Fallback: append to panels container
        const panelsContainer = document.querySelector('.panels');
        if (panelsContainer) {
          panelsContainer.appendChild(panel);
        }
      }
    }
    
    panel.innerHTML = `
      <h2>⚡ Performance Mode</h2>
      <p class="panel-description">Enhanced accuracy testing with optional server acceleration</p>
      
      <div class="performance-controls">
        <div class="performance-mode-selector">
          <label for="performance-mode">Execution Mode:</label>
          <select id="performance-mode">
            <option value="auto" selected>Auto-Detect (Recommended)</option>
            <option value="browser">Browser Only</option>
            <option value="server">Server Only</option>
          </select>
        </div>
        
        <div id="server-status" class="server-status">
          <div class="status-indicator">
            <span class="status-dot unknown"></span>
            <span class="status-text">Checking server availability...</span>
          </div>
          <div class="server-info" style="display: none;"></div>
        </div>
        
        <div class="server-controls">
          <button id="launch-server" class="server-btn launch-btn" style="display: none;">
            🚀 Launch Performance Server
          </button>
          <button id="stop-server" class="server-btn stop-btn" style="display: none;">
            ⏹️ Stop Server
          </button>
          <button id="refresh-server" class="server-btn refresh-btn">
            🔄 Refresh Status
          </button>
        </div>
        
        <div id="performance-recommendation" class="performance-recommendation" style="display: none;">
          <h4>💡 Performance Recommendation</h4>
          <div class="recommendation-content"></div>
        </div>
        
        <div class="accuracy-test-controls">
          <button id="run-enhanced-accuracy-test" class="accuracy-test-btn" disabled>
            🧪 Run Enhanced Accuracy Test
          </button>
          <div class="test-options">
            <label>
              <input type="checkbox" id="include-ensemble" checked>
              Include ensemble predictions
            </label>
            <label>
              <input type="checkbox" id="adaptive-weighting" checked>
              Adaptive method weighting
            </label>
          </div>
        </div>
      </div>
      
      <div id="test-progress" class="test-progress" style="display: none;">
        <div class="progress-header">
          <h4>Testing in Progress...</h4>
          <button id="cancel-test" class="cancel-test-btn">Cancel</button>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="progress-details">
          <span class="current-method">Initializing...</span>
          <span class="progress-text">0%</span>
        </div>
        <div class="performance-info">
          <span class="execution-mode">Mode: Browser</span>
          <span class="elapsed-time">Elapsed: 00:00</span>
        </div>
      </div>
      
      <div id="test-results" class="test-results" style="display: none;">
        <h3>📊 Accuracy Test Results</h3>
        <div class="results-content"></div>
      </div>
    `;
    
    // Store element references
    this.elements.performancePanel = panel;
    this.elements.modeSelector = panel.querySelector('#performance-mode');
    this.elements.serverStatus = panel.querySelector('#server-status');
    this.elements.launchServerBtn = panel.querySelector('#launch-server');
    this.elements.stopServerBtn = panel.querySelector('#stop-server');
    this.elements.refreshServerBtn = panel.querySelector('#refresh-server');
    this.elements.runAccuracyTestBtn = panel.querySelector('#run-enhanced-accuracy-test');
    this.elements.testProgress = panel.querySelector('#test-progress');
    this.elements.testResults = panel.querySelector('#test-results');
    this.elements.performanceRecommendation = panel.querySelector('#performance-recommendation');
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Mode selector
    if (this.elements.modeSelector) {
      this.elements.modeSelector.addEventListener('change', (e) => {
        this.performanceMode = e.target.value;
        this.updateUIState();
      });
    }
    
    // Server controls
    if (this.elements.launchServerBtn) {
      this.elements.launchServerBtn.addEventListener('click', () => this.launchServer());
    }
    
    if (this.elements.stopServerBtn) {
      this.elements.stopServerBtn.addEventListener('click', () => this.stopServer());
    }
    
    if (this.elements.refreshServerBtn) {
      this.elements.refreshServerBtn.addEventListener('click', () => this.refreshServerStatus());
    }
    
    // Accuracy test
    if (this.elements.runAccuracyTestBtn) {
      this.elements.runAccuracyTestBtn.addEventListener('click', () => this.runAccuracyTest());
    }
    
    // Cancel test
    const cancelBtn = this.elements.testProgress?.querySelector('#cancel-test');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelAccuracyTest());
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribeToState() {
    state.subscribe('drawsUpdated', (draws) => {
      this.updatePerformanceRecommendation(draws.length);
      this.updateTestButtonState();
    });
  }

  /**
   * Async server detection
   */
  async detectServerAsync() {
    try {
      const serverInfo = await this.serverManager.detectServer();
      this.updateServerStatus(serverInfo);
    } catch (error) {
      console.warn('[PerformanceUI] Server detection failed:', error);
      this.updateServerStatus({ available: false, error: error.message });
    }
  }

  /**
   * Update server status display
   */
  updateServerStatus(serverInfo) {
    if (!this.elements.serverStatus) return;
    
    const statusDot = this.elements.serverStatus.querySelector('.status-dot');
    const statusText = this.elements.serverStatus.querySelector('.status-text');
    const serverInfoDiv = this.elements.serverStatus.querySelector('.server-info');
    
    if (serverInfo.available) {
      statusDot.className = 'status-dot available';
      statusText.textContent = 'Performance server available';
      
      serverInfoDiv.style.display = 'block';
      serverInfoDiv.innerHTML = `
        <div class="server-capabilities">
          <strong>Capabilities:</strong>
          <ul>
            <li>CPU Cores: ${serverInfo.performance?.cpuCores || 'N/A'}</li>
            <li>Memory: ${serverInfo.performance?.memoryUsage?.total || 'N/A'}</li>
            <li>Response Time: ${Math.round(serverInfo.performance?.responseTime || 0)}ms</li>
          </ul>
        </div>
      `;
      
      this.elements.launchServerBtn.style.display = 'none';
      this.elements.stopServerBtn.style.display = 'inline-block';
      
    } else {
      statusDot.className = 'status-dot unavailable';
      statusText.textContent = serverInfo.canLaunch ? 
        'Server not running (can launch)' : 
        'Server not available';
      
      serverInfoDiv.style.display = 'none';
      
      this.elements.launchServerBtn.style.display = serverInfo.canLaunch ? 'inline-block' : 'none';
      this.elements.stopServerBtn.style.display = 'none';
    }
    
    this.updateUIState();
  }

  /**
   * Update performance recommendation
   */
  updatePerformanceRecommendation(datasetSize) {
    if (!this.elements.performanceRecommendation || !datasetSize) return;
    
    const recommendation = this.serverManager.recommendPerformanceMode(datasetSize, 'medium');
    const content = this.elements.performanceRecommendation.querySelector('.recommendation-content');
    
    content.innerHTML = `
      <div class="recommendation-summary">
        <strong>Dataset Size:</strong> ${datasetSize} draws<br>
        <strong>Recommended Mode:</strong> ${recommendation.useServer ? 'Server' : 'Browser'}<br>
        <strong>Expected Speedup:</strong> ${recommendation.expectedSpeedup}x<br>
        <strong>Reason:</strong> ${recommendation.reason}
      </div>
      ${recommendation.alternatives.length > 0 ? `
        <div class="recommendation-alternatives">
          <strong>Alternatives:</strong>
          <ul>
            ${recommendation.alternatives.map(alt => `<li>${alt}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
    
    this.elements.performanceRecommendation.style.display = 'block';
    
    // Auto-adjust mode selector based on recommendation
    if (this.performanceMode === 'auto') {
      if (recommendation.useServer && this.serverManager.serverStatus === 'available') {
        this.performanceMode = 'server';
      } else {
        this.performanceMode = 'browser';
      }
      this.updateUIState();
    }
  }

  /**
   * Launch server
   */
  async launchServer() {
    try {
      this.elements.launchServerBtn.disabled = true;
      this.elements.launchServerBtn.textContent = '🚀 Launching...';
      
      const result = await this.serverManager.launchServer();
      
      if (result.success) {
        this.updateServerStatus({
          available: true,
          capabilities: result.capabilities,
          performance: { launchTime: result.launchTime }
        });
      } else {
        showWarning('Server Launch Failed', result.error || 'Unknown error');
        this.updateServerStatus({ available: false, error: result.error });
      }
      
    } catch (error) {
      console.error('[PerformanceUI] Server launch error:', error);
      showError('Launch Error', error.message);
      this.updateServerStatus({ available: false, error: error.message });
    } finally {
      this.elements.launchServerBtn.disabled = false;
      this.elements.launchServerBtn.textContent = '🚀 Launch Performance Server';
    }
  }

  /**
   * Stop server
   */
  async stopServer() {
    try {
      this.elements.stopServerBtn.disabled = true;
      this.elements.stopServerBtn.textContent = '⏹️ Stopping...';
      
      const result = await this.serverManager.stopServer();
      
      if (result.success) {
        this.updateServerStatus({ available: false });
      } else {
        showWarning('Server Stop Failed', result.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('[PerformanceUI] Server stop error:', error);
      showError('Stop Error', error.message);
    } finally {
      this.elements.stopServerBtn.disabled = false;
      this.elements.stopServerBtn.textContent = '⏹️ Stop Server';
    }
  }

  /**
   * Refresh server status
   */
  async refreshServerStatus() {
    try {
      this.elements.refreshServerBtn.disabled = true;
      this.elements.refreshServerBtn.textContent = '🔄 Checking...';
      
      const serverInfo = await this.serverManager.getServerInfo();
      this.updateServerStatus(serverInfo);
      
    } catch (error) {
      console.error('[PerformanceUI] Server refresh error:', error);
      showError('Status Check Failed', error.message);
    } finally {
      this.elements.refreshServerBtn.disabled = false;
      this.elements.refreshServerBtn.textContent = '🔄 Refresh Status';
    }
  }

  /**
   * Update UI state based on current conditions
   */
  updateUIState() {
    this.updateTestButtonState();
    
    // Update mode selector to match current mode
    if (this.elements.modeSelector && this.elements.modeSelector.value !== this.performanceMode) {
      this.elements.modeSelector.value = this.performanceMode;
    }
  }

  /**
   * Update test button state
   */
  updateTestButtonState() {
    if (!this.elements.runAccuracyTestBtn) return;
    
    const hasData = state.draws && state.draws.length >= 100;
    const canRunTest = hasData && !this.isTestRunning;
    
    this.elements.runAccuracyTestBtn.disabled = !canRunTest;
    
    if (!hasData) {
      this.elements.runAccuracyTestBtn.textContent = '🧪 Upload Data First (100+ draws needed)';
    } else if (this.isTestRunning) {
      this.elements.runAccuracyTestBtn.textContent = '🧪 Test in Progress...';
    } else {
      this.elements.runAccuracyTestBtn.textContent = '🧪 Run Enhanced Accuracy Test';
    }
  }

  /**
   * Run enhanced accuracy test
   */
  async runAccuracyTest() {
    if (this.isTestRunning || !state.draws || state.draws.length < 100) {
      return;
    }
    
    this.isTestRunning = true;
    this.updateTestButtonState();
    
    // Show progress panel
    this.elements.testProgress.style.display = 'block';
    this.elements.testResults.style.display = 'none';
    
    const startTime = Date.now();
    let progressInterval;
    
    try {
      // Create enhanced accuracy tester
      const includeEnsemble = document.getElementById('include-ensemble')?.checked || true;
      const adaptiveWeighting = document.getElementById('adaptive-weighting')?.checked || true;
      
      const options = {
        minTrainingSize: Math.max(100, Math.floor(state.draws.length * 0.4)),
        testWindowSize: Math.min(50, Math.floor(state.draws.length * 0.1)),
        stepSize: 10,
        maxValidationPeriods: 10,
        bootstrapIterations: state.draws.length > 500 ? 500 : 200,
        confidenceLevel: 0.95,
        includeEnsemble,
        adaptiveWeighting
      };
      
      this.currentAccuracyTest = new EnhancedAccuracyTester(state.draws, options);
      
      // Update progress display
      const progressFill = this.elements.testProgress.querySelector('.progress-fill');
      const progressText = this.elements.testProgress.querySelector('.progress-text');
      const currentMethodSpan = this.elements.testProgress.querySelector('.current-method');
      const elapsedTimeSpan = this.elements.testProgress.querySelector('.elapsed-time');
      const executionModeSpan = this.elements.testProgress.querySelector('.execution-mode');
      
      progressInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        elapsedTimeSpan.textContent = `Elapsed: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }, 1000);
      
      // Progress callback
      const progressCallback = (progress) => {
        const percentage = Math.round(progress.progress || 0);
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}%`;
        
        if (progress.currentMethod) {
          currentMethodSpan.textContent = `Testing: ${progress.currentMethod} (Window ${progress.window + 1}/${progress.totalWindows || 'N/A'})`;
        }
        
        if (progress.source === 'server') {
          executionModeSpan.textContent = 'Mode: Server (Accelerated)';
        } else {
          executionModeSpan.textContent = 'Mode: Browser';
        }
      };
      
      showInfo('Starting Accuracy Test', 'Beginning enhanced accuracy analysis with walk-forward validation...');
      
      // Run test with server management
      const results = await this.serverManager.runAccuracyTestWithServerManager(
        this.currentAccuracyTest,
        {
          preferServer: this.performanceMode === 'auto' || this.performanceMode === 'server',
          fallbackToBrowser: this.performanceMode !== 'server',
          progressCallback
        }
      );
      
      // Display results
      this.displayTestResults(results);
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      showSuccess('Accuracy Test Complete', `Analysis completed in ${duration} seconds`);
      
    } catch (error) {
      console.error('[PerformanceUI] Accuracy test failed:', error);
      showError('Test Failed', error.message);
      
      this.elements.testResults.innerHTML = `
        <h3>❌ Test Failed</h3>
        <div class="error-message">
          <strong>Error:</strong> ${error.message}
        </div>
      `;
      this.elements.testResults.style.display = 'block';
      
    } finally {
      this.isTestRunning = false;
      this.currentAccuracyTest = null;
      
      clearInterval(progressInterval);
      this.elements.testProgress.style.display = 'none';
      this.updateTestButtonState();
    }
  }

  /**
   * Cancel running accuracy test
   */
  cancelAccuracyTest() {
    if (this.currentAccuracyTest) {
      // This would cancel the current test - implementation depends on test structure
      showInfo('Cancelling Test', 'Attempting to cancel accuracy test...');
      this.currentAccuracyTest = null;
    }
  }

  /**
   * Display test results
   */
  displayTestResults(results) {
    if (!this.elements.testResults) return;
    
    const { summary, performanceInfo } = results;
    const content = this.elements.testResults.querySelector('.results-content') || 
                   this.elements.testResults;
    
    const executionMode = performanceInfo?.usedServer ? 'Server (Accelerated)' : 'Browser';
    const testDuration = Math.round(summary.testDuration / 1000) || 0;
    
    content.innerHTML = `
      <div class="results-summary">
        <div class="execution-info">
          <span class="execution-mode">Execution Mode: ${executionMode}</span>
          <span class="duration">Duration: ${testDuration}s</span>
          <span class="predictions">Total Predictions: ${summary.totalPredictions}</span>
        </div>
        
        <div class="best-method">
          <h4>🏆 Best Performing Method</h4>
          <div class="method-card">
            <strong>${summary.bestMethod?.displayName || 'N/A'}</strong>
            <div class="metrics">
              <span>Score: ${((summary.bestMethod?.overallScore || 0) * 100).toFixed(1)}%</span>
              <span>Avg Matches: ${(summary.bestMethod?.averageMatches || 0).toFixed(2)}</span>
              <span>Hit Rate: ${((summary.bestMethod?.hitRate || 0) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        
        <div class="method-ranking">
          <h4>📊 Method Ranking</h4>
          <div class="ranking-list">
            ${summary.methodRanking?.map((method, index) => `
              <div class="rank-item">
                <span class="rank">#${index + 1}</span>
                <span class="method-name">${method.displayName}</span>
                <span class="score">${(method.overallScore * 100).toFixed(1)}%</span>
                <div class="method-details">
                  Avg Matches: ${method.averageMatches.toFixed(2)} | 
                  Hit Rate: ${(method.hitRate * 100).toFixed(1)}% |
                  Weight: ${(method.weight * 100).toFixed(0)}%
                </div>
              </div>
            `).join('') || '<div>No ranking data available</div>'}
          </div>
        </div>
        
        ${summary.ensemble ? `
          <div class="ensemble-results">
            <h4>🎯 Ensemble Performance</h4>
            <div class="ensemble-metrics">
              <span>Score: ${(summary.ensemble.overallScore * 100).toFixed(1)}%</span>
              <span>Avg Matches: ${summary.ensemble.averageMatches.toFixed(2)}</span>
              <span>Hit Rate: ${(summary.ensemble.hitRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        ` : ''}
        
        <div class="key-findings">
          <h4>🔍 Key Findings</h4>
          <ul>
            ${summary.keyFindings?.map(finding => `<li>${finding}</li>`).join('') || '<li>No findings available</li>'}
          </ul>
        </div>
        
        ${performanceInfo?.serverInfo ? `
          <div class="performance-details">
            <h4>⚡ Performance Details</h4>
            <div class="server-performance">
              <strong>Server Capabilities:</strong>
              <ul>
                <li>CPU Cores: ${performanceInfo.serverInfo.performance?.cpuCores || 'N/A'}</li>
                <li>Memory: ${performanceInfo.serverInfo.performance?.memoryUsage || 'N/A'}</li>
                <li>Average Response: ${Math.round(performanceInfo.serverInfo.performanceMetrics?.avgResponseTime || 0)}ms</li>
              </ul>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    this.elements.testResults.style.display = 'block';
  }
}

// Initialize performance UI when DOM is ready
let performanceUI = null;

export function initPerformanceUI() {
  if (!performanceUI) {
    performanceUI = new PerformanceUI();
  }
  return performanceUI;
}

export default PerformanceUI;