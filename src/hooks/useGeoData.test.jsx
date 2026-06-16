import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGeoData, _clearGeoCache } from './useGeoData.js';

beforeEach(() => { _clearGeoCache(); });

describe('useGeoData', () => {
  it('loads and returns data', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ type: 'FeatureCollection', features: [] }),
    });
    const { result } = renderHook(() => useGeoData('/data/x.geojson'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ type: 'FeatureCollection', features: [] });
    expect(result.current.error).toBe(null);
  });

  it('sets error on failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const { result } = renderHook(() => useGeoData('/data/missing.geojson'));
    await waitFor(() => expect(result.current.error).not.toBe(null));
    expect(result.current.data).toBe(null);
  });
});
