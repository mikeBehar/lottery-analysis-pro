/*
**  Strategy Class
**  Version: 1.0.2 | Modified: 2023-11-17
**  Changes: Added strategy saving to localStorage.
*/

/**
 * STRATEGY MANAGER v1.0.1
 * Fixed: Syntax error in localStorage call
 * Updated: 2023-11-20
 */
class Strategy {
  constructor(name, weights) {
    this.name = name;
    this.weights = weights;
  }

  save() {
    const strategies = JSON.parse(localStorage.getItem('strategies') || '[]');
    strategies.push(this);
    localStorage.setItem('strategies', JSON.stringify(strategies)); // Fixed line
  }
}