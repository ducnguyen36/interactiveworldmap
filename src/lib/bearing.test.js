import { describe, it, expect } from 'vitest';
import { bearing } from './bearing.js';

describe('bearing', () => {
  it('points north for due-north movement', () => {
    expect(bearing([0, 0], [0, 1])).toBeCloseTo(0, 1);
  });
  it('points east for due-east movement', () => {
    expect(bearing([0, 0], [1, 0])).toBeCloseTo(90, 1);
  });
  it('points south for due-south movement', () => {
    expect(bearing([0, 1], [0, 0])).toBeCloseTo(180, 1);
  });
  it('points west for due-west movement', () => {
    expect(bearing([1, 0], [0, 0])).toBeCloseTo(270, 1);
  });
  it('returns a value in [0, 360)', () => {
    const b = bearing([10, 10], [-5, -3]);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});
