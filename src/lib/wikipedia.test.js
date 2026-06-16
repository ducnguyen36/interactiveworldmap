import { describe, it, expect } from 'vitest';
import { summaryUrl, parseSummary } from './wikipedia.js';

describe('wikipedia', () => {
  it('builds a per-language summary URL', () => {
    expect(summaryUrl('vi', 'Việt Nam')).toBe(
      'https://vi.wikipedia.org/api/rest_v1/page/summary/Vi%E1%BB%87t%20Nam'
    );
  });
  it('parses a summary payload', () => {
    const json = { title: 'Vietnam', extract: 'A country.', thumbnail: { source: 'http://img' } };
    expect(parseSummary(json)).toEqual({ title: 'Vietnam', extract: 'A country.', thumbnail: 'http://img' });
  });
  it('returns null for a not-found payload', () => {
    expect(parseSummary({ type: 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found' })).toBeNull();
    expect(parseSummary(null)).toBeNull();
  });
});
