import { describe, it, expect } from 'vitest';
import { commoditiesForCountry, volcanoCountInBounds } from './countryFacts.js';

describe('commoditiesForCountry', () => {
  const ag = { rice: [{ iso2: 'VN' }, { iso2: 'CN' }], coffee: [{ iso2: 'VN' }], wheat: [{ iso2: 'US' }] };
  it('returns commodity ids the country appears in', () => {
    expect(commoditiesForCountry(ag, 'VN')).toEqual(['rice', 'coffee']);
  });
  it('returns empty for a country with none', () => {
    expect(commoditiesForCountry(ag, 'XX')).toEqual([]);
  });
  it('handles null/empty data', () => {
    expect(commoditiesForCountry(null, 'VN')).toEqual([]);
  });
});

describe('volcanoCountInBounds', () => {
  const vol = { features: [
    { geometry: { coordinates: [10, 20] } },   // inside
    { geometry: { coordinates: [100, 80] } },  // outside
    { geometry: { coordinates: [0, 0] } },     // on edge → inside
  ] };
  const bounds = { south: 0, west: 0, north: 30, east: 30 };
  it('counts points within the bbox', () => {
    expect(volcanoCountInBounds(vol, bounds)).toBe(2);
  });
  it('returns 0 for null data or bounds', () => {
    expect(volcanoCountInBounds(null, bounds)).toBe(0);
    expect(volcanoCountInBounds(vol, null)).toBe(0);
  });
});
