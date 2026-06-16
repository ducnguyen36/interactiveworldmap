import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWikiInfo } from './useWikiInfo.js';

const country = {
  entities: {
    Q881: {
      labels: { vi: { value: 'Việt Nam' }, en: { value: 'Vietnam' } },
      claims: { P36: [{ mainsnak: { datavalue: { value: { id: 'Q1858' } } } }] },
      sitelinks: { viwiki: { title: 'Việt Nam' }, enwiki: { title: 'Vietnam' } },
    },
  },
};
const capital = { entities: { Q1858: { labels: { vi: { value: 'Hà Nội' }, en: { value: 'Hanoi' } } } } };

function mockFetch() {
  return vi.fn((url) => {
    if (url.includes('ids=Q881')) return Promise.resolve({ ok: true, json: async () => country });
    if (url.includes('ids=Q1858')) return Promise.resolve({ ok: true, json: async () => capital });
    if (url.includes('vi.wikipedia.org')) return Promise.resolve({ ok: true, json: async () => ({ title: 'Việt Nam', extract: 'Một quốc gia.' }) });
    if (url.includes('en.wikipedia.org')) return Promise.resolve({ ok: true, json: async () => ({ title: 'Vietnam', extract: 'A country.' }) });
    return Promise.resolve({ ok: false, status: 404 });
  });
}

const feature = { wikidata: 'Q881', iso2: 'VN', nameVi: 'Việt Nam', nameEn: 'Vietnam', population: 97000000 };

beforeEach(() => { globalThis.fetch = mockFetch(); });

describe('useWikiInfo', () => {
  it('assembles capital, population, flag and the dual extracts', async () => {
    const { result } = renderHook(() => useWikiInfo(feature, 'dual'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data.capital).toEqual({ vi: 'Hà Nội', en: 'Hanoi' });
    expect(result.current.data.population).toBe(97000000);
    expect(result.current.data.flag).toBe('https://flagcdn.com/w160/vn.png');
    expect(result.current.data.extracts).toHaveLength(2);
    expect(result.current.data.extracts[0]).toMatchObject({ lang: 'vi', extract: 'Một quốc gia.' });
  });

  it('fetches only the active language in single mode', async () => {
    const { result } = renderHook(() => useWikiInfo(feature, 'en'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data.extracts).toHaveLength(1);
    expect(result.current.data.extracts[0].lang).toBe('en');
  });

  it('is inert when feature is null', () => {
    const { result } = renderHook(() => useWikiInfo(null, 'vi'));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
  });
});
