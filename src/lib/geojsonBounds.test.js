import { describe, it, expect } from 'vitest';
import { geojsonBounds } from './geojsonBounds.js';

describe('geojsonBounds', () => {
  it('bounds of a Point', () => {
    expect(geojsonBounds({ type: 'Point', coordinates: [105, 21] }))
      .toEqual({ south: 21, west: 105, north: 21, east: 105 });
  });
  it('bounds of a Polygon', () => {
    expect(geojsonBounds({ type: 'Polygon', coordinates: [[[102, 8], [110, 8], [110, 23], [102, 8]]] }))
      .toEqual({ south: 8, west: 102, north: 23, east: 110 });
  });
  it('bounds of a MultiPolygon spans all parts', () => {
    const g = { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 5]]]] };
    expect(geojsonBounds(g)).toEqual({ south: 0, west: 0, north: 6, east: 6 });
  });
  it('null for missing geometry', () => {
    expect(geojsonBounds(null)).toBeNull();
    expect(geojsonBounds({ type: 'Polygon' })).toBeNull();
  });
});
