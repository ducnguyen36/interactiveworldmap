# Interactive World Map v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three deferred thematic layers (Ocean Currents, Climate Zones, Agriculture) plus a Legend panel, clean up the Leaflet chrome, and replace the language dropdown with a minimal flag-icon switcher.

**Architecture:** The v1 layer registry already drives both `LayerControl` and `MapView`. v2 replaces the three `disabled` placeholder registry entries with real layer components, adds a `legend` descriptor to each overlay, and renders a registry-driven `Legend` panel. Climate is a translucent non-interactive overlay so country click-to-zoom still works underneath. Two new pure helpers (`bearing`, `climate`) are unit-tested; layer components are verified in the running app.

**Tech Stack:** Vite, React 18, react-leaflet 4.2.1 + Leaflet 1.9, Tailwind, i18next, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-06-17-interactive-world-map-v2-design.md`

**Baseline:** v1 is complete on branch `feature/interactive-world-map` (24 passing tests). Continue on the same branch.

---

## File structure (v2 changes)

```
src/lib/bearing.js                       NEW  pure: compass bearing between two [lng,lat] points
src/lib/climate.js                       NEW  pure: köppen CODE → { group, color }
src/data/commodities.js                  NEW  COMMODITIES list (id, vi, en, icon) — shared by layer + legend
src/components/layers/CurrentsLayer.jsx  NEW  warm/cold current lines + direction arrows
src/components/layers/ClimateLayer.jsx   NEW  köppen polygons, translucent, non-interactive
src/components/layers/AgricultureLayer.jsx NEW commodity icon markers
src/components/Legend.jsx                NEW  registry-driven legend panel
src/data/layers.js                       MOD  real entries + legend descriptors
src/components/MapView.jsx               MOD  reposition zoom, custom attribution
src/components/Header.jsx                MOD  flag-icon language switcher
src/App.jsx                              MOD  render <Legend>
src/index.css                            MOD  current colors, marker/attribution styles
src/i18n/locales/{vi,en}.json            MOD  legend + lang aria strings
scripts/fetch-data.mjs                   MOD  fetch + trim climate
public/data/climate.geojson              NEW  fetched
public/data/currents.geojson             NEW  curated, committed
public/data/agriculture.json             NEW  curated, committed
```

---

## Task 1: bearing() pure helper (TDD)

**Files:** Create `src/lib/bearing.js`; Test `src/lib/bearing.test.js`

- [ ] **Step 1: Write the failing test** — `src/lib/bearing.test.js`
```js
import { describe, it, expect } from 'vitest';
import { bearing } from './bearing.js';

describe('bearing', () => {
  it('points north for due-north movement', () => {
    expect(bearing([0, 0], [0, 1])).toBeCloseTo(0, 1);
  });
  it('points east for due-east movement', () => {
    expect(bearing([0, 0], [1, 0])).toBeCloseTo(90, 1);
  });
  it('points south for due-south movement', () => {
    expect(bearing([0, 1], [0, 0])).toBeCloseTo(180, 1);
  });
  it('points west for due-west movement', () => {
    expect(bearing([1, 0], [0, 0])).toBeCloseTo(270, 1);
  });
  it('returns a value in [0, 360)', () => {
    const b = bearing([10, 10], [-5, -3]);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL** — `npx vitest run src/lib/bearing.test.js` → module not found.

- [ ] **Step 3: Implement** — `src/lib/bearing.js`
```js
// Compass bearing (degrees, 0 = north, 90 = east) from point a to point b.
// Points are GeoJSON [lng, lat] pairs.
export function bearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
```

- [ ] **Step 4: Run it, confirm PASS** (5 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/bearing.js src/lib/bearing.test.js
git commit -m "feat: add bearing helper for current direction arrows"
```

---

## Task 2: climate() pure helper (TDD)

**Files:** Create `src/lib/climate.js`; Test `src/lib/climate.test.js`

- [ ] **Step 1: Write the failing test** — `src/lib/climate.test.js`
```js
import { describe, it, expect } from 'vitest';
import { climateClass } from './climate.js';

describe('climateClass', () => {
  it('maps each main Köppen group to its color', () => {
    expect(climateClass('Af')).toEqual({ group: 'A', color: '#2e7d32' });
    expect(climateClass('BWh')).toEqual({ group: 'B', color: '#e0c060' });
    expect(climateClass('Cfb')).toEqual({ group: 'C', color: '#9ccc65' });
    expect(climateClass('Dfc')).toEqual({ group: 'D', color: '#80cbc4' });
    expect(climateClass('ET')).toEqual({ group: 'E', color: '#cfd8dc' });
  });
  it('falls back for unknown/empty codes', () => {
    expect(climateClass('X')).toEqual({ group: '?', color: '#cccccc' });
    expect(climateClass('')).toEqual({ group: '?', color: '#cccccc' });
    expect(climateClass(null)).toEqual({ group: '?', color: '#cccccc' });
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL.**

- [ ] **Step 3: Implement** — `src/lib/climate.js`
```js
// Köppen-Geiger main classes → fixed palette (theme-independent so the
// classification stays recognizable in both light and dark mode).
const GROUPS = {
  A: '#2e7d32', // tropical
  B: '#e0c060', // arid
  C: '#9ccc65', // temperate
  D: '#80cbc4', // continental
  E: '#cfd8dc', // polar
};

export function climateClass(code) {
  const g = typeof code === 'string' && code.length ? code[0].toUpperCase() : '';
  if (GROUPS[g]) return { group: g, color: GROUPS[g] };
  return { group: '?', color: '#cccccc' };
}
```

- [ ] **Step 4: Run it, confirm PASS** (2 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/climate.js src/lib/climate.test.js
git commit -m "feat: add climate Köppen class→color helper"
```

---

## Task 3: Data files + CSS

**Files:** Create `src/data/commodities.js`, `public/data/currents.geojson`, `public/data/agriculture.json`; Modify `scripts/fetch-data.mjs`, `src/index.css`; Output `public/data/climate.geojson`.

- [ ] **Step 1: Commodities module** — `src/data/commodities.js`
```js
// Shared by AgricultureLayer (markers) and the agriculture legend descriptor.
// Icons are standard emoji (render on Windows via Segoe UI Emoji); only
// regional-flag emoji fail on Windows, which is why the language switcher uses images.
export const COMMODITIES = [
  { id: 'rice', vi: 'Lúa gạo', en: 'Rice', icon: '🍚' },
  { id: 'wheat', vi: 'Lúa mì', en: 'Wheat', icon: '🌾' },
  { id: 'maize', vi: 'Ngô', en: 'Maize', icon: '🌽' },
  { id: 'coffee', vi: 'Cà phê', en: 'Coffee', icon: '☕' },
  { id: 'tea', vi: 'Chè', en: 'Tea', icon: '🍵' },
  { id: 'cattle', vi: 'Bò', en: 'Cattle', icon: '🐄' },
  { id: 'pigs', vi: 'Lợn', en: 'Pigs', icon: '🐖' },
  { id: 'sheep', vi: 'Cừu', en: 'Sheep', icon: '🐑' },
  { id: 'poultry', vi: 'Gia cầm', en: 'Poultry', icon: '🐔' },
];
```

- [ ] **Step 2: Currents data** — `public/data/currents.geojson` (curated from standard oceanographic maps; coordinates are [lng, lat])
```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "properties": { "name_vi": "Dòng Gulf Stream", "name_en": "Gulf Stream", "type": "warm" }, "geometry": { "type": "LineString", "coordinates": [[-80, 25], [-65, 35], [-50, 41], [-35, 45]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Bắc Đại Tây Dương", "name_en": "North Atlantic Drift", "type": "warm" }, "geometry": { "type": "LineString", "coordinates": [[-35, 45], [-15, 53], [3, 60]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Cư-rô-si-ô", "name_en": "Kuroshio Current", "type": "warm" }, "geometry": { "type": "LineString", "coordinates": [[122, 24], [132, 31], [142, 36], [150, 39]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Bắc Thái Bình Dương", "name_en": "North Pacific Current", "type": "warm" }, "geometry": { "type": "LineString", "coordinates": [[150, 39], [180, 43], [-150, 45]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng A-la-xca", "name_en": "Alaska Current", "type": "warm" }, "geometry": { "type": "LineString", "coordinates": [[-145, 52], [-150, 57], [-160, 58]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Bra-xin", "name_en": "Brazil Current", "type": "warm" }, "geometry": { "type": "LineString", "coordinates": [[-38, -14], [-48, -26], [-55, -37]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Đông Úc", "name_en": "East Australian Current", "type": "warm" }, "geometry": { "type": "LineString", "coordinates": [[153, -27], [152, -34], [150, -41]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Mũi Kim (Agulhas)", "name_en": "Agulhas Current", "type": "warm" }, "geometry": { "type": "LineString", "coordinates": [[33, -29], [28, -35], [22, -38]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Xích đạo Bắc", "name_en": "North Equatorial Current", "type": "warm" }, "geometry": { "type": "LineString", "coordinates": [[-18, 9], [-45, 11], [-68, 13]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng La-bra-đo", "name_en": "Labrador Current", "type": "cold" }, "geometry": { "type": "LineString", "coordinates": [[-55, 60], [-52, 52], [-49, 45]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Ca-li-phoóc-ni-a", "name_en": "California Current", "type": "cold" }, "geometry": { "type": "LineString", "coordinates": [[-126, 46], [-123, 36], [-116, 26]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Pê-ru (Humboldt)", "name_en": "Humboldt Current", "type": "cold" }, "geometry": { "type": "LineString", "coordinates": [[-72, -17], [-75, -29], [-74, -40]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Ca-na-ri", "name_en": "Canary Current", "type": "cold" }, "geometry": { "type": "LineString", "coordinates": [[-13, 33], [-17, 25], [-20, 17]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Ben-ghê-la", "name_en": "Benguela Current", "type": "cold" }, "geometry": { "type": "LineString", "coordinates": [[15, -32], [13, -23], [11, -15]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Ôi-a-si-ô", "name_en": "Oyashio Current", "type": "cold" }, "geometry": { "type": "LineString", "coordinates": [[162, 56], [152, 49], [146, 43]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Phôn-len (Malvinas)", "name_en": "Falkland Current", "type": "cold" }, "geometry": { "type": "LineString", "coordinates": [[-60, -50], [-56, -43], [-53, -38]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Tây Úc", "name_en": "West Australian Current", "type": "cold" }, "geometry": { "type": "LineString", "coordinates": [[111, -24], [113, -31], [115, -37]] } },
    { "type": "Feature", "properties": { "name_vi": "Dòng Hoàn lưu Nam Cực", "name_en": "Antarctic Circumpolar Current", "type": "cold" }, "geometry": { "type": "LineString", "coordinates": [[-150, -57], [-90, -58], [-30, -57], [20, -56]] } }
  ]
}
```

- [ ] **Step 3: Agriculture data** — `public/data/agriculture.json` (top producers per commodity, FAOSTAT-curated; coords are [lat, lng] country centroids)
```json
{
  "rice": [ {"iso2":"CN","coord":[35,103]}, {"iso2":"IN","coord":[22,79]}, {"iso2":"ID","coord":[-2,118]}, {"iso2":"BD","coord":[24,90]}, {"iso2":"VN","coord":[16,108]}, {"iso2":"TH","coord":[15,101]} ],
  "wheat": [ {"iso2":"CN","coord":[35,103]}, {"iso2":"IN","coord":[22,79]}, {"iso2":"RU","coord":[60,100]}, {"iso2":"US","coord":[39,-98]}, {"iso2":"FR","coord":[46,2]} ],
  "maize": [ {"iso2":"US","coord":[39,-98]}, {"iso2":"CN","coord":[35,103]}, {"iso2":"BR","coord":[-10,-52]}, {"iso2":"AR","coord":[-34,-64]}, {"iso2":"MX","coord":[23,-102]} ],
  "coffee": [ {"iso2":"BR","coord":[-10,-52]}, {"iso2":"VN","coord":[16,108]}, {"iso2":"CO","coord":[4,-73]}, {"iso2":"ID","coord":[-2,118]}, {"iso2":"ET","coord":[9,40]} ],
  "tea": [ {"iso2":"CN","coord":[30,110]}, {"iso2":"IN","coord":[26,92]}, {"iso2":"KE","coord":[0,38]}, {"iso2":"LK","coord":[7,81]} ],
  "cattle": [ {"iso2":"BR","coord":[-10,-52]}, {"iso2":"IN","coord":[22,79]}, {"iso2":"US","coord":[39,-98]}, {"iso2":"CN","coord":[35,103]}, {"iso2":"AR","coord":[-34,-64]} ],
  "pigs": [ {"iso2":"CN","coord":[35,113]}, {"iso2":"US","coord":[41,-92]}, {"iso2":"BR","coord":[-22,-48]}, {"iso2":"DE","coord":[51,10]}, {"iso2":"ES","coord":[40,-3]} ],
  "sheep": [ {"iso2":"CN","coord":[40,95]}, {"iso2":"AU","coord":[-30,144]}, {"iso2":"IN","coord":[22,79]}, {"iso2":"IR","coord":[32,53]}, {"iso2":"NZ","coord":[-42,172]} ],
  "poultry": [ {"iso2":"US","coord":[39,-98]}, {"iso2":"CN","coord":[35,103]}, {"iso2":"BR","coord":[-10,-52]}, {"iso2":"ID","coord":[-2,118]} ]
}
```

- [ ] **Step 4: Add climate fetch to the data script** — edit `scripts/fetch-data.mjs`.

Add this constant near the other URL constants:
```js
const CLIMATE = 'https://raw.githubusercontent.com/circleofconfusion/climate-map/master/topojson/1976-2000.geojson';
```
Add this trim function next to `trimVolcanoes`:
```js
function trimClimate(fc) {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => ({
      type: 'Feature',
      properties: { CODE: f.properties.CODE ?? null },
      geometry: f.geometry,
    })),
  };
}
```
In `main()`, change the parallel fetch and writes to include climate:
```js
  const [countries, plates, volcanoes, climate] = await Promise.all([
    getJson(COUNTRIES), getJson(PLATES), getJson(VOLCANOES), getJson(CLIMATE),
  ]);
  await writeFile(new URL('countries.geojson', OUT), JSON.stringify(trimCountries(countries)));
  await writeFile(new URL('plates.geojson', OUT), JSON.stringify(plates));
  await writeFile(new URL('volcanoes.geojson', OUT), JSON.stringify(trimVolcanoes(volcanoes)));
  await writeFile(new URL('climate.geojson', OUT), JSON.stringify(trimClimate(climate)));
  console.log('Wrote countries, plates, volcanoes, climate to public/data/');
```
> Note: the existing `currents.geojson` and `agriculture.json` are hand-authored (Steps 2–3) and are NOT produced by this script — don't overwrite them.

- [ ] **Step 5: Run the script (regenerates the fetched files) and verify climate**
```bash
node scripts/fetch-data.mjs
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('./public/data/climate.geojson','utf8'));console.log('climate features:',d.features.length,'first CODE:',d.features[0].properties.CODE);"
```
Expected: a non-zero feature count and a Köppen code string (e.g. `ET`, `Dfc`). Also confirm `currents.geojson` (18 features) and `agriculture.json` still parse:
```bash
node -e "const fs=require('fs');console.log('currents:',JSON.parse(fs.readFileSync('./public/data/currents.geojson','utf8')).features.length);console.log('ag keys:',Object.keys(JSON.parse(fs.readFileSync('./public/data/agriculture.json','utf8'))).length);"
```
Expected: `currents: 18`, `ag keys: 9`.

- [ ] **Step 6: Add CSS** — edit `src/index.css`.

In the existing `:root { … }` block, add these two lines before the closing `}`:
```css
  --current-warm: #d64545;
  --current-cold: #2f6fb0;
```
In the existing `.dark { … }` block, add these two lines before the closing `}`:
```css
  --current-warm: #f87171;
  --current-cold: #60a5fa;
```
Append these rules at the end of the file:
```css
/* Ocean currents */
.current-warm { stroke: var(--current-warm); }
.current-cold { stroke: var(--current-cold); }
.arrow-warm { color: var(--current-warm); }
.arrow-cold { color: var(--current-cold); }
.current-arrow, .ag-marker { background: none; border: none; }

/* Themed Leaflet attribution (replaces default light box) */
.leaflet-control-attribution { background: var(--panel-bg) !important; color: var(--panel-text); font-size: 10px; }
.leaflet-control-attribution a { color: var(--panel-text); }
```

- [ ] **Step 7: Commit**
```bash
git add src/data/commodities.js public/data/currents.geojson public/data/agriculture.json public/data/climate.geojson scripts/fetch-data.mjs src/index.css
git commit -m "feat: add v2 data (climate, currents, agriculture) + styles"
```

---

## Task 4: Layer components (Currents, Climate, Agriculture)

**Files:** Create `src/components/layers/CurrentsLayer.jsx`, `src/components/layers/ClimateLayer.jsx`, `src/components/layers/AgricultureLayer.jsx`.

> Rendered inside the Leaflet map (later wired through the registry). Not unit-tested (jsdom has no real map); verified in the running app.

- [ ] **Step 1: CurrentsLayer** — `src/components/layers/CurrentsLayer.jsx`
```jsx
import L from 'leaflet';
import { GeoJSON, Marker } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { dualText } from '../../lib/dualText.js';
import { bearing } from '../../lib/bearing.js';

export default function CurrentsLayer() {
  const { data } = useGeoData('/data/currents.geojson');
  const { mode } = useLanguage();
  if (!data) return null;

  return (
    <>
      <GeoJSON
        key={mode}
        data={data}
        style={(f) => ({ className: f.properties.type === 'warm' ? 'current-warm' : 'current-cold', weight: 2.5 })}
        onEachFeature={(f, layer) =>
          layer.bindTooltip(dualText(f.properties.name_vi, f.properties.name_en, mode), { sticky: true })
        }
      />
      {data.features.map((f, i) => {
        const cs = f.geometry.coordinates;
        const a = cs[cs.length - 2];
        const b = cs[cs.length - 1];
        const deg = bearing(a, b) - 90; // '➤' glyph points east (90°) by default
        const cls = f.properties.type === 'warm' ? 'arrow-warm' : 'arrow-cold';
        return (
          <Marker
            key={i}
            position={[b[1], b[0]]}
            interactive={false}
            icon={L.divIcon({
              className: 'current-arrow',
              html: `<span class="${cls}" style="display:inline-block;font-size:16px;transform:rotate(${deg}deg)">➤</span>`,
              iconSize: [16, 16],
            })}
          />
        );
      })}
    </>
  );
}
```

- [ ] **Step 2: ClimateLayer** — `src/components/layers/ClimateLayer.jsx`
```jsx
import { GeoJSON } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { climateClass } from '../../lib/climate.js';

export default function ClimateLayer() {
  const { data } = useGeoData('/data/climate.geojson');
  if (!data) return null;

  return (
    <GeoJSON
      data={data}
      style={(f) => ({
        fillColor: climateClass(f.properties.CODE).color,
        fillOpacity: 0.5,
        weight: 0,
        interactive: false, // let clicks pass through to the country layer beneath
      })}
    />
  );
}
```

- [ ] **Step 3: AgricultureLayer** — `src/components/layers/AgricultureLayer.jsx`
```jsx
import L from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { dualText } from '../../lib/dualText.js';
import { COMMODITIES } from '../../data/commodities.js';

export default function AgricultureLayer() {
  const { data } = useGeoData('/data/agriculture.json');
  const { mode } = useLanguage();
  if (!data) return null;

  return (
    <>
      {COMMODITIES.flatMap((c) =>
        (data[c.id] || []).map((loc, i) => (
          <Marker
            key={`${c.id}-${i}`}
            position={loc.coord}
            icon={L.divIcon({
              className: 'ag-marker',
              html: `<span style="font-size:16px">${c.icon}</span>`,
              iconSize: [20, 20],
            })}
          >
            <Tooltip sticky>{dualText(c.vi, c.en, mode)}</Tooltip>
          </Marker>
        ))
      )}
    </>
  );
}
```

- [ ] **Step 4: Verify build** — `npm run build` → success (components compile/import). Do not run the app here.

- [ ] **Step 5: Commit**
```bash
git add src/components/layers/CurrentsLayer.jsx src/components/layers/ClimateLayer.jsx src/components/layers/AgricultureLayer.jsx
git commit -m "feat: add currents, climate and agriculture layer components"
```

---

## Task 5: Registry — real entries + legend descriptors

**Files:** Modify `src/data/layers.js`; Modify `src/data/layers.test.js`

- [ ] **Step 1: Update the failing test first** — replace the contents of `src/data/layers.test.js`
```js
import { describe, it, expect } from 'vitest';
import { LAYERS, baseLayers, overlayLayers } from './layers.js';

describe('layer registry', () => {
  it('every layer has id, labelKey, kind and a component', () => {
    for (const l of LAYERS) {
      expect(l.id).toBeTruthy();
      expect(l.labelKey).toMatch(/^layer\./);
      expect(['base', 'overlay']).toContain(l.kind);
      expect(typeof l.component).toBe('function');
    }
  });
  it('exposes exactly one default-enabled base layer (political)', () => {
    const defaults = baseLayers().filter((l) => l.enabledByDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe('political');
  });
  it('has no disabled layers (all five are implemented)', () => {
    expect(LAYERS.some((l) => l.disabled)).toBe(false);
    expect(LAYERS.map((l) => l.id).sort()).toEqual(
      ['agriculture', 'climate', 'currents', 'political', 'tectonic']
    );
  });
  it('every overlay has a legend descriptor with items', () => {
    for (const l of overlayLayers()) {
      expect(Array.isArray(l.legend?.items)).toBe(true);
      expect(l.legend.items.length).toBeGreaterThan(0);
      for (const item of l.legend.items) {
        expect(item.icon || item.swatch).toBeTruthy();
        expect(item.labelKey || item.label).toBeTruthy();
      }
    }
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL** — `npx vitest run src/data/layers.test.js` (current registry has disabled entries / null components).

- [ ] **Step 3: Implement** — replace the contents of `src/data/layers.js`
```js
import PoliticalLayer from '../components/layers/PoliticalLayer.jsx';
import TectonicLayer from '../components/layers/TectonicLayer.jsx';
import CurrentsLayer from '../components/layers/CurrentsLayer.jsx';
import ClimateLayer from '../components/layers/ClimateLayer.jsx';
import AgricultureLayer from '../components/layers/AgricultureLayer.jsx';
import { COMMODITIES } from './commodities.js';

export const LAYERS = [
  { id: 'political', labelKey: 'layer.political', kind: 'base', enabledByDefault: true, component: PoliticalLayer },
  {
    id: 'tectonic', labelKey: 'layer.tectonic', kind: 'overlay', component: TectonicLayer,
    legend: { items: [
      { swatch: 'var(--plate)', shape: 'line', labelKey: 'legend.plateBoundary' },
      { swatch: 'var(--volcano)', shape: 'dot', labelKey: 'legend.volcano' },
    ] },
  },
  {
    id: 'currents', labelKey: 'layer.currents', kind: 'overlay', component: CurrentsLayer,
    legend: { items: [
      { swatch: 'var(--current-warm)', shape: 'line', labelKey: 'legend.warmCurrent' },
      { swatch: 'var(--current-cold)', shape: 'line', labelKey: 'legend.coldCurrent' },
    ] },
  },
  {
    id: 'climate', labelKey: 'layer.climate', kind: 'overlay', component: ClimateLayer,
    legend: { items: [
      { swatch: '#2e7d32', labelKey: 'legend.climateA' },
      { swatch: '#e0c060', labelKey: 'legend.climateB' },
      { swatch: '#9ccc65', labelKey: 'legend.climateC' },
      { swatch: '#80cbc4', labelKey: 'legend.climateD' },
      { swatch: '#cfd8dc', labelKey: 'legend.climateE' },
    ] },
  },
  {
    id: 'agriculture', labelKey: 'layer.agriculture', kind: 'overlay', component: AgricultureLayer,
    legend: { items: COMMODITIES.map((c) => ({ icon: c.icon, label: { vi: c.vi, en: c.en } })) },
  },
];

export const baseLayers = () => LAYERS.filter((l) => l.kind === 'base');
export const overlayLayers = () => LAYERS.filter((l) => l.kind === 'overlay');
```

- [ ] **Step 4: Run it, confirm PASS** (4 tests). Then run `npm run test` → all green (v1 tests + new helpers, no regressions).

- [ ] **Step 5: Commit**
```bash
git add src/data/layers.js src/data/layers.test.js
git commit -m "feat: wire currents/climate/agriculture into layer registry with legends"
```

---

## Task 6: Legend panel + i18n + App wiring

**Files:** Create `src/components/Legend.jsx`, `src/components/Legend.test.jsx`; Modify `src/i18n/locales/vi.json`, `src/i18n/locales/en.json`, `src/App.jsx`

- [ ] **Step 1: Add i18n strings** — add these keys to BOTH locale files (keep both files' key sets identical).

`src/i18n/locales/vi.json` — add:
```json
  "legend.warmCurrent": "Dòng biển nóng",
  "legend.coldCurrent": "Dòng biển lạnh",
  "legend.plateBoundary": "Ranh giới mảng",
  "legend.volcano": "Núi lửa",
  "legend.climateA": "Nhiệt đới (A)",
  "legend.climateB": "Khô hạn (B)",
  "legend.climateC": "Ôn đới (C)",
  "legend.climateD": "Lục địa (D)",
  "legend.climateE": "Cực (E)",
  "lang.vietnamese": "Tiếng Việt",
  "lang.english": "English",
  "lang.dual": "Song ngữ"
```
`src/i18n/locales/en.json` — add:
```json
  "legend.warmCurrent": "Warm current",
  "legend.coldCurrent": "Cold current",
  "legend.plateBoundary": "Plate boundary",
  "legend.volcano": "Volcano",
  "legend.climateA": "Tropical (A)",
  "legend.climateB": "Arid (B)",
  "legend.climateC": "Temperate (C)",
  "legend.climateD": "Continental (D)",
  "legend.climateE": "Polar (E)",
  "lang.vietnamese": "Tiếng Việt",
  "lang.english": "English",
  "lang.dual": "Song ngữ"
```
(Add commas as needed so each JSON file stays valid.)

- [ ] **Step 2: Write the failing test** — `src/components/Legend.test.jsx`
```jsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import Legend from './Legend.jsx';

function renderWith(ids) {
  return render(
    <LanguageProvider>
      <Legend activeOverlayIds={new Set(ids)} />
    </LanguageProvider>
  );
}

beforeEach(() => { localStorage.clear(); });

describe('Legend', () => {
  it('renders nothing when no overlays are active', () => {
    const { container } = renderWith([]);
    expect(container.firstChild).toBeNull();
  });
  it('renders a section for an active overlay', () => {
    renderWith(['currents']);
    expect(screen.getByText('Dòng biển nóng')).toBeInTheDocument();
    expect(screen.getByText('Dòng biển lạnh')).toBeInTheDocument();
  });
  it('renders agriculture commodity labels from the registry', () => {
    renderWith(['agriculture']);
    expect(screen.getByText('Lúa gạo')).toBeInTheDocument();
    expect(screen.getByText('Cà phê')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it, confirm FAIL** — module not found.

- [ ] **Step 4: Implement** — `src/components/Legend.jsx`
```jsx
import { LAYERS } from '../data/layers.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { dualText } from '../lib/dualText.js';

function swatchStyle(item) {
  const base = { background: item.swatch, width: '16px', display: 'inline-block' };
  if (item.shape === 'line') return { ...base, height: '3px' };
  if (item.shape === 'dot') return { ...base, height: '14px', borderRadius: '50%' };
  return { ...base, height: '12px' };
}

export default function Legend({ activeOverlayIds }) {
  const { mode, tt } = useLanguage();
  const active = LAYERS.filter((l) => l.legend && activeOverlayIds.has(l.id));
  if (active.length === 0) return null;

  const labelOf = (item) =>
    item.labelKey ? tt(item.labelKey) : dualText(item.label.vi, item.label.en, mode);

  return (
    <div className="absolute bottom-4 left-4 z-[1000] rounded-lg shadow-lg p-3 text-xs max-h-[40vh] overflow-y-auto"
         style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
      {active.map((l) => (
        <div key={l.id} className="mb-2 last:mb-0">
          <p className="font-semibold mb-1">{tt(l.labelKey)}</p>
          {l.legend.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 mb-0.5">
              {item.icon
                ? <span className="w-4 text-center">{item.icon}</span>
                : <span style={swatchStyle(item)} />}
              <span>{labelOf(item)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run it, confirm PASS** (3 tests).

- [ ] **Step 6: Wire into App** — edit `src/App.jsx`: add the import and render `<Legend>` in `<main>` after `<LayerControl>`.

Add import (with the other component imports):
```jsx
import Legend from './components/Legend.jsx';
```
In the `<main>`, add after the `<LayerControl … />` element:
```jsx
              <Legend activeOverlayIds={activeOverlayIds} />
```

- [ ] **Step 7: Run full suite** — `npm run test` → all green.

- [ ] **Step 8: Commit**
```bash
git add src/components/Legend.jsx src/components/Legend.test.jsx src/i18n/locales/vi.json src/i18n/locales/en.json src/App.jsx
git commit -m "feat: add registry-driven legend panel"
```

---

## Task 7: MapView — reposition zoom + custom attribution

**Files:** Modify `src/components/MapView.jsx`

- [ ] **Step 1: Implement** — replace the contents of `src/components/MapView.jsx`
```jsx
import { MapContainer, ZoomControl, AttributionControl } from 'react-leaflet';
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
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
    >
      <ZoomControl position="topright" />
      <AttributionControl position="bottomright" prefix="Natural Earth · Köppen-Geiger · FAO · Wikipedia" />
      {active.map((l) => l.component && <l.component key={l.id} />)}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Verify** — `npm run build` → success; `npm run test` → still green (App smoke test mocks MapView, so unaffected).

- [ ] **Step 3: Commit**
```bash
git add src/components/MapView.jsx
git commit -m "feat: reposition zoom control and replace Leaflet attribution branding"
```

---

## Task 8: Header — flag-icon language switcher

**Files:** Modify `src/components/Header.jsx`; Create `src/components/Header.test.jsx`

- [ ] **Step 1: Write the failing test** — `src/components/Header.test.jsx`
```jsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import Header from './Header.jsx';

function renderHeader() {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <Header />
      </LanguageProvider>
    </ThemeProvider>
  );
}

beforeEach(() => { localStorage.clear(); });

describe('Header language switcher', () => {
  it('renders three flag buttons', () => {
    renderHeader();
    expect(screen.getByLabelText('Tiếng Việt')).toBeInTheDocument();
    expect(screen.getByLabelText('English')).toBeInTheDocument();
    expect(screen.getByLabelText('Song ngữ')).toBeInTheDocument();
  });
  it('marks the active language and switches on click', () => {
    renderHeader();
    const vi = screen.getByLabelText('Tiếng Việt');
    const en = screen.getByLabelText('English');
    expect(vi).toHaveAttribute('aria-pressed', 'true');
    en.click();
    expect(en).toHaveAttribute('aria-pressed', 'true');
    expect(vi).toHaveAttribute('aria-pressed', 'false');
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL** — the current Header uses a `<select>`, so the flag buttons / aria-labels don't exist yet.

- [ ] **Step 3: Implement** — replace the contents of `src/components/Header.jsx`
```jsx
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const MODES = [
  { id: 'vi', labelKey: 'lang.vietnamese', flags: ['vn'] },
  { id: 'en', labelKey: 'lang.english', flags: ['gb'] },
  { id: 'dual', labelKey: 'lang.dual', flags: ['vn', 'gb'] },
];

export default function Header() {
  const { mode, setMode, tt } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="flex items-center justify-between px-4 py-2 shadow z-[1000] relative"
            style={{ background: 'var(--panel-bg)', color: 'var(--panel-text)' }}>
      <h1 className="font-bold">{tt('app.title')}</h1>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={tt(m.labelKey)}
              aria-label={tt(m.labelKey)}
              aria-pressed={mode === m.id}
              className={`flex items-center gap-0.5 rounded border px-1 py-0.5 transition
                ${mode === m.id ? 'ring-2 ring-blue-500 opacity-100' : 'opacity-50 hover:opacity-90'}`}
            >
              {m.flags.map((code) => (
                <img key={code} src={`https://flagcdn.com/w40/${code}.png`} alt="" className="h-4 w-auto rounded-sm" />
              ))}
            </button>
          ))}
        </div>
        <button onClick={toggleTheme} aria-label={tt('theme.toggle')} className="border rounded px-2 py-1">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run it, confirm PASS** (2 tests). Then `npm run test` → all green.

- [ ] **Step 5: Commit**
```bash
git add src/components/Header.jsx src/components/Header.test.jsx
git commit -m "feat: replace language dropdown with flag-icon switcher"
```

---

## Task 9: README update + final verification

**Files:** Modify `README.md`

- [ ] **Step 1: Update the README** — replace the "How it works" and "Data sources & licenses" sections of `README.md` with:
```markdown
## How it works
- **Base map:** Natural Earth country polygons rendered as GeoJSON (no tiles, no API keys).
- **Labels:** `NAME_VI` / `NAME_EN` from Natural Earth, switched by language mode.
- **Layers:** Political (base) + four overlays — Tectonic (plates + volcanoes), Ocean
  Currents (warm/cold arrows), Climate Zones (Köppen, translucent), and Agriculture
  (commodity markers). The Layer Control and Legend are both driven by `src/data/layers.js`.
- **Info panel:** flag (flagcdn by ISO code), population (`POP_EST`), capital + article
  titles (Wikidata), and the intro extract (Wikipedia REST summary).
- **Themes:** the `dark` class on `<html>` toggles CSS variables used by both Tailwind
  and the Leaflet SVG. Language switcher uses flag images (`flagcdn`).

## Data sources & licenses
- Countries / volcanoes are described in `scripts/fetch-data.mjs`.
- Countries: Natural Earth (public domain).
- Tectonic plate boundaries: Hugo Ahlenius / Peter Bird (Open Data Commons Attribution).
- Volcanoes: Smithsonian Global Volcanism Program (CC0).
- Climate: Köppen-Geiger classification (circleofconfusion/climate-map, 1976–2000).
- Ocean currents: curated from standard oceanographic references (illustrative, not a
  precise vector field).
- Agriculture: top-producing countries per commodity, curated from FAOSTAT statistics.
- Flags: flagcdn.com. Summaries: Wikipedia / Wikidata APIs.
```

- [ ] **Step 2: Final automated verification**
```bash
npm run test
npm run build
```
Expected: all tests pass (v1 24 + bearing 5 + climate 2 + Legend 3 + Header 2 = 36, minus none); build clean. (The updated `layers.test.js` replaced the 3 old assertions but keeps 4 tests.)

- [ ] **Step 3: Commit**
```bash
git add README.md
git commit -m "docs: update README for v2 layers and data sources"
```

---

## Self-review notes (addressed)
- **Spec coverage:** Currents (T3 data, T4 component, T5 registry, legend T5/T6), Climate (same), Agriculture (same + commodities T3), Legend panel (T6), Leaflet chrome — zoom reposition + attribution (T7), flag-icon switcher (T8), translucent non-interactive climate (T4 `interactive:false`), honest provenance (README T9). All spec sections map to a task.
- **Type consistency:** legend descriptor shape `{ items: [{ swatch|icon, shape?, labelKey|label }] }` is produced in `layers.js` (T5) and consumed identically in `Legend.jsx` (T6). `COMMODITIES` item shape `{ id, vi, en, icon }` is produced in T3 and consumed by `AgricultureLayer` (T4) and the agriculture legend (T5). `agriculture.json` keys are commodity `id`s (T3) read by `AgricultureLayer` via `data[c.id]` (T4). Currents feature props `{ name_vi, name_en, type }` (T3) consumed by `CurrentsLayer` (T4). Climate prop `CODE` (T3) consumed via `climateClass` (T2/T4).
- **Placeholder scan:** none.
