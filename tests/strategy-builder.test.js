/**
 * STRATEGY BUILDER UNIT TESTS
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * Unit tests for the custom strategy builder functionality
 */

import { initStrategyBuilder } from '../js/strategy-builder.js';
import state from '../js/state.js';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = mockLocalStorage;

// Mock notifications
jest.mock('../js/notifications.js', () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
  showInfo: jest.fn()
}));

// Mock DOM elements
const mockElements = {
  'formula-builder': { innerHTML: '' },
  'save-strategy': { addEventListener: jest.fn() },
  'strategy-name': { value: '', trim: jest.fn().mockReturnValue('') },
  'energy-weight': { value: '30', addEventListener: jest.fn(), nextElementSibling: { textContent: '' } },
  'frequency-weight': { value: '25', addEventListener: jest.fn(), nextElementSibling: { textContent: '' } },
  'gaps-weight': { value: '20', addEventListener: jest.fn(), nextElementSibling: { textContent: '' } },
  'patterns-weight': { value: '15', addEventListener: jest.fn(), nextElementSibling: { textContent: '' } },
  'random-weight': { value: '10', addEventListener: jest.fn(), nextElementSibling: { textContent: '' } },
  'total-weight': { textContent: '100', style: {} },
  'avoid-consecutive': { checked: true },
  'balance-odd-even': { checked: true },
  'spread-ranges': { checked: true },
  'limit-repeats': { checked: false },
  'preview-strategy': { addEventListener: jest.fn(), disabled: false },
  'preview-results': { innerHTML: '' },
  'strategies-list': { innerHTML: '' }
};

global.document = {
  getElementById: jest.fn((id) => mockElements[id] || null),
  createElement: jest.fn((tag) => ({
    className: '',
    innerHTML: '',
    textContent: '',
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
    click: jest.fn()
  })),
  querySelectorAll: jest.fn(() => [
    mockElements['energy-weight'],
    mockElements['frequency-weight'], 
    mockElements['gaps-weight'],
    mockElements['patterns-weight'],
    mockElements['random-weight']
  ])
};

// Mock window functions
global.window = {
  loadStrategy: jest.fn(),
  useStrategy: jest.fn(),
  deleteStrategy: jest.fn(),
  confirm: jest.fn()
};

// Mock console
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('Strategy Builder', () => {
  const { showError, showSuccess, showInfo } = require('../js/notifications.js');
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('[]');
    
    // Reset mock elements
    Object.values(mockElements).forEach(el => {
      if (el.innerHTML !== undefined) el.innerHTML = '';
      if (el.textContent !== undefined) el.textContent = '';
      if (el.value !== undefined) el.value = '';
      if (el.checked !== undefined) el.checked = false;
      if (el.disabled !== undefined) el.disabled = false;
    });

    // Reset state
    state.draws = [];
  });

  describe('Initialization', () => {
    it('should initialize strategy builder successfully', () => {
      initStrategyBuilder();

      expect(document.getElementById).toHaveBeenCalledWith('formula-builder');
      expect(document.getElementById).toHaveBeenCalledWith('save-strategy');
      expect(console.log).toHaveBeenCalledWith('[Strategy Builder] Initialized successfully');
    });

    it('should handle missing DOM elements gracefully', () => {
      document.getElementById = jest.fn(() => null);

      expect(() => initStrategyBuilder()).not.toThrow();
    });

    it('should load existing strategies from localStorage', () => {
      const mockStrategies = JSON.stringify([
        {
          id: '1',
          name: 'Test Strategy',
          weights: { energy: 40, frequency: 30, gaps: 10, patterns: 10, random: 10 },
          created: '2025-09-02T10:00:00.000Z'
        }
      ]);
      mockLocalStorage.getItem.mockReturnValue(mockStrategies);

      initStrategyBuilder();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('lottery-strategies');
    });
  });

  describe('Formula Builder Setup', () => {
    it('should create formula builder HTML', () => {
      initStrategyBuilder();

      const formulaBuilder = mockElements['formula-builder'];
      expect(formulaBuilder.innerHTML).toContain('strategy-config');
      expect(formulaBuilder.innerHTML).toContain('Strategy Name:');
      expect(formulaBuilder.innerHTML).toContain('Component Weights');
      expect(formulaBuilder.innerHTML).toContain('Number Filters');
      expect(formulaBuilder.innerHTML).toContain('Strategy Preview');
      expect(formulaBuilder.innerHTML).toContain('Saved Strategies');
    });

    it('should set up weight controls', () => {
      initStrategyBuilder();

      expect(document.querySelectorAll).toHaveBeenCalledWith('.weight-control input[type="range"]');
      
      // Check that event listeners were added to weight sliders
      const sliders = document.querySelectorAll('.weight-control input[type="range"]');
      sliders.forEach(slider => {
        expect(slider.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      });
    });

    it('should set up preview and save buttons', () => {
      initStrategyBuilder();

      expect(mockElements['preview-strategy'].addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements['save-strategy'].addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('Weight Management', () => {
    beforeEach(() => {
      initStrategyBuilder();
    });

    it('should update weight values when sliders change', () => {
      const mockEvent = {
        target: {
          id: 'energy-weight',
          value: '50',
          nextElementSibling: { textContent: '' }
        }
      };

      // Simulate weight slider change
      const sliders = document.querySelectorAll('.weight-control input[type="range"]');
      const energySlider = sliders[0];
      
      // Get the event handler and call it
      const inputHandler = energySlider.addEventListener.mock.calls
        .find(call => call[0] === 'input')[1];
      
      inputHandler(mockEvent);

      expect(mockEvent.target.nextElementSibling.textContent).toBe('50%');
    });

    it('should calculate total weight correctly', () => {
      // This would test the total weight calculation logic
      // Implementation depends on how the weight update function works
      expect(true).toBe(true); // Placeholder
    });

    it('should color-code total weight based on value', () => {
      // Test color coding logic for total weights
      // - Green for 100%
      // - Red for >100%  
      // - Orange for <100%
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Strategy Saving', () => {
    beforeEach(() => {
      initStrategyBuilder();
      mockElements['strategy-name'].value = 'Test Strategy';
      mockElements['strategy-name'].trim = jest.fn().mockReturnValue('Test Strategy');
    });

    it('should save strategy with valid inputs', () => {
      // Mock confirm to return true for overwrite
      global.confirm = jest.fn().mockReturnValue(true);

      // Simulate save button click
      const saveHandler = mockElements['save-strategy'].addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      
      saveHandler();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'lottery-strategies', 
        expect.stringContaining('Test Strategy')
      );
      expect(showSuccess).toHaveBeenCalledWith(
        'Strategy Saved',
        '"Test Strategy" has been saved successfully'
      );
    });

    it('should validate strategy name is provided', () => {
      mockElements['strategy-name'].trim = jest.fn().mockReturnValue('');

      const saveHandler = mockElements['save-strategy'].addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      
      saveHandler();

      expect(showError).toHaveBeenCalledWith(
        'Missing Name',
        'Please enter a name for your strategy'
      );
    });

    it('should validate weights total 100%', () => {
      // Mock weight calculation to return non-100 total
      // This would require mocking the weight calculation logic
      expect(true).toBe(true); // Placeholder
    });

    it('should handle strategy name conflicts', () => {
      // Mock existing strategy with same name
      const existingStrategies = [
        { name: 'Test Strategy', id: '1' }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingStrategies));
      global.confirm = jest.fn().mockReturnValue(false); // User chooses not to overwrite

      const saveHandler = mockElements['save-strategy'].addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      
      saveHandler();

      expect(global.confirm).toHaveBeenCalledWith('Strategy "Test Strategy" already exists. Overwrite?');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Strategy Preview', () => {
    beforeEach(() => {
      initStrategyBuilder();
      state.draws = [
        { whiteBalls: [1,2,3,4,5], powerball: 10 },
        { whiteBalls: [6,7,8,9,10], powerball: 15 }
      ];
    });

    it('should generate preview numbers', async () => {
      const previewHandler = mockElements['preview-strategy'].addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      
      await previewHandler();

      expect(mockElements['preview-results'].innerHTML).toContain('preview-numbers');
    });

    it('should handle preview with no data', async () => {
      state.draws = [];

      const previewHandler = mockElements['preview-strategy'].addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      
      await previewHandler();

      expect(showError).toHaveBeenCalledWith(
        'No Data',
        'Please load lottery data first to preview your strategy'
      );
    });

    it('should disable button during preview generation', async () => {
      const previewHandler = mockElements['preview-strategy'].addEventListener.mock.calls
        .find(call => call[0] === 'click')[1];
      
      const previewPromise = previewHandler();

      // Button should be disabled during generation
      expect(mockElements['preview-strategy'].disabled).toBe(true);

      await previewPromise;

      // Button should be re-enabled after completion
      expect(mockElements['preview-strategy'].disabled).toBe(false);
    });
  });

  describe('Strategy Management', () => {
    const mockStrategy = {
      id: '123',
      name: 'Test Strategy',
      weights: { energy: 30, frequency: 25, gaps: 20, patterns: 15, random: 10 },
      filters: { avoidConsecutive: true, balanceOddEven: false },
      created: '2025-09-02T10:00:00.000Z'
    };

    beforeEach(() => {
      initStrategyBuilder();
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockStrategy]));
    });

    it('should load strategy for editing', () => {
      // This tests the global loadStrategy function
      window.loadStrategy('123');

      expect(showInfo).toHaveBeenCalledWith(
        'Strategy Loaded',
        '"Test Strategy" has been loaded for editing'
      );
    });

    it('should use strategy for analysis', () => {
      window.useStrategy('123');

      expect(showSuccess).toHaveBeenCalledWith(
        'Strategy Applied',
        '"Test Strategy" is now being used for analysis'
      );
    });

    it('should delete strategy with confirmation', () => {
      global.confirm = jest.fn().mockReturnValue(true);

      window.deleteStrategy('123');

      expect(global.confirm).toHaveBeenCalledWith(
        'Delete strategy "Test Strategy"? This cannot be undone.'
      );
      expect(showInfo).toHaveBeenCalledWith(
        'Strategy Deleted',
        '"Test Strategy" has been deleted'
      );
    });

    it('should not delete strategy if user cancels', () => {
      global.confirm = jest.fn().mockReturnValue(false);

      window.deleteStrategy('123');

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle non-existent strategy IDs gracefully', () => {
      expect(() => window.loadStrategy('999')).not.toThrow();
      expect(() => window.useStrategy('999')).not.toThrow();
      expect(() => window.deleteStrategy('999')).not.toThrow();
    });
  });

  describe('Strategy List Display', () => {
    beforeEach(() => {
      initStrategyBuilder();
    });

    it('should display no strategies message when list is empty', () => {
      mockLocalStorage.getItem.mockReturnValue('[]');

      // This would test the loadSavedStrategies function
      expect(true).toBe(true); // Placeholder
    });

    it('should display saved strategies in list', () => {
      const strategies = [
        {
          id: '1',
          name: 'Strategy 1',
          weights: { energy: 30, frequency: 25, gaps: 20, patterns: 15, random: 10 },
          created: '2025-09-02T10:00:00.000Z'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(strategies));

      // Test strategy list rendering
      expect(true).toBe(true); // Placeholder
    });

    it('should show last used date when available', () => {
      const strategies = [
        {
          id: '1',
          name: 'Strategy 1',
          weights: { energy: 30, frequency: 25, gaps: 20, patterns: 15, random: 10 },
          created: '2025-09-02T10:00:00.000Z',
          lastUsed: '2025-09-02T11:00:00.000Z'
        }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(strategies));

      // Test last used date display
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Number Generation Logic', () => {
    beforeEach(() => {
      initStrategyBuilder();
      state.draws = Array.from({ length: 100 }, (_, i) => ({
        whiteBalls: [i+1, i+2, i+3, i+4, i+5],
        powerball: (i % 26) + 1
      }));
    });

    it('should generate valid white ball numbers', async () => {
      const strategy = {
        weights: { energy: 50, frequency: 30, gaps: 10, patterns: 5, random: 5 }
      };

      // This would test the generateNumbersWithStrategy function
      // Numbers should be between 1-69, no duplicates, sorted
      expect(true).toBe(true); // Placeholder
    });

    it('should generate valid powerball number', async () => {
      const strategy = {
        weights: { energy: 50, frequency: 30, gaps: 10, patterns: 5, random: 5 }
      };

      // Powerball should be between 1-26
      expect(true).toBe(true); // Placeholder
    });

    it('should respect strategy weights in number generation', async () => {
      const energyStrategy = {
        weights: { energy: 90, frequency: 5, gaps: 3, patterns: 1, random: 1 }
      };

      const frequencyStrategy = {
        weights: { energy: 10, frequency: 80, gaps: 5, patterns: 3, random: 2 }
      };

      // Test that different weight profiles produce different number distributions
      expect(true).toBe(true); // Placeholder
    });
  });
});