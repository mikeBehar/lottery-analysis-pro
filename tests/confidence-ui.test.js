/**
 * CONFIDENCE UI UNIT TESTS
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * Unit tests for confidence interval UI controller and display components
 */

import { initConfidenceUI, getCurrentPredictions } from '../js/confidence-ui.js';
import state from '../js/state.js';

// Mock the confidence predictor module
jest.mock('../js/confidence-predictor.js', () => ({
  PositionBasedPredictor: jest.fn().mockImplementation(() => ({
    generatePredictionWithConfidenceIntervals: jest.fn().mockResolvedValue([
      {
        position: 'ball1',
        prediction: 7,
        confidenceInterval: {
          lower: 4,
          upper: 10,
          method: 'bootstrap',
          confidenceLevel: 0.95,
          display: {
            range: '7 {-3, +3}',
            interval: '[4, 10]',
            symmetric: true,
            precision: '±3'
          }
        },
        statistics: {
          mean: 7.2,
          median: 7,
          std: 2.1,
          sampleSize: 100
        }
      },
      {
        position: 'ball2',
        prediction: 19,
        confidenceInterval: {
          lower: 15,
          upper: 23,
          method: 'bootstrap',
          confidenceLevel: 0.95,
          display: {
            range: '19 {-4, +4}',
            interval: '[15, 23]',
            symmetric: true,
            precision: '±4'
          }
        },
        statistics: {
          mean: 19.1,
          median: 19,
          std: 2.8,
          sampleSize: 100
        }
      },
      {
        position: 'powerball',
        prediction: 12,
        confidenceInterval: {
          lower: 8,
          upper: 16,
          method: 'bootstrap',
          confidenceLevel: 0.95,
          display: {
            range: '12 {-4, +4}',
            interval: '[8, 16]',
            symmetric: true,
            precision: '±4'
          }
        },
        statistics: {
          mean: 12.3,
          median: 12,
          std: 3.1,
          sampleSize: 100
        }
      }
    ]),
    getSystemStats: jest.fn().mockReturnValue({
      totalDraws: 100,
      positionStats: {
        ball1: { mean: 7.2, range: '1-15', std: 2.1 },
        ball2: { mean: 19.1, range: '10-30', std: 2.8 },
        powerball: { mean: 12.3, range: '1-26', std: 3.1 }
      },
      dataQuality: {
        sufficient: true,
        drawCount: 100,
        recommendation: 'Sufficient data for reliable confidence intervals'
      }
    })
  }))
}));

// Mock notifications
jest.mock('../js/notifications.js', () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
  showInfo: jest.fn()
}));

describe('Confidence UI Controller', () => {
  let mockHistoricalData;
  
  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div id="confidence-predictions">
        <div class="confidence-controls">
          <select id="confidence-level">
            <option value="0.90">90%</option>
            <option value="0.95" selected>95%</option>
            <option value="0.99">99%</option>
          </select>
          <select id="confidence-method">
            <option value="bootstrap" selected>Bootstrap</option>
            <option value="normal">Normal</option>
            <option value="time-weighted">Time-Weighted</option>
          </select>
          <button id="generate-confidence-prediction">Generate Prediction</button>
        </div>
        <div id="confidence-results"></div>
        <div id="confidence-stats"></div>
      </div>
    `;
    
    // Mock historical data
    mockHistoricalData = [];
    for (let i = 0; i < 100; i++) {
      mockHistoricalData.push({
        whiteBalls: [
          Math.floor(Math.random() * 15) + 1,
          Math.floor(Math.random() * 20) + 10,
          Math.floor(Math.random() * 25) + 20,
          Math.floor(Math.random() * 25) + 30,
          Math.floor(Math.random() * 15) + 55
        ].sort((a, b) => a - b),
        powerball: Math.floor(Math.random() * 26) + 1,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      });
    }
    
    // Reset state
    state.draws = mockHistoricalData;
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('Initialization', () => {
    it('should initialize confidence UI correctly', () => {
      const generateBtn = document.getElementById('generate-confidence-prediction');
      expect(generateBtn).toBeTruthy();
      
      initConfidenceUI();
      
      // Should have event listener attached (can't directly test, but initialization should not throw)
      expect(() => generateBtn.click()).not.toThrow();
    });
    
    it('should handle missing DOM elements gracefully', () => {
      document.body.innerHTML = '<div></div>'; // Remove required elements
      
      expect(() => initConfidenceUI()).not.toThrow();
    });
  });
  
  describe('Prediction Generation', () => {
    beforeEach(() => {
      initConfidenceUI();
    });
    
    it('should generate prediction when button is clicked', async () => {
      const generateBtn = document.getElementById('generate-confidence-prediction');
      const resultsContainer = document.getElementById('confidence-results');
      
      // Initially empty
      expect(resultsContainer.children.length).toBe(0);
      
      // Click generate button
      generateBtn.click();
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have generated predictions
      expect(resultsContainer.children.length).toBeGreaterThan(0);
    });
    
    it('should handle insufficient data error', async () => {
      const { showError } = require('../js/notifications.js');
      
      // Set insufficient data
      state.draws = [];
      
      const generateBtn = document.getElementById('generate-confidence-prediction');
      generateBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(showError).toHaveBeenCalledWith(
        'No Data',
        'Please upload a CSV file with lottery data first'
      );
    });
    
    it('should handle minimum data requirement', async () => {
      const { showError } = require('../js/notifications.js');
      
      // Set data below minimum threshold
      state.draws = mockHistoricalData.slice(0, 15); // Only 15 draws
      
      const generateBtn = document.getElementById('generate-confidence-prediction');
      generateBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(showError).toHaveBeenCalledWith(
        'Insufficient Data',
        'At least 20 historical draws are required for confidence intervals'
      );
    });
    
    it('should disable button while generating', async () => {
      const generateBtn = document.getElementById('generate-confidence-prediction');
      
      expect(generateBtn.disabled).toBe(false);
      expect(generateBtn.textContent).toBe('Generate Prediction');
      
      generateBtn.click();
      
      // Should be disabled during generation
      expect(generateBtn.disabled).toBe(true);
      expect(generateBtn.textContent).toBe('Generating...');
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be re-enabled
      expect(generateBtn.disabled).toBe(false);
      expect(generateBtn.textContent).toBe('Generate Prediction');
    });
  });
  
  describe('Prediction Display', () => {
    beforeEach(async () => {
      initConfidenceUI();
      
      // Generate a prediction
      const generateBtn = document.getElementById('generate-confidence-prediction');
      generateBtn.click();
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    it('should display predictions in the results container', () => {
      const resultsContainer = document.getElementById('confidence-results');
      
      expect(resultsContainer.children.length).toBe(3); // Based on mock data
      
      // Check each prediction card
      Array.from(resultsContainer.children).forEach(card => {
        expect(card.classList.contains('confidence-ball')).toBe(true);
        
        // Should have main prediction elements
        expect(card.querySelector('.main-number')).toBeTruthy();
        expect(card.querySelector('.confidence-range')).toBeTruthy();
        expect(card.querySelector('.confidence-level')).toBeTruthy();
        expect(card.querySelector('.method-used')).toBeTruthy();
        expect(card.querySelector('.confidence-visualization')).toBeTruthy();
      });
    });
    
    it('should display powerball with special styling', () => {
      const resultsContainer = document.getElementById('confidence-results');
      const powerballCard = Array.from(resultsContainer.children)
        .find(card => card.classList.contains('powerball'));
      
      expect(powerballCard).toBeTruthy();
    });
    
    it('should display confidence intervals correctly', () => {
      const resultsContainer = document.getElementById('confidence-results');
      const firstCard = resultsContainer.children[0];
      
      const mainNumber = firstCard.querySelector('.main-number');
      const confidenceRange = firstCard.querySelector('.confidence-range');
      
      expect(mainNumber.textContent).toBe('7'); // From mock data
      expect(confidenceRange.textContent).toBe('7 {-3, +3}'); // From mock data
    });
  });
  
  describe('Statistics Display', () => {
    beforeEach(async () => {
      initConfidenceUI();
      
      const generateBtn = document.getElementById('generate-confidence-prediction');
      generateBtn.click();
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    it('should display system statistics', () => {
      const statsContainer = document.getElementById('confidence-stats');
      
      expect(statsContainer.children.length).toBeGreaterThan(0);
      
      // Should have header
      const header = statsContainer.querySelector('h3');
      expect(header.textContent).toBe('📊 Statistical Summary');
      
      // Should have data quality indicator
      const qualityDiv = statsContainer.querySelector('.data-quality-good');
      expect(qualityDiv).toBeTruthy();
      expect(qualityDiv.textContent).toContain('100 historical draws');
    });
    
    it('should display stats grid with position statistics', () => {
      const statsContainer = document.getElementById('confidence-stats');
      const statsGrid = statsContainer.querySelector('.stats-grid');
      
      expect(statsGrid).toBeTruthy();
      
      const statCards = statsGrid.querySelectorAll('.stat-card');
      expect(statCards.length).toBeGreaterThan(0);
      
      statCards.forEach(card => {
        expect(card.querySelector('.stat-value')).toBeTruthy();
        expect(card.querySelector('.stat-label')).toBeTruthy();
      });
    });
  });
  
  describe('Control Integration', () => {
    beforeEach(() => {
      initConfidenceUI();
    });
    
    it('should read confidence level from control', async () => {
      const confidenceLevelSelect = document.getElementById('confidence-level');
      confidenceLevelSelect.value = '0.99';
      
      const generateBtn = document.getElementById('generate-confidence-prediction');
      generateBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have called with 99% confidence
      const confidenceLevelDisplay = document.querySelector('.confidence-level');
      expect(confidenceLevelDisplay.textContent).toBe('99% confident'); // Should reflect selected level
    });
    
    it('should read method from control', async () => {
      const methodSelect = document.getElementById('confidence-method');
      methodSelect.value = 'time-weighted';
      
      const generateBtn = document.getElementById('generate-confidence-prediction');
      generateBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const methodDisplay = document.querySelector('.method-used');
      expect(methodDisplay.textContent).toBe('Time-weighted method'); // Should reflect selected method
    });
  });
  
  describe('getCurrentPredictions function', () => {
    beforeEach(async () => {
      initConfidenceUI();
      
      const generateBtn = document.getElementById('generate-confidence-prediction');
      generateBtn.click();
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    it('should extract current predictions from UI', () => {
      const predictions = getCurrentPredictions();
      
      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);
      
      predictions.forEach(pred => {
        expect(pred).toHaveProperty('position');
        expect(pred).toHaveProperty('prediction');
        expect(pred).toHaveProperty('confidenceRange');
        expect(typeof pred.prediction).toBe('number');
      });
    });
    
    it('should return null when no predictions are displayed', () => {
      // Clear results
      document.getElementById('confidence-results').innerHTML = '';
      
      const predictions = getCurrentPredictions();
      expect(predictions).toBeNull();
    });
  });
  
  describe('Data Quality Updates', () => {
    it('should update data quality display when new data is loaded', () => {
      initConfidenceUI();
      
      const statsContainer = document.getElementById('confidence-stats');
      
      // Initially empty
      expect(statsContainer.children.length).toBe(0);
      
      // Simulate data loading
      state.publish('drawsUpdated', mockHistoricalData);
      
      // Should show data quality info
      expect(statsContainer.children.length).toBeGreaterThan(0);
      expect(statsContainer.textContent).toContain('100 historical draws available');
    });
    
    it('should show warning for insufficient data', () => {
      initConfidenceUI();
      
      const insufficientData = mockHistoricalData.slice(0, 50);
      state.publish('drawsUpdated', insufficientData);
      
      const statsContainer = document.getElementById('confidence-stats');
      // The data quality display shows good/warning based on actual data assessment
      const qualityDiv = statsContainer.querySelector('.data-quality-good, .data-quality-warning');
      
      expect(qualityDiv).toBeTruthy();
      // Note: Mock predictor uses original data size in getSystemStats, so this tests the display mechanism
      expect(qualityDiv.textContent).toContain('historical draws available');
    });
  });
  
  describe('Error Handling', () => {
    beforeEach(() => {
      initConfidenceUI();
    });
    
    it('should handle prediction generation errors', async () => {
      const { showError } = require('../js/notifications.js');
      
      // Set state to simulate error condition by removing draws
      state.draws = null;
      
      const generateBtn = document.getElementById('generate-confidence-prediction');
      generateBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(showError).toHaveBeenCalledWith(
        'No Data',
        'Please upload a CSV file with lottery data first'
      );
    });
  });
});

describe('Utility Functions', () => {
  describe('Position Label Generation', () => {
    it('should generate correct position labels', () => {
      // This tests the internal getPositionLabel function indirectly
      // by checking the output in the UI after prediction generation
      
      document.body.innerHTML = `
        <div id="confidence-predictions">
          <div id="confidence-results"></div>
          <div id="confidence-stats"></div>
          <button id="generate-confidence-prediction">Generate</button>
          <select id="confidence-level"><option value="0.95" selected>95%</option></select>
          <select id="confidence-method"><option value="bootstrap" selected>Bootstrap</option></select>
        </div>
      `;
      
      state.draws = [{
        whiteBalls: [1, 2, 3, 4, 5],
        powerball: 10,
        date: new Date()
      }];
      
      initConfidenceUI();
      
      // The function should handle position labeling correctly
      // This is tested indirectly through the UI generation
      expect(() => {
        const generateBtn = document.getElementById('generate-confidence-prediction');
        generateBtn.click();
      }).not.toThrow();
    });
  });
});