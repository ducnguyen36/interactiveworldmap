# 3D Globe Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Leaflet map with a MapLibre GL 3D globe (spin / pinch / tap), port all five layers + selection/zoom/labels onto it, and make the UI touch-first for TV touchscreens and iPads.

**Architecture:** `react-map-gl` (maplibre entry) renders a `<Map>` with a minimal style (globe projection, themed ocean background, bundled glyphs). The layer registry stays the single source of truth: each entry keeps a React `component` (now rendering `<Source>/<Layer>/<Marker>`) and gains `interactiveLayerIds` + a pure `selectFeature(feature)` mapper. MapView owns hit-testing, feature-state (hover/selected), and theme-reactive paints; MapController reimplements zoom-to-focus/zoom-back on the MapLibre camera. All downstream UI (SelectionContext, InfoPanel, wiki hooks, i18n, theme) is reused unchanged.

**Tech Stack:** React 18, maplibre-gl ^5, react-map-gl ^8 (`react-map-gl/maplibre`), Vitest.

**Reference spec:** `docs/superpowers/specs/2026-06-18-3d-globe-phase1-design.md`

**Baseline:** branch `feature/3d-globe` (off `master`), 64 tests passing.

**Interim-state note:** Tasks 3–6 migrate the map engine piece by piece. Between them, some registry components are still Leaflet-based; the app *builds and tests green* throughout, but the dev-server runtime is only fully coherent again after Task 6. That is acceptable (no live preview this session); never leave a task with a red build or red tests.

**Convention change:** `focus.center` is now `[lng, lat]` (MapLibre order). Only MapController consumes it, so nothing else changes.

---

## File structure
```
scripts/fetch-glyphs.mjs           NEW  downloads Noto Sans Regular pbf glyph ranges
public/glyphs/Noto Sans Regular/*  NEW  committed glyphs (Latin + Vietnamese)
src/lib/assetUrl.js(.test.js)      NEW  absolute asset URL from Vite BASE_URL
src/lib/geojsonBounds.js(.test.js) NEW  bbox of any GeoJSON geometry
src/lib/isFrontFacing.js(.test.js) NEW  visible-hemisphere test for globe markers
src/lib/mapExpressions.js(.test.js) NEW MapLibre color expressions from palettes
src/lib/labelPoints.js(.test.js)   NEW  country/ocean label point FeatureCollections
src/lib/fullGeometry.js(.test.js)  NEW  full geometry lookup for tile-clipped features
src/lib/mapStyle.js                NEW  base globe style + cssVar helper
src/hooks/useGeoData.js            MOD  export getCachedGeoData
src/components/MapView.jsx         MOD  full rewrite on react-map-gl
src/components/MapController.jsx   MOD  MapLibre camera version
src/components/layers/*.jsx        MOD  all five rewritten on <Source>/<Layer>/<Marker>
src/data/layers.js                 MOD  + interactiveLayerIds, selectFeature
src/data/layers.test.js            MOD  + hit-test config & selectFeature tests
src/components/Header.jsx          MOD  + fullscreen toggle
src/components/LayerControl.jsx    MOD  collapsible, touch-sized
src/components/Legend.jsx          MOD  collapsible, touch-sized
src/components/InfoPanel.jsx       MOD  bottom-sheet on narrow screens, big close
src/i18n/locales/{vi,en}.json      MOD  + control.legend, kiosk.fullscreen
src/index.css                      MOD  drop Leaflet rules; TV/touch sizing
src/main.jsx                       MOD  drop leaflet css
src/lib/bounds.js(.test.js)        DEL  Leaflet-only (replaced by geojsonBounds)
package.json                       MOD  +maplibre-gl,react-map-gl; −react-leaflet,leaflet
README.md                          MOD  engine + device notes
```

---

## Task 1: Deps, glyphs, assetUrl (TDD)

**Files:** Create `scripts/fetch-glyphs.mjs`, `public/glyphs/Noto Sans Regular/*.pbf`, `src/lib/assetUrl.js`, `src/lib/assetUrl.test.js`; Modify `package.json`.

- [ ] **Step 1: Install the new deps** (leave Leaflet installed until Task 8):
```bash
npm install maplibre-gl@^5 react-map-gl@^8
```
Verify the maplibre entry exists: `node -e "import('react-map-gl/maplibre').then(m=>console.log('ok', typeof m.default))"` → prints `ok function` (or `ok object`). If this import path fails, report BLOCKED with the installed versions.

- [ ] **Step 2: Write the failing assetUrl test** — `src/lib/assetUrl.test.js`
```js
import { describe, it, expect } from 'vitest';
import { assetUrl } from './assetUrl.js';

describe('assetUrl', () => {
  it('returns an absolute URL for a public asset', () => {
    const u = assetUrl('data/countries.geojson');
    expect(u.startsWith('http')).toBe(true);
    expect(u.endsWith('/data/countries.geojson')).toBe(true);
    expect(u.includes('//data')).toBe(false);
  });
  it('accepts a leading slash', () => {
    expect(assetUrl('/data/x.json')).toBe(assetUrl('data/x.json'));
  });
});
```

- [ ] **Step 3: Run it, confirm FAIL** — `npx vitest run src/lib/assetUrl.test.js`.

- [ ] **Step 4: Implement** — `src/lib/assetUrl.js`
```js
// Absolute URL for a public asset, resolved against Vite's base. Works at a host root,
// under a subpath, and with the relative './' base used for GitHub Pages. MapLibre style
// URLs (glyphs, source data) must be absolute, hence this helper.
export function assetUrl(path) {
  const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
  return base + path.replace(/^\//, '');
}
```

- [ ] **Step 5: Run it, confirm PASS** (2 tests).

- [ ] **Step 6: Glyph fetch script** — `scripts/fetch-glyphs.mjs`
```js
import { writeFile, mkdir } from 'node:fs/promises';

// MapLibre symbol layers need pre-rendered SDF glyphs. Noto Sans Regular covers
// Latin + Vietnamese; ranges are 256-codepoint blocks (7680-7935 = Latin Extended
// Additional, where precomposed Vietnamese lives). Source: openmaptiles/fonts (OFL).
const FONT = 'Noto Sans Regular';
const RANGES = ['0-255', '256-511', '512-767', '768-1023', '7680-7935'];
const SOURCES = [
  (font, range) => `https://fonts.openmaptiles.org/${encodeURIComponent(font)}/${range}.pbf`,
  (font, range) => `https://raw.githubusercontent.com/openmaptiles/fonts/gh-pages/${encodeURIComponent(font)}/${range}.pbf`,
];

const OUT = new URL(`../public/glyphs/${FONT}/`, import.meta.url);

async function fetchFirst(range) {
  for (const src of SOURCES) {
    const url = src(FONT, range);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 500) return { buf, url };
      }
    } catch { /* try next source */ }
  }
  throw new Error(`No source served glyphs for range ${range}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const range of RANGES) {
    const { buf, url } = await fetchFirst(range);
    await writeFile(new URL(`${range}.pbf`, OUT), buf);
    console.log(`glyphs ${range}: ${buf.length} bytes (${url})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 7: Run it and verify** — `node scripts/fetch-glyphs.mjs` → five lines, each > 500 bytes. If BOTH sources 404 for `Noto Sans Regular`, list the font directories available on one of the sources and pick the closest Noto Sans regular variant, adjust `FONT`, and report the substitution.

- [ ] **Step 8: Verify suite + commit**
```bash
npm run test && npm run build
git add package.json package-lock.json scripts/fetch-glyphs.mjs "public/glyphs" src/lib/assetUrl.js src/lib/assetUrl.test.js
git commit -m "feat: add maplibre deps, bundled label glyphs, assetUrl helper"
```

---

## Task 2: Pure globe helpers (TDD)

**Files:** Create `src/lib/geojsonBounds.js(.test.js)`, `src/lib/isFrontFacing.js(.test.js)`, `src/lib/mapExpressions.js(.test.js)`, `src/lib/labelPoints.js(.test.js)`, `src/lib/fullGeometry.js(.test.js)`; Modify `src/hooks/useGeoData.js`.

- [ ] **Step 1: Failing tests.** Create all five test files:

`src/lib/geojsonBounds.test.js`
```js
import { describe, it, expect } from 'vitest';
import { geojsonBounds } from './geojsonBounds.js';

describe('geojsonBounds', () => {
  it('bounds of a Point', () => {
    expect(geojsonBounds({ type: 'Point', coordinates: [105, 21] }))
      .toEqual({ south: 21, west: 105, north: 21, east: 105 });
  });
  it('bounds of a Polygon', () => {
    expect(geojsonBounds({ type: 'Polygon', coordinates: [[[102, 8], [110, 8], [110, 23], [102, 8]]] }))
      .toEqual({ south: 8, west: 102, north: 23, east: 110 });
  });
  it('bounds of a MultiPolygon spans all parts', () => {
    const g = { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 5]]]] };
    expect(geojsonBounds(g)).toEqual({ south: 0, west: 0, north: 6, east: 6 });
  });
  it('null for missing geometry', () => {
    expect(geojsonBounds(null)).toBeNull();
    expect(geojsonBounds({ type: 'Polygon' })).toBeNull();
  });
});
```

`src/lib/isFrontFacing.test.js`
```js
import { describe, it, expect } from 'vitest';
import { isFrontFacing } from './isFrontFacing.js';

describe('isFrontFacing', () => {
  it('point at the center is visible', () => {
    expect(isFrontFacing([0, 0], [0, 0])).toBe(true);
  });
  it('antipode is hidden', () => {
    expect(isFrontFacing([0, 0], [180, 0])).toBe(false);
  });
  it('just inside / outside the 90° horizon', () => {
    expect(isFrontFacing([0, 0], [89, 0])).toBe(true);
    expect(isFrontFacing([0, 0], [91, 0])).toBe(false);
  });
});
```

`src/lib/mapExpressions.test.js`
```js
import { describe, it, expect } from 'vitest';
import { mapcolor7Expression, climateColorExpression, currentColorExpression } from './mapExpressions.js';
import { mapColor } from './mapColor.js';
import { climateClass } from './climate.js';

describe('mapExpressions', () => {
  it('mapcolor7Expression matches all 7 palette colors with a fallback', () => {
    const e = mapcolor7Expression();
    expect(e[0]).toBe('match');
    for (const n of [1, 2, 3, 4, 5, 6, 7]) expect(e).toContain(mapColor(n));
    expect(e[e.length - 1]).toBe(mapColor(0)); // fallback last
  });
  it('climateColorExpression matches the 5 groups with a fallback', () => {
    const e = climateColorExpression();
    expect(e[0]).toBe('match');
    for (const g of ['A', 'B', 'C', 'D', 'E']) expect(e).toContain(climateClass(g).color);
    expect(e[e.length - 1]).toBe(climateClass('?').color);
  });
  it('currentColorExpression maps warm/cold', () => {
    expect(currentColorExpression('#w', '#c')).toEqual(['match', ['get', 'type'], 'warm', '#w', '#c']);
  });
});
```

`src/lib/labelPoints.test.js`
```js
import { describe, it, expect } from 'vitest';
import { countryLabelPoints, oceanLabelPoints } from './labelPoints.js';

const countries = { features: [
  { properties: { NAME_VI: 'Việt Nam', NAME_EN: 'Vietnam', LABELRANK: 2 },
    geometry: { type: 'Polygon', coordinates: [[[102, 8], [110, 8], [110, 23], [102, 8]]] } },
  { properties: { NAME_VI: 'Nhỏ', NAME_EN: 'Tiny', LABELRANK: 5 },
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } },
] };

describe('countryLabelPoints', () => {
  it('emits a centered point per major country only, labeled by mode', () => {
    const fc = countryLabelPoints(countries, 'vi');
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties.label).toBe('Việt Nam');
    expect(fc.features[0].geometry.coordinates).toEqual([106, 15.5]);
  });
  it('dual mode joins both names', () => {
    expect(countryLabelPoints(countries, 'dual').features[0].properties.label).toBe('Việt Nam / Vietnam');
  });
});

describe('oceanLabelPoints', () => {
  it('converts [lat,lng] ocean coords into lng/lat points', () => {
    const fc = oceanLabelPoints({ features: [{ name_vi: 'Thái Bình Dương', name_en: 'Pacific Ocean', coord: [0, -150] }] }, 'en');
    expect(fc.features[0].geometry.coordinates).toEqual([-150, 0]);
    expect(fc.features[0].properties.label).toBe('Pacific Ocean');
  });
});
```

`src/lib/fullGeometry.test.js`
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { fullGeometry } from './fullGeometry.js';
import { _clearGeoCache, _primeGeoCache } from '../hooks/useGeoData.js';

beforeEach(() => { _clearGeoCache(); });

describe('fullGeometry', () => {
  it('returns the original geometry by feature id from the cached source', () => {
    const fc = { features: [{ geometry: { type: 'Point', coordinates: [1, 2] } }, { geometry: { type: 'Point', coordinates: [3, 4] } }] };
    _primeGeoCache('/data/x.geojson', fc);
    expect(fullGeometry('/data/x.geojson', { id: 1 })).toEqual({ type: 'Point', coordinates: [3, 4] });
  });
  it('null when the cache is cold or id missing', () => {
    expect(fullGeometry('/data/x.geojson', { id: 0 })).toBeNull();
    expect(fullGeometry('/data/x.geojson', {})).toBeNull();
  });
});
```

- [ ] **Step 2: Run all five, confirm FAIL.**

- [ ] **Step 3: Implement.**

`src/lib/geojsonBounds.js`
```js
// Bounding box of any GeoJSON geometry as { south, west, north, east }.
// Replaces the Leaflet-specific boundsToObj.
export function geojsonBounds(geometry) {
  if (!geometry || !geometry.coordinates) return null;
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  const visit = (coords) => {
    if (typeof coords[0] === 'number') {
      if (coords[0] < west) west = coords[0];
      if (coords[0] > east) east = coords[0];
      if (coords[1] < south) south = coords[1];
      if (coords[1] > north) north = coords[1];
    } else {
      for (const c of coords) visit(c);
    }
  };
  visit(geometry.coordinates);
  if (west === Infinity) return null;
  return { south, west, north, east };
}
```

`src/lib/isFrontFacing.js`
```js
// True when a [lng, lat] point is on the visible hemisphere of a globe whose
// camera is centered on [lng, lat] `center` (great-circle distance < 90°).
// Used to hide HTML markers that are "behind" the globe.
export function isFrontFacing(center, point) {
  const toRad = (d) => (d * Math.PI) / 180;
  const clng = toRad(center[0]), clat = toRad(center[1]);
  const plng = toRad(point[0]), plat = toRad(point[1]);
  const cosD = Math.sin(clat) * Math.sin(plat) + Math.cos(clat) * Math.cos(plat) * Math.cos(plng - clng);
  return cosD > 0;
}
```

`src/lib/mapExpressions.js`
```js
import { mapColor } from './mapColor.js';
import { climateClass } from './climate.js';

// MapLibre data-driven color expressions built from the app's palette helpers,
// keeping a single source of truth for layer colors.

export function mapcolor7Expression() {
  const e = ['match', ['get', 'MAPCOLOR7']];
  for (const n of [1, 2, 3, 4, 5, 6, 7]) e.push(n, mapColor(n));
  e.push(mapColor(0));
  return e;
}

export function climateColorExpression() {
  const e = ['match', ['slice', ['coalesce', ['get', 'CODE'], ''], 0, 1]];
  for (const g of ['A', 'B', 'C', 'D', 'E']) e.push(g, climateClass(g).color);
  e.push(climateClass('?').color);
  return e;
}

export function currentColorExpression(warm, cold) {
  return ['match', ['get', 'type'], 'warm', warm, cold];
}
```

`src/lib/labelPoints.js`
```js
import { dualText } from './dualText.js';
import { geojsonBounds } from './geojsonBounds.js';

// Point FeatureCollections used by the symbol label layers. Country labels sit at
// the bbox centre of the feature's largest ring — good enough for classroom labels.

function largestRing(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Polygon') return geometry.coordinates[0] ?? null;
  if (geometry.type === 'MultiPolygon') {
    let best = null, bestLen = -1;
    for (const poly of geometry.coordinates) {
      const ring = poly[0];
      if (ring && ring.length > bestLen) { bestLen = ring.length; best = ring; }
    }
    return best;
  }
  return null;
}

export function countryLabelPoints(countriesFC, mode) {
  const features = [];
  for (const f of countriesFC.features) {
    const p = f.properties;
    if ((p.LABELRANK ?? 9) > 2) continue;
    const ring = largestRing(f.geometry);
    if (!ring) continue;
    const b = geojsonBounds({ type: 'Polygon', coordinates: [ring] });
    if (!b) continue;
    features.push({
      type: 'Feature',
      properties: { label: dualText(p.NAME_VI, p.NAME_EN, mode) },
      geometry: { type: 'Point', coordinates: [(b.west + b.east) / 2, (b.south + b.north) / 2] },
    });
  }
  return { type: 'FeatureCollection', features };
}

export function oceanLabelPoints(oceans, mode) {
  return {
    type: 'FeatureCollection',
    features: (oceans?.features ?? []).map((o) => ({
      type: 'Feature',
      properties: { label: dualText(o.name_vi, o.name_en, mode) },
      // oceans.json stores [lat, lng]; GeoJSON wants [lng, lat]
      geometry: { type: 'Point', coordinates: [o.coord[1], o.coord[0]] },
    })),
  };
}
```

`src/lib/fullGeometry.js`
```js
import { getCachedGeoData } from '../hooks/useGeoData.js';

// Hit-test features from tiled GeoJSON sources have tile-clipped geometry. With
// `generateId`, a feature's id is its index in the original collection, so the full
// geometry can be looked up in the cached source data. Null when unavailable
// (callers fall back to the clipped geometry).
export function fullGeometry(dataPath, feature) {
  if (feature?.id === undefined || feature.id === null) return null;
  const fc = getCachedGeoData(dataPath);
  return fc?.features?.[feature.id]?.geometry ?? null;
}
```

In `src/hooks/useGeoData.js`, add below `_clearGeoCache` (keeping everything else intact):
```js
export function _primeGeoCache(url, data) { cache.set(resolveUrl(url), data); }
export function getCachedGeoData(url) { return cache.get(resolveUrl(url)) ?? null; }
```
(`resolveUrl` already exists in this file; these must be declared AFTER it or use function hoisting — `resolveUrl` is a function declaration, so placement anywhere top-level works.)

- [ ] **Step 4: Run all new tests + full suite, confirm PASS.**

- [ ] **Step 5: Commit**
```bash
git add src/lib/geojsonBounds.js src/lib/geojsonBounds.test.js src/lib/isFrontFacing.js src/lib/isFrontFacing.test.js src/lib/mapExpressions.js src/lib/mapExpressions.test.js src/lib/labelPoints.js src/lib/labelPoints.test.js src/lib/fullGeometry.js src/lib/fullGeometry.test.js src/hooks/useGeoData.js
git commit -m "feat: add pure globe helpers (bounds, hemisphere, expressions, labels)"
```

---

## Task 3: Base globe — mapStyle, MapController, MapView

**Files:** Create `src/lib/mapStyle.js`; Rewrite `src/components/MapController.jsx`, `src/components/MapView.jsx`.

> Not unit-tested (WebGL); the App smoke test mocks MapView. Build + tests must stay green.

- [ ] **Step 1:** `src/lib/mapStyle.js`
```js
import { assetUrl } from './assetUrl.js';

// Read a CSS custom property (theme variable) at runtime.
export function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// Minimal MapLibre style: globe projection, themed ocean background, bundled glyphs.
// All data layers are added as react-map-gl <Source>/<Layer> children.
export function baseMapStyle() {
  return {
    version: 8,
    projection: { type: 'globe' },
    glyphs: assetUrl('glyphs/') + '{fontstack}/{range}.pbf',
    sources: {},
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': cssVar('--map-ocean', '#cfe8f3') } },
    ],
  };
}
```

- [ ] **Step 2:** Rewrite `src/components/MapController.jsx`
```jsx
import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useSelection } from '../context/SelectionContext.jsx';

// Selection-driven camera: fly to the clicked feature; restore the prior view on close.
// focus is { bounds: {south,west,north,east} } or { center: [lng, lat] }.
export default function MapController() {
  const { current: map } = useMap();
  const { selected } = useSelection();
  const savedView = useRef(null);

  useEffect(() => {
    if (!map) return;
    if (selected && selected.focus) {
      if (!savedView.current) {
        const c = map.getCenter();
        savedView.current = { center: [c.lng, c.lat], zoom: map.getZoom() };
      }
      const f = selected.focus;
      if (f.bounds) {
        const b = f.bounds;
        map.fitBounds([[b.west, b.south], [b.east, b.north]], { maxZoom: 5.5, padding: 40, duration: 1200 });
      } else if (f.center) {
        map.flyTo({ center: f.center, zoom: Math.max(map.getZoom(), 5.5), duration: 1200 });
      }
    } else if (!selected && savedView.current) {
      map.flyTo({ center: savedView.current.center, zoom: savedView.current.zoom, duration: 1200 });
      savedView.current = null;
    }
  }, [selected, map]);

  return null;
}
```

- [ ] **Step 3:** Rewrite `src/components/MapView.jsx`
```jsx
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import Map, { AttributionControl, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LAYERS } from '../data/layers.js';
import { baseMapStyle, cssVar } from '../lib/mapStyle.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { useSelection } from '../context/SelectionContext.jsx';
import MapController from './MapController.jsx';

export default function MapView({ activeBaseId, activeOverlayIds }) {
  const { theme } = useTheme();
  const { selected, setSelected } = useSelection();
  const mapRef = useRef(null);
  const selectedFsRef = useRef(null); // { source, id } carrying the 'selected' feature-state
  const hoverFsRef = useRef(null);
  const [center, setCenter] = useState([0, 20]); // [lng, lat] for marker backside culling
  const mapStyle = useMemo(() => baseMapStyle(), []);

  const active = LAYERS.filter(
    (l) => (l.kind === 'base' && l.id === activeBaseId) ||
           (l.kind === 'overlay' && activeOverlayIds.has(l.id))
  );
  const interactiveLayerIds = active.flatMap((l) => l.interactiveLayerIds ?? []);

  // Ensure globe projection even if a runtime ignores the style's projection root.
  const handleLoad = useCallback((e) => {
    const map = e.target;
    if (map.setProjection) map.setProjection({ type: 'globe' });
  }, []);

  // Re-apply theme-sensitive paints when the theme flips.
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || !map.isStyleLoaded?.()) return;
    map.setPaintProperty('background', 'background-color', cssVar('--map-ocean', '#cfe8f3'));
    const dark = theme === 'dark';
    if (map.getLayer('country-label-text')) {
      map.setPaintProperty('country-label-text', 'text-color', dark ? '#e5e7eb' : '#1f2933');
      map.setPaintProperty('country-label-text', 'text-halo-color', dark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)');
    }
  }, [theme]);

  // Clear the 'selected' feature-state when the selection is cleared (panel ×).
  useEffect(() => {
    if (!selected && selectedFsRef.current) {
      const map = mapRef.current?.getMap?.();
      if (map) { try { map.setFeatureState(selectedFsRef.current, { selected: false }); } catch { /* source gone */ } }
      selectedFsRef.current = null;
    }
  }, [selected]);

  const handleClick = useCallback((e) => {
    const feature = e.features && e.features[0];
    if (!feature) return;
    const owner = LAYERS.find((l) => (l.interactiveLayerIds ?? []).includes(feature.layer.id));
    if (!owner || !owner.selectFeature) return;
    const selection = owner.selectFeature(feature);
    if (!selection) return;
    const map = mapRef.current?.getMap?.();
    if (map) {
      if (selectedFsRef.current) { try { map.setFeatureState(selectedFsRef.current, { selected: false }); } catch { /* source gone */ } }
      if (feature.id !== undefined && feature.id !== null) {
        const fs = { source: feature.source, id: feature.id };
        map.setFeatureState(fs, { selected: true });
        selectedFsRef.current = fs;
      }
    }
    setSelected(selection);
  }, [setSelected]);

  // Desktop nicety: hover feature-state (touch devices simply never fire it).
  const handleMouseMove = useCallback((e) => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const feature = e.features && e.features[0];
    if (hoverFsRef.current) {
      try { map.setFeatureState(hoverFsRef.current, { hover: false }); } catch { /* source gone */ }
      hoverFsRef.current = null;
    }
    if (feature && feature.id !== undefined && feature.id !== null) {
      const fs = { source: feature.source, id: feature.id };
      map.setFeatureState(fs, { hover: true });
      hoverFsRef.current = fs;
    }
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
      minZoom={1}
      maxZoom={7}
      mapStyle={mapStyle}
      interactiveLayerIds={interactiveLayerIds}
      onLoad={handleLoad}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMoveEnd={(e) => setCenter([e.viewState.longitude, e.viewState.latitude])}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
    >
      <NavigationControl position="top-left" showCompass={false} />
      <AttributionControl position="bottom-right" compact customAttribution="Natural Earth · Köppen-Geiger · FAO · Wikipedia" />
      <MapController />
      {active.map((l) => l.component && <l.component key={l.id} center={center} />)}
    </Map>
  );
}
```

- [ ] **Step 4: Verify** — `npm run build` (success) and `npm run test` (green; App test mocks MapView, layer components untouched so registry tests unaffected).

- [ ] **Step 5: Commit**
```bash
git add src/lib/mapStyle.js src/components/MapController.jsx src/components/MapView.jsx
git commit -m "feat: MapLibre globe MapView shell and camera controller"
```

---

## Task 4: PoliticalLayer + registry hit-test (TDD for selectFeature)

**Files:** Rewrite `src/components/layers/PoliticalLayer.jsx`; Modify `src/data/layers.js`, `src/data/layers.test.js`.

- [ ] **Step 1: Add failing registry tests.** Append to the `describe` in `src/data/layers.test.js`:
```js
  it('political exposes hit-test config and maps a feature to a country selection', () => {
    const byId = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
    expect(byId.political.interactiveLayerIds).toEqual(['political-fill']);
    const feature = {
      id: 0, source: 'countries', layer: { id: 'political-fill' },
      properties: { NAME_VI: 'Việt Nam', NAME_EN: 'Vietnam', WIKIDATAID: 'Q881', ISO_A2: 'VN', POP_EST: 97000000 },
      geometry: { type: 'Polygon', coordinates: [[[102, 8], [110, 8], [110, 23], [102, 8]]] },
    };
    const sel = byId.political.selectFeature(feature);
    expect(sel.kind).toBe('country');
    expect(sel.iso2).toBe('VN');
    expect(sel.nameVi).toBe('Việt Nam');
    expect(sel.bounds).toEqual({ south: 8, west: 102, north: 23, east: 110 });
    expect(sel.focus).toEqual({ bounds: sel.bounds });
  });
```

- [ ] **Step 2: Run layers.test, confirm the new test FAILS.**

- [ ] **Step 3: Rewrite** `src/components/layers/PoliticalLayer.jsx`
```jsx
import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { mapcolor7Expression } from '../../lib/mapExpressions.js';
import { countryLabelPoints, oceanLabelPoints } from '../../lib/labelPoints.js';
import { assetUrl } from '../../lib/assetUrl.js';

const FONT = ['Noto Sans Regular'];

export default function PoliticalLayer() {
  const { mode } = useLanguage();
  // Raw data (cached app-wide) drives label placement and full-geometry lookups.
  const { data: countries } = useGeoData('/data/countries.geojson');
  const { data: oceans } = useGeoData('/data/oceans.json');

  const countryLabels = useMemo(() => (countries ? countryLabelPoints(countries, mode) : null), [countries, mode]);
  const oceanLabels = useMemo(() => (oceans ? oceanLabelPoints(oceans, mode) : null), [oceans, mode]);
  const fillColor = useMemo(() => mapcolor7Expression(), []);

  return (
    <>
      <Source id="countries" type="geojson" data={assetUrl('data/countries.geojson')} generateId>
        <Layer
          id="political-fill"
          type="fill"
          paint={{
            'fill-color': fillColor,
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false], 0.8,
              1,
            ],
          }}
        />
        <Layer
          id="political-border"
          type="line"
          paint={{
            'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#2563eb', '#7a8288'],
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 0.6],
          }}
        />
      </Source>
      {countryLabels && (
        <Source id="country-labels" type="geojson" data={countryLabels}>
          <Layer
            id="country-label-text"
            type="symbol"
            layout={{ 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 12 }}
            paint={{ 'text-color': '#1f2933', 'text-halo-color': 'rgba(255,255,255,0.85)', 'text-halo-width': 1.2 }}
          />
        </Source>
      )}
      {oceanLabels && (
        <Source id="ocean-labels" type="geojson" data={oceanLabels}>
          <Layer
            id="ocean-label-text"
            type="symbol"
            layout={{ 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 13, 'text-letter-spacing': 0.1 }}
            paint={{ 'text-color': '#2f6fb0', 'text-opacity': 0.8 }}
          />
        </Source>
      )}
    </>
  );
}
```

- [ ] **Step 4: Update the registry.** In `src/data/layers.js`, add imports:
```js
import { geojsonBounds } from '../lib/geojsonBounds.js';
import { fullGeometry } from '../lib/fullGeometry.js';
```
Replace the `political` entry with:
```js
  {
    id: 'political', labelKey: 'layer.political', kind: 'base', enabledByDefault: true,
    component: PoliticalLayer,
    interactiveLayerIds: ['political-fill'],
    selectFeature: (feature) => {
      const p = feature.properties;
      const bounds = geojsonBounds(fullGeometry('/data/countries.geojson', feature) ?? feature.geometry);
      return {
        kind: 'country',
        wikidata: p.WIKIDATAID || null,
        iso2: p.ISO_A2 && p.ISO_A2 !== '-99' ? p.ISO_A2 : null,
        nameVi: p.NAME_VI, nameEn: p.NAME_EN, population: p.POP_EST ?? null,
        bounds,
        focus: bounds ? { bounds } : null,
      };
    },
  },
```

- [ ] **Step 5: Run layers.test (new test passes) + full suite + `npm run build` → all green.**

- [ ] **Step 6: Commit**
```bash
git add src/components/layers/PoliticalLayer.jsx src/data/layers.js src/data/layers.test.js
git commit -m "feat: political layer on the globe with symbol labels and hit-test selection"
```

---

## Task 5: ClimateLayer + CurrentsLayer (TDD for selectFeature)

**Files:** Rewrite `src/components/layers/ClimateLayer.jsx`, `src/components/layers/CurrentsLayer.jsx`; Modify `src/data/layers.js`, `src/data/layers.test.js`.

- [ ] **Step 1: Add failing registry tests** (append to the `describe`):
```js
  it('climate and currents selectFeature map hit-test features', () => {
    const byId = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
    const zone = { id: 3, source: 'climate', layer: { id: 'climate-fill' },
      properties: { CODE: 'Af' },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 0]]] } };
    const selC = byId.climate.selectFeature(zone);
    expect(selC.kind).toBe('climate');
    expect(selC.code).toBe('Af');
    expect(selC.focus.bounds).toEqual({ south: 0, west: 0, north: 2, east: 2 });

    const cur = { id: 1, source: 'currents', layer: { id: 'currents-line' },
      properties: { name_vi: 'Dòng Gulf Stream', name_en: 'Gulf Stream', type: 'warm' },
      geometry: { type: 'LineString', coordinates: [[-80, 25], [-35, 45]] } };
    const selK = byId.currents.selectFeature(cur);
    expect(selK).toMatchObject({ kind: 'current', nameVi: 'Dòng Gulf Stream', nameEn: 'Gulf Stream', type: 'warm' });
    expect(selK.focus.bounds).toEqual({ south: 25, west: -80, north: 45, east: -35 });
  });
```

- [ ] **Step 2: Run, confirm FAIL.**

- [ ] **Step 3: Rewrite** `src/components/layers/ClimateLayer.jsx`
```jsx
import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { climateColorExpression } from '../../lib/mapExpressions.js';
import { assetUrl } from '../../lib/assetUrl.js';

export default function ClimateLayer() {
  const fillColor = useMemo(() => climateColorExpression(), []);
  return (
    <Source id="climate" type="geojson" data={assetUrl('data/climate.geojson')} generateId>
      <Layer
        id="climate-fill"
        type="fill"
        paint={{
          'fill-color': fillColor,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.95,
            ['boolean', ['feature-state', 'hover'], false], 0.9,
            0.8,
          ],
        }}
      />
      <Layer
        id="climate-outline"
        type="line"
        paint={{
          'line-color': '#111111',
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2, 0],
        }}
      />
    </Source>
  );
}
```

- [ ] **Step 4: Rewrite** `src/components/layers/CurrentsLayer.jsx`
```jsx
import { Source, Layer, Marker } from 'react-map-gl/maplibre';
import { useGeoData } from '../../hooks/useGeoData.js';
import { currentColorExpression } from '../../lib/mapExpressions.js';
import { assetUrl } from '../../lib/assetUrl.js';
import { bearing } from '../../lib/bearing.js';
import { isFrontFacing } from '../../lib/isFrontFacing.js';

export default function CurrentsLayer({ center = [0, 20] }) {
  const { data } = useGeoData('/data/currents.geojson');
  return (
    <>
      <Source id="currents" type="geojson" data={assetUrl('data/currents.geojson')} generateId>
        <Layer
          id="currents-line"
          type="line"
          layout={{ 'line-cap': 'round' }}
          paint={{
            'line-color': currentColorExpression('#e05252', '#3b82f6'),
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 4.5, 2.5],
          }}
        />
      </Source>
      {data && data.features.map((f, i) => {
        const cs = f.geometry.coordinates;
        const a = cs[cs.length - 2];
        const b = cs[cs.length - 1];
        if (!isFrontFacing(center, b)) return null;
        const deg = bearing(a, b) - 90; // '➤' points east by default
        const color = f.properties.type === 'warm' ? '#e05252' : '#3b82f6';
        return (
          <Marker key={i} longitude={b[0]} latitude={b[1]}>
            <span style={{ display: 'inline-block', fontSize: 16, color, transform: `rotate(${deg}deg)`, pointerEvents: 'none' }}>➤</span>
          </Marker>
        );
      })}
    </>
  );
}
```

- [ ] **Step 5: Registry entries.** In `src/data/layers.js`, replace the `climate` and `currents` entries with (legends unchanged):
```js
  {
    id: 'climate', labelKey: 'layer.climate', kind: 'overlay', component: ClimateLayer,
    interactiveLayerIds: ['climate-fill'],
    selectFeature: (feature) => {
      const bounds = geojsonBounds(fullGeometry('/data/climate.geojson', feature) ?? feature.geometry);
      return { kind: 'climate', code: feature.properties.CODE, focus: bounds ? { bounds } : null };
    },
    legend: { items: ['A', 'B', 'C', 'D', 'E'].map((g) => ({
      swatch: climateClass(g).color,
      labelKey: `legend.climate${g}`,
    })) },
  },
  {
    id: 'currents', labelKey: 'layer.currents', kind: 'overlay', component: CurrentsLayer,
    interactiveLayerIds: ['currents-line'],
    selectFeature: (feature) => {
      const p = feature.properties;
      const bounds = geojsonBounds(fullGeometry('/data/currents.geojson', feature) ?? feature.geometry);
      return { kind: 'current', nameVi: p.name_vi, nameEn: p.name_en, type: p.type, focus: bounds ? { bounds } : null };
    },
    legend: { items: [
      { swatch: '#e05252', shape: 'line', labelKey: 'legend.warmCurrent' },
      { swatch: '#3b82f6', shape: 'line', labelKey: 'legend.coldCurrent' },
    ] },
  },
```

- [ ] **Step 6: Run tests + build → green. Commit**
```bash
git add src/components/layers/ClimateLayer.jsx src/components/layers/CurrentsLayer.jsx src/data/layers.js src/data/layers.test.js
git commit -m "feat: climate and currents layers on the globe"
```

---

## Task 6: TectonicLayer + AgricultureLayer (TDD for volcano selectFeature)

**Files:** Rewrite `src/components/layers/TectonicLayer.jsx`, `src/components/layers/AgricultureLayer.jsx`; Modify `src/data/layers.js`, `src/data/layers.test.js`.

- [ ] **Step 1: Add failing registry test:**
```js
  it('tectonic selectFeature maps a volcano point', () => {
    const byId = Object.fromEntries(LAYERS.map((l) => [l.id, l]));
    const v = { id: 7, source: 'volcanoes', layer: { id: 'volcano-circle' },
      properties: { name: 'Acatenango' },
      geometry: { type: 'Point', coordinates: [-90.876, 14.501] } };
    const sel = byId.tectonic.selectFeature(v);
    expect(sel).toMatchObject({ kind: 'volcano', name: 'Acatenango' });
    expect(sel.focus).toEqual({ center: [-90.876, 14.501] });
  });
```

- [ ] **Step 2: Run, confirm FAIL.**

- [ ] **Step 3: Rewrite** `src/components/layers/TectonicLayer.jsx`
```jsx
import { Source, Layer } from 'react-map-gl/maplibre';
import { assetUrl } from '../../lib/assetUrl.js';

export default function TectonicLayer() {
  return (
    <>
      <Source id="plates" type="geojson" data={assetUrl('data/plates.geojson')}>
        <Layer id="plates-line" type="line" paint={{ 'line-color': '#d64545', 'line-width': 1.5 }} />
      </Source>
      <Source id="volcanoes" type="geojson" data={assetUrl('data/volcanoes.geojson')} generateId>
        <Layer
          id="volcano-circle"
          type="circle"
          paint={{
            'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 6.5, 4],
            'circle-color': '#b91c1c',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
          }}
        />
      </Source>
    </>
  );
}
```

- [ ] **Step 4: Rewrite** `src/components/layers/AgricultureLayer.jsx`
```jsx
import { Marker } from 'react-map-gl/maplibre';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useSelection } from '../../context/SelectionContext.jsx';
import { dualText } from '../../lib/dualText.js';
import { COMMODITIES } from '../../data/commodities.js';
import { isFrontFacing } from '../../lib/isFrontFacing.js';

export default function AgricultureLayer({ center = [0, 20] }) {
  const { data } = useGeoData('/data/agriculture.json');
  const { mode } = useLanguage();
  const { setSelected } = useSelection();
  if (!data) return null;

  return (
    <>
      {COMMODITIES.flatMap((c) =>
        (data[c.id] || []).map((loc, i) => {
          const lngLat = [loc.coord[1], loc.coord[0]]; // agriculture.json stores [lat, lng]
          if (!isFrontFacing(center, lngLat)) return null;
          const label = dualText(c.vi, c.en, mode);
          return (
            <Marker
              key={`${c.id}-${i}`}
              longitude={lngLat[0]}
              latitude={lngLat[1]}
              onClick={(e) => {
                e.originalEvent?.stopPropagation?.();
                setSelected({ kind: 'commodity', id: c.id, vi: c.vi, en: c.en, icon: c.icon, iso2: loc.iso2, focus: { center: lngLat } });
              }}
            >
              <button type="button" title={label} aria-label={label}
                      className="text-base leading-none p-1.5 cursor-pointer bg-transparent border-0">
                {c.icon}
              </button>
            </Marker>
          );
        })
      )}
    </>
  );
}
```

- [ ] **Step 5: Registry.** Replace the `tectonic` entry (legend unchanged) with:
```js
  {
    id: 'tectonic', labelKey: 'layer.tectonic', kind: 'overlay', component: TectonicLayer,
    interactiveLayerIds: ['volcano-circle'],
    selectFeature: (feature) => {
      const c = feature.geometry?.coordinates ?? null;
      return { kind: 'volcano', name: feature.properties.name ?? null, focus: c ? { center: c } : null };
    },
    legend: { items: [
      { swatch: '#d64545', shape: 'line', labelKey: 'legend.plateBoundary' },
      { swatch: '#b91c1c', shape: 'dot', labelKey: 'legend.volcano' },
    ] },
  },
```
(The `agriculture` entry keeps `component` + `legend` only — its markers self-select.)

- [ ] **Step 6: Run tests + build → green. Commit**
```bash
git add src/components/layers/TectonicLayer.jsx src/components/layers/AgricultureLayer.jsx src/data/layers.js src/data/layers.test.js
git commit -m "feat: tectonic and agriculture layers on the globe"
```

---

## Task 7: Touch-first / TV + iPad UX pass

**Files:** Modify `src/components/Header.jsx`, `src/components/LayerControl.jsx`, `src/components/Legend.jsx`, `src/components/InfoPanel.jsx`, `src/i18n/locales/vi.json`, `src/i18n/locales/en.json`, `src/index.css`.

- [ ] **Step 1: i18n.** Add to BOTH locales (same key set, valid JSON):
vi: `"control.legend": "Chú giải", "kiosk.fullscreen": "Toàn màn hình"`
en: `"control.legend": "Legend", "kiosk.fullscreen": "Fullscreen"`
Verify: `node -e "const a=Object.keys(require('./src/i18n/locales/vi.json')).sort();const b=Object.keys(require('./src/i18n/locales/en.json')).sort();console.log('match',JSON.stringify(a)===JSON.stringify(b))"` → `match true`.

- [ ] **Step 2: Header fullscreen toggle.** In `src/components/Header.jsx`, add after the theme-toggle button:
```jsx
        <button
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen?.();
            else document.documentElement.requestFullscreen?.();
          }}
          aria-label={tt('kiosk.fullscreen')} title={tt('kiosk.fullscreen')}
          className="border rounded px-2 py-1 min-h-11 min-w-11"
        >⛶</button>
```
Also add `min-h-11 min-w-11` to the theme-toggle button and the language flag buttons' shared className so all header controls hit ~44px targets.

- [ ] **Step 3: LayerControl → collapsible, touch-sized.** Replace the contents of `src/components/LayerControl.jsx`:
```jsx
import { useState } from 'react';
import { baseLayers, overlayLayers } from '../data/layers.js';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function LayerControl({ activeBaseId, setActiveBaseId, activeOverlayIds, toggleOverlay }) {
  const { tt } = useLanguage();
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  return (
    <div className="absolute top-4 left-14 z-[1000]">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={tt('control.title')}
              className="rounded-lg shadow-lg px-3 py-2 min-h-11 min-w-11 text-lg"
              style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
        🗺️
      </button>
      {open && (
        <div className="mt-2 rounded-lg shadow-lg p-4 text-base max-h-[70vh] overflow-y-auto"
             style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
          <h2 className="font-semibold mb-2">{tt('control.title')}</h2>
          <p className="uppercase text-xs opacity-60 mb-1">{tt('control.base')}</p>
          {baseLayers().map((l) => (
            <label key={l.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
              <input type="radio" name="base" className="w-5 h-5" checked={activeBaseId === l.id}
                     onChange={() => setActiveBaseId(l.id)} />
              <span>{tt(l.labelKey)}</span>
            </label>
          ))}
          <p className="uppercase text-xs opacity-60 mt-3 mb-1">{tt('control.overlays')}</p>
          {overlayLayers().map((l) => (
            <label key={l.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" checked={activeOverlayIds.has(l.id)}
                     onChange={() => toggleOverlay(l.id)} />
              <span>{tt(l.labelKey)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Legend → collapsible.** In `src/components/Legend.jsx`: add `import { useState } from 'react';`, add `const [open, setOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);` inside the component (before the early return), and change the returned JSX to wrap the existing panel:
```jsx
  return (
    <div className="absolute bottom-6 left-4 z-[1000]">
      {open && (
        <div className="mb-2 rounded-lg shadow-lg p-3 text-xs max-h-[40vh] overflow-y-auto"
             style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
          {/* existing sections markup unchanged */}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={tt('control.legend')}
              className="rounded-lg shadow-lg px-3 py-2 min-h-11 min-w-11 text-lg"
              style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
        ℹ️
      </button>
    </div>
  );
```
(Keep the `if (active.length === 0) return null;` early return and all section-rendering logic exactly as they are. Note: `window.innerWidth >= 1024` is true in jsdom (1024), so the existing Legend tests still see the content.)

- [ ] **Step 5: InfoPanel → bottom sheet on narrow screens + big close.** In `src/components/InfoPanel.jsx`:
  - Replace the `<aside className=...>` line's className with:
```jsx
    <aside className="absolute z-[1100] overflow-y-auto shadow-2xl p-4 bottom-0 left-0 right-0 h-1/2 w-full rounded-t-2xl md:top-0 md:right-0 md:bottom-auto md:left-auto md:h-full md:w-96 md:max-w-[85vw] md:rounded-none"
```
  - Replace the close button's className with: `"float-right text-3xl leading-none p-2 -mt-2 -mr-2 min-h-11 min-w-11"`.

- [ ] **Step 6: CSS pass.** In `src/index.css`:
  - DELETE all Leaflet-era rules: the `.leaflet-container`, `.country`, `.country:hover`, `.country-selected`, `.plate-boundary`, `.volcano`, `.country-label`, `.ocean-label`, `.leaflet-tooltip.*`, `.current-warm`, `.current-cold`, `.arrow-warm`, `.arrow-cold`, `.current-arrow, .ag-marker`, and `.leaflet-control-attribution` blocks.
  - KEEP the `:root`/`.dark` variable blocks and the `html, body, #root` rule.
  - APPEND:
```css
/* Globe canvas inherits app font; TV-size screens get larger UI text. */
.maplibregl-map { font: inherit; }
@media (min-width: 1920px) { html { font-size: 18px; } }
```

- [ ] **Step 7: Run `npm run test` (Legend/Header/InfoPanel tests must stay green) + `npm run build`. Commit**
```bash
git add src/components/Header.jsx src/components/LayerControl.jsx src/components/Legend.jsx src/components/InfoPanel.jsx src/i18n/locales/vi.json src/i18n/locales/en.json src/index.css
git commit -m "feat: touch-first kiosk UX (fullscreen, drawers, bottom sheet, tap targets)"
```

---

## Task 8: Remove Leaflet + docs

**Files:** Modify `src/main.jsx`, `package.json`, `README.md`; Delete `src/lib/bounds.js`, `src/lib/bounds.test.js`.

- [ ] **Step 1:** Confirm nothing imports Leaflet or boundsToObj anymore:
```bash
grep -rn "react-leaflet\|from 'leaflet'\|leaflet/dist\|boundsToObj" src/
```
Expected: the ONLY hit is `src/main.jsx` (`import 'leaflet/dist/leaflet.css';`). If any layer/component still imports Leaflet, STOP and report — an earlier task was incomplete.

- [ ] **Step 2:** Remove the `import 'leaflet/dist/leaflet.css';` line from `src/main.jsx`; delete `src/lib/bounds.js` and `src/lib/bounds.test.js` (`git rm`).

- [ ] **Step 3:** `npm uninstall react-leaflet leaflet`

- [ ] **Step 4:** README: in "How it works", replace the base-map bullet with:
```markdown
- **Globe:** MapLibre GL renders an interactive 3D globe (drag to spin, pinch to zoom,
  tap to select) purely from bundled GeoJSON — no tiles, no API keys. Works in the
  browser on desktops, iPads, and touch TVs; use the fullscreen button for kiosk use.
```
And replace the "Labels:" bullet with:
```markdown
- **Labels:** MapLibre symbol layers with bundled Noto Sans glyphs (Latin + Vietnamese),
  regenerable via `node scripts/fetch-glyphs.mjs`.
```

- [ ] **Step 5:** `npm run test` (all green) + `npm run build` (clean). Report the final bundle size. Commit:
```bash
git add -A
git commit -m "chore: remove Leaflet; document the MapLibre globe"
```

---

## Self-review notes (addressed)
- **Spec coverage:** deps/glyphs/assetUrl (T1); pure helpers incl. clipped-geometry lookup (T2); globe shell + camera + theme paints + hit-test/feature-state plumbing (T3); political + labels (T4); climate + currents (T5); tectonic + agriculture markers w/ backside cull (T6); touch/kiosk UX + fullscreen (T7); Leaflet removal + docs (T8). Sequencing matches the spec.
- **Type consistency:** registry entry shape `{ id, labelKey, kind, component, interactiveLayerIds?, selectFeature?, legend?, enabledByDefault? }` is produced in T4–T6 and consumed by MapView (T3: `interactiveLayerIds`, `selectFeature(feature)`) and the tests. `focus` = `{bounds:{south,west,north,east}}` | `{center:[lng,lat]}` produced by selectFeature/markers, consumed only by MapController (T3). `getCachedGeoData`/`_primeGeoCache` (T2) consumed by fullGeometry (T2) + its test. `cssVar`/`baseMapStyle` (T3) consumed in MapView. Legend/CountryLayerFacts contracts untouched (`bounds` shape preserved).
- **Test safety:** App test mocks MapView (never evaluates maplibre css import); layers.test imports layer components → react-map-gl/maplibre module import runs under jsdom without instantiating WebGL. If a jsdom import error appears, the implementer reports it (mitigation: mock `react-map-gl/maplibre` in layers.test — only as a fallback).
- **Placeholder scan:** none.
