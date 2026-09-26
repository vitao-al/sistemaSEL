import { describe, expect, it } from 'vitest';
import { calculatePercentVariation, calculatePercentShare, getPageLabel, getTrendDirection } from './dashboard-metrics';

describe('calculatePercentVariation', () => {
  it('calculates a positive and negative variation correctly', () => {
    expect(calculatePercentVariation(10, 5)).toBe(100);
    expect(calculatePercentVariation(8, 10)).toBe(-20);
    expect(calculatePercentVariation(0, 0)).toBe(0);
  });

  it('avoids dividing by zero when the previous value is zero', () => {
    expect(calculatePercentVariation(5, 0)).toBe(100);
    expect(calculatePercentVariation(0, 5)).toBe(-100);
  });
});

describe('calculatePercentShare', () => {
  it('calculates the correct share of a total', () => {
    expect(calculatePercentShare(6, 10)).toBe(60);
    expect(calculatePercentShare(0, 10)).toBe(0);
    expect(calculatePercentShare(0, 0)).toBe(0);
  });
});

describe('getTrendDirection', () => {
  it('marks positive variation as rising and negative variation as falling', () => {
    expect(getTrendDirection(12)).toBe(true);
    expect(getTrendDirection(0)).toBe(true);
    expect(getTrendDirection(-12)).toBe(false);
  });
});

describe('getPageLabel', () => {
  it('builds the expected footer label for each page', () => {
    expect(getPageLabel(1, 3)).toBe('1 de 3');
    expect(getPageLabel(2, 3)).toBe('2 de 3');
    expect(getPageLabel(3, 3)).toBe('3 de 3');
  });
});
