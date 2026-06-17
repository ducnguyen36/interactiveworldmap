import { describe, it, expect } from 'vitest';
import { mapColor } from './mapColor.js';

describe('mapColor', () => {
  it('maps 1..7 to distinct vibrant hex colors', () => {
    const colors = [1, 2, 3, 4, 5, 6, 7].map(mapColor);
    expect(colors).toEqual(['#e57373', '#81c784', '#64b5f6', '#ffb74d', '#ba68c8', '#4db6ac', '#fff176']);
    expect(new Set(colors).size).toBe(7);
  });
  it('falls back for missing/0/unknown values', () => {
    expect(mapColor(0)).toBe('#cfd8dc');
    expect(mapColor(undefined)).toBe('#cfd8dc');
    expect(mapColor(99)).toBe('#cfd8dc');
  });
});
