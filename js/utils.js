/**
 * UTILITY FUNCTIONS FOR LOTTERY ANALYSIS 
 * Version: 1.0.1 | Last Updated: 2023-11-16
 */

// ==================== ENERGY CALCULATION ==================== //
/**
 * Calculates energy signature for lottery numbers
 * @param {number[]} numbers - Array of numbers (1-69)
 * @returns {Object[]} Energy data for each number
 * @version 1.0.1 | Updated: 2023-11-16
 */
function calculateEnergy(numbers) {
  return numbers.map(num => ({
    number: num,
    isPrime: isPrime(num),
    digitalRoot: getDigitalRoot(num),
    mod5: num % 5 * 0.2,
    gridScore: getGridPositionScore(num),
    energy: 0 // Placeholder for weighted sum
  }));
}

// ==================== SUPPORTING FUNCTIONS ==================== //
/** 
 * Checks if a number is prime 
 * @version 1.0.0 | Created: 2023-11-15
 */
function isPrime(num) {
  if (num <= 1) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
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
 * @version 1.0.1 | Updated: 2023-11-16
 */
function getGridPositionScore(num) {
  const grid = [
    [0.3, 0.5, 0.7, 0.5, 0.3],
    // ... expanded grid definition
  ];
  const row = Math.floor((num - 1) / 14);
  const col = (num - 1) % 14;
  return grid[row][col];
}