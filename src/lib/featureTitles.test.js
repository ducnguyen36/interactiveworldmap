import { describe, it, expect } from 'vitest';
import { featureWikiTitles } from './featureTitles.js';

describe('featureWikiTitles', () => {
  it('volcano → name in both languages', () => {
    expect(featureWikiTitles({ kind: 'volcano', name: 'Mount Fuji' }, null))
      .toEqual({ vi: ['Mount Fuji'], en: ['Mount Fuji'] });
  });
  it('current → vi/en names', () => {
    expect(featureWikiTitles({ kind: 'current', nameVi: 'Dòng Gulf Stream', nameEn: 'Gulf Stream' }, null))
      .toEqual({ vi: ['Dòng Gulf Stream'], en: ['Gulf Stream'] });
  });
  it('commodity with country → country-specific article first, then general', () => {
    expect(featureWikiTitles({ kind: 'commodity', vi: 'Cà phê', en: 'Coffee' }, { vi: 'Ấn Độ', en: 'India' }))
      .toEqual({ vi: ['Cà phê'], en: ['Coffee production in India', 'Coffee'] });
  });
  it('commodity without country → general article only', () => {
    expect(featureWikiTitles({ kind: 'commodity', vi: 'Cà phê', en: 'Coffee' }, null))
      .toEqual({ vi: ['Cà phê'], en: ['Coffee'] });
  });
  it('climate → koppen article candidates for the code', () => {
    expect(featureWikiTitles({ kind: 'climate', code: 'Af' }, null))
      .toEqual({ vi: ['Khí hậu rừng mưa nhiệt đới', 'Phân loại khí hậu Köppen'], en: ['Tropical rainforest climate', 'Köppen climate classification'] });
  });
});
