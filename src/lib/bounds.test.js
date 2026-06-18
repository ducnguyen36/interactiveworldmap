import { describe, it, expect } from 'vitest';
import { boundsToObj } from './bounds.js';

describe('boundsToObj', () => {
  it('serializes a Leaflet bounds to plain {south,west,north,east}', () => {
    const fakeBounds = { getSouth: () => 1, getWest: () => 2, getNorth: () => 3, getEast: () => 4 };
    expect(boundsToObj(fakeBounds)).toEqual({ south: 1, west: 2, north: 3, east: 4 });
  });
});
