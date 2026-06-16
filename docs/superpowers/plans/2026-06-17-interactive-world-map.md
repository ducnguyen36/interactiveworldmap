# Interactive World Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React web app with an interactive, vector world map for Vietnamese geography teachers: Vietnamese-labeled countries, click-to-zoom, a Wikipedia/Wikidata info panel, toggleable thematic layers (Political + Tectonic in v1), VI/EN/Dual language, and light/dark themes.

**Architecture:** Vite + React with react-leaflet rendering Natural Earth country polygons (no raster tiles, no API keys). Plain React Context for theme/language/selection state. A data-driven layer registry feeds both the Layer Control panel and the map. Pure, unit-tested modules (`dualText`, `wikipedia`, `wikidata`) back the info panel; theming is driven by a `dark` class on `<html>` toggling CSS variables consumed by both Tailwind and Leaflet SVG.

**Tech Stack:** Vite, React 18, react-leaflet 4 + Leaflet 1.9, Tailwind CSS 3, i18next + react-i18next, Vitest + React Testing Library.

**Reference spec:** `docs/superpowers/specs/2026-06-17-interactive-world-map-design.md`

---

## File structure (built across the tasks)

```
interactiveworldmap/
├── index.html
├── package.json
├── vite.config.js              # Vite + Vitest config
├── tailwind.config.js
├── postcss.config.js
├── README.md
├── scripts/
│   └── fetch-data.mjs          # downloads + trims the open GeoJSON into public/data
├── public/
│   └── data/
│       ├── countries.geojson
│       ├── plates.geojson
│       ├── volcanoes.geojson
│       └── oceans.json
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css               # Tailwind layers + CSS variables + Leaflet overrides
    ├── i18n/
    │   ├── index.js
    │   └── locales/{vi,en}.json
    ├── context/
    │   ├── ThemeContext.jsx
    │   ├── LanguageContext.jsx
    │   └── SelectionContext.jsx
    ├── lib/
    │   ├── dualText.js
    │   ├── wikipedia.js
    │   └── wikidata.js
    ├── hooks/
    │   ├── useGeoData.js
    │   └── useWikiInfo.js
    ├── data/
    │   └── layers.js           # the layer registry
    └── components/
        ├── Header.jsx
        ├── LayerControl.jsx
        ├── MapView.jsx
        ├── InfoPanel.jsx
        └── layers/
            ├── PoliticalLayer.jsx
            └── TectonicLayer.jsx
```

---

## Task 1: Project scaffold (Vite + React + Tailwind + Vitest)

**Files:**
- Create: `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`, `src/setupTests.js`

- [ ] **Step 1: Scaffold Vite React app**

Run in the project root (it already contains `docs/` and `.git`):
```bash
npm create vite@latest . -- --template react
```
If prompted that the directory is not empty, choose "Ignore files and continue".

- [ ] **Step 2: Pin React 18 and install dependencies**

react-leaflet 4 requires React 18. Set exact deps in `package.json` `dependencies`/`devDependencies`, then install:
```bash
npm install react@18.3.1 react-dom@18.3.1 leaflet@1.9.4 react-leaflet@4.2.1 i18next@23.11.5 react-i18next@14.1.2
npm install -D tailwindcss@3.4.4 postcss@8.4.38 autoprefixer@10.4.19 vitest@1.6.0 jsdom@24.1.0 @testing-library/react@16.0.0 @testing-library/jest-dom@6.4.6 @testing-library/user-event@14.5.2
```

- [ ] **Step 3: Initialise Tailwind**

Run:
```bash
npx tailwindcss init -p
```
Overwrite `tailwind.config.js` with:
```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 4: Configure Vite + Vitest**

Overwrite `vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
});
```
Create `src/setupTests.js`:
```js
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Base styles and shell**

Overwrite `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --map-ocean: #cfe8f3;
  --map-land: #e9e6d8;
  --map-stroke: #9aa0a6;
  --map-land-hover: #d8e8c8;
  --panel-bg: #ffffff;
  --panel-text: #1f2933;
  --plate: #d64545;
  --volcano: #b91c1c;
}
.dark {
  --map-ocean: #0b1f2a;
  --map-land: #2a3b2e;
  --map-stroke: #5b6b5e;
  --map-land-hover: #3c5440;
  --panel-bg: #111827;
  --panel-text: #e5e7eb;
  --plate: #f87171;
  --volcano: #fca5a5;
}

html, body, #root { height: 100%; margin: 0; }

/* Leaflet container uses the themed ocean color as the water background */
.leaflet-container { background: var(--map-ocean); font: inherit; }

/* Country polygons (className set in PoliticalLayer) */
.country { fill: var(--map-land); stroke: var(--map-stroke); stroke-width: 0.5; }
.country:hover { fill: var(--map-land-hover); }
.country-selected { fill: var(--map-land-hover); stroke: #2563eb; stroke-width: 1.5; }

/* Tectonic layer */
.plate-boundary { stroke: var(--plate); stroke-width: 1.5; fill: none; }
.volcano { fill: var(--volcano); stroke: #ffffff; stroke-width: 0.6; }

/* Map text labels */
.country-label { background: transparent; border: none; box-shadow: none;
  color: var(--panel-text); font-weight: 600; font-size: 11px; }
.ocean-label { background: transparent; border: none; box-shadow: none;
  color: var(--panel-text); opacity: 0.7; font-style: italic; font-size: 12px; }
.leaflet-tooltip.country-label::before, .leaflet-tooltip.ocean-label::before { display: none; }
```

Overwrite `src/App.jsx`:
```jsx
export default function App() {
  return <div className="h-full grid place-items-center">World map shell</div>;
}
```
Ensure `src/main.jsx` imports the CSS and Leaflet CSS:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 6: Verify dev server and test runner boot**

Add `"test": "vitest run"` to `package.json` scripts.
Run:
```bash
npm run build
```
Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + Tailwind + Vitest"
```

---

## Task 2: dualText utility (pure, TDD)

The display helper used everywhere for VI/EN/Dual text.

**Files:**
- Create: `src/lib/dualText.js`
- Test: `src/lib/dualText.test.js`

- [ ] **Step 1: Write the failing test**

`src/lib/dualText.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { dualText } from './dualText.js';

describe('dualText', () => {
  it('returns Vietnamese in vi mode', () => {
    expect(dualText('Việt Nam', 'Vietnam', 'vi')).toBe('Việt Nam');
  });
  it('returns English in en mode', () => {
    expect(dualText('Việt Nam', 'Vietnam', 'en')).toBe('Vietnam');
  });
  it('joins both in dual mode', () => {
    expect(dualText('Việt Nam', 'Vietnam', 'dual')).toBe('Việt Nam / Vietnam');
  });
  it('collapses dual when vi equals en', () => {
    expect(dualText('Fiji', 'Fiji', 'dual')).toBe('Fiji');
  });
  it('falls back to the other language when one is missing', () => {
    expect(dualText('', 'Vietnam', 'vi')).toBe('Vietnam');
    expect(dualText('Việt Nam', '', 'en')).toBe('Việt Nam');
    expect(dualText('', 'Vietnam', 'dual')).toBe('Vietnam');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/dualText.test.js`
Expected: FAIL — cannot resolve `./dualText.js`.

- [ ] **Step 3: Implement**

`src/lib/dualText.js`:
```js
export function dualText(vi, en, mode) {
  if (mode === 'en') return en || vi || '';
  if (mode === 'dual') {
    if (!vi) return en || '';
    if (!en || en === vi) return vi;
    return `${vi} / ${en}`;
  }
  return vi || en || '';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/dualText.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dualText.js src/lib/dualText.test.js
git commit -m "feat: add dualText display helper"
```

---

## Task 3: i18n + ThemeContext + LanguageContext

**Files:**
- Create: `src/i18n/index.js`, `src/i18n/locales/vi.json`, `src/i18n/locales/en.json`, `src/context/ThemeContext.jsx`, `src/context/LanguageContext.jsx`
- Test: `src/context/LanguageContext.test.jsx`

- [ ] **Step 1: Locale resources**

`src/i18n/locales/vi.json`:
```json
{
  "app.title": "Bản đồ Thế giới Tương tác",
  "panel.capital": "Thủ đô",
  "panel.population": "Dân số",
  "panel.noData": "Không có dữ liệu cho khu vực này.",
  "panel.loading": "Đang tải…",
  "panel.retry": "Thử lại",
  "panel.close": "Đóng",
  "panel.readMore": "Đọc thêm trên Wikipedia",
  "control.title": "Lớp bản đồ",
  "control.base": "Bản đồ nền",
  "control.overlays": "Lớp phủ",
  "control.comingSoon": "Sắp có",
  "layer.political": "Bản đồ Chính trị",
  "layer.tectonic": "Mảng kiến tạo & Núi lửa",
  "layer.currents": "Dòng biển",
  "layer.climate": "Đới khí hậu",
  "layer.agriculture": "Nông nghiệp",
  "lang.label": "Ngôn ngữ",
  "theme.toggle": "Đổi giao diện sáng/tối"
}
```
`src/i18n/locales/en.json`:
```json
{
  "app.title": "Interactive World Map",
  "panel.capital": "Capital",
  "panel.population": "Population",
  "panel.noData": "No data available for this area.",
  "panel.loading": "Loading…",
  "panel.retry": "Retry",
  "panel.close": "Close",
  "panel.readMore": "Read more on Wikipedia",
  "control.title": "Map Layers",
  "control.base": "Base map",
  "control.overlays": "Overlays",
  "control.comingSoon": "Coming soon",
  "layer.political": "Political Map",
  "layer.tectonic": "Tectonic Plates & Volcanoes",
  "layer.currents": "Ocean Currents",
  "layer.climate": "Climate Zones",
  "layer.agriculture": "Agriculture",
  "lang.label": "Language",
  "theme.toggle": "Toggle light/dark theme"
}
```

- [ ] **Step 2: i18next setup**

`src/i18n/index.js`:
```js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: 'vi',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 3: Write the failing LanguageContext test**

`src/context/LanguageContext.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from './LanguageContext.jsx';

function Probe() {
  const { mode, setMode, tt } = useLanguage();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="title">{tt('app.title')}</span>
      <button onClick={() => setMode('dual')}>dual</button>
    </div>
  );
}

describe('LanguageContext', () => {
  it('defaults to vi and translates', () => {
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId('mode').textContent).toBe('vi');
    expect(screen.getByTestId('title').textContent).toBe('Bản đồ Thế giới Tương tác');
  });
  it('joins both languages in dual mode', () => {
    render(<LanguageProvider><Probe /></LanguageProvider>);
    act(() => { screen.getByText('dual').click(); });
    expect(screen.getByTestId('title').textContent).toBe(
      'Bản đồ Thế giới Tương tác / Interactive World Map'
    );
  });
});
```

- [ ] **Step 4: Run it to verify failure**

Run: `npx vitest run src/context/LanguageContext.test.jsx`
Expected: FAIL — cannot resolve `./LanguageContext.jsx`.

- [ ] **Step 5: Implement LanguageContext**

`src/context/LanguageContext.jsx`:
```jsx
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import i18n from '../i18n/index.js';
import { dualText } from '../lib/dualText.js';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'iwm.lang';

export function LanguageProvider({ children }) {
  const [mode, setModeState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'vi');

  useEffect(() => {
    i18n.changeLanguage(mode === 'en' ? 'en' : 'vi');
  }, [mode]);

  const setMode = useCallback((next) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const tt = useCallback((key) => {
    const tvi = i18n.getFixedT('vi');
    const ten = i18n.getFixedT('en');
    return dualText(tvi(key), ten(key), mode);
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode, tt }), [mode, setMode, tt]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
```

- [ ] **Step 6: Implement ThemeContext**

`src/context/ThemeContext.jsx`:
```jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'iwm.theme';

function initialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

- [ ] **Step 7: Run tests to verify pass**

Run: `npx vitest run src/context/LanguageContext.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add src/i18n src/context/LanguageContext.jsx src/context/ThemeContext.jsx src/context/LanguageContext.test.jsx
git commit -m "feat: add i18n, language and theme contexts"
```

---

## Task 4: Data fetch script + ship data files

Downloads the open datasets, trims them to needed fields, and writes `public/data/`. Run once at build-setup time; outputs are committed so the app needs no network for base data.

**Files:**
- Create: `scripts/fetch-data.mjs`, `public/data/oceans.json`
- Output (committed): `public/data/{countries,plates,volcanoes}.geojson`

- [ ] **Step 1: Write the fetch/trim script**

`scripts/fetch-data.mjs`:
```js
import { writeFile, mkdir } from 'node:fs/promises';

const OUT = new URL('../public/data/', import.meta.url);

const COUNTRIES = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const PLATES = 'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json';
const VOLCANOES = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_volcanoes.geojson';

const KEEP = ['NAME_VI', 'NAME_EN', 'NAME_LONG', 'WIKIDATAID', 'ISO_A2', 'ISO_A3', 'CONTINENT', 'POP_EST', 'LABELRANK'];

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.json();
}

function trimCountries(fc) {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => {
      const props = {};
      for (const k of KEEP) if (k in f.properties) props[k] = f.properties[k];
      return { type: 'Feature', properties: props, geometry: f.geometry };
    }),
  };
}

function trimVolcanoes(fc) {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => ({
      type: 'Feature',
      properties: { name: f.properties.NAME ?? f.properties.name ?? null },
      geometry: f.geometry,
    })),
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const [countries, plates, volcanoes] = await Promise.all([
    getJson(COUNTRIES), getJson(PLATES), getJson(VOLCANOES),
  ]);
  await writeFile(new URL('countries.geojson', OUT), JSON.stringify(trimCountries(countries)));
  await writeFile(new URL('plates.geojson', OUT), JSON.stringify(plates));
  await writeFile(new URL('volcanoes.geojson', OUT), JSON.stringify(trimVolcanoes(volcanoes)));
  console.log('Wrote countries, plates, volcanoes to public/data/');
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the script and verify fields**

Run:
```bash
node scripts/fetch-data.mjs
node -e "const d=require('./public/data/countries.geojson');const p=d.features.find(f=>f.properties.ISO_A2==='VN').properties;console.log(p)"
```
Expected: prints a Vietnam properties object containing `NAME_VI: 'Việt Nam'` (or similar), `WIKIDATAID: 'Q881'`, `POP_EST`, and `LABELRANK`. If `LABELRANK` is absent, note it — PoliticalLayer's permanent-label rule (Task 7) must then fall back to a population threshold.

- [ ] **Step 3: Create curated oceans/continents labels**

`public/data/oceans.json` (label coords are [lat, lng] for the label anchor):
```json
{
  "features": [
    { "id": "pacific", "name_vi": "Thái Bình Dương", "name_en": "Pacific Ocean", "wikidata": "Q98", "coord": [0, -150] },
    { "id": "atlantic", "name_vi": "Đại Tây Dương", "name_en": "Atlantic Ocean", "wikidata": "Q97", "coord": [10, -35] },
    { "id": "indian", "name_vi": "Ấn Độ Dương", "name_en": "Indian Ocean", "wikidata": "Q1239", "coord": [-25, 80] },
    { "id": "arctic", "name_vi": "Bắc Băng Dương", "name_en": "Arctic Ocean", "wikidata": "Q788", "coord": [78, 0] },
    { "id": "southern", "name_vi": "Nam Đại Dương", "name_en": "Southern Ocean", "wikidata": "Q4918", "coord": [-65, 140] }
  ]
}
```

- [ ] **Step 4: Commit data + script**

```bash
git add scripts/fetch-data.mjs public/data
git commit -m "feat: add data fetch script and ship base geo data"
```

---

## Task 5: useGeoData hook (TDD)

Fetches and caches a JSON/GeoJSON file from `public/data/`.

**Files:**
- Create: `src/hooks/useGeoData.js`
- Test: `src/hooks/useGeoData.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/hooks/useGeoData.test.jsx`:
```jsx
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
```

- [ ] **Step 2: Run it to verify failure**

Run: `npx vitest run src/hooks/useGeoData.test.jsx`
Expected: FAIL — cannot resolve `./useGeoData.js`.

- [ ] **Step 3: Implement**

`src/hooks/useGeoData.js`:
```js
import { useEffect, useState } from 'react';

const cache = new Map();
export function _clearGeoCache() { cache.clear(); }

export function useGeoData(url) {
  const [state, setState] = useState(() =>
    cache.has(url)
      ? { data: cache.get(url), loading: false, error: null }
      : { data: null, loading: true, error: null }
  );

  useEffect(() => {
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

  return state;
}
```

- [ ] **Step 4: Run it to verify pass**

Run: `npx vitest run src/hooks/useGeoData.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGeoData.js src/hooks/useGeoData.test.jsx
git commit -m "feat: add useGeoData fetch+cache hook"
```

---

## Task 6: SelectionContext + layer registry

**Files:**
- Create: `src/context/SelectionContext.jsx`, `src/data/layers.js`
- Test: `src/data/layers.test.js`

- [ ] **Step 1: SelectionContext**

`src/context/SelectionContext.jsx`:
```jsx
import { createContext, useContext, useState, useMemo } from 'react';

const SelectionContext = createContext(null);

export function SelectionProvider({ children }) {
  const [selected, setSelected] = useState(null); // { wikidata, iso2, nameVi, nameEn, population }
  const value = useMemo(() => ({ selected, setSelected }), [selected]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider');
  return ctx;
}
```

- [ ] **Step 2: Write the failing registry test**

`src/data/layers.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { LAYERS, baseLayers, overlayLayers } from './layers.js';

describe('layer registry', () => {
  it('every layer has id, labelKey, kind', () => {
    for (const l of LAYERS) {
      expect(l.id).toBeTruthy();
      expect(l.labelKey).toMatch(/^layer\./);
      expect(['base', 'overlay']).toContain(l.kind);
    }
  });
  it('exposes exactly one default-enabled base layer', () => {
    const defaults = baseLayers().filter((l) => l.enabledByDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe('political');
  });
  it('political and tectonic are implemented (not disabled)', () => {
    const byId = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
    expect(byId.political.disabled).toBeFalsy();
    expect(byId.tectonic.disabled).toBeFalsy();
    expect(byId.currents.disabled).toBe(true);
  });
});
```

- [ ] **Step 3: Run it to verify failure**

Run: `npx vitest run src/data/layers.test.js`
Expected: FAIL — cannot resolve `./layers.js`.

- [ ] **Step 4: Implement the registry**

`src/data/layers.js`:
```js
import PoliticalLayer from '../components/layers/PoliticalLayer.jsx';
import TectonicLayer from '../components/layers/TectonicLayer.jsx';

export const LAYERS = [
  { id: 'political', labelKey: 'layer.political', kind: 'base', enabledByDefault: true, component: PoliticalLayer },
  { id: 'tectonic', labelKey: 'layer.tectonic', kind: 'overlay', enabledByDefault: false, component: TectonicLayer },
  { id: 'currents', labelKey: 'layer.currents', kind: 'overlay', disabled: true, component: null },
  { id: 'climate', labelKey: 'layer.climate', kind: 'overlay', disabled: true, component: null },
  { id: 'agriculture', labelKey: 'layer.agriculture', kind: 'overlay', disabled: true, component: null },
];

export const baseLayers = () => LAYERS.filter((l) => l.kind === 'base');
export const overlayLayers = () => LAYERS.filter((l) => l.kind === 'overlay');
```

> Note: this file imports the layer components built in Task 7. Implement Task 7 before running this test, or stub the two components first. The test run in Step 5 assumes Task 7 is done.

- [ ] **Step 5: Run it to verify pass** (after Task 7)

Run: `npx vitest run src/data/layers.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/context/SelectionContext.jsx src/data/layers.js src/data/layers.test.js
git commit -m "feat: add selection context and layer registry"
```

---

## Task 7: Map layer components (PoliticalLayer + TectonicLayer)

**Files:**
- Create: `src/components/layers/PoliticalLayer.jsx`, `src/components/layers/TectonicLayer.jsx`

> These are rendered inside a Leaflet `MapContainer` (Task 8), so they may call `useMap()`. They are not unit-tested directly (jsdom has no real map); they are exercised via the app smoke test and manual verification.

- [ ] **Step 1: PoliticalLayer**

`src/components/layers/PoliticalLayer.jsx`:
```jsx
import { useRef } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useSelection } from '../../context/SelectionContext.jsx';
import { dualText } from '../../lib/dualText.js';

export default function PoliticalLayer() {
  const { data } = useGeoData('/data/countries.geojson');
  const { mode } = useLanguage();
  const { setSelected } = useSelection();
  const map = useMap();
  const geoRef = useRef(null);

  if (!data) return null;

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    const label = dualText(p.NAME_VI, p.NAME_EN, mode);
    const isMajor = (p.LABELRANK ?? 9) <= 2;
    layer.bindTooltip(label, isMajor
      ? { permanent: true, direction: 'center', className: 'country-label' }
      : { sticky: true });
    layer.on({
      mouseover: (e) => e.target.setStyle({ weight: 1.2 }),
      mouseout: (e) => geoRef.current?.resetStyle(e.target),
      click: () => {
        setSelected({
          wikidata: p.WIKIDATAID || null,
          iso2: p.ISO_A2 && p.ISO_A2 !== '-99' ? p.ISO_A2 : null,
          nameVi: p.NAME_VI, nameEn: p.NAME_EN, population: p.POP_EST ?? null,
        });
        map.fitBounds(layer.getBounds(), { animate: true, maxZoom: 5, padding: [20, 20] });
      },
    });
  };

  // key on mode so labels re-render when language changes
  return (
    <GeoJSON
      key={mode}
      ref={geoRef}
      data={data}
      onEachFeature={onEachFeature}
      style={() => ({ className: 'country', fillOpacity: 1, weight: 0.5 })}
    />
  );
}
```

- [ ] **Step 2: TectonicLayer**

`src/components/layers/TectonicLayer.jsx`:
```jsx
import L from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';

export default function TectonicLayer() {
  const { data: plates } = useGeoData('/data/plates.geojson');
  const { data: volcanoes } = useGeoData('/data/volcanoes.geojson');

  return (
    <>
      {plates && (
        <GeoJSON data={plates} style={() => ({ className: 'plate-boundary', weight: 1.5 })} />
      )}
      {volcanoes && (
        <GeoJSON
          data={volcanoes}
          pointToLayer={(feature, latlng) =>
            L.circleMarker(latlng, { radius: 3.5, className: 'volcano', fillOpacity: 0.9 })
          }
          onEachFeature={(feature, layer) => {
            if (feature.properties?.name) layer.bindTooltip(feature.properties.name, { sticky: true });
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Verify the registry test now passes**

Run: `npx vitest run src/data/layers.test.js`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add src/components/layers
git commit -m "feat: add political and tectonic map layers"
```

---

## Task 8: MapView + LayerControl

**Files:**
- Create: `src/components/MapView.jsx`, `src/components/LayerControl.jsx`

- [ ] **Step 1: MapView**

`src/components/MapView.jsx`:
```jsx
import { MapContainer } from 'react-leaflet';
import { LAYERS } from '../data/layers.js';

export default function MapView({ activeBaseId, activeOverlayIds }) {
  const active = LAYERS.filter(
    (l) => (l.kind === 'base' && l.id === activeBaseId) ||
           (l.kind === 'overlay' && activeOverlayIds.has(l.id))
  );
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={7}
      worldCopyJump
      className="h-full w-full"
    >
      {active.map((l) => l.component && <l.component key={l.id} />)}
    </MapContainer>
  );
}
```

- [ ] **Step 2: LayerControl**

`src/components/LayerControl.jsx`:
```jsx
import { baseLayers, overlayLayers } from '../data/layers.js';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function LayerControl({ activeBaseId, setActiveBaseId, activeOverlayIds, toggleOverlay }) {
  const { tt } = useLanguage();
  return (
    <div className="absolute top-4 left-4 z-[1000] rounded-lg shadow-lg p-3 text-sm"
         style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
      <h2 className="font-semibold mb-2">{tt('control.title')}</h2>
      <p className="uppercase text-xs opacity-60 mb-1">{tt('control.base')}</p>
      {baseLayers().map((l) => (
        <label key={l.id} className="flex items-center gap-2 mb-1 cursor-pointer">
          <input type="radio" name="base" checked={activeBaseId === l.id}
                 onChange={() => setActiveBaseId(l.id)} />
          <span>{tt(l.labelKey)}</span>
        </label>
      ))}
      <p className="uppercase text-xs opacity-60 mt-2 mb-1">{tt('control.overlays')}</p>
      {overlayLayers().map((l) => (
        <label key={l.id}
               className={`flex items-center gap-2 mb-1 ${l.disabled ? 'opacity-40' : 'cursor-pointer'}`}>
          <input type="checkbox" disabled={l.disabled}
                 checked={activeOverlayIds.has(l.id)}
                 onChange={() => toggleOverlay(l.id)} />
          <span>{tt(l.labelKey)}{l.disabled ? ` (${tt('control.comingSoon')})` : ''}</span>
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MapView.jsx src/components/LayerControl.jsx
git commit -m "feat: add map view and layer control panel"
```

---

## Task 9: wikipedia + wikidata libraries (pure, TDD)

**Files:**
- Create: `src/lib/wikipedia.js`, `src/lib/wikidata.js`
- Test: `src/lib/wikipedia.test.js`, `src/lib/wikidata.test.js`

- [ ] **Step 1: Write the failing wikipedia test**

`src/lib/wikipedia.test.js`:
```js
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
```

- [ ] **Step 2: Run it to verify failure**

Run: `npx vitest run src/lib/wikipedia.test.js`
Expected: FAIL — cannot resolve `./wikipedia.js`.

- [ ] **Step 3: Implement wikipedia.js**

`src/lib/wikipedia.js`:
```js
export function summaryUrl(lang, title) {
  return `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
}

export function parseSummary(json) {
  if (!json || json.type?.endsWith('not_found')) return null;
  return {
    title: json.title ?? null,
    extract: json.extract ?? '',
    thumbnail: json.thumbnail?.source ?? null,
  };
}
```

- [ ] **Step 4: Write the failing wikidata test**

`src/lib/wikidata.test.js`:
```js
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
```

- [ ] **Step 5: Run it to verify failure**

Run: `npx vitest run src/lib/wikidata.test.js`
Expected: FAIL — cannot resolve `./wikidata.js`.

- [ ] **Step 6: Implement wikidata.js**

`src/lib/wikidata.js`:
```js
export function entitiesUrl(ids, languages = ['vi', 'en']) {
  const idParam = Array.isArray(ids) ? ids.join('|') : ids;
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: idParam,
    props: 'labels|claims|sitelinks',
    languages: languages.join('|'),
    sitefilter: languages.map((l) => `${l}wiki`).join('|'),
    format: 'json',
    origin: '*',
  });
  return `https://www.wikidata.org/w/api.php?${params.toString()}`;
}

export function getEntity(json, id) {
  return json?.entities?.[id] ?? null;
}

export function claimEntityId(entity, prop) {
  return entity?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.id ?? null;
}

export function claimQuantity(entity, prop) {
  const amount = entity?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.amount;
  if (amount == null) return null;
  return Number(String(amount).replace('+', ''));
}

export function label(entity, lang) {
  return entity?.labels?.[lang]?.value ?? null;
}

export function siteTitle(entity, lang) {
  return entity?.sitelinks?.[`${lang}wiki`]?.title ?? null;
}
```

- [ ] **Step 7: Run both lib tests to verify pass**

Run: `npx vitest run src/lib/wikipedia.test.js src/lib/wikidata.test.js`
Expected: PASS (wikipedia 3, wikidata 3).

- [ ] **Step 8: Commit**

```bash
git add src/lib/wikipedia.js src/lib/wikidata.js src/lib/wikipedia.test.js src/lib/wikidata.test.js
git commit -m "feat: add wikipedia and wikidata pure helpers"
```

---

## Task 10: useWikiInfo hook (orchestration, TDD)

Combines feature properties + Wikidata + Wikipedia into the panel's data shape.

**Files:**
- Create: `src/hooks/useWikiInfo.js`
- Test: `src/hooks/useWikiInfo.test.jsx`

Data shape returned in `data`:
```
{
  name: { vi, en },
  flag: string|null,                 // flagcdn URL or null
  capital: { vi, en } | null,
  population: number|null,
  extracts: [{ lang, title, extract, thumbnail }]   // one per active language
}
```

- [ ] **Step 1: Write the failing test**

`src/hooks/useWikiInfo.test.jsx`:
```jsx
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
```

- [ ] **Step 2: Run it to verify failure**

Run: `npx vitest run src/hooks/useWikiInfo.test.jsx`
Expected: FAIL — cannot resolve `./useWikiInfo.js`.

- [ ] **Step 3: Implement**

`src/hooks/useWikiInfo.js`:
```js
import { useEffect, useState, useCallback } from 'react';
import { entitiesUrl, getEntity, claimEntityId, label, siteTitle } from '../lib/wikidata.js';
import { summaryUrl, parseSummary } from '../lib/wikipedia.js';

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function flagUrl(iso2) {
  return iso2 ? `https://flagcdn.com/w160/${iso2.toLowerCase()}.png` : null;
}

async function load(feature, langs) {
  const result = {
    name: { vi: feature.nameVi, en: feature.nameEn },
    flag: flagUrl(feature.iso2),
    capital: null,
    population: feature.population ?? null,
    extracts: [],
  };
  const titles = { vi: feature.nameVi, en: feature.nameEn };

  // Wikidata: capital + per-language article titles (+ population fallback)
  if (feature.wikidata) {
    try {
      const json = await getJson(entitiesUrl([feature.wikidata], ['vi', 'en']));
      const entity = getEntity(json, feature.wikidata);
      for (const l of ['vi', 'en']) titles[l] = siteTitle(entity, l) || titles[l];
      const capId = claimEntityId(entity, 'P36');
      if (capId) {
        const capJson = await getJson(entitiesUrl([capId], ['vi', 'en']));
        const capEntity = getEntity(capJson, capId);
        result.capital = { vi: label(capEntity, 'vi'), en: label(capEntity, 'en') };
      }
    } catch { /* keep name fallbacks */ }
  }

  // Wikipedia: one extract per active language
  for (const l of langs) {
    if (!titles[l]) continue;
    try {
      const summary = parseSummary(await getJson(summaryUrl(l, titles[l])));
      if (summary) result.extracts.push({ lang: l, ...summary });
    } catch { /* skip this language */ }
  }
  return result;
}

export function useWikiInfo(feature, mode) {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const langs = mode === 'dual' ? ['vi', 'en'] : [mode];

  const run = useCallback(() => {
    if (!feature) { setState({ data: null, loading: false, error: null }); return () => {}; }
    let active = true;
    setState({ data: null, loading: true, error: null });
    load(feature, langs)
      .then((data) => { if (active) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (active) setState({ data: null, loading: false, error }); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature, mode]);

  useEffect(() => run(), [run]);
  return { ...state, retry: run };
}
```

- [ ] **Step 4: Run it to verify pass**

Run: `npx vitest run src/hooks/useWikiInfo.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useWikiInfo.js src/hooks/useWikiInfo.test.jsx
git commit -m "feat: add useWikiInfo orchestration hook"
```

---

## Task 11: InfoPanel (TDD for states)

**Files:**
- Create: `src/components/InfoPanel.jsx`
- Test: `src/components/InfoPanel.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/InfoPanel.test.jsx`:
```jsx
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
```

> `injectedSelection` is a test-only prop letting the panel be driven without the map. In the app it reads from `useSelection()`; the prop overrides that when provided.

- [ ] **Step 2: Run it to verify failure**

Run: `npx vitest run src/components/InfoPanel.test.jsx`
Expected: FAIL — cannot resolve `./InfoPanel.jsx`.

- [ ] **Step 3: Implement**

`src/components/InfoPanel.jsx`:
```jsx
import { useLanguage } from '../context/LanguageContext.jsx';
import { useSelection } from '../context/SelectionContext.jsx';
import { useWikiInfo } from '../hooks/useWikiInfo.js';
import { dualText } from '../lib/dualText.js';

export default function InfoPanel({ injectedSelection }) {
  const { mode, tt } = useLanguage();
  const { selected, setSelected } = useSelection();
  const feature = injectedSelection !== undefined ? injectedSelection : selected;
  const { data, loading, error, retry } = useWikiInfo(feature, mode);

  if (!feature) return null;

  return (
    <aside className="absolute top-0 right-0 h-full w-80 max-w-[85vw] z-[1000] overflow-y-auto shadow-2xl p-4"
           style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
      <button onClick={() => setSelected(null)} className="float-right text-xl leading-none"
              aria-label={tt('panel.close')}>×</button>

      <h2 className="text-lg font-bold pr-6">{dualText(feature.nameVi, feature.nameEn, mode)}</h2>

      {loading && <p className="mt-4 opacity-70">{tt('panel.loading')}</p>}

      {error && (
        <div className="mt-4">
          <p className="opacity-70">{tt('panel.noData')}</p>
          <button onClick={retry} className="mt-2 px-3 py-1 rounded border">{tt('panel.retry')}</button>
        </div>
      )}

      {data && !loading && (
        <div className="mt-3 space-y-3">
          {data.flag && <img src={data.flag} alt="" className="w-24 border" />}
          {data.capital && (
            <p><span className="font-semibold">{tt('panel.capital')}: </span>
              {dualText(data.capital.vi, data.capital.en, mode)}</p>
          )}
          {data.population != null && (
            <p><span className="font-semibold">{tt('panel.population')}: </span>
              {data.population.toLocaleString(mode === 'en' ? 'en-US' : 'vi-VN')}</p>
          )}
          {data.extracts.map((ex) => (
            <div key={ex.lang}>
              {ex.thumbnail && <img src={ex.thumbnail} alt="" className="float-right ml-2 w-16 rounded" />}
              <p className="text-sm leading-relaxed">{ex.extract}</p>
              <a className="text-sm text-blue-500 underline"
                 href={`https://${ex.lang}.wikipedia.org/wiki/${encodeURIComponent(ex.title)}`}
                 target="_blank" rel="noreferrer">{tt('panel.readMore')}</a>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Run it to verify pass**

Run: `npx vitest run src/components/InfoPanel.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/InfoPanel.jsx src/components/InfoPanel.test.jsx
git commit -m "feat: add Wikipedia/Wikidata info panel"
```

---

## Task 12: Header + App assembly

**Files:**
- Create: `src/components/Header.jsx`
- Modify: `src/App.jsx`
- Test: `src/App.test.jsx`

- [ ] **Step 1: Header (language switcher + theme toggle)**

`src/components/Header.jsx`:
```jsx
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const MODES = [
  { id: 'vi', label: 'Tiếng Việt' },
  { id: 'en', label: 'English' },
  { id: 'dual', label: 'Song ngữ' },
];

export default function Header() {
  const { mode, setMode, tt } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="flex items-center justify-between px-4 py-2 shadow z-[1000] relative"
            style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
      <h1 className="font-bold">{tt('app.title')}</h1>
      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor="lang">{tt('lang.label')}</label>
        <select id="lang" value={mode} onChange={(e) => setMode(e.target.value)}
                className="border rounded px-2 py-1 bg-transparent">
          {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <button onClick={toggleTheme} aria-label={tt('theme.toggle')}
                className="border rounded px-2 py-1">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Assemble App**

`src/App.jsx`:
```jsx
import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { SelectionProvider } from './context/SelectionContext.jsx';
import { baseLayers } from './data/layers.js';
import Header from './components/Header.jsx';
import LayerControl from './components/LayerControl.jsx';
import MapView from './components/MapView.jsx';
import InfoPanel from './components/InfoPanel.jsx';

export default function App() {
  const [activeBaseId, setActiveBaseId] = useState(
    baseLayers().find((l) => l.enabledByDefault)?.id ?? 'political'
  );
  const [activeOverlayIds, setActiveOverlayIds] = useState(() => new Set());

  const toggleOverlay = (id) =>
    setActiveOverlayIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <ThemeProvider>
      <LanguageProvider>
        <SelectionProvider>
          <div className="flex flex-col h-full">
            <Header />
            <main className="relative flex-1">
              <MapView activeBaseId={activeBaseId} activeOverlayIds={activeOverlayIds} />
              <LayerControl
                activeBaseId={activeBaseId} setActiveBaseId={setActiveBaseId}
                activeOverlayIds={activeOverlayIds} toggleOverlay={toggleOverlay}
              />
              <InfoPanel />
            </main>
          </div>
        </SelectionProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Write the smoke test**

`src/App.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

// react-leaflet needs real DOM measurement; stub MapView for the smoke test.
vi.mock('./components/MapView.jsx', () => ({ default: () => <div data-testid="map" /> }));

beforeEach(() => { localStorage.clear(); });

describe('App', () => {
  it('renders header title and map without crashing', () => {
    render(<App />);
    expect(screen.getByText('Bản đồ Thế giới Tương tác')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: PASS — all suites green (dualText, LanguageContext, useGeoData, layers, wikipedia, wikidata, useWikiInfo, InfoPanel, App).

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.jsx src/App.jsx src/App.test.jsx
git commit -m "feat: assemble app shell with header, layers, panel"
```

---

## Task 13: README + manual verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

`README.md`:
````markdown
# Interactive World Map (Bản đồ Thế giới Tương tác)

An interactive, vector world map for Vietnamese geography/geology teachers. Vietnamese
labels by default, click-to-zoom, a Wikipedia/Wikidata info panel, toggleable thematic
layers (Political + Tectonic), VI/EN/Dual language, and light/dark themes.

## Requirements
- Node.js 18+

## Setup
```bash
npm install
node scripts/fetch-data.mjs   # only needed if public/data/ is empty; data is committed
npm run dev                   # http://localhost:5173
```

## Scripts
- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run test` — run the unit/component tests (Vitest)

## How it works
- **Base map:** Natural Earth country polygons rendered as GeoJSON (no tiles, no API keys).
- **Labels:** `NAME_VI` / `NAME_EN` from Natural Earth, switched by language mode.
- **Info panel:** flag (flagcdn by ISO code), population (`POP_EST`), capital + article
  titles (Wikidata), and the intro extract (Wikipedia REST summary).
- **Themes:** the `dark` class on `<html>` toggles CSS variables used by both Tailwind
  and the Leaflet SVG.

## Adding a new layer
1. Build a component in `src/components/layers/` (rendered inside the Leaflet map; it may
   use `useMap()` and `useGeoData()`).
2. Add an entry to `src/data/layers.js`:
   `{ id, labelKey, kind: 'base'|'overlay', component }` and a `layer.<id>` string in
   both `src/i18n/locales/vi.json` and `en.json`.
The Layer Control panel and map pick it up automatically.

## Data sources & licenses
- Countries / volcanoes: Natural Earth (public domain).
- Tectonic plate boundaries: Hugo Ahlenius / Peter Bird (Open Data Commons Attribution).
- Flags: flagcdn.com. Summaries: Wikipedia/Wikidata APIs.
````

- [ ] **Step 2: Full verification**

Run:
```bash
npm run test
npm run build
```
Expected: tests pass; build succeeds.

Then run `npm run dev` and manually confirm:
- Map shows with Vietnamese country labels on major countries.
- Clicking a country zooms in and opens the info panel with flag/capital/population/extract.
- Language select (Tiếng Việt / English / Song ngữ) updates header, labels, and panel.
- Theme toggle flips light/dark (map water + land colors change).
- Layer Control toggles the Tectonic overlay (plate lines + volcano dots); the other three
  overlays appear disabled with "Coming soon".

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and layer-extension guide"
```

---

## Self-review notes (addressed)
- **Spec coverage:** core map + VI labels (T7), click-to-zoom (T7), layer control + 2 real
  layers + framework for 3 more (T6–T8), info panel with flag/name/capital/population/extract
  (T10–T11), i18n VI/EN/Dual (T3, used throughout), light/dark theme (T3, T1 CSS vars),
  README (T13). All spec sections map to a task.
- **Type consistency:** the selection object shape (`{ wikidata, iso2, nameVi, nameEn,
  population }`) is produced in PoliticalLayer (T7) and consumed identically by useWikiInfo
  (T10) and InfoPanel (T11). Registry shape (`{ id, labelKey, kind, component, ... }`) is
  consistent across T6, T8, T12.
- **Known verification point:** `LABELRANK` presence is checked in T4 Step 2; if absent the
  permanent-label rule in T7 falls back to a population threshold.
