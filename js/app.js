/**
 * LOTTERY ANALYSIS PRO - CORE APPLICATION
 * Version: 2.0.2
 * Last Updated: 2023-11-20
 * Changes:
 * - Fixed loadSavedStrategies reference error
 * - Added proper strategy management
 * - Enhanced error handling
 */

(function() {
  'use strict';

  // ==================== CONSTANTS ==================== //
  const CONFIG = {
    energyWeights: {
      prime: 0.3,
      digitalRoot: 0.2,
      mod5: 0.2,
      gridPosition: 0.3
    }
  };

  // ==================== STATE ==================== //
  const state = {
    draws: [],
    strategies: [],
    currentStrategy: null
  };

  // ==================== DOM ELEMENTS ==================== //
  const elements = {
    uploadInput: document.getElementById('csvUpload'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    energyResults: document.getElementById('energy-results')
  };

  // ==================== INITIALIZATION ==================== //
  document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    initStrategies(); // Renamed from loadSavedStrategies
    console.log('App initialized successfully');
  });

  // ==================== STRATEGY MANAGEMENT ==================== //

  /**
   * Initialize strategies from localStorage
   * @version 1.0.1
   */
  function initStrategies() {
    try {
      const saved = localStorage.getItem('lotteryStrategies');
      if (saved) {
        state.strategies = JSON.parse(saved);
        console.log(`Loaded ${state.strategies.length} strategies`);
      }
    } catch (error) {
      console.error('Strategy loading failed:', error);
    }
  }

  /**
   * Save strategies to localStorage
   * @version 1.0.0
   */
  function saveStrategies() {
    localStorage.setItem(
      'lotteryStrategies',
      JSON.stringify(state.strategies)
    );
  }

  // ==================== CORE FUNCTIONS ==================== //

  function initEventListeners() {
    if (!elements.uploadInput || !elements.analyzeBtn) {
      console.error('Required elements missing');
      return;
    }

    elements.uploadInput.addEventListener('change', handleFileUpload);
    elements.analyzeBtn.addEventListener('click', runAnalysis);
  }

  async function handleFileUpload(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;

      const content = await readFile(file);
      state.draws = parseCSV(content);
      
      elements.analyzeBtn.disabled = false;
      console.log(`Loaded ${state.draws.length} draws`);
    } catch (error) {
      showError('File upload failed', error);
    }
  }

  function runAnalysis() {
    if (state.draws.length === 0) {
      showError('No data', new Error('Please upload CSV file first'));
      return;
    }
    console.log('Running analysis...');
    // Your analysis logic here
  }

  // ==================== UTILITIES ==================== //
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  }

  function parseCSV(content) {
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [mm, dd, yyyy, ...nums] = line.split(',');
        return {
          date: new Date(`${yyyy}-${mm}-${dd}`),
          numbers: nums.slice(0, 6).map(Number),
          powerball: Number(nums[6])
        };
      });
  }

  function showError(title, error) {
    console.error(`${title}:`, error);
    alert(`${title}\n${error.message}`);
  }

  // ==================== ERROR FILTERING ==================== //
  const originalError = console.error;
  console.error = function() {
    const isExternalError = !arguments[0] || 
      (typeof arguments[0] === 'string' && 
       !arguments[0].includes('lottery-analysis'));
    
    if (isExternalError) return;
    originalError.apply(console, arguments);
  };
})();