import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext.jsx';

vi.mock('../hooks/useGeoData.js', () => ({
  useGeoData: (url) => {
    if (!url) return { data: null, loading: false, error: null };
    if (url.includes('agriculture')) return { data: { rice: [{ iso2: 'VN' }], coffee: [{ iso2: 'VN' }] }, loading: false, error: null };
    if (url.includes('volcanoes')) return { data: { features: [{ geometry: { coordinates: [106, 16] } }] }, loading: false, error: null };
    return { data: null, loading: false, error: null };
  },
}));
vi.mock('../hooks/useWikiSummary.js', () => ({
  useWikiSummary: (titles) => titles
    ? { extracts: [{ lang: 'en', title: 'Climate of Vietnam', extract: 'Tropical climate.' }], loading: false, error: null, retry: () => {} }
    : { extracts: [], loading: false, error: null, retry: () => {} },
}));

import CountryLayerFacts from './CountryLayerFacts.jsx';

const props = { iso2: 'VN', nameVi: 'Việt Nam', nameEn: 'Vietnam', bounds: { south: 8, west: 102, north: 23, east: 110 } };

function renderWith(overlayIds) {
  return render(
    <LanguageProvider>
      <CountryLayerFacts {...props} activeOverlayIds={new Set(overlayIds)} />
    </LanguageProvider>
  );
}

beforeEach(() => { localStorage.clear(); });

describe('CountryLayerFacts', () => {
  it('renders nothing when no overlays active', () => {
    const { container } = renderWith([]);
    expect(container.firstChild).toBeNull();
  });
  it('lists agricultural products when agriculture active', () => {
    renderWith(['agriculture']);
    expect(screen.getByText(/Lúa gạo/)).toBeInTheDocument();
    expect(screen.getByText(/Cà phê/)).toBeInTheDocument();
  });
  it('shows the volcano count when tectonic active', () => {
    renderWith(['tectonic']);
    expect(screen.getByText(/Số núi lửa/)).toBeInTheDocument();
    expect(screen.getByText(/\b1\b/)).toBeInTheDocument();
  });
  it('shows the climate extract when climate active', () => {
    renderWith(['climate']);
    expect(screen.getByText('Tropical climate.')).toBeInTheDocument();
  });
});
