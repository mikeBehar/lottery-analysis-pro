// tests/analysis.test.js
// Unit tests for js/analysis.js

import { calculateFrequency, findCommonPairs, gapAnalysis, getHotAndColdNumbers, getOverdueNumbers } from '../js/analysis.js';
  describe('getOverdueNumbers', () => {
    it('identifies most overdue numbers (never drawn first)', () => {
      const draws = [
        { whiteBalls: [1, 2, 3] },
        { whiteBalls: [2, 3, 4] },
        { whiteBalls: [3, 4, 5] },
      ];
      // 6,7,8,9,10 never drawn, should be most overdue
      const result = getOverdueNumbers(draws, 10, 3);
      expect(result.slice(0, 3)).toEqual([6, 7, 8]);
    });

    it('identifies overdue among drawn numbers', () => {
      const draws = [
        { whiteBalls: [1, 2, 3] }, // 1 last seen here
        { whiteBalls: [2, 3, 4] }, // 2 last seen here
        { whiteBalls: [3, 4, 5] }, // 3 last seen here
      ];
      // 1 last seen at index 0, 2 at 1, 3 at 2
      const result = getOverdueNumbers(draws, 5, 3);
      expect(result).toContain(1);
      expect(result).toContain(4);
      expect(result).toContain(5);
    });
  });

describe('analysis.js', () => {
  describe('calculateFrequency', () => {
    it('calculates frequency of whiteBalls and powerball', () => {
      const draws = [
        { whiteBalls: [1, 2, 3, 4, 5], powerball: 10 },
        { whiteBalls: [1, 2, 3, 6, 7], powerball: 10 },
        { whiteBalls: [2, 3, 4, 5, 6], powerball: 20 },
      ];
      const freq = calculateFrequency(draws, 10);
      expect(freq.whiteBalls[0]).toBe(2); // 1
      expect(freq.whiteBalls[1]).toBe(3); // 2
      expect(freq.whiteBalls[2]).toBe(3); // 3
      expect(freq.whiteBalls[3]).toBe(2); // 4
      expect(freq.whiteBalls[4]).toBe(2); // 5
      expect(freq.whiteBalls[5]).toBe(2); // 6
      expect(freq.whiteBalls[6]).toBe(1); // 7
      expect(freq.whiteBalls[7]).toBe(0); // 8
      expect(freq.whiteBalls[8]).toBe(0); // 9
      expect(freq.whiteBalls[9]).toBe(0); // 10
      expect(freq.powerball[10]).toBe(2);
      expect(freq.powerball[20]).toBe(1);
    });
  });

  describe('findCommonPairs', () => {
    it('finds most common number pairs', () => {
      const draws = [
        { whiteBalls: [1, 2, 3] },
        { whiteBalls: [2, 3, 4] },
        { whiteBalls: [1, 2, 4] },
      ];
      const pairs = findCommonPairs(draws);
      expect(pairs['1-2']).toBe(2);
      expect(pairs['2-3']).toBe(2);
      expect(pairs['1-3']).toBe(1);
      expect(pairs['3-4']).toBe(1);
      expect(pairs['2-4']).toBe(2);
      expect(pairs['1-4']).toBe(1);
    });
  });

  describe('gapAnalysis', () => {
    it('analyzes gaps between consecutive numbers in draws', () => {
      const draws = [
        { whiteBalls: [1, 3, 6] }, // gaps: 2, 3
        { whiteBalls: [2, 5, 8] }, // gaps: 3, 3
        { whiteBalls: [10, 12, 15] }, // gaps: 2, 3
      ];
      const gaps = gapAnalysis(draws);
      expect(gaps[2]).toBe(2); // (1-3, 10-12)
      expect(gaps[3]).toBe(4); // (3-6, 2-5, 5-8, 12-15)
      expect(gaps[1]).toBeUndefined();
    });
  });

  describe('getHotAndColdNumbers', () => {
    it('identifies hot and cold numbers from all draws', () => {
      const draws = [
        { whiteBalls: [1, 2, 3, 4, 5] },
        { whiteBalls: [1, 2, 3, 6, 7] },
        { whiteBalls: [2, 3, 4, 5, 6] },
      ];
      const { hot, cold } = getHotAndColdNumbers(draws, 10, null, 2);
      expect(hot).toEqual([2, 3]); // 2 and 3 appear 3 times each
      expect(cold).toEqual([8, 9]); // 8 and 9 never appear
    });

    it('identifies hot/cold numbers from recent N draws', () => {
      const draws = [
        { whiteBalls: [1, 2, 3] },
        { whiteBalls: [2, 3, 4] },
        { whiteBalls: [3, 4, 5] },
      ];
      // Only last 2 draws: [2,3,4], [3,4,5]
      const { hot, cold } = getHotAndColdNumbers(draws, 5, 2, 1);
      expect(hot).toEqual([3]); // 3 appears in both
      expect(cold).toEqual([1]); // 1 does not appear in last 2 draws
    });
  });
});
