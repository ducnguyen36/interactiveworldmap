# Info Panel — Layer Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the info panel so clicking a layer feature (current/volcano/agriculture marker) shows its Wikipedia description, and clicking a country shows a "Layer details" section (crops, volcano count, and the country's climate description) for the active overlays.

**Architecture:** Selections gain a `kind` discriminator (`country`/`current`/`volcano`/`commodity`). InfoPanel branches on it: country selections render the existing facts plus a registry-aware `CountryLayerFacts` section; feature selections render a Wikipedia summary fetched via a new `useWikiSummary` hook with ordered title candidates + English fallback. Pure helpers build the titles and compute the per-country facts.

**Tech Stack:** React 18, react-leaflet 4.2.1, Vitest. Reuses existing `wikipedia.js`, `useGeoData`, `dualText`, `COMMODITIES`.

**Reference spec:** `docs/superpowers/specs/2026-06-17-info-panel-layer-details-design.md`

**Baseline:** branch `feature/interactive-world-map`, 37 passing tests, app verified working.

---

## File structure

```
src/lib/featureTitles.js          NEW  featureWikiTitles(feature, countryName), climateTitles(nameVi,nameEn)
src/lib/countryFacts.js           NEW  commoditiesForCountry(agData, iso2), volcanoCountInBounds(volData, bounds)
src/hooks/useWikiSummary.js       NEW  fetch Wikipedia summaries from candidate titles + EN fallback
src/hooks/useGeoData.js           MOD  no-op on falsy url
src/components/WikiExtracts.jsx   NEW  shared extract renderer (thumbnail + text + read-more)
src/components/CountryLayerFacts.jsx NEW per-country layer facts section
src/components/InfoPanel.jsx      MOD  branch on kind; country facts + feature views
src/components/layers/PoliticalLayer.jsx   MOD  add kind:'country' + bounds
src/components/layers/CurrentsLayer.jsx    MOD  click → current selection
src/components/layers/TectonicLayer.jsx    MOD  volcano click → volcano selection
src/components/layers/AgricultureLayer.jsx MOD  marker click → commodity selection
src/App.jsx                       MOD  pass activeOverlayIds to InfoPanel
src/i18n/locales/{vi,en}.json     MOD  new panel.* keys
```

---

## Task 1: featureTitles helpers (TDD)

**Files:** Create `src/lib/featureTitles.js`, `src/lib/featureTitles.test.js`

- [ ] **Step 1: Write the failing test** — `src/lib/featureTitles.test.js`
```js
import { describe, it, expect } from 'vitest';
import { featureWikiTitles, climateTitles } from './featureTitles.js';

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
});

describe('climateTitles', () => {
  it('builds Climate of {country} + vi candidates', () => {
    expect(climateTitles('Việt Nam', 'Vietnam'))
      .toEqual({ vi: ['Khí hậu Việt Nam', 'Khí hậu của Việt Nam'], en: ['Climate of Vietnam'] });
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL** — `npx vitest run src/lib/featureTitles.test.js`.

- [ ] **Step 3: Implement** — `src/lib/featureTitles.js`
```js
// Build ordered Wikipedia title candidates (first match wins) per language for a
// non-country feature selection. countryName is { vi, en } or null.
export function featureWikiTitles(feature, countryName) {
  if (feature.kind === 'volcano') {
    return { vi: [feature.name], en: [feature.name] };
  }
  if (feature.kind === 'current') {
    return { vi: [feature.nameVi], en: [feature.nameEn] };
  }
  // commodity
  const en = countryName
    ? [`${feature.en} production in ${countryName.en}`, feature.en]
    : [feature.en];
  return { vi: [feature.vi], en };
}

export function climateTitles(nameVi, nameEn) {
  return {
    vi: [`Khí hậu ${nameVi}`, `Khí hậu của ${nameVi}`],
    en: [`Climate of ${nameEn}`],
  };
}
```

- [ ] **Step 4: Run it, confirm PASS** (5 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/featureTitles.js src/lib/featureTitles.test.js
git commit -m "feat: add wiki title helpers for features and country climate"
```

---

## Task 2: countryFacts helpers (TDD)

**Files:** Create `src/lib/countryFacts.js`, `src/lib/countryFacts.test.js`

- [ ] **Step 1: Write the failing test** — `src/lib/countryFacts.test.js`
```js
import { describe, it, expect } from 'vitest';
import { commoditiesForCountry, volcanoCountInBounds } from './countryFacts.js';

describe('commoditiesForCountry', () => {
  const ag = { rice: [{ iso2: 'VN' }, { iso2: 'CN' }], coffee: [{ iso2: 'VN' }], wheat: [{ iso2: 'US' }] };
  it('returns commodity ids the country appears in', () => {
    expect(commoditiesForCountry(ag, 'VN')).toEqual(['rice', 'coffee']);
  });
  it('returns empty for a country with none', () => {
    expect(commoditiesForCountry(ag, 'XX')).toEqual([]);
  });
  it('handles null/empty data', () => {
    expect(commoditiesForCountry(null, 'VN')).toEqual([]);
  });
});

describe('volcanoCountInBounds', () => {
  const vol = { features: [
    { geometry: { coordinates: [10, 20] } },   // inside
    { geometry: { coordinates: [100, 80] } },  // outside
    { geometry: { coordinates: [0, 0] } },     // on edge → inside
  ] };
  const bounds = { south: 0, west: 0, north: 30, east: 30 };
  it('counts points within the bbox', () => {
    expect(volcanoCountInBounds(vol, bounds)).toBe(2);
  });
  it('returns 0 for null data or bounds', () => {
    expect(volcanoCountInBounds(null, bounds)).toBe(0);
    expect(volcanoCountInBounds(vol, null)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL.**

- [ ] **Step 3: Implement** — `src/lib/countryFacts.js`
```js
export function commoditiesForCountry(agData, iso2) {
  if (!agData || !iso2) return [];
  return Object.keys(agData).filter((id) =>
    (agData[id] || []).some((loc) => loc.iso2 === iso2)
  );
}

// Bounding-box count (approximate for antimeridian-crossing countries). Volcano
// points are GeoJSON [lng, lat]; bounds is { south, west, north, east }.
export function volcanoCountInBounds(volData, bounds) {
  if (!volData || !bounds) return 0;
  return volData.features.filter((f) => {
    const [lng, lat] = f.geometry.coordinates;
    return lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north;
  }).length;
}
```

- [ ] **Step 4: Run it, confirm PASS** (5 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/countryFacts.js src/lib/countryFacts.test.js
git commit -m "feat: add country agriculture/volcano facts helpers"
```

---

## Task 3: useWikiSummary hook (TDD)

**Files:** Create `src/hooks/useWikiSummary.js`, `src/hooks/useWikiSummary.test.jsx`

- [ ] **Step 1: Write the failing test** — `src/hooks/useWikiSummary.test.jsx`
```jsx
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
```

- [ ] **Step 2: Run it, confirm FAIL.**

- [ ] **Step 3: Implement** — `src/hooks/useWikiSummary.js`
```js
import { useEffect, useState, useCallback, useMemo } from 'react';
import { summaryUrl, parseSummary } from '../lib/wikipedia.js';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function firstSummary(lang, candidates) {
  for (const title of candidates || []) {
    if (!title) continue;
    try {
      const s = parseSummary(await getJson(summaryUrl(lang, title)));
      if (s) return { lang, ...s };
    } catch { /* try next candidate */ }
  }
  return null;
}

async function load(titles, langs) {
  const extracts = [];
  for (const lang of langs) {
    const s = await firstSummary(lang, titles[lang]);
    if (s) extracts.push(s);
  }
  if (extracts.length === 0 && !langs.includes('en')) {
    const s = await firstSummary('en', titles.en);
    if (s) extracts.push(s);
  }
  return extracts;
}

export function useWikiSummary(titles, mode) {
  const [state, setState] = useState({ extracts: [], loading: false, error: null });
  const langs = useMemo(() => (mode === 'dual' ? ['vi', 'en'] : [mode]), [mode]);
  const key = titles ? JSON.stringify(titles) : null;

  const run = useCallback(() => {
    if (!titles) { setState({ extracts: [], loading: false, error: null }); return () => {}; }
    let active = true;
    setState({ extracts: [], loading: true, error: null });
    load(titles, langs)
      .then((extracts) => { if (active) setState({ extracts, loading: false, error: null }); })
      .catch((error) => { if (active) setState({ extracts: [], loading: false, error }); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, langs]);

  useEffect(() => run(), [run]);
  return { ...state, retry: run };
}
```

- [ ] **Step 4: Run it, confirm PASS** (3 tests). Then `npm run test` → all green (40 total).

- [ ] **Step 5: Commit**
```bash
git add src/hooks/useWikiSummary.js src/hooks/useWikiSummary.test.jsx
git commit -m "feat: add useWikiSummary hook with candidate + English fallback"
```

---

## Task 4: Make layer features selectable

**Files:** Modify `src/components/layers/PoliticalLayer.jsx`, `CurrentsLayer.jsx`, `TectonicLayer.jsx`, `AgricultureLayer.jsx`

> No unit tests (Leaflet needs a real map); verified in the running app at the end.

- [ ] **Step 1: PoliticalLayer — add `kind` + `bounds`.** In `src/components/layers/PoliticalLayer.jsx`, replace the `click` handler inside `onEachFeature` with:
```jsx
      click: () => {
        if (selectedElRef.current) selectedElRef.current.classList.remove('country-selected');
        const el = layer.getElement();
        if (el) { el.classList.add('country-selected'); selectedElRef.current = el; }
        const b = layer.getBounds();
        setSelected({
          kind: 'country',
          wikidata: p.WIKIDATAID || null,
          iso2: p.ISO_A2 && p.ISO_A2 !== '-99' ? p.ISO_A2 : null,
          nameVi: p.NAME_VI, nameEn: p.NAME_EN, population: p.POP_EST ?? null,
          bounds: { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
        });
        map.fitBounds(b, { animate: true, maxZoom: 5, padding: [20, 20] });
      },
```

- [ ] **Step 2: CurrentsLayer — click sets a current selection.** In `src/components/layers/CurrentsLayer.jsx`:
  - Add the import: `import { useSelection } from '../../context/SelectionContext.jsx';`
  - After `const { mode } = useLanguage();` add: `const { setSelected } = useSelection();`
  - Replace the `<GeoJSON … onEachFeature={…} />` `onEachFeature` prop with:
```jsx
        onEachFeature={(f, layer) => {
          const p = f.properties;
          layer.bindTooltip(dualText(p.name_vi, p.name_en, mode), { sticky: true });
          layer.on('click', () => setSelected({ kind: 'current', nameVi: p.name_vi, nameEn: p.name_en, type: p.type }));
        }}
```

- [ ] **Step 3: TectonicLayer — volcano click sets a volcano selection.** In `src/components/layers/TectonicLayer.jsx`:
  - Add imports: `import { useSelection } from '../../context/SelectionContext.jsx';`
  - Inside the component, after the `useGeoData` calls add: `const { setSelected } = useSelection();`
  - Replace the volcano `onEachFeature` with:
```jsx
          onEachFeature={(feature, layer) => {
            const name = feature.properties?.name || null;
            if (name) layer.bindTooltip(name, { sticky: true });
            layer.on('click', () => setSelected({ kind: 'volcano', name }));
          }}
```

- [ ] **Step 4: AgricultureLayer — marker click sets a commodity selection.** In `src/components/layers/AgricultureLayer.jsx`:
  - Add import: `import { useSelection } from '../../context/SelectionContext.jsx';`
  - After `const { mode } = useLanguage();` add: `const { setSelected } = useSelection();`
  - Add an `eventHandlers` prop to the `<Marker>`:
```jsx
          <Marker
            key={`${c.id}-${i}`}
            position={loc.coord}
            eventHandlers={{ click: () => setSelected({ kind: 'commodity', id: c.id, vi: c.vi, en: c.en, icon: c.icon, iso2: loc.iso2 }) }}
            icon={L.divIcon({
              className: 'ag-marker',
              html: `<span style="font-size:16px">${c.icon}</span>`,
              iconSize: [20, 20],
            })}
          >
```

- [ ] **Step 5: Verify + commit**
```bash
npm run build   # success
npm run test    # still 40 (no unit tests added here)
git add src/components/layers/PoliticalLayer.jsx src/components/layers/CurrentsLayer.jsx src/components/layers/TectonicLayer.jsx src/components/layers/AgricultureLayer.jsx
git commit -m "feat: make currents, volcanoes, agriculture markers and countries set typed selections"
```

---

## Task 5: i18n keys + useGeoData null-guard + WikiExtracts

**Files:** Modify `src/i18n/locales/vi.json`, `src/i18n/locales/en.json`, `src/hooks/useGeoData.js`; Create `src/components/WikiExtracts.jsx`

- [ ] **Step 1: Add i18n keys to BOTH locale files** (add a comma after the previous last entry; keep valid JSON; both files must share the same key set).

`src/i18n/locales/vi.json` — add:
```json
  "panel.layerDetails": "Thông tin theo lớp",
  "panel.agricultureProducts": "Nông sản chính",
  "panel.volcanoes": "Số núi lửa",
  "panel.climateNote": "Xem các đới khí hậu trên bản đồ.",
  "panel.currentsNote": "Xem các dòng biển trên bản đồ.",
  "panel.majorProducer": "Nước sản xuất chính"
```
`src/i18n/locales/en.json` — add:
```json
  "panel.layerDetails": "Layer details",
  "panel.agricultureProducts": "Major agricultural products",
  "panel.volcanoes": "Volcanoes",
  "panel.climateNote": "See climate zones on the map.",
  "panel.currentsNote": "See ocean currents on the map.",
  "panel.majorProducer": "Major producer"
```
Verify: `node -e "require('./src/i18n/locales/vi.json');require('./src/i18n/locales/en.json');console.log('ok')"`

- [ ] **Step 2: useGeoData no-op on falsy url — write the failing test.** Append to `src/hooks/useGeoData.test.jsx` (inside the existing `describe`):
```jsx
  it('is inert when url is falsy (no fetch)', () => {
    globalThis.fetch = vi.fn();
    const { result } = renderHook(() => useGeoData(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
```

- [ ] **Step 3: Run it, confirm FAIL** — `npx vitest run src/hooks/useGeoData.test.jsx` (current code fetches `null`).

- [ ] **Step 4: Implement the guard.** In `src/hooks/useGeoData.js`, change the initial state and add an early return in the effect:
```js
  const [state, setState] = useState(() =>
    url && cache.has(url)
      ? { data: cache.get(url), loading: false, error: null }
      : { data: null, loading: !!url, error: null }
  );

  useEffect(() => {
    if (!url) { setState({ data: null, loading: false, error: null }); return; }
    if (cache.has(url)) {
      setState({ data: cache.get(url), loading: false, error: null });
      return;
    }
    let active = true;
    setState({ data: null, loading: true, error: null });
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        cache.set(url, data);
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (active) setState({ data: null, loading: false, error });
      });
    return () => { active = false; };
  }, [url]);
```

- [ ] **Step 5: Run it, confirm PASS** (3 useGeoData tests now).

- [ ] **Step 6: Create the shared extract renderer** — `src/components/WikiExtracts.jsx`
```jsx
import { useLanguage } from '../context/LanguageContext.jsx';

export default function WikiExtracts({ extracts }) {
  const { tt } = useLanguage();
  if (!extracts || extracts.length === 0) return null;
  return (
    <div className="space-y-3">
      {extracts.map((ex) => (
        <div key={ex.lang}>
          {ex.thumbnail && <img src={ex.thumbnail} alt="" className="float-right ml-2 w-16 rounded" />}
          <p className="text-sm leading-relaxed">{ex.extract}</p>
          {ex.title && (
            <a className="text-sm text-blue-500 underline"
               href={`https://${ex.lang}.wikipedia.org/wiki/${encodeURIComponent(ex.title)}`}
               target="_blank" rel="noreferrer">{tt('panel.readMore')}</a>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Run full suite + commit**
```bash
npm run test   # all green
git add src/i18n/locales/vi.json src/i18n/locales/en.json src/hooks/useGeoData.js src/hooks/useGeoData.test.jsx src/components/WikiExtracts.jsx
git commit -m "feat: add panel i18n keys, useGeoData null-guard, shared WikiExtracts"
```

---

## Task 6: CountryLayerFacts component (TDD)

**Files:** Create `src/components/CountryLayerFacts.jsx`, `src/components/CountryLayerFacts.test.jsx`

- [ ] **Step 1: Write the failing test** — `src/components/CountryLayerFacts.test.jsx`
```jsx
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
```

- [ ] **Step 2: Run it, confirm FAIL** — module not found.

- [ ] **Step 3: Implement** — `src/components/CountryLayerFacts.jsx`
```jsx
import { useGeoData } from '../hooks/useGeoData.js';
import { useWikiSummary } from '../hooks/useWikiSummary.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { dualText } from '../lib/dualText.js';
import { COMMODITIES } from '../data/commodities.js';
import { commoditiesForCountry, volcanoCountInBounds } from '../lib/countryFacts.js';
import { climateTitles } from '../lib/featureTitles.js';
import WikiExtracts from './WikiExtracts.jsx';

export default function CountryLayerFacts({ iso2, bounds, nameVi, nameEn, activeOverlayIds }) {
  const { mode, tt } = useLanguage();
  const agActive = activeOverlayIds.has('agriculture');
  const tecActive = activeOverlayIds.has('tectonic');
  const climateActive = activeOverlayIds.has('climate');
  const currentsActive = activeOverlayIds.has('currents');

  const { data: agData } = useGeoData(agActive ? '/data/agriculture.json' : null);
  const { data: volData } = useGeoData(tecActive ? '/data/volcanoes.geojson' : null);
  const climate = useWikiSummary(climateActive ? climateTitles(nameVi, nameEn) : null, mode);

  if (!agActive && !tecActive && !climateActive && !currentsActive) return null;

  const commodities = agData
    ? commoditiesForCountry(agData, iso2).map((id) => COMMODITIES.find((c) => c.id === id)).filter(Boolean)
    : [];
  const volcanoCount = volData ? volcanoCountInBounds(volData, bounds) : null;

  return (
    <div className="mt-4 border-t pt-3 space-y-2">
      <h3 className="font-semibold text-sm">{tt('panel.layerDetails')}</h3>

      {agActive && commodities.length > 0 && (
        <p className="text-sm">
          <span className="font-semibold">{tt('panel.agricultureProducts')}: </span>
          {commodities.map((c) => `${c.icon} ${dualText(c.vi, c.en, mode)}`).join(', ')}
        </p>
      )}

      {tecActive && volcanoCount != null && (
        <p className="text-sm">
          <span className="font-semibold">{tt('panel.volcanoes')}: </span>{volcanoCount}
        </p>
      )}

      {climateActive && (
        <div>
          <p className="font-semibold text-sm">{tt('layer.climate')}</p>
          {climate.extracts.length > 0
            ? <WikiExtracts extracts={climate.extracts} />
            : <p className="text-sm opacity-70">{tt('panel.climateNote')}</p>}
        </div>
      )}

      {currentsActive && <p className="text-sm opacity-70">{tt('panel.currentsNote')}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Run it, confirm PASS** (4 tests). Then `npm run test` → all green.

- [ ] **Step 5: Commit**
```bash
git add src/components/CountryLayerFacts.jsx src/components/CountryLayerFacts.test.jsx
git commit -m "feat: add CountryLayerFacts layer-details section"
```

---

## Task 7: InfoPanel branching + App wiring

**Files:** Modify `src/components/InfoPanel.jsx`, `src/App.jsx`; Replace `src/components/InfoPanel.test.jsx`

- [ ] **Step 1: Replace the test** — `src/components/InfoPanel.test.jsx`
```jsx
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
    expect(screen.getByText('Dòng biển nóng')).toBeInTheDocument(); // warm label (vi default)
    expect(screen.getByText('A warm current.')).toBeInTheDocument();
    expect(screen.queryByTestId('facts')).toBeNull();
  });
  it('renders a volcano feature view', () => {
    renderWith({ kind: 'volcano', name: 'Mount Fuji' });
    expect(screen.getByText('Mount Fuji')).toBeInTheDocument();
    expect(screen.getByText('Núi lửa')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL** — the current InfoPanel doesn't branch on kind / use these hooks.

- [ ] **Step 3: Implement** — replace the contents of `src/components/InfoPanel.jsx`
```jsx
import { useLanguage } from '../context/LanguageContext.jsx';
import { useSelection } from '../context/SelectionContext.jsx';
import { useWikiInfo } from '../hooks/useWikiInfo.js';
import { useWikiSummary } from '../hooks/useWikiSummary.js';
import { useGeoData } from '../hooks/useGeoData.js';
import { dualText } from '../lib/dualText.js';
import { featureWikiTitles } from '../lib/featureTitles.js';
import WikiExtracts from './WikiExtracts.jsx';
import CountryLayerFacts from './CountryLayerFacts.jsx';

export default function InfoPanel({ injectedSelection, activeOverlayIds = new Set() }) {
  const { mode, tt } = useLanguage();
  const { selected, setSelected } = useSelection();
  const feature = injectedSelection !== undefined ? injectedSelection : selected;
  const kind = (feature && feature.kind) || 'country';

  // Country: Wikidata + Wikipedia (only for country kind).
  const wiki = useWikiInfo(feature && kind === 'country' ? feature : null, mode);

  // Commodity needs its country's name (from cached countries data) to build the title.
  const { data: countries } = useGeoData(kind === 'commodity' ? '/data/countries.geojson' : null);
  let countryName = null;
  if (kind === 'commodity' && countries) {
    const cf = countries.features.find((x) => x.properties.ISO_A2 === feature.iso2);
    if (cf) countryName = { vi: cf.properties.NAME_VI, en: cf.properties.NAME_EN };
  }
  const summary = useWikiSummary(feature && kind !== 'country' ? featureWikiTitles(feature, countryName) : null, mode);

  if (!feature) return null;

  const title =
    kind === 'volcano' ? (feature.name || '') :
    kind === 'commodity' ? dualText(feature.vi, feature.en, mode) :
    dualText(feature.nameVi, feature.nameEn, mode);

  const featureLabel =
    kind === 'current' ? tt(feature.type === 'warm' ? 'legend.warmCurrent' : 'legend.coldCurrent') :
    kind === 'volcano' ? tt('legend.volcano') :
    kind === 'commodity' ? `${tt('panel.majorProducer')}${countryName ? ': ' + dualText(countryName.vi, countryName.en, mode) : ''}` :
    null;

  return (
    <aside className="absolute top-0 right-0 h-full w-80 max-w-[85vw] z-[1000] overflow-y-auto shadow-2xl p-4"
           style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
      <button onClick={() => setSelected(null)} className="float-right text-xl leading-none"
              aria-label={tt('panel.close')}>×</button>

      <h2 className="text-lg font-bold pr-6">
        {kind === 'commodity' && <span className="mr-1">{feature.icon}</span>}
        {title}
      </h2>

      {kind === 'country' ? (
        <>
          {wiki.loading && <p className="mt-4 opacity-70">{tt('panel.loading')}</p>}
          {wiki.error && (
            <div className="mt-4">
              <p className="opacity-70">{tt('panel.noData')}</p>
              <button onClick={wiki.retry} className="mt-2 px-3 py-1 rounded border">{tt('panel.retry')}</button>
            </div>
          )}
          {wiki.data && !wiki.loading && (
            <div className="mt-3 space-y-3">
              {wiki.data.flag && <img src={wiki.data.flag} alt="" className="w-24 border" />}
              {wiki.data.capital && (
                <p><span className="font-semibold">{tt('panel.capital')}: </span>
                  {dualText(wiki.data.capital.vi, wiki.data.capital.en, mode)}</p>
              )}
              {wiki.data.population != null && (
                <p><span className="font-semibold">{tt('panel.population')}: </span>
                  {wiki.data.population.toLocaleString(mode === 'en' ? 'en-US' : 'vi-VN')}</p>
              )}
              <WikiExtracts extracts={wiki.data.extracts} />
            </div>
          )}
          <CountryLayerFacts
            iso2={feature.iso2} bounds={feature.bounds}
            nameVi={feature.nameVi} nameEn={feature.nameEn}
            activeOverlayIds={activeOverlayIds}
          />
        </>
      ) : (
        <div className="mt-3 space-y-3">
          {featureLabel && <p className="text-sm font-semibold opacity-80">{featureLabel}</p>}
          {summary.loading && <p className="opacity-70">{tt('panel.loading')}</p>}
          {!summary.loading && summary.extracts.length === 0 && (
            <p className="opacity-70">{tt('panel.noData')}</p>
          )}
          <WikiExtracts extracts={summary.extracts} />
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Run it, confirm PASS** (4 tests).

- [ ] **Step 5: Wire App** — in `src/App.jsx`, change `<InfoPanel />` to:
```jsx
              <InfoPanel activeOverlayIds={activeOverlayIds} />
```

- [ ] **Step 6: Run full suite + build**
```bash
npm run test   # all green
npm run build  # success
```

- [ ] **Step 7: Commit**
```bash
git add src/components/InfoPanel.jsx src/components/InfoPanel.test.jsx src/App.jsx
git commit -m "feat: InfoPanel shows layer feature details and per-country layer facts"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full automated check**
```bash
npm run test
npm run build
```
Expected: all tests pass; build clean.

- [ ] **Step 2: Manual run check** (`npm run dev`):
  - Click a country with Climate on → "Layer details" shows a climate description; with Agriculture on → its crops; with Tectonic on → a volcano count.
  - Click an ocean current → its name + warm/cold + a Wikipedia description.
  - Click a volcano → its name + description.
  - Click an agriculture marker (e.g. coffee on Brazil/India) → commodity + "Coffee production in …" description.
  - Switch VI/EN/Dual → labels and descriptions follow (English fallback when no VI article).

- [ ] **Step 3: Commit any doc note if needed** (no code expected here).

---

## Self-review notes (addressed)
- **Spec coverage:** feature titles + climate titles (T1), per-country facts helpers (T2), useWikiSummary with EN fallback (T3), typed selections from all four layers (T4), i18n + useGeoData null-guard + WikiExtracts (T5), CountryLayerFacts incl. climate description (T6), InfoPanel branching + commodity country-name resolution + App wiring (T7), verification (T8). All spec sections map to a task.
- **Type consistency:** selection shapes set in T4 (`{kind:'country',…,bounds}`, `{kind:'current',nameVi,nameEn,type}`, `{kind:'volcano',name}`, `{kind:'commodity',id,vi,en,icon,iso2}`) are consumed identically by `featureWikiTitles` (T1) and InfoPanel (T7). `climateTitles` (T1) consumed by CountryLayerFacts (T6). Helper names (`commoditiesForCountry`, `volcanoCountInBounds`) consistent T2↔T6. `useWikiSummary` return `{extracts,loading,error,retry}` consistent T3↔T6/T7. `WikiExtracts` prop `extracts` consistent T5↔T6/T7.
- **Placeholder scan:** none.
