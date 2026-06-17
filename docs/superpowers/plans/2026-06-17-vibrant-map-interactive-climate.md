# Vibrant Map + Interactive Climate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Color countries with a vibrant distinct-neighbor palette (Natural Earth MAPCOLOR7), and make the Climate layer interactive so clicking a Köppen zone highlights it and shows that climate type's Wikipedia description.

**Architecture:** Add MAPCOLOR7 to the shipped country data and color each country via a pure `mapColor()` palette in `PoliticalLayer` (drop the flat CSS fill). Make `ClimateLayer` interactive with hover/click highlight via a Leaflet ref, emitting a new `climate` selection kind that flows through the existing `featureWikiTitles` → `useWikiSummary` → `InfoPanel` pipeline using a per-Köppen-code article map. Reorder the registry so climate sits below the line/marker overlays.

**Tech Stack:** React 18, react-leaflet 4.2.1, Vitest. Reuses `climateClass`, `useWikiSummary`, `WikiExtracts`, `useSelection`.

**Reference spec:** `docs/superpowers/specs/2026-06-17-vibrant-map-interactive-climate-design.md`

**Baseline:** branch `feature/vibrant-climate` (off `master`), 58 tests passing.

---

## File structure
```
src/lib/mapColor.js                 NEW  mapColor(n) → vibrant palette hex
src/lib/climate.js                  MOD  add koppenArticle(code)
src/lib/featureTitles.js            MOD  add 'climate' case; remove climateTitles
src/lib/featureTitles.test.js       MOD  add climate test; drop climateTitles test
src/components/layers/PoliticalLayer.jsx   MOD  fillColor = mapColor(MAPCOLOR7)
src/components/layers/ClimateLayer.jsx     MOD  interactive + hover/click highlight
src/data/layers.js                  MOD  reorder climate above other overlays
src/components/InfoPanel.jsx        MOD  'climate' kind (title=code, label=group)
src/components/CountryLayerFacts.jsx       MOD  remove climate sub-section
src/components/CountryLayerFacts.test.jsx  MOD  drop climate assertion
src/components/InfoPanel.test.jsx   MOD  add climate selection test
src/index.css                       MOD  drop flat fill from .country
scripts/fetch-data.mjs              MOD  add MAPCOLOR7 to KEEP; re-run
public/data/countries.geojson       (regenerated)
```

---

## Task 1: mapColor helper (TDD)

**Files:** Create `src/lib/mapColor.js`, `src/lib/mapColor.test.js`

- [ ] **Step 1: Write the failing test** — `src/lib/mapColor.test.js`
```js
import { describe, it, expect } from 'vitest';
import { mapColor } from './mapColor.js';

describe('mapColor', () => {
  it('maps 1..7 to distinct vibrant hex colors', () => {
    const colors = [1, 2, 3, 4, 5, 6, 7].map(mapColor);
    expect(colors).toEqual(['#e57373', '#81c784', '#64b5f6', '#ffb74d', '#ba68c8', '#4db6ac', '#fff176']);
    expect(new Set(colors).size).toBe(7); // all distinct
  });
  it('falls back for missing/0/unknown values', () => {
    expect(mapColor(0)).toBe('#cfd8dc');
    expect(mapColor(undefined)).toBe('#cfd8dc');
    expect(mapColor(99)).toBe('#cfd8dc');
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL** — `npx vitest run src/lib/mapColor.test.js`.

- [ ] **Step 3: Implement** — `src/lib/mapColor.js`
```js
// Natural Earth MAPCOLOR7 (1..7, adjacent countries differ) → vibrant palette.
const PALETTE = {
  1: '#e57373', 2: '#81c784', 3: '#64b5f6', 4: '#ffb74d',
  5: '#ba68c8', 6: '#4db6ac', 7: '#fff176',
};

export function mapColor(n) {
  return PALETTE[n] || '#cfd8dc';
}
```

- [ ] **Step 4: Run it, confirm PASS** (2 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/mapColor.js src/lib/mapColor.test.js
git commit -m "feat: add mapColor vibrant palette helper"
```

---

## Task 2: Add MAPCOLOR7 to the data

**Files:** Modify `scripts/fetch-data.mjs`; regenerate `public/data/countries.geojson`

- [ ] **Step 1: Add the field to KEEP.** In `scripts/fetch-data.mjs`, find the `KEEP` array and add `'MAPCOLOR7'`:
```js
const KEEP = ['NAME_VI', 'NAME_EN', 'NAME_LONG', 'WIKIDATAID', 'ISO_A2', 'ISO_A3', 'CONTINENT', 'POP_EST', 'LABELRANK', 'MAPCOLOR7'];
```

- [ ] **Step 2: Re-run the data script** (re-downloads all sources; takes a minute):
```bash
node scripts/fetch-data.mjs
```
Expected: prints the "Wrote countries, plates, volcanoes, climate" success line.

- [ ] **Step 3: Verify MAPCOLOR7 is present** (ESM project — use readFileSync):
```bash
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('./public/data/countries.geojson','utf8'));const vn=d.features.find(f=>f.properties.ISO_A2==='VN');console.log('VN MAPCOLOR7:',vn.properties.MAPCOLOR7,'| feature count:',d.features.length);"
```
Expected: a `VN MAPCOLOR7:` integer in 1–7 and a feature count (~242). Report it.

- [ ] **Step 4: Commit**
```bash
git add scripts/fetch-data.mjs public/data/countries.geojson
git commit -m "feat: include MAPCOLOR7 in country data"
```

---

## Task 3: Vibrant country fill

**Files:** Modify `src/components/layers/PoliticalLayer.jsx`, `src/index.css`

> No unit test (Leaflet); verified live later.

- [ ] **Step 1: Color countries by MAPCOLOR7.** In `src/components/layers/PoliticalLayer.jsx`:
  - Add import: `import { mapColor } from '../../lib/mapColor.js';`
  - Replace the `<GeoJSON … style={...} />` `style` prop with:
```jsx
      style={(f) => ({ className: 'country', fillColor: mapColor(f.properties.MAPCOLOR7), fillOpacity: 1, weight: 0.5 })}
```

- [ ] **Step 2: Let the per-feature fill show.** In `src/index.css`, change the `.country` rule (line ~34) from:
```css
.country { fill: var(--map-land); stroke: var(--map-stroke); stroke-width: 0.5; }
```
to (drop the `fill` so the inline `fillColor` is used; CSS rules otherwise override SVG presentation attributes):
```css
.country { stroke: var(--map-stroke); stroke-width: 0.5; }
```
Leave `.country:hover` and `.country-selected` unchanged (they intentionally override the vibrant color with the themed hover/selected color for feedback).

- [ ] **Step 3: Verify build** — `npm run build` (success) and `npm run test` (still green, 60 now with Tasks 1 added — confirm no failures).

- [ ] **Step 4: Commit**
```bash
git add src/components/layers/PoliticalLayer.jsx src/index.css
git commit -m "feat: color countries with vibrant MAPCOLOR7 palette"
```

---

## Task 4: koppenArticle helper (TDD)

**Files:** Modify `src/lib/climate.js`, `src/lib/climate.test.js`

- [ ] **Step 1: Add the failing test** — append to `src/lib/climate.test.js` (inside the file, new `describe`):
```js
import { koppenArticle } from './climate.js';

describe('koppenArticle', () => {
  it('maps codes to climate-type Wikipedia titles (specific first, then general fallback)', () => {
    expect(koppenArticle('Af').en).toEqual(['Tropical rainforest climate', 'Köppen climate classification']);
    expect(koppenArticle('Am').en[0]).toBe('Tropical monsoon climate');
    expect(koppenArticle('Aw').en[0]).toBe('Tropical savanna climate');
    expect(koppenArticle('BWh').en[0]).toBe('Desert climate');
    expect(koppenArticle('BSk').en[0]).toBe('Semi-arid climate');
    expect(koppenArticle('Csa').en[0]).toBe('Mediterranean climate');
    expect(koppenArticle('Cfa').en[0]).toBe('Humid subtropical climate');
    expect(koppenArticle('Cfb').en[0]).toBe('Oceanic climate');
    expect(koppenArticle('Dfb').en[0]).toBe('Humid continental climate');
    expect(koppenArticle('Dfc').en[0]).toBe('Subarctic climate');
    expect(koppenArticle('ET').en[0]).toBe('Tundra');
    expect(koppenArticle('EF').en[0]).toBe('Ice cap climate');
  });
  it('falls back to the general article for unknown/empty codes', () => {
    expect(koppenArticle('').en).toEqual(['Köppen climate classification']);
    expect(koppenArticle('ZZ').en).toEqual(['Köppen climate classification']);
  });
  it('always provides a vi candidate list', () => {
    expect(Array.isArray(koppenArticle('Af').vi)).toBe(true);
    expect(koppenArticle('Af').vi.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL** — `npx vitest run src/lib/climate.test.js`.

- [ ] **Step 3: Implement** — append to `src/lib/climate.js`:
```js
// Köppen code → Wikipedia article candidates for the climate *type*.
// Returns { en: [...], vi: [...] }, specific title first then the general fallback.
export function koppenArticle(code) {
  const c = typeof code === 'string' ? code : '';
  const generalEn = 'Köppen climate classification';
  const generalVi = 'Phân loại khí hậu Köppen';
  let en = null;
  let vi = null;
  if (c === 'Af') { en = 'Tropical rainforest climate'; vi = 'Khí hậu rừng mưa nhiệt đới'; }
  else if (c === 'Am') { en = 'Tropical monsoon climate'; vi = 'Khí hậu gió mùa nhiệt đới'; }
  else if (c[0] === 'A') { en = 'Tropical savanna climate'; vi = 'Khí hậu xavan'; }
  else if (c.startsWith('BW')) { en = 'Desert climate'; vi = 'Khí hậu hoang mạc'; }
  else if (c.startsWith('BS')) { en = 'Semi-arid climate'; vi = 'Khí hậu bán khô hạn'; }
  else if (c.startsWith('Cs')) { en = 'Mediterranean climate'; vi = 'Khí hậu Địa Trung Hải'; }
  else if (c === 'Cfa' || c === 'Cwa') { en = 'Humid subtropical climate'; vi = 'Khí hậu cận nhiệt đới ẩm'; }
  else if (c[0] === 'C') { en = 'Oceanic climate'; vi = 'Khí hậu đại dương'; }
  else if (c[0] === 'D' && (c[2] === 'a' || c[2] === 'b')) { en = 'Humid continental climate'; vi = 'Khí hậu lục địa ẩm'; }
  else if (c[0] === 'D') { en = 'Subarctic climate'; vi = 'Khí hậu cận Bắc Cực'; }
  else if (c === 'ET') { en = 'Tundra'; vi = 'Đồng rêu'; }
  else if (c === 'EF') { en = 'Ice cap climate'; vi = 'Khí hậu chỏm băng'; }
  return {
    en: en ? [en, generalEn] : [generalEn],
    vi: vi ? [vi, generalVi] : [generalVi],
  };
}
```

- [ ] **Step 4: Run it, confirm PASS.** Then `npm run test` (all green).

- [ ] **Step 5: Commit**
```bash
git add src/lib/climate.js src/lib/climate.test.js
git commit -m "feat: add koppenArticle climate-type Wikipedia mapping"
```

---

## Task 5: featureWikiTitles climate case (TDD)

**Files:** Modify `src/lib/featureTitles.js`, `src/lib/featureTitles.test.js`

> Leave `climateTitles` in place for now (Task 7 removes it once `CountryLayerFacts` stops using it).

- [ ] **Step 1: Add the failing test** — in `src/lib/featureTitles.test.js`, inside the existing `describe('featureWikiTitles', …)` block, add:
```js
  it('climate → koppen article candidates for the code', () => {
    expect(featureWikiTitles({ kind: 'climate', code: 'Af' }, null))
      .toEqual({ vi: ['Khí hậu rừng mưa nhiệt đới', 'Phân loại khí hậu Köppen'], en: ['Tropical rainforest climate', 'Köppen climate classification'] });
  });
```

- [ ] **Step 2: Run it, confirm FAIL.**

- [ ] **Step 3: Implement.** In `src/lib/featureTitles.js`:
  - Add import at top: `import { koppenArticle } from './climate.js';`
  - In `featureWikiTitles`, add a climate branch BEFORE the volcano branch:
```js
  if (feature.kind === 'climate') {
    return koppenArticle(feature.code);
  }
```

- [ ] **Step 4: Run it, confirm PASS.** Then `npm run test` (all green).

- [ ] **Step 5: Commit**
```bash
git add src/lib/featureTitles.js src/lib/featureTitles.test.js
git commit -m "feat: featureWikiTitles handles the climate kind"
```

---

## Task 6: Interactive ClimateLayer + registry reorder

**Files:** Modify `src/components/layers/ClimateLayer.jsx`, `src/data/layers.js`

> No unit test (Leaflet); verified live later. `layers.test.js` asserts the id SET (order-independent) and that overlays have legends, so the reorder keeps it green.

- [ ] **Step 1: Make climate interactive.** Replace the contents of `src/components/layers/ClimateLayer.jsx`:
```jsx
import { useRef } from 'react';
import { GeoJSON } from 'react-leaflet';
import { useGeoData } from '../../hooks/useGeoData.js';
import { useSelection } from '../../context/SelectionContext.jsx';
import { climateClass } from '../../lib/climate.js';

export default function ClimateLayer() {
  const { data } = useGeoData('/data/climate.geojson');
  const { setSelected } = useSelection();
  const geoRef = useRef(null);
  const selectedRef = useRef(null);

  if (!data) return null;

  const style = (f) => ({
    fillColor: climateClass(f.properties.CODE).color,
    fillOpacity: 0.8,
    weight: 0,
    color: '#111111',
  });

  const onEachFeature = (feature, layer) => {
    layer.on({
      mouseover: (e) => { if (e.target !== selectedRef.current) e.target.setStyle({ weight: 1, color: '#333333' }); },
      mouseout: (e) => { if (e.target !== selectedRef.current) geoRef.current?.resetStyle(e.target); },
      click: (e) => {
        if (selectedRef.current && geoRef.current) geoRef.current.resetStyle(selectedRef.current);
        e.target.setStyle({ weight: 2, color: '#111111', fillOpacity: 0.9 });
        e.target.bringToFront();
        selectedRef.current = e.target;
        setSelected({ kind: 'climate', code: feature.properties.CODE });
      },
    });
  };

  return <GeoJSON ref={geoRef} data={data} style={style} onEachFeature={onEachFeature} />;
}
```

- [ ] **Step 2: Reorder the registry** so climate renders just above the political base (below the line/marker overlays). In `src/data/layers.js`, move the `climate` entry to immediately after `political` (before `tectonic`). The array order becomes: `political`, `climate`, `tectonic`, `currents`, `agriculture`. Keep every entry's contents (id/labelKey/kind/component/legend) exactly as-is — only the order changes.

- [ ] **Step 3: Verify** — `npm run build` (success) and `npm run test` (all green; `layers.test.js` still passes since it checks the id set, not order).

- [ ] **Step 4: Commit**
```bash
git add src/components/layers/ClimateLayer.jsx src/data/layers.js
git commit -m "feat: make climate layer interactive with click/hover highlight"
```

---

## Task 7: InfoPanel climate kind + drop country climate section + remove climateTitles

**Files:** Modify `src/components/InfoPanel.jsx`, `src/components/CountryLayerFacts.jsx`, `src/lib/featureTitles.js`, and the tests `src/components/InfoPanel.test.jsx`, `src/components/CountryLayerFacts.test.jsx`, `src/lib/featureTitles.test.js`

- [ ] **Step 1: Update CountryLayerFacts test** — remove the climate assertion. In `src/components/CountryLayerFacts.test.jsx`:
  - Delete the `vi.mock('../hooks/useWikiSummary.js', …)` block (no longer used).
  - Delete the test `it('shows the climate extract when climate active', …)`.
  - Keep the other tests (null, agriculture, volcano count).

- [ ] **Step 2: Update CountryLayerFacts** — remove the climate sub-section. Replace the contents of `src/components/CountryLayerFacts.jsx`:
```jsx
import { useGeoData } from '../hooks/useGeoData.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { dualText } from '../lib/dualText.js';
import { COMMODITIES } from '../data/commodities.js';
import { commoditiesForCountry, volcanoCountInBounds } from '../lib/countryFacts.js';

export default function CountryLayerFacts({ iso2, bounds, activeOverlayIds }) {
  const { mode, tt } = useLanguage();
  const agActive = activeOverlayIds.has('agriculture');
  const tecActive = activeOverlayIds.has('tectonic');
  const climateActive = activeOverlayIds.has('climate');
  const currentsActive = activeOverlayIds.has('currents');

  const { data: agData } = useGeoData(agActive ? '/data/agriculture.json' : null);
  const { data: volData } = useGeoData(tecActive ? '/data/volcanoes.geojson' : null);

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

      {climateActive && <p className="text-sm opacity-70">{tt('panel.climateNote')}</p>}
      {currentsActive && <p className="text-sm opacity-70">{tt('panel.currentsNote')}</p>}
    </div>
  );
}
```
(Note: `nameVi`/`nameEn` props are no longer needed here; `panel.climateNote` now just hints "see the map" since clicking a country won't reach this while Climate is on, but keeping the note is harmless and covers the brief moment before climate data renders.)

- [ ] **Step 3: Update InfoPanel** — add the `climate` kind to `title` and `featureLabel`, and drop the `nameVi`/`nameEn` props passed to `CountryLayerFacts`. In `src/components/InfoPanel.jsx`:
  - Add import: `import { climateClass } from '../lib/climate.js';`
  - Replace the `title` const with:
```jsx
  const title =
    kind === 'volcano' ? (feature.name || '') :
    kind === 'climate' ? (feature.code || '') :
    kind === 'commodity' ? dualText(feature.vi, feature.en, mode) :
    dualText(feature.nameVi, feature.nameEn, mode);
```
  - Replace the `featureLabel` const with:
```jsx
  const climateGroup = kind === 'climate' ? climateClass(feature.code).group : null;
  const featureLabel =
    kind === 'current' ? tt(feature.type === 'warm' ? 'legend.warmCurrent' : 'legend.coldCurrent') :
    kind === 'volcano' ? tt('legend.volcano') :
    kind === 'climate' ? (['A', 'B', 'C', 'D', 'E'].includes(climateGroup) ? tt(`legend.climate${climateGroup}`) : null) :
    kind === 'commodity' ? `${tt('panel.majorProducer')}${countryName ? ': ' + dualText(countryName.vi, countryName.en, mode) : ''}` :
    null;
```
  - In the country branch, change the `<CountryLayerFacts … />` call to drop `nameVi`/`nameEn`:
```jsx
          <CountryLayerFacts iso2={feature.iso2} bounds={feature.bounds} activeOverlayIds={activeOverlayIds} />
```

- [ ] **Step 4: Update InfoPanel test** — add a climate selection test. In `src/components/InfoPanel.test.jsx`, add inside the `describe`:
```jsx
  it('renders a climate feature view with code, group and description', () => {
    renderWith({ kind: 'climate', code: 'Af' });
    expect(screen.getByText('Af')).toBeInTheDocument();
    expect(screen.getByText('Nhiệt đới (A)')).toBeInTheDocument(); // group label (vi default)
    expect(screen.getByText('A warm current.')).toBeInTheDocument(); // mocked useWikiSummary extract
  });
```
(The existing `vi.mock('../hooks/useWikiSummary.js', …)` returns the same extract for any non-null titles, so the climate branch reuses it.)

- [ ] **Step 5: Remove the now-unused climateTitles.** In `src/lib/featureTitles.js`, delete the `climateTitles` export entirely. In `src/lib/featureTitles.test.js`, delete the `describe('climateTitles', …)` block and its import usage.

- [ ] **Step 6: Run the suites** — `npx vitest run src/components/InfoPanel.test.jsx src/components/CountryLayerFacts.test.jsx src/lib/featureTitles.test.js` → all pass. Then `npm run test` → all green; `npm run build` → success.

- [ ] **Step 7: Commit**
```bash
git add src/components/InfoPanel.jsx src/components/InfoPanel.test.jsx src/components/CountryLayerFacts.jsx src/components/CountryLayerFacts.test.jsx src/lib/featureTitles.js src/lib/featureTitles.test.js
git commit -m "feat: climate-zone info panel; drop unreachable country climate section"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full automated check**
```bash
npm run test
npm run build
```
Expected: all tests pass; build clean.

- [ ] **Step 2: Manual browser check** (`npm run dev`):
  - Base map shows varied vibrant country colors (neighbors differ).
  - Toggle Climate → colored zones at ~0.8 opacity; hovering a zone outlines it; clicking a zone gives it a dark outline + the panel shows the code (e.g. "Af"), the group ("Tropical (A)"), and a Wikipedia description of that climate type.
  - Clicking a different zone resets the previous highlight.
  - With Climate + Tectonic/Agriculture on, the volcano/commodity markers still sit on top and are clickable.
  - VI / EN / Dual update the climate panel; English fallback when no VI article.

- [ ] **Step 3: No code expected here** (verification only).

---

## Self-review notes (addressed)
- **Spec coverage:** vibrant palette (T1 mapColor, T2 data, T3 PoliticalLayer+CSS); interactive climate (T6 ClimateLayer + reorder); climate-type article map (T4 koppenArticle, T5 featureWikiTitles); climate panel (T7 InfoPanel); drop country climate section + climateTitles (T7); verification (T8). All spec sections map to a task.
- **Type consistency:** new selection `{ kind:'climate', code }` set in ClimateLayer (T6), consumed by `featureWikiTitles` climate case (T5) and InfoPanel title/label (T7). `mapColor(n)` (T1) consumed in PoliticalLayer (T3). `koppenArticle(code)` (T4) consumed in featureTitles (T5). `climateClass(code).group` (existing) used in InfoPanel (T7). `CountryLayerFacts` prop change (drop nameVi/nameEn) is applied in both the component (T7 S2) and its caller InfoPanel (T7 S3).
- **No broken intermediate:** `climateTitles` is removed in T7 (same task that removes its only consumer, CountryLayerFacts), avoiding a dangling import.
- **Placeholder scan:** none.
