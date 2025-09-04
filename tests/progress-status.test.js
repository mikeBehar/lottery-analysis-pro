/**
 * PROGRESS STATUS UNIT TESTS
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * Unit tests for the progress status manager
 */

import state from '../js/state.js';

// Mock DOM elements
const mockProgressStatus = {
  style: { display: 'none' },
  querySelector: jest.fn(),
  getElementById: jest.fn()
};

const mockCurrentStep = { textContent: '' };
const mockTimestamp = { textContent: '' };
const mockSuggestedActions = { textContent: '' };

// Mock document.getElementById
global.document = {
  getElementById: jest.fn((id) => {
    switch(id) {
      case 'progress-status': return mockProgressStatus;
      case 'current-step': return mockCurrentStep;
      case 'step-timestamp': return mockTimestamp;
      case 'suggested-actions': return mockSuggestedActions;
      default: return null;
    }
  })
};

// Mock console.log
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('Progress Status Manager', () => {
  let ProgressStatus;
  let progressStatus;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock DOM elements
    mockProgressStatus.style.display = 'none';
    mockCurrentStep.textContent = '';
    mockTimestamp.textContent = '';
    mockSuggestedActions.textContent = '';

    // Reset state
    state.subscribers = {};
    
    // Dynamically import the module to get fresh instance
    delete require.cache[require.resolve('../js/progress-status.js')];
  });

  describe('Initialization', () => {
    it('should initialize progress status manager', async () => {
      const progressStatusModule = await import('../js/progress-status.js');
      progressStatus = progressStatusModule.default;

      expect(document.getElementById).toHaveBeenCalledWith('progress-status');
      expect(document.getElementById).toHaveBeenCalledWith('current-step');
      expect(document.getElementById).toHaveBeenCalledWith('step-timestamp');
      expect(document.getElementById).toHaveBeenCalledWith('suggested-actions');
    });

    it('should handle missing DOM elements gracefully', async () => {
      // Mock getElementById to return null
      document.getElementById = jest.fn(() => null);
      
      expect(async () => {
        await import('../js/progress-status.js');
      }).not.toThrow();
    });

    it('should subscribe to state events', async () => {
      const progressStatusModule = await import('../js/progress-status.js');
      progressStatus = progressStatusModule.default;

      // Check that state subscriptions were set up
      expect(Object.keys(state.subscribers)).toContain('drawsUpdated');
      expect(Object.keys(state.subscribers)).toContain('progress');
      expect(Object.keys(state.subscribers)).toContain('error');
    });
  });

  describe('Step Updates', () => {
    beforeEach(async () => {
      const progressStatusModule = await import('../js/progress-status.js');
      progressStatus = progressStatusModule.default;
    });

    it('should update step when data is loaded', () => {
      const mockDraws = [{ whiteBalls: [1,2,3,4,5], powerball: 10 }];
      
      state.publish('drawsUpdated', mockDraws);

      expect(mockCurrentStep.textContent).toBe('Data loaded');
      expect(mockSuggestedActions.textContent).toBe('Run analysis or optimize parameters');
      expect(mockProgressStatus.style.display).toBe('block');
    });

    it('should update step during progress', () => {
      state.publish('progress', 'Running ML predictions...');

      expect(mockCurrentStep.textContent).toBe('Running ML predictions...');
      expect(mockSuggestedActions.textContent).toBe('Please wait...');
    });

    it('should update step on completion', () => {
      state.publish('hideProgress');

      expect(mockCurrentStep.textContent).toBe('Analysis complete');
      expect(mockSuggestedActions.textContent).toBe('Try parameter optimization or accuracy testing');
    });

    it('should update step on energy results', () => {
      const mockEnergyData = [{ number: 1, energy: 0.5 }];
      
      state.publish('energyResults', mockEnergyData);

      expect(mockCurrentStep.textContent).toBe('Energy analysis complete');
      expect(mockSuggestedActions.textContent).toBe('Check AI predictions next');
    });

    it('should update step on ML results', () => {
      const mockMLResults = { whiteBalls: [1,2,3,4,5], powerball: 10 };
      
      state.publish('mlResults', mockMLResults);

      expect(mockCurrentStep.textContent).toBe('AI predictions complete');
      expect(mockSuggestedActions.textContent).toBe('Review recommendations or try optimization');
    });

    it('should handle errors', () => {
      const errorData = { title: 'Test Error', message: 'Something went wrong' };
      
      state.publish('error', errorData);

      expect(mockCurrentStep.textContent).toBe('Error: Test Error');
      expect(mockSuggestedActions.textContent).toBe('Check the error message and try again');
    });

    it('should handle optimization events', () => {
      // Optimization started
      state.publish('optimizationStarted');
      expect(mockCurrentStep.textContent).toBe('Parameter optimization in progress');
      expect(mockSuggestedActions.textContent).toBe('This may take several minutes...');

      // Optimization completed
      state.publish('optimizationComplete');
      expect(mockCurrentStep.textContent).toBe('Optimization complete');
      expect(mockSuggestedActions.textContent).toBe('Run analysis again to see improved results');
    });
  });

  describe('Timestamp Management', () => {
    beforeEach(async () => {
      const progressStatusModule = await import('../js/progress-status.js');
      progressStatus = progressStatusModule.default;
      
      // Mock Date
      const mockDate = new Date('2025-09-02T10:30:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      mockDate.toLocaleTimeString = jest.fn().mockReturnValue('10:30:00 AM');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should set timestamp when step updates', () => {
      state.publish('progress', 'Test step');

      expect(mockTimestamp.textContent).toContain('Started: 10:30:00 AM');
    });

    it('should update elapsed time', () => {
      // Simulate step start
      state.publish('progress', 'Test step');
      
      // Mock elapsed time calculation
      const originalDate = global.Date;
      global.Date = jest.fn(() => ({
        toLocaleTimeString: () => '10:30:00 AM',
        valueOf: () => new originalDate('2025-09-02T10:35:00.000Z').valueOf()
      }));

      // Trigger elapsed time update
      progressStatus.updateElapsedTime();

      expect(mockTimestamp.textContent).toContain('5m 0s elapsed');
    });
  });

  describe('Visibility Management', () => {
    beforeEach(async () => {
      const progressStatusModule = await import('../js/progress-status.js');
      progressStatus = progressStatusModule.default;
    });

    it('should show progress status when step updates', () => {
      state.publish('progress', 'Test step');

      expect(mockProgressStatus.style.display).toBe('block');
    });

    it('should hide progress status when requested', () => {
      progressStatus.hide();

      expect(mockProgressStatus.style.display).toBe('none');
    });

    it('should show progress status when requested', () => {
      progressStatus.show();

      expect(mockProgressStatus.style.display).toBe('block');
    });
  });

  describe('Elapsed Time Calculation', () => {
    beforeEach(async () => {
      const progressStatusModule = await import('../js/progress-status.js');
      progressStatus = progressStatusModule.default;
    });

    it('should return empty string when no start time', () => {
      const elapsed = progressStatus.getElapsedTime();
      expect(elapsed).toBe('');
    });

    it('should format seconds correctly', () => {
      // Set a start time
      progressStatus.startTime = new Date(Date.now() - 45000); // 45 seconds ago
      
      const elapsed = progressStatus.getElapsedTime();
      expect(elapsed).toBe('45s');
    });

    it('should format minutes and seconds correctly', () => {
      // Set a start time 
      progressStatus.startTime = new Date(Date.now() - 125000); // 2m 5s ago
      
      const elapsed = progressStatus.getElapsedTime();
      expect(elapsed).toBe('2m 5s');
    });
  });
});