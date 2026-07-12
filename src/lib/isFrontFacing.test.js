import { describe, it, expect } from 'vitest';
import { isFrontFacing } from './isFrontFacing.js';

describe('isFrontFacing', () => {
  it('point at the center is visible', () => {
    expect(isFrontFacing([0, 0], [0, 0])).toBe(true);
  });
  it('antipode is hidden', () => {
    expect(isFrontFacing([0, 0], [180, 0])).toBe(false);
  });
  it('just inside / outside the 90° horizon', () => {
    expect(isFrontFacing([0, 0], [89, 0])).toBe(true);
    expect(isFrontFacing([0, 0], [91, 0])).toBe(false);
  });
});
