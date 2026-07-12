import { describe, it, expect, beforeEach } from 'vitest';
import { fullGeometry } from './fullGeometry.js';
import { _clearGeoCache, _primeGeoCache } from '../hooks/useGeoData.js';

beforeEach(() => { _clearGeoCache(); });

describe('fullGeometry', () => {
  it('returns the original geometry by feature id from the cached source', () => {
    const fc = { features: [{ geometry: { type: 'Point', coordinates: [1, 2] } }, { geometry: { type: 'Point', coordinates: [3, 4] } }] };
    _primeGeoCache('/data/x.geojson', fc);
    expect(fullGeometry('/data/x.geojson', { id: 1 })).toEqual({ type: 'Point', coordinates: [3, 4] });
  });
  it('null when the cache is cold or id missing', () => {
    expect(fullGeometry('/data/x.geojson', { id: 0 })).toBeNull();
    expect(fullGeometry('/data/x.geojson', {})).toBeNull();
  });
});
