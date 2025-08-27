/**
 * LOTTERY ANALYSIS UTILITIES
 * Version: 2.4.2 | Updated: 2025-08-21 02:45 PM EST
 * Changes:
 * - Added temporal weighting analysis
 * - Added number pairing/grouping analysis
 * - Enhanced gap analysis with statistical expectations
 * - Maintained all existing energy calculation functions
 */

// =============== ENERGY CALCULATION =============== //
/**
 * Calculates energy signature for lottery numbers
 * @param {number[]} numbers - Array of numbers (1-69)
 * @param {Object} weights - The energy weights from CONFIG.
 * @returns {Object[]} Energy data for each number
 * @version 1.1.0 | Updated: 2024-08-21
 */
function calculateEnergy(numbers, weights) {
  const defaultWeights = {
    prime: 0.3,
    digitalRoot: 0.2,
    mod5: 0.2,
    gridPosition: 0.3
  };
  const effectiveWeights = weights || defaultWeights;
  
  return numbers.map(num => {
    const energyComponents = {
      isPrime: isPrime(num) ? 1 : 0,
      digitalRoot: getDigitalRoot(num),
      mod5: (num % 5) * 0.2,
      gridScore: getGridPositionScore(num)
    };

    const energy = (energyComponents.isPrime * effectiveWeights.prime) +
                   (energyComponents.digitalRoot * effectiveWeights.digitalRoot) +
                   (energyComponents.mod5 * effectiveWeights.mod5) +
                   (energyComponents.gridScore * effectiveWeights.gridPosition);

    return {
      number: num,
      ...energyComponents,
      energy: energy
    };
  });
}

/**
 * Displays energy calculation results in a container
 * @param {Object[]} energyData - Array of energy data objects
 * @param {HTMLElement} container - DOM element to display results in
 * @version 1.0.0 | Created: 2023-11-16
 */
function displayEnergyResults(energyData, container) {
  if (!energyData || energyData.length === 0) {
    container.innerHTML = '<p>No energy data available</p>';
    return;
  }

  const sorted = [...energyData].sort((a, b) => b.energy - a.energy);
  const topNumbers = sorted.slice(0, 15);
  
  container.innerHTML = topNumbers.map(num => `
    <div class="number-card" data-energy="${num.energy.toFixed(2)}">
      <div class="number">${num.number}</div>
      <div class="energy-score">${num.energy.toFixed(2)}</div>
      <div class="energy-breakdown">
        Prime: ${num.isPrime ? '✓' : '✗'} | 
        Root: ${num.digitalRoot} | 
        Mod5: ${(num.mod5 / 0.2).toFixed(0)} | 
        Grid: ${num.gridScore.toFixed(1)}
      </div>
    </div>
  `).join('');
}

// =============== TEMPORAL ANALYSIS =============== //
/**
 * Applies exponential time decay to an array of draws
 * Recent draws are weighted more heavily than older ones
 * @param {Array} draws - Array of draw objects
 * @param {number} decayRate - Decay factor (e.g., 0.9 = 10% decay per draw)
 * @returns {Array} Draws with an added `weight` property
 * @version 1.0.0 | Created: 2024-08-20 07:30 PM EST
 */
function applyTemporalDecay(draws, decayRate = 0.99) {
  if (!draws.length) return [];
  
  const weightedDraws = draws.map((draw, index) => {
    // Most recent draw gets weight = 1, previous gets decayRate, then decayRate^2, etc.
    const weight = Math.pow(decayRate, draws.length - index - 1);
    return { ...draw, weight };
  });
  
  return weightedDraws;
}

// =============== NUMBER RELATIONSHIP ANALYSIS =============== //
/**
 * Analyzes and identifies number pairs that frequently appear together
 * @param {Array} draws - Array of draw objects
 * @param {number} minFrequency - Minimum co-occurrences to consider
 * @returns {Object} Map of number pairs and their frequency count
 * @version 1.0.0 | Created: 2024-08-20 07:30 PM EST
 */
function findNumberPairs(draws, minFrequency = 5) {
  const pairCounts = {};
  
  draws.forEach(draw => {
    const whiteBalls = (draw.whiteBalls || []).slice().sort((a, b) => a - b);
    // Create all possible pairs in the draw
    for (let i = 0; i < whiteBalls.length; i++) {
      for (let j = i + 1; j < whiteBalls.length; j++) {
        const pairKey = `${whiteBalls[i]}-${whiteBalls[j]}`;
        pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
      }
    }
  });
  
  // Filter and sort pairs
  const frequentPairs = Object.entries(pairCounts)
    .filter(([_, count]) => count >= minFrequency)
    .sort((a, b) => b[1] - a[1])
    .reduce((obj, [key, count]) => {
      obj[key] = count;
      return obj;
    }, {});
  
  return frequentPairs;
}

// =============== GAP ANALYSIS =============== //
/**
 * Calculates the expected and actual gaps for each number
 * Identifies truly overdue numbers based on statistical expectation
 * @param {Array} draws - Array of draw objects
 * @returns {Object} Gap analysis for numbers 1-69.
 * @version 1.0.0 | Created: 2024-08-20 07:30 PM EST
 */
function calculateGapAnalysis(draws) {
  const gapData = {};
  
  // Initialize numbers 1-69
  for (let i = 1; i <= 69; i++) {
    gapData[i] = {
      number: i,
      frequency: 0,
      lastSeen: null,
      gaps: [],
      expectedGap: 0,
      currentGap: 0,
      isOverdue: false
    };
  }
  
  // First pass: calculate frequencies and gaps
  draws.forEach((draw, drawIndex) => {
    (draw.whiteBalls || []).forEach(num => {
      if (num >= 1 && num <= 69) {
        if (gapData[num].lastSeen !== null) {
          const gap = drawIndex - gapData[num].lastSeen;
          gapData[num].gaps.push(gap);
        }
        gapData[num].lastSeen = drawIndex;
        gapData[num].frequency++;
      }
    });
  });
  
  // Second pass: calculate expected gap and overdue status
  Object.values(gapData).forEach(data => {
    if (data.gaps.length > 0) {
      data.expectedGap = data.gaps.reduce((sum, gap) => sum + gap, 0) / data.gaps.length;
      data.currentGap = draws.length - data.lastSeen;
      data.isOverdue = data.currentGap > data.expectedGap * 1.5; // 50% beyond expected
    }
  });
  
  return gapData;
}

// =============== SUPPORTING FUNCTIONS =============== //
/** 
 * Checks if a number is prime 
 * @version 1.0.0 | Created: 2023-11-15
 */
function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
}

/** 
 * Calculates digital root (recursive digit sum) 
 * @version 1.0.0 | Created: 2023-11-15
 */
function getDigitalRoot(num) {
  return num - 9 * Math.floor((num - 1) / 9);
}

/** 
 * Scores spatial position on a 5x14 grid 
 * @version 1.0.4 | Updated: 2024-08-20 07:30 PM EST
 */
function getGridPositionScore(num) {
  const GRID = [
    [0.3, 0.5, 0.7, 0.9, 1.0, 0.9, 0.7, 0.5, 0.3, 0.5, 0.7, 0.9, 1.0, 0.9],
    [0.5, 0.7, 0.9, 1.0, 0.9, 0.7, 0.5, 0.7, 0.9, 1.0, 0.9, 0.7, 0.5, 0.7],
    [0.7, 0.9, 1.0, 0.9, 0.7, 0.5, 0.3, 0.5, 0.7, 0.9, 1.0, 0.9, 0.7, 0.5],
    [0.5, 0.7, 0.9, 1.0, 0.9, 0.7, 0.5, 0.7, 0.9, 1.0, 0.9, 0.7, 0.5, 0.7],
    [0.3, 0.5, 0.7, 0.9, 1.0, 0.9, 0.7, 0.5, 0.3, 0.5, 0.7, 0.9, 1.0, 0.9]
  ];
  
  if (num < 1 || num > 70) return 0.5;
  const row = Math.floor((num - 1) / 14);
  const col = (num - 1) % 14;
  return GRID[row]?.[col] ?? 0.5;
}

// =============== EXPORTS =============== //
// Note: If using ES6 modules, add export statements
// export {
//   calculateEnergy, displayEnergyResults,
//   applyTemporalDecay, findNumberPairs, calculateGapAnalysis,
//   isPrime, getDigitalRoot, getGridPositionScore
// };

// =============== TEMPORAL WEIGHTING =============== //
/**
 * Applies exponential time decay to draws (recent draws weighted higher)
 * @param {Array} draws - Array of draw objects with date property
 * @param {number} decayRate - Decay rate (0-1), higher = faster decay
 * @returns {Array} Draws with temporal weights added
 * @version 1.0.0 | Created: 2024-08-20
 */
function applyTemporalWeighting(draws, decayRate = 0.1) {
  if (!draws.length) return draws;
  
  const mostRecentDate = new Date(Math.max(...draws.map(d => d.date.getTime())));
  const maxAgeDays = (mostRecentDate - new Date(Math.min(...draws.map(d => d.date.getTime())))) / (1000 * 60 * 60 * 24);
  
  return draws.map(draw => {
    const ageDays = (mostRecentDate - draw.date) / (1000 * 60 * 60 * 24);
    const normalizedAge = ageDays / maxAgeDays;
    const weight = Math.exp(-decayRate * normalizedAge * 10); // Exponential decay
    return {
      ...draw,
      temporalWeight: weight,
      weightedNumbers: (draw.whiteBalls || []).map(num => ({
        number: num,
        weight: weight
      }))
    };
  });
}

/**
 * Calculates frequency with temporal weighting
 * @param {Array} weightedDraws - Draws with temporal weights
 * @returns {Array} Frequency map with temporal weighting
 */
function calculateTemporalFrequency(weightedDraws) {
  const frequency = new Array(70).fill(0);
  weightedDraws.forEach(draw => {
    draw.weightedNumbers.forEach(weightedNum => {
      if (weightedNum.number >= 1 && weightedNum.number <= 69) {
        frequency[weightedNum.number] += weightedNum.weight;
      }
    });
  });
  return frequency;
}

// Make temporal functions available globally
if (typeof window !== 'undefined') {
  window.applyTemporalWeighting = applyTemporalWeighting;
  window.calculateTemporalFrequency = calculateTemporalFrequency;
}