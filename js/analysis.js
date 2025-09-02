/**
 * Identify the most overdue numbers (not drawn for the longest time).
 * @param {Array} draws - Array of draw objects with whiteBalls
 * @param {number} maxNumber - Maximum number in the lottery (e.g., 69)
 * @param {number} topN - Number of overdue numbers to return (default 5)
 * @returns {Array} Array of most overdue numbers
 */
export function getOverdueNumbers(draws, maxNumber = 69) {
  // Track the last seen index for each number
  const lastSeen = Array(maxNumber).fill(-1);
  for (let i = draws.length - 1; i >= 0; i--) {
    const draw = draws[i];
    if (Array.isArray(draw.whiteBalls)) {
      draw.whiteBalls.forEach(n => {
        if (n > 0 && n <= maxNumber && lastSeen[n - 1] === -1) {
          lastSeen[n - 1] = i;
        }
      });
    }
  }
  // Numbers with -1 have never been drawn (most overdue)
  const numbered = lastSeen.map((idx, n) => ({ number: n + 1, lastSeen: idx }));
  // Sort by lastSeen ascending (-1 first, then oldest)
  return numbered.slice().sort((a, b) => a.lastSeen - b.lastSeen).map(x => x.number);
}
/**
 * Identify hot and cold numbers from draws.
 * @param {Array} draws - Array of draw objects with whiteBalls
 * @param {number} maxNumber - Maximum number in the lottery (e.g., 69)
 * @param {number} recentCount - Only consider the most recent N draws (optional)
 * @param {number} topN - Number of hot/cold numbers to return (default 5)
 * @returns {Object} { hot: [numbers], cold: [numbers] }
 */
export function getHotAndColdNumbers(draws, maxNumber = 69, recentCount = null, topN = 5) {
  const useDraws = recentCount ? draws.slice(-recentCount) : draws;
  const freq = Array(maxNumber).fill(0);
  useDraws.forEach((draw, i) => {
    if (Array.isArray(draw.whiteBalls)) {
      draw.whiteBalls.forEach(n => {
        if (n > 0 && n <= maxNumber) freq[n - 1]++;
      });
    } else {
      // Debug: log if whiteBalls is missing or not an array
      console.warn(`[getHotAndColdNumbers] Draw at index ${i} missing or invalid whiteBalls:`, draw.whiteBalls);
    }
  });
  // Debug: log frequency array and draws
  console.log('[getHotAndColdNumbers] Frequency array:', freq);
  console.log('[getHotAndColdNumbers] Input draws sample:', useDraws.slice(0, 3));
  // Pair each number with its frequency
  const numbered = freq.map((count, idx) => ({ number: idx + 1, count }));
  // Hot: topN with highest frequency (excluding zeros)
  const hot = numbered
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
    .map(x => x.number);
  // Cold: topN with lowest frequency, always including zeros first
  const cold = numbered
    .sort((a, b) => a.count - b.count || a.number - b.number)
    .slice(0, topN)
    .map(x => x.number);
  console.log('[getHotAndColdNumbers] Hot:', hot, 'Cold:', cold);
  return { hot, cold };
}
// js/analysis.js
// Core machine learning and statistical analysis logic for lottery analysis

/**
 * Calculate frequency of each number in the draws.
 * @param {Array} draws - Array of draw objects with whiteBalls and powerball.
 * @param {number} maxNumber - Maximum number in the lottery (e.g., 69 for Powerball)
 * @returns {Object} Frequency table for whiteBalls and powerball
 */
export function calculateFrequency(draws, maxNumber = 69) {
  const freq = { whiteBalls: Array(maxNumber).fill(0), powerball: {} };
  draws.forEach(draw => {
    if (Array.isArray(draw.whiteBalls)) {
      draw.whiteBalls.forEach(n => {
        if (n > 0 && n <= maxNumber) freq.whiteBalls[n - 1]++;
      });
    }
    if (draw.powerball) {
      freq.powerball[draw.powerball] = (freq.powerball[draw.powerball] || 0) + 1;
    }
  });
  return freq;
}

/**
 * Find most common number pairs (basic pattern mining)
 * @param {Array} draws - Array of draw objects
 * @returns {Object} Pair frequency table
 */
export function findCommonPairs(draws) {
  const pairCounts = {};
  draws.forEach(draw => {
    if (Array.isArray(draw.whiteBalls)) {
      const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const key = `${sorted[i]}-${sorted[j]}`;
          pairCounts[key] = (pairCounts[key] || 0) + 1;
        }
      }
    }
  });
  return pairCounts;
}


/**
 * Analyze gaps between consecutive numbers in each draw.
 * @param {Array} draws - Array of draw objects with whiteBalls
 * @returns {Object} Gap frequency table
 */
export function gapAnalysis(draws) {
  const gapCounts = {};
  draws.forEach(draw => {
    if (Array.isArray(draw.whiteBalls)) {
      const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i] - sorted[i - 1];
        gapCounts[gap] = (gapCounts[gap] || 0) + 1;
      }
    }
  });
  return gapCounts;
}
