# Interactive World Map — v2 "Full Version" Design

**Date:** 2026-06-17
**Status:** Approved for planning
**Builds on:** v1 (`2026-06-17-interactive-world-map-design.md`), already implemented and merged on branch `feature/interactive-world-map`.

## Purpose

Extend the v1 classroom world map to the "full version": fill the three deferred thematic
layers (Ocean Currents, Climate Zones, Agriculture) into the existing layer framework, add
a Legend panel, clean up the Leaflet chrome, and replace the language dropdown with a
minimal flag-icon switcher.

## Scope

### In scope
1. **Ocean Currents layer** — major named warm/cold currents as colored arrowed lines.
2. **Climate Zones layer** — Köppen-Geiger zones, grouped into 5 main classes, colored.
3. **Agriculture layer** — commodity icon markers at top-producing countries.
4. **Legend panel** — shows a legend section per active overlay, driven by the registry.
5. **Leaflet chrome fixes** — remove the "Leaflet" attribution branding (keep a small
   themed data credit) and reposition the zoom control so it no longer overlaps the
   Layer Control panel.
6. **Flag-icon language switcher** — replace the `<select>` with minimal flag buttons.

### Out of scope (YAGNI)
- Per-commodity sub-toggles, animated/seasonal currents, time-series climate, raster tiles.

## Data provenance (honest hybrid)

The user chose "authoritative datasets where they exist." Applied realistically:

| Layer | Provenance | Notes |
|-------|-----------|-------|
| Climate | **Authoritative** | Köppen-Geiger GeoJSON (Beck et al. / vu-wien 0.5°), simplified to web resolution, grouped into 5 main classes (A–E). |
| Currents | **Curated from references** | No clean authoritative GeoJSON exists; ~25–30 major named currents hand-authored from standard oceanographic maps. Labeled honestly in README + legend. |
| Agriculture | **Curated from FAOSTAT** | Top-producing countries per commodity from FAO statistics, rendered as markers. Authoritative source, curated representation. |

Candidate climate sources to confirm during planning (pick smallest web-usable GeoJSON):
`github.com/circleofconfusion/climate-map`, `github.com/rjerue/koppen-map`,
official `koeppen-geiger.vu-wien.ac.at`.

## Architecture

The v1 layer registry already drives both `LayerControl` and `MapView`. v2 replaces the 3
`disabled` placeholder entries with real ones and adds a `legend` descriptor to entries.

```
src/components/
├── Header.jsx            (MODIFY: flag-icon language switcher)
├── Legend.jsx            (NEW: renders legend per active overlay)
├── MapView.jsx           (MODIFY: zoomControl=false + <ZoomControl topright>,
│                                   attributionControl=false + themed credit; render <Legend/>)
└── layers/
    ├── CurrentsLayer.jsx     (NEW)
    ├── ClimateLayer.jsx      (NEW)
    └── AgricultureLayer.jsx  (NEW)
src/data/layers.js        (MODIFY: real entries + legend descriptors)
src/lib/
├── bearing.js            (NEW pure: bearing between two [lng,lat] points, for arrows)
└── climate.js            (NEW pure: köppen code → {group, color})
public/data/
├── climate.geojson       (NEW: fetched + simplified)
├── currents.geojson      (NEW: curated, committed)
└── agriculture.json      (NEW: curated, committed)
scripts/fetch-data.mjs    (MODIFY: add climate fetch+simplify)
src/i18n/locales/{vi,en}.json (MODIFY: legend/commodity/climate strings)
```

### Layer components

**CurrentsLayer** — `useGeoData('/data/currents.geojson')`. Each feature is a LineString
with `{ name_vi, name_en, type: 'warm'|'cold' }`. Render a `GeoJSON` styled by type
(warm → `--current-warm` red, cold → `--current-cold` blue). For direction, add an
`L.marker` with a rotated `divIcon` (▶) at the line's last point, rotated by
`bearing(secondLast, last)`. Sticky tooltip with `dualText(name_vi,name_en,mode)`.

**ClimateLayer** — `useGeoData('/data/climate.geojson')`. Köppen polygons. Style:
`fillColor = climateColor(group)`, `fillOpacity: 0.5`, `weight: 0`, **`interactive: false`**
so clicks pass through to the country layer beneath. No tooltip (legend explains colors).

**AgricultureLayer** — `useGeoData('/data/agriculture.json')`. JSON shape:
`{ commodities: [{ id, name_vi, name_en, icon, countries: [{ iso2, coord:[lat,lng] }] }] }`.
For each commodity×country, render an `L.marker` with a `divIcon` showing `icon` (a small
inline SVG or text glyph — NOT an emoji flag/icon, for Windows rendering). Sticky tooltip:
commodity name (dual).

**Legend** — reads the active overlay ids (passed from App, same state LayerControl uses)
and the `LAYERS` registry; for each active layer with a `legend` descriptor, renders a
titled section. Descriptor:
```js
legend: {
  items: [
    { swatch: 'var(--current-warm)', labelKey: 'legend.warmCurrent' },
    { icon: '<svg…>', label: { vi: 'Lúa gạo', en: 'Rice' } },
  ]
}
```
Each item has EITHER `swatch` (color box) OR `icon` (glyph), plus `labelKey` (i18n) OR a
`{vi,en}` label. Positioned bottom-left, themed via CSS variables, scrollable.

### Header — flag-icon language switcher

Replace the `<select>` with a row of 3 small buttons:
- `vi` → flagcdn `vn` image
- `en` → flagcdn `gb` image
- `dual` → `vn` + `gb` images side by side (smaller)

Active button gets a ring/border highlight. Each button has `aria-label` and `title`
("Tiếng Việt" / "English" / "Song ngữ"). Flags use `https://flagcdn.com/w40/{code}.png`
(images, not emoji — emoji flags do not render on Windows). The theme toggle button stays.

### MapView — Leaflet chrome

- `<MapContainer zoomControl={false} attributionControl={false} …>`.
- Add `<ZoomControl position="topright" />` (react-leaflet) so zoom sits opposite the
  top-left Layer Control.
- Render a small themed credit `<div>` (bottom-right, `z-[1000]`, tiny, low-opacity) with
  data-source text (Natural Earth · Köppen-Geiger · FAO · Wikipedia) — replaces Leaflet's
  default attribution while staying license-compliant.
- Render `<Legend activeOverlayIds={…} />` inside the map area.

## Data flow

Unchanged from v1. Overlay checkboxes (LayerControl) toggle `activeOverlayIds` in App;
MapView renders active layer components; Legend renders sections for the same active ids.
Climate is a non-interactive overlay, so country click-to-zoom/info-panel still works.

## CSS variables (added)

```
--current-warm: #d64545;  --current-cold: #2f6fb0;     (light)
--current-warm: #f87171;  --current-cold: #60a5fa;     (dark)
--legend-bg / --legend-text  → reuse --panel-bg / --panel-text
```
Climate class colors live in `src/lib/climate.js` (fixed palette, theme-independent so the
classification stays recognizable): A #2e7d32, B #e0c060, C #9ccc65, D #80cbc4, E #cfd8dc.

## Error handling

Per-layer `useGeoData` already surfaces load errors without breaking the map. If a layer's
data fails to load, that layer renders nothing; other layers and the base map are
unaffected. Legend only renders sections for layers whose toggle is on (independent of
data load state).

## Testing

- **Unit (pure):** `bearing()` (known cardinal cases), `climate.climateClass(code)` →
  correct group + color (A/B/C/D/E + unknown fallback), updated `layers.test.js` asserting
  the 3 former-disabled layers now have components + legend descriptors, and registry
  legend-descriptor shape validity.
- **Component:** `Legend` renders a section per active overlay and nothing when none active;
  `Header` renders 3 flag buttons and calls `setMode` on click (flag `img` alt/aria checks).
- **Layer components + Leaflet chrome:** verified in the running app (jsdom can't render a
  real Leaflet map), as in v1.
- Full suite must stay green (v1's 24 tests + new ones).

## Success criteria
- Toggling Currents shows warm/cold arrowed lines with a warm/cold legend.
- Toggling Climate tints land by Köppen class (translucent) with a class legend; clicking a
  country underneath still zooms + opens the info panel.
- Toggling Agriculture shows commodity markers with an icon legend.
- Multiple overlays can be active together; the Legend shows a section for each.
- No "Leaflet" branding; zoom control no longer overlaps the Layer Control.
- Language switcher is flag icons (vn / gb / both); active state visible; accessible labels.
- Tests green; `npm run build` clean.
