import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import { SelectionProvider } from '../context/SelectionContext.jsx';
import InfoPanel from './InfoPanel.jsx';

vi.mock('../hooks/useWikiInfo.js', () => ({
  useWikiInfo: (feature) => feature ? ({
    data: {
      name: { vi: 'Việt Nam', en: 'Vietnam' },
      flag: 'http://flag', capital: { vi: 'Hà Nội', en: 'Hanoi' },
      population: 97000000, extracts: [{ lang: 'vi', title: 'Việt Nam', extract: 'Một quốc gia.' }],
    }, loading: false, error: null, retry: () => {},
  }) : { data: null, loading: false, error: null, retry: () => {} },
}));

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
  it('renders capital, population and extract when selected', () => {
    renderWith({ wikidata: 'Q881', iso2: 'VN', nameVi: 'Việt Nam', nameEn: 'Vietnam', population: 97000000 });
    expect(screen.getByText('Hà Nội')).toBeInTheDocument();
    expect(screen.getByText('Một quốc gia.')).toBeInTheDocument();
    expect(screen.getByText(/97[.,]000[.,]000/)).toBeInTheDocument();
  });
});
