# Zoom-to-Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking any feature (country, climate zone, current, volcano, crop marker) zooms/focuses the map on it; closing the panel (×) animates back to the pre-click view; zoom strengthened to level 6.

**Architecture:** A single `MapController` inside the Leaflet map watches the selection and performs all zoom: on select it saves the current view (once) and zooms to `selected.focus` (fitBounds for `{bounds}`, flyTo for `{center}`); on deselect it animates back to the saved view. Each layer's click handler just records `focus` on the selection.

**Tech Stack:** React 18, react-leaflet 4.2.1, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-06-18-zoom-focus-design.md`

**Baseline:** branch `feature/zoom-focus` (off `master`), 63 tests passing.

---

## File structure
```
src/lib/bounds.js                NEW  boundsToObj(leafletBounds) → {south,west,north,east}
src/lib/bounds.test.js           NEW  unit test
src/components/MapController.jsx  NEW  selection-driven zoom + zoom-back-out
src/components/MapView.jsx        MOD  render <MapController/>
src/components/layers/PoliticalLayer.jsx   MOD  focus:{bounds}; remove inline fitBounds/useMap
src/components/layers/ClimateLayer.jsx     MOD  focus:{bounds}
src/components/layers/CurrentsLayer.jsx    MOD  focus:{bounds}
src/components/layers/TectonicLayer.jsx    MOD  volcano focus:{center}
src/components/layers/AgricultureLayer.jsx MOD  commodity focus:{center}
```

---

## Task 1: boundsToObj helper (TDD)

**Files:** Create `src/lib/bounds.js`, `src/lib/bounds.test.js`

- [ ] **Step 1: Write the failing test** — `src/lib/bounds.test.js`
```js
import { describe, it, expect } from 'vitest';
import { boundsToObj } from './bounds.js';

describe('boundsToObj', () => {
  it('serializes a Leaflet bounds to plain {south,west,north,east}', () => {
    const fakeBounds = { getSouth: () => 1, getWest: () => 2, getNorth: () => 3, getEast: () => 4 };
    expect(boundsToObj(fakeBounds)).toEqual({ south: 1, west: 2, north: 3, east: 4 });
  });
});
```

- [ ] **Step 2: Run it, confirm FAIL** — `npx vitest run src/lib/bounds.test.js`.

- [ ] **Step 3: Implement** — `src/lib/bounds.js`
```js
// Serialize a Leaflet LatLngBounds into a plain object (storable in selection state).
export function boundsToObj(b) {
  return { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() };
}
```

- [ ] **Step 4: Run it, confirm PASS** (1 test).

- [ ] **Step 5: Commit**
```bash
git add src/lib/bounds.js src/lib/bounds.test.js
git commit -m "feat: add boundsToObj helper"
```

---

## Task 2: MapController + MapView + PoliticalLayer

**Files:** Create `src/components/MapController.jsx`; Modify `src/components/MapView.jsx`, `src/components/layers/PoliticalLayer.jsx`

> No unit tests (Leaflet behavior); verified live. After this task, countries zoom via the controller and the zoom-back-out works — no regression.

- [ ] **Step 1: Create the controller** — `src/components/MapController.jsx`
```jsx
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useSelection } from '../context/SelectionContext.jsx';

// Selection-driven map zoom: focus the clicked feature; restore the prior view on close.
export default function MapController() {
  const map = useMap();
  const { selected } = useSelection();
  const savedView = useRef(null);

  useEffect(() => {
    if (selected && selected.focus) {
      if (!savedView.current) {
        savedView.current = { center: map.getCenter(), zoom: map.getZoom() };
      }
      const f = selected.focus;
      if (f.bounds) {
        const b = f.bounds;
        map.fitBounds([[b.south, b.west], [b.north, b.east]], { animate: true, maxZoom: 6, padding: [20, 20] });
      } else if (f.center) {
        map.flyTo(f.center, Math.max(map.getZoom(), 6), { animate: true });
      }
    } else if (!selected && savedView.current) {
      map.flyTo(savedView.current.center, savedView.current.zoom, { animate: true });
      savedView.current = null;
    }
  }, [selected, map]);

  return null;
}
```

- [ ] **Step 2: Render it in MapView.** In `src/components/MapView.jsx`:
  - Add import: `import MapController from './MapController.jsx';`
  - Render `<MapController />` as the first child inside `<MapContainer>` (before `<ZoomControl …/>`):
```jsx
      <MapController />
```

- [ ] **Step 3: Update PoliticalLayer** to set `focus` and drop its inline zoom. In `src/components/layers/PoliticalLayer.jsx`:
  - Change the react-leaflet import to drop `useMap`: `import { GeoJSON } from 'react-leaflet';`
  - Add import: `import { boundsToObj } from '../../lib/bounds.js';`
  - Remove the `const map = useMap();` line.
  - Replace the `click` handler with (computes bounds once, reuses for both `bounds` and `focus.bounds`, no `map.fitBounds`):
```jsx
      click: () => {
        if (selectedElRef.current) selectedElRef.current.classList.remove('country-selected');
        const el = layer.getElement();
        if (el) { el.classList.add('country-selected'); selectedElRef.current = el; }
        const bounds = boundsToObj(layer.getBounds());
        setSelected({
          kind: 'country',
          wikidata: p.WIKIDATAID || null,
          iso2: p.ISO_A2 && p.ISO_A2 !== '-99' ? p.ISO_A2 : null,
          nameVi: p.NAME_VI, nameEn: p.NAME_EN, population: p.POP_EST ?? null,
          bounds,
          focus: { bounds },
        });
      },
```

- [ ] **Step 4: Verify** — `npm run build` (success) and `npm run test` (64 pass — Task 1 added one; no other test changes).

- [ ] **Step 5: Commit**
```bash
git add src/components/MapController.jsx src/components/MapView.jsx src/components/layers/PoliticalLayer.jsx
git commit -m "feat: centralize zoom in MapController with zoom-back-out; country focus"
```

---

## Task 3: Add focus to the other layers

**Files:** Modify `src/components/layers/ClimateLayer.jsx`, `CurrentsLayer.jsx`, `TectonicLayer.jsx`, `AgricultureLayer.jsx`

> No unit tests (Leaflet); verified live.

- [ ] **Step 1: ClimateLayer.** In `src/components/layers/ClimateLayer.jsx`:
  - Add import: `import { boundsToObj } from '../../lib/bounds.js';`
  - In the `click` handler, change the `setSelected(...)` call to include focus:
```jsx
        setSelected({ kind: 'climate', code: feature.properties.CODE, focus: { bounds: boundsToObj(e.target.getBounds()) } });
```

- [ ] **Step 2: CurrentsLayer.** In `src/components/layers/CurrentsLayer.jsx`:
  - Add import: `import { boundsToObj } from '../../lib/bounds.js';`
  - In `onEachFeature`, change the click line to:
```jsx
          layer.on('click', () => setSelected({ kind: 'current', nameVi: p.name_vi, nameEn: p.name_en, type: p.type, focus: { bounds: boundsToObj(layer.getBounds()) } }));
```

- [ ] **Step 3: TectonicLayer (volcano).** In `src/components/layers/TectonicLayer.jsx`, change the volcano `onEachFeature` click to capture the marker's latlng:
```jsx
          onEachFeature={(feature, layer) => {
            const name = feature.properties?.name || null;
            if (name) layer.bindTooltip(name, { sticky: true });
            layer.on('click', () => {
              const ll = layer.getLatLng();
              setSelected({ kind: 'volcano', name, focus: { center: [ll.lat, ll.lng] } });
            });
          }}
```

- [ ] **Step 4: AgricultureLayer.** In `src/components/layers/AgricultureLayer.jsx`, add `focus` to the marker's click selection:
```jsx
            eventHandlers={{ click: () => setSelected({ kind: 'commodity', id: c.id, vi: c.vi, en: c.en, icon: c.icon, iso2: loc.iso2, focus: { center: loc.coord } }) }}
```

- [ ] **Step 5: Verify** — `npm run build` (success) and `npm run test` (64 pass).

- [ ] **Step 6: Commit**
```bash
git add src/components/layers/ClimateLayer.jsx src/components/layers/CurrentsLayer.jsx src/components/layers/TectonicLayer.jsx src/components/layers/AgricultureLayer.jsx
git commit -m "feat: add focus targets for climate, current, volcano, commodity clicks"
```

---

## Task 4: Final verification

- [ ] **Step 1: Automated** — `npm run test` (64 pass), `npm run build` (success).
- [ ] **Step 2: Manual browser check** (`npm run dev`):
  - Click a country → zooms to it (≈ level 6 for small/medium); the panel opens.
  - Click × → map animates back to the previous (world) view.
  - Toggle Climate, click a zone → zooms to fit the zone + highlights it; × → animates back.
  - Toggle Tectonic, click a volcano → flies to it at zoom ≥ 6.
  - Toggle Agriculture, click a crop marker → flies to it; × → back.
  - Toggle Currents, click a current line → fits the line.
- [ ] **Step 3: No code expected** (verification only).

---

## Self-review notes (addressed)
- **Spec coverage:** focus field on every selection (T2 country, T3 others), MapController zoom + saved-view restore + stronger maxZoom 6 / flyTo 6 (T2), boundsToObj helper (T1), MapView renders controller (T2). All spec items mapped.
- **Type consistency:** `focus` is `{ bounds: {south,west,north,east} }` (from `boundsToObj`) or `{ center: [lat,lng] }`; MapController (T2) consumes exactly those shapes. `boundsToObj` (T1) used by PoliticalLayer/ClimateLayer/CurrentsLayer. Country keeps its `bounds` field for CountryLayerFacts and reuses it for `focus.bounds`.
- **No broken intermediate:** T2 removes PoliticalLayer's inline fitBounds but adds the controller in the same task, so country zoom keeps working throughout.
- **Placeholder scan:** none.
