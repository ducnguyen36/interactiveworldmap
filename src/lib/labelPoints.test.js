import { describe, it, expect } from 'vitest';
import { countryLabelPoints, oceanLabelPoints } from './labelPoints.js';

const countries = { features: [
  { properties: { NAME_VI: 'Việt Nam', NAME_EN: 'Vietnam', LABELRANK: 2 },
    geometry: { type: 'Polygon', coordinates: [[[102, 8], [110, 8], [110, 23], [102, 8]]] } },
  { properties: { NAME_VI: 'Nhỏ', NAME_EN: 'Tiny', LABELRANK: 5 },
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } },
] };

describe('countryLabelPoints', () => {
  it('emits a centered point per major country only, labeled by mode', () => {
    const fc = countryLabelPoints(countries, 'vi');
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties.label).toBe('Việt Nam');
    expect(fc.features[0].geometry.coordinates).toEqual([106, 15.5]);
  });
  it('dual mode joins both names', () => {
    expect(countryLabelPoints(countries, 'dual').features[0].properties.label).toBe('Việt Nam / Vietnam');
  });
});

describe('oceanLabelPoints', () => {
  it('converts [lat,lng] ocean coords into lng/lat points', () => {
    const fc = oceanLabelPoints({ features: [{ name_vi: 'Thái Bình Dương', name_en: 'Pacific Ocean', coord: [0, -150] }] }, 'en');
    expect(fc.features[0].geometry.coordinates).toEqual([-150, 0]);
    expect(fc.features[0].properties.label).toBe('Pacific Ocean');
  });
});
