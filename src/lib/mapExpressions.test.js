import { describe, it, expect } from 'vitest';
import { mapcolor7Expression, climateColorExpression, currentColorExpression } from './mapExpressions.js';
import { mapColor } from './mapColor.js';
import { climateClass } from './climate.js';

describe('mapExpressions', () => {
  it('mapcolor7Expression matches all 7 palette colors with a fallback', () => {
    const e = mapcolor7Expression();
    expect(e[0]).toBe('match');
    for (const n of [1, 2, 3, 4, 5, 6, 7]) expect(e).toContain(mapColor(n));
    expect(e[e.length - 1]).toBe(mapColor(0));
  });
  it('climateColorExpression matches the 5 groups with a fallback', () => {
    const e = climateColorExpression();
    expect(e[0]).toBe('match');
    for (const g of ['A', 'B', 'C', 'D', 'E']) expect(e).toContain(climateClass(g).color);
    expect(e[e.length - 1]).toBe(climateClass('?').color);
  });
  it('currentColorExpression maps warm/cold', () => {
    expect(currentColorExpression('#w', '#c')).toEqual(['match', ['get', 'type'], 'warm', '#w', '#c']);
  });
});
