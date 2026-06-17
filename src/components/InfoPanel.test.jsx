import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import { SelectionProvider } from '../context/SelectionContext.jsx';

vi.mock('../hooks/useWikiInfo.js', () => ({
  useWikiInfo: (feature) => feature ? ({
    data: { name: { vi: 'Việt Nam', en: 'Vietnam' }, flag: 'http://flag',
      capital: { vi: 'Hà Nội', en: 'Hanoi' }, population: 97000000,
      extracts: [{ lang: 'vi', title: 'Việt Nam', extract: 'Một quốc gia.' }] },
    loading: false, error: null, retry: () => {},
  }) : { data: null, loading: false, error: null, retry: () => {} },
}));
vi.mock('../hooks/useWikiSummary.js', () => ({
  useWikiSummary: (titles) => titles
    ? { extracts: [{ lang: 'en', title: 'Gulf Stream', extract: 'A warm current.' }], loading: false, error: null, retry: () => {} }
    : { extracts: [], loading: false, error: null, retry: () => {} },
}));
vi.mock('../hooks/useGeoData.js', () => ({ useGeoData: () => ({ data: null, loading: false, error: null }) }));
vi.mock('./CountryLayerFacts.jsx', () => ({ default: () => <div data-testid="facts" /> }));

import InfoPanel from './InfoPanel.jsx';

function renderWith(selected) {
  return render(
    <LanguageProvider>
      <SelectionProvider>
        <InfoPanel injectedSelection={selected} />
      </SelectionProvider>
    </LanguageProvider>
  );
}

beforeEach(() => { localStorage.clear(); });

describe('InfoPanel', () => {
  it('renders nothing when no selection', () => {
    const { container } = renderWith(null);
    expect(container.firstChild).toBeNull();
  });
  it('renders country info + the layer-facts section', () => {
    renderWith({ kind: 'country', wikidata: 'Q881', iso2: 'VN', nameVi: 'Việt Nam', nameEn: 'Vietnam', population: 97000000 });
    expect(screen.getByText('Hà Nội')).toBeInTheDocument();
    expect(screen.getByText('Một quốc gia.')).toBeInTheDocument();
    expect(screen.getByTestId('facts')).toBeInTheDocument();
  });
  it('renders a current feature view with its description', () => {
    renderWith({ kind: 'current', nameVi: 'Dòng Gulf Stream', nameEn: 'Gulf Stream', type: 'warm' });
    expect(screen.getByText('Dòng Gulf Stream')).toBeInTheDocument();
    expect(screen.getByText('Dòng biển nóng')).toBeInTheDocument();
    expect(screen.getByText('A warm current.')).toBeInTheDocument();
    expect(screen.queryByTestId('facts')).toBeNull();
  });
  it('renders a volcano feature view', () => {
    renderWith({ kind: 'volcano', name: 'Mount Fuji' });
    expect(screen.getByText('Mount Fuji')).toBeInTheDocument();
    expect(screen.getByText('Núi lửa')).toBeInTheDocument();
  });
});
