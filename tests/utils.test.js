import { getDigitalRoot } from '../js/utils.js';

describe('getDigitalRoot', () => {
  test('should return the correct digital root for a single-digit number', () => {
    expect(getDigitalRoot(5)).toBe(5);
  });

  test('should return the correct digital root for a multi-digit number', () => {
    expect(getDigitalRoot(42)).toBe(6);
  });

  test('should return the correct digital root for a number that sums to a multi-digit number', () => {
    expect(getDigitalRoot(99)).toBe(9);
  });

  test('should return the correct digital root for a large number', () => {
    expect(getDigitalRoot(123456789)).toBe(9);
  });
});