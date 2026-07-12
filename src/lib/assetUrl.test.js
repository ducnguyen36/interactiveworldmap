import { describe, it, expect } from 'vitest';
import { assetUrl } from './assetUrl.js';

describe('assetUrl', () => {
  it('returns an absolute URL for a public asset', () => {
    const u = assetUrl('data/countries.geojson');
    expect(u.startsWith('http')).toBe(true);
    expect(u.endsWith('/data/countries.geojson')).toBe(true);
    expect(u.includes('//data')).toBe(false);
  });
  it('accepts a leading slash', () => {
    expect(assetUrl('/data/x.json')).toBe(assetUrl('data/x.json'));
  });
});
