/**
 * PROGRESS STATUS MANAGER
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * Manages the progress status display under the analyze button
 */

import state from './state.js';

class ProgressStatus {
  constructor() {
    this.currentStep = '';
    this.startTime = null;
    this.progressContainer = null;
    this.currentStepEl = null;
    this.timestampEl = null;
    this.suggestedActionsEl = null;
    
    this.init();
  }

  init() {
    this.progressContainer = document.getElementById('progress-status');
    this.currentStepEl = document.getElementById('current-step');
    this.timestampEl = document.getElementById('step-timestamp');
    this.suggestedActionsEl = document.getElementById('suggested-actions');

    if (!this.progressContainer) return;

    // Subscribe to state changes
    state.subscribe('drawsUpdated', () => {
      this.updateStep('Data loaded', 'Run analysis or optimize parameters');
      this.show();
    });

    state.subscribe('progress', (message) => {
      this.updateStep(message, 'Please wait...');
    });

    state.subscribe('hideProgress', () => {
      this.updateStep('Analysis complete', 'Try parameter optimization or accuracy testing');
    });

    state.subscribe('energyResults', () => {
      this.updateStep('Energy analysis complete', 'Check AI predictions next');
    });

    state.subscribe('mlResults', () => {
      this.updateStep('AI predictions complete', 'Review recommendations or try optimization');
    });

    state.subscribe('error', (error) => {
      this.updateStep(`Error: ${error.title}`, 'Check the error message and try again');
    });

    // Optimization events
    state.subscribe('optimizationStarted', () => {
      this.updateStep('Parameter optimization in progress', 'This may take several minutes...');
    });

    state.subscribe('optimizationComplete', () => {
      this.updateStep('Optimization complete', 'Run analysis again to see improved results');
    });

    console.log('[Progress Status] Initialized successfully');
  }

  updateStep(step, suggestedActions = '') {
    if (!this.progressContainer) return;

    this.currentStep = step;
    this.startTime = new Date();

    if (this.currentStepEl) {
      this.currentStepEl.textContent = step;
    }

    if (this.timestampEl) {
      this.timestampEl.textContent = `Started: ${this.startTime.toLocaleTimeString()}`;
    }

    if (this.suggestedActionsEl && suggestedActions) {
      this.suggestedActionsEl.textContent = suggestedActions;
    }

    this.show();
  }

  show() {
    if (this.progressContainer) {
      this.progressContainer.style.display = 'block';
    }
  }

  hide() {
    if (this.progressContainer) {
      this.progressContainer.style.display = 'none';
    }
  }

  getElapsedTime() {
    if (!this.startTime) return '';
    
    const elapsed = new Date() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
  }

  updateElapsedTime() {
    if (this.timestampEl && this.startTime) {
      const elapsed = this.getElapsedTime();
      this.timestampEl.textContent = `Started: ${this.startTime.toLocaleTimeString()} (${elapsed} elapsed)`;
    }
  }
}

// Create and export singleton instance
const progressStatus = new ProgressStatus();

// Update elapsed time every 5 seconds
setInterval(() => {
  progressStatus.updateElapsedTime();
}, 5000);

export default progressStatus;