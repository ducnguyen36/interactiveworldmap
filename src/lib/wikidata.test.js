import { describe, it, expect } from 'vitest';
import { entitiesUrl, getEntity, claimEntityId, claimQuantity, label, siteTitle } from './wikidata.js';

const fixture = {
  entities: {
    Q881: {
      labels: { vi: { value: 'Việt Nam' }, en: { value: 'Vietnam' } },
      claims: {
        P36: [{ mainsnak: { datavalue: { value: { id: 'Q1858' } } } }],
        P1082: [{ mainsnak: { datavalue: { value: { amount: '+97000000' } } } }],
      },
      sitelinks: { viwiki: { title: 'Việt Nam' }, enwiki: { title: 'Vietnam' } },
    },
  },
};

describe('wikidata', () => {
  it('builds an entities API URL with CORS origin', () => {
    const url = entitiesUrl(['Q881'], ['vi', 'en']);
    expect(url).toContain('action=wbgetentities');
    expect(url).toContain('ids=Q881');
    expect(url).toContain('origin=%2A');
  });
  it('reads claims, labels and sitelinks', () => {
    const e = getEntity(fixture, 'Q881');
    expect(claimEntityId(e, 'P36')).toBe('Q1858');
    expect(claimQuantity(e, 'P1082')).toBe(97000000);
    expect(label(e, 'vi')).toBe('Việt Nam');
    expect(siteTitle(e, 'en')).toBe('Vietnam');
  });
  it('returns null for missing data', () => {
    const e = getEntity(fixture, 'Q881');
    expect(claimEntityId(e, 'P999')).toBeNull();
    expect(claimQuantity(e, 'P999')).toBeNull();
    expect(label(e, 'fr')).toBeNull();
  });
});
