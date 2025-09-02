import LotteryML from '../js/ml.js';

describe('ML Parameterization', () => {
  let ml;

  beforeEach(() => {
    ml = new LotteryML();
  });

  describe('valueToNumbers with custom offsets', () => {
    it('should use default offsets when none provided', () => {
      const numbers = ml.valueToNumbers(35);
      
      expect(numbers).toBeInstanceOf(Array);
      expect(numbers.length).toBeGreaterThan(0);
      expect(numbers.length).toBeLessThanOrEqual(10);
      
      // All numbers should be in valid range
      numbers.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(69);
      });
      
      // Should use default offsets [0, 7, 13, 19, 23, 11, 17, 29, 5, 37]
      expect(numbers).toContain(36); // base (35) + 1 (after modulo conversion)
    });

    it('should use custom offsets when provided', () => {
      const customOffsets = [0, 5, 10, 15, 20];
      const numbers = ml.valueToNumbers(10, customOffsets);
      
      expect(numbers.length).toBeLessThanOrEqual(customOffsets.length);
      
      // Should contain numbers based on custom offsets
      const expectedNumbers = customOffsets.map(offset => {
        const num = (10 + offset) % 69 + 1;
        return Math.max(1, Math.min(69, num));
      });
      
      expectedNumbers.forEach(expectedNum => {
        expect(numbers).toContain(expectedNum);
      });
    });

    it('should handle edge case values', () => {
      // Test with value 0
      const numbers1 = ml.valueToNumbers(0, [0, 1, 2]);
      expect(numbers1).toBeInstanceOf(Array);
      numbers1.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(69);
      });

      // Test with large value
      const numbers2 = ml.valueToNumbers(100, [0, 1, 2]);
      expect(numbers2).toBeInstanceOf(Array);
      numbers2.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(69);
      });
    });

    it('should remove duplicates from generated numbers', () => {
      // Use offsets that would create duplicates
      const offsetsWithDuplicates = [0, 69, 138]; // All would result in same number after modulo
      const numbers = ml.valueToNumbers(35, offsetsWithDuplicates);
      
      const uniqueNumbers = [...new Set(numbers)];
      expect(numbers.length).toBe(uniqueNumbers.length);
    });

    it('should limit output to 10 numbers maximum', () => {
      const manyOffsets = Array.from({length: 20}, (_, i) => i);
      const numbers = ml.valueToNumbers(35, manyOffsets);
      
      expect(numbers.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Optimized offsets management', () => {
    it('should set and get optimized offsets', () => {
      const optimizedOffsets = [1, 8, 15, 22, 29, 36, 43, 50];
      
      ml.setOptimizedOffsets(optimizedOffsets);
      const currentOffsets = ml.getCurrentOffsets();
      
      expect(currentOffsets).toEqual(optimizedOffsets);
    });

    it('should return default offsets when no optimization set', () => {
      const currentOffsets = ml.getCurrentOffsets();
      
      expect(currentOffsets).toEqual([0, 7, 13, 19, 23, 11, 17, 29, 5, 37]);
    });

    it('should use optimized offsets in predictions when set', async () => {
      const optimizedOffsets = [2, 4, 6, 8, 10];
      ml.setOptimizedOffsets(optimizedOffsets);
      
      // Create mock data for LSTM prediction test
      const mockPredict = jest.fn().mockReturnValue({
        dataSync: () => [35] // Mock TensorFlow prediction result
      });
      
      ml.model = { predict: mockPredict };
      
      const mockInputs = {}; // Mock preprocessed inputs
      jest.spyOn(ml, 'preprocessData').mockReturnValue({ inputs: mockInputs });
      
      const prediction = await ml.predictWithLSTM([{whiteBalls: [1, 2, 3, 4, 5]}]);
      
      expect(prediction.offsets).toEqual(optimizedOffsets);
    });
  });

  describe('LSTM prediction with custom offsets', () => {
    it('should include offset information in LSTM predictions', async () => {
      // Mock the TensorFlow model
      const mockPredict = jest.fn().mockReturnValue({
        dataSync: () => [42] // Mock prediction value
      });
      
      ml.model = { predict: mockPredict };
      
      // Mock preprocessData to return valid inputs
      jest.spyOn(ml, 'preprocessData').mockReturnValue({ 
        inputs: {} // Mock tensor inputs
      });
      
      const sampleDraws = Array(50).fill().map(() => ({
        whiteBalls: [1, 2, 3, 4, 5]
      }));
      
      const prediction = await ml.predictWithLSTM(sampleDraws);
      
      expect(prediction).toHaveProperty('offsets');
      expect(prediction.offsets).toEqual(ml.getCurrentOffsets());
      expect(prediction).toHaveProperty('whiteBalls');
      expect(prediction.whiteBalls.length).toBe(5); // Should limit to 5 for white balls
    });

    it('should work with custom optimized offsets in LSTM', async () => {
      const customOffsets = [3, 7, 11, 17, 23, 31, 37, 41];
      ml.setOptimizedOffsets(customOffsets);
      
      // Mock the TensorFlow model
      const mockPredict = jest.fn().mockReturnValue({
        dataSync: () => [25]
      });
      
      ml.model = { predict: mockPredict };
      jest.spyOn(ml, 'preprocessData').mockReturnValue({ inputs: {} });
      
      const sampleDraws = Array(50).fill().map(() => ({
        whiteBalls: [10, 20, 30, 40, 50]
      }));
      
      const prediction = await ml.predictWithLSTM(sampleDraws);
      
      expect(prediction.offsets).toEqual(customOffsets);
      expect(prediction.model).toBe('lstm');
    });
  });

  describe('Integration with optimization system', () => {
    it('should maintain backwards compatibility with existing code', () => {
      // Test that existing code using valueToNumbers still works
      const numbers1 = ml.valueToNumbers(35);
      const numbers2 = ml.valueToNumbers(35, null);
      
      expect(numbers1).toEqual(numbers2); // Should be the same when null is passed
    });

    it('should handle invalid offset arrays gracefully', () => {
      // Empty array
      const numbers1 = ml.valueToNumbers(35, []);
      expect(numbers1).toBeInstanceOf(Array);
      
      // Array with negative numbers (should still work due to modulo operation)
      const numbers2 = ml.valueToNumbers(35, [-5, -3, 0, 3, 5]);
      expect(numbers2).toBeInstanceOf(Array);
      numbers2.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(69);
      });
    });

    it('should properly update internal state when offsets change', () => {
      const initialOffsets = ml.getCurrentOffsets();
      const newOffsets = [5, 10, 15, 20, 25];
      
      ml.setOptimizedOffsets(newOffsets);
      expect(ml.getCurrentOffsets()).toEqual(newOffsets);
      expect(ml.getCurrentOffsets()).not.toEqual(initialOffsets);
      
      // Reset and check
      ml.setOptimizedOffsets(null);
      expect(ml.getCurrentOffsets()).toEqual(initialOffsets);
    });
  });

  describe('Performance considerations', () => {
    it('should handle large offset arrays efficiently', () => {
      const largeOffsetArray = Array.from({length: 50}, (_, i) => i);
      
      const startTime = performance.now();
      const numbers = ml.valueToNumbers(35, largeOffsetArray);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
      expect(numbers.length).toBeLessThanOrEqual(10); // Still limited to 10
    });

    it('should handle repeated calls efficiently', () => {
      const offsets = [1, 5, 10, 15, 20];
      
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        ml.valueToNumbers(i % 69, offsets);
      }
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // 1000 calls in less than 1 second
    });
  });
});