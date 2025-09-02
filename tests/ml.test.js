import LotteryML from '../js/ml.js';

describe('LotteryML', () => {
  let ml;

  beforeEach(() => {
    ml = new LotteryML();
  });

  describe('calculateFrequency', () => {
    it('should correctly calculate the frequency of numbers from draws', () => {
      const draws = [
        { numbers: [1, 2, 3, 4, 5] },
        { numbers: [1, 2, 3, 6, 7] },
        { numbers: [1, 2, 8, 9, 10] },
      ];

      const frequency = ml.calculateFrequency(draws);

      // The frequency array is 1-indexed for numbers, so index 0 is unused.
      expect(frequency[1]).toBe(3);
      expect(frequency[2]).toBe(3);
      expect(frequency[3]).toBe(2);
      expect(frequency[4]).toBe(1);
      expect(frequency[5]).toBe(1);
      expect(frequency[6]).toBe(1);
      expect(frequency[7]).toBe(1);
      expect(frequency[8]).toBe(1);
      expect(frequency[9]).toBe(1);
      expect(frequency[10]).toBe(1);
      expect(frequency[11]).toBe(0); // A number that never appeared
    });

    it('should return an array of zeros if draws are empty', () => {
      const draws = [];
      const frequency = ml.calculateFrequency(draws);
      // Expect a zero-filled array of length 70
      expect(frequency).toEqual(new Array(70).fill(0));
    });

    it('should handle draws with missing or null numbers property', () => {
      const draws = [
        { numbers: [1, 2, 3] },
        { }, // Missing 'numbers'
        { numbers: null }, // Null 'numbers'
        { numbers: [1, 4, 5] },
      ];
      const frequency = ml.calculateFrequency(draws);
      expect(frequency[1]).toBe(2);
      expect(frequency[2]).toBe(1);
      expect(frequency[3]).toBe(1);
      expect(frequency[4]).toBe(1);
      expect(frequency[5]).toBe(1);
    });
  });

  describe('getFrequencyBasedPrediction', () => {
    it('should return the top 10 numbers, sorted, based on frequency', () => {
      // Create a frequency map where some numbers are clearly more frequent
      const frequencyMap = new Array(70).fill(0);
      frequencyMap[10] = 5;
      frequencyMap[20] = 8;
      frequencyMap[30] = 10;
      frequencyMap[40] = 2;
      frequencyMap[50] = 9;
      frequencyMap[60] = 7;
      frequencyMap[5] = 6;
      frequencyMap[15] = 12;
      frequencyMap[25] = 11;
      frequencyMap[35] = 1;
      frequencyMap[45] = 13;
      frequencyMap[55] = 4;

      const prediction = ml.getFrequencyBasedPrediction(frequencyMap);

      // Expected numbers are the ones with the highest frequency, sorted numerically
      const expected = [15, 25, 45, 30, 50, 20, 60, 5, 10, 55].sort((a, b) => a - b);
      
      expect(prediction).toEqual(expected);
    });
  });

  describe('getFallbackPrediction', () => {
    it('should return a specific set of common numbers', () => {
      const prediction = ml.getFallbackPrediction();
      expect(prediction.numbers).toEqual([7, 19, 23, 31, 42, 56, 11, 15, 44, 58]);
      expect(prediction.model).toBe('fallback');
    });
  });

  describe('valueToNumbers', () => {
    it('should convert a continuous value to a plausible set of discrete numbers', () => {
      const value = 33.7;
      const numbers = ml.valueToNumbers(value);
      
      // Should return an array of valid lottery numbers
      expect(numbers).toBeInstanceOf(Array);
      expect(numbers.length).toBeGreaterThan(0);
      expect(numbers.length).toBeLessThanOrEqual(10);
      numbers.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(69);
      });
      
      // Should remove duplicates
      const uniqueNumbers = [...new Set(numbers)];
      expect(numbers.length).toBe(uniqueNumbers.length);
      
      // Should use default offsets [0, 7, 13, 19, 23, 11, 17, 29, 5, 37]
      // base = Math.round(33.7) = 34, with offset 0: (34 + 0) % 69 + 1 = 35
      expect(numbers).toContain(35);
    });
    
    it('should accept custom offsets', () => {
      const customOffsets = [0, 5, 10];
      const numbers = ml.valueToNumbers(10, customOffsets);
      
      expect(numbers.length).toBeLessThanOrEqual(customOffsets.length);
      numbers.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(69);
      });
    });
  });
});