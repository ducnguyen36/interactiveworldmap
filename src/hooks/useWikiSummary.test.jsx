import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWikiSummary } from './useWikiSummary.js';

function mockFetch(map) {
  return vi.fn((url) => {
    for (const key of Object.keys(map)) {
      if (url.includes(encodeURIComponent(key))) {
        return Promise.resolve({ ok: true, json: async () => map[key] });
      }
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('useWikiSummary', () => {
  it('uses the first candidate that resolves, in the active language', async () => {
    globalThis.fetch = mockFetch({ 'Coffee production in India': { title: 'Coffee production in India', extract: 'About coffee in India.' } });
    const titles = { vi: ['Cà phê'], en: ['Coffee production in India', 'Coffee'] };
    const { result } = renderHook(() => useWikiSummary(titles, 'en'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.extracts).toHaveLength(1);
    expect(result.current.extracts[0]).toMatchObject({ lang: 'en', extract: 'About coffee in India.' });
  });

  it('falls back to English when the active language has no article', async () => {
    globalThis.fetch = mockFetch({ 'Coffee': { title: 'Coffee', extract: 'About coffee.' } });
    const titles = { vi: ['Cà phê khong ton tai'], en: ['Coffee'] };
    const { result } = renderHook(() => useWikiSummary(titles, 'vi'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.extracts).toHaveLength(1);
    expect(result.current.extracts[0].lang).toBe('en');
  });

  it('is inert when titles is null', () => {
    const { result } = renderHook(() => useWikiSummary(null, 'vi'));
    expect(result.current.loading).toBe(false);
    expect(result.current.extracts).toEqual([]);
  });
});
