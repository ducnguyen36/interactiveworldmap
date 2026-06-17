import { describe, it, expect } from 'vitest';
import { climateClass } from './climate.js';

describe('climateClass', () => {
  it('maps each main Köppen group to its color', () => {
    expect(climateClass('Af')).toEqual({ group: 'A', color: '#2e7d32' });
    expect(climateClass('BWh')).toEqual({ group: 'B', color: '#e0c060' });
    expect(climateClass('Cfb')).toEqual({ group: 'C', color: '#9ccc65' });
    expect(climateClass('Dfc')).toEqual({ group: 'D', color: '#80cbc4' });
    expect(climateClass('ET')).toEqual({ group: 'E', color: '#cfd8dc' });
  });
  it('falls back for unknown/empty codes', () => {
    expect(climateClass('X')).toEqual({ group: '?', color: '#cccccc' });
    expect(climateClass('')).toEqual({ group: '?', color: '#cccccc' });
    expect(climateClass(null)).toEqual({ group: '?', color: '#cccccc' });
  });
});
