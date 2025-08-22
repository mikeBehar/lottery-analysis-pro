/**
 * LOTTERY ANALYSIS UTILITIES
 * Version: 1.3.0 | Updated: 2025-08-20 03:45 PM EST
 */

// =============== ENERGY CALCULATION =============== //
function calculateEnergy(numbers) {
  return numbers.map(num => ({
    number: num,
    isPrime: isPrime(num) ? 1 : 0,
    digitalRoot: getDigitalRoot(num),
    mod5: (num % 5) * 0.2,
    gridScore: getGridPositionScore(num),
    energy: 0
  }));
}

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

// =============== SUPPORTING FUNCTIONS =============== //
function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
}

function getDigitalRoot(num) {
  return num - 9 * Math.floor((num - 1) / 9);
}

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