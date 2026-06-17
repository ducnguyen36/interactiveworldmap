import { describe, it, expect } from 'vitest';
import { climateClass, koppenArticle } from './climate.js';

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

describe('koppenArticle', () => {
  it('maps codes to climate-type Wikipedia titles (specific first, then general fallback)', () => {
    expect(koppenArticle('Af').en).toEqual(['Tropical rainforest climate', 'Köppen climate classification']);
    expect(koppenArticle('Am').en[0]).toBe('Tropical monsoon climate');
    expect(koppenArticle('Aw').en[0]).toBe('Tropical savanna climate');
    expect(koppenArticle('BWh').en[0]).toBe('Desert climate');
    expect(koppenArticle('BSk').en[0]).toBe('Semi-arid climate');
    expect(koppenArticle('Csa').en[0]).toBe('Mediterranean climate');
    expect(koppenArticle('Cfa').en[0]).toBe('Humid subtropical climate');
    expect(koppenArticle('Cfb').en[0]).toBe('Oceanic climate');
    expect(koppenArticle('Dfb').en[0]).toBe('Humid continental climate');
    expect(koppenArticle('Dfc').en[0]).toBe('Subarctic climate');
    expect(koppenArticle('ET').en[0]).toBe('Tundra');
    expect(koppenArticle('EF').en[0]).toBe('Ice cap climate');
  });
  it('falls back to the general article for unknown/empty codes', () => {
    expect(koppenArticle('').en).toEqual(['Köppen climate classification']);
    expect(koppenArticle('ZZ').en).toEqual(['Köppen climate classification']);
  });
  it('always provides a vi candidate list', () => {
    expect(Array.isArray(koppenArticle('Af').vi)).toBe(true);
    expect(koppenArticle('Af').vi.length).toBeGreaterThan(0);
  });
});
