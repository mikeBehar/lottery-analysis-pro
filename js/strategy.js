/**
 * STRATEGY MANAGER
 * Version: 2.0.0 | Updated: 2025-08-20 02:30 PM EST
 * Complete strategy management with localStorage persistence
 */

class Strategy {
  constructor(name, weights) {
    this.name = name;
    this.weights = weights;
    this.version = "2.0.0";
    this.created = new Date().toISOString();
  }

  evaluate(numberData) {
    return Object.entries(this.weights).reduce((score, [factor, weight]) => {
      return score + (numberData[factor] * weight);
    }, 0);
  }

  save() {
    try {
      const strategies = Strategy.loadAll();
      const existingIndex = strategies.findIndex(s => s.name === this.name);
      
      if (existingIndex >= 0) {
        strategies[existingIndex] = this; // Update existing
      } else {
        strategies.push(this); // Add new
      }
      
      localStorage.setItem('lotteryStrategies', JSON.stringify(strategies));
      return true;
    } catch (error) {
      console.error('Failed to save strategy:', error);
      return false;
    }
  }

  static loadAll() {
    try {
      return JSON.parse(localStorage.getItem('lotteryStrategies') || '[]');
    } catch (error) {
      console.error('Failed to load strategies:', error);
      return [];
    }
  }

  static delete(name) {
    try {
      const strategies = Strategy.loadAll();
      const filtered = strategies.filter(s => s.name !== name);
      localStorage.setItem('lotteryStrategies', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to delete strategy:', error);
      return false;
    }
  }

  static getByName(name) {
    return Strategy.loadAll().find(s => s.name === name);
  }
}