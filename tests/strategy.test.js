import Strategy from '../js/strategy.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    clear() {
      store = {};
    },
    removeItem(key) {
      delete store[key];
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Strategy', () => {

  beforeEach(() => {
    // Clear the mock localStorage before each test
    localStorage.clear();
  });

  it('should construct a new strategy object correctly', () => {
    const weights = { factorA: 0.5, factorB: 0.5 };
    const strategy = new Strategy('Test Strategy', weights);

    expect(strategy.name).toBe('Test Strategy');
    expect(strategy.weights).toEqual(weights);
    expect(strategy.version).toBeDefined();
    expect(strategy.created).toBeDefined();
  });

  it('should evaluate a score based on number data and weights', () => {
    const weights = { prime: 0.7, digitalRoot: 0.3 };
    const strategy = new Strategy('Test Strategy', weights);
    const numberData = { prime: 1, digitalRoot: 5, otherFactor: 10 };

    // Score should be (1 * 0.7) + (5 * 0.3) = 0.7 + 1.5 = 2.2
    const score = strategy.evaluate(numberData);
    expect(score).toBeCloseTo(2.2);
  });

  it('should save a new strategy to localStorage', () => {
    const weights = { factorA: 1 };
    const strategy = new Strategy('New Strategy', weights);
    strategy.save();

    const savedStrategies = JSON.parse(localStorage.getItem('lotteryStrategies'));
    expect(savedStrategies.length).toBe(1);
    expect(savedStrategies[0].name).toBe('New Strategy');
  });

  it('should update an existing strategy in localStorage', () => {
    const oldWeights = { factorA: 1 };
    const oldStrategy = new Strategy('Existing Strategy', oldWeights);
    oldStrategy.save();

    const newWeights = { factorA: 0.8, factorB: 0.2 };
    const updatedStrategy = new Strategy('Existing Strategy', newWeights);
    updatedStrategy.save();

    const savedStrategies = JSON.parse(localStorage.getItem('lotteryStrategies'));
    expect(savedStrategies.length).toBe(1);
    expect(savedStrategies[0].weights).toEqual(newWeights);
  });

  it('should load all strategies from localStorage', () => {
    const strategies = [
      new Strategy('Strategy 1', { a: 1 }),
      new Strategy('Strategy 2', { b: 1 })
    ];
    localStorage.setItem('lotteryStrategies', JSON.stringify(strategies));

    const loaded = Strategy.loadAll();
    expect(loaded.length).toBe(2);
    expect(loaded[1].name).toBe('Strategy 2');
  });

  it('should delete a strategy by name from localStorage', () => {
    const strategies = [
      new Strategy('To Keep', { a: 1 }),
      new Strategy('To Delete', { b: 1 })
    ];
    localStorage.setItem('lotteryStrategies', JSON.stringify(strategies));

    Strategy.delete('To Delete');

    const remaining = Strategy.loadAll();
    expect(remaining.length).toBe(1);
    expect(remaining[0].name).toBe('To Keep');
  });

  it('should get a strategy by name from localStorage', () => {
    const strategies = [
      new Strategy('First', { a: 1 }),
      new Strategy('Second', { b: 1 })
    ];
    localStorage.setItem('lotteryStrategies', JSON.stringify(strategies));

    const found = Strategy.getByName('Second');
    expect(found.name).toBe('Second');
  });

});