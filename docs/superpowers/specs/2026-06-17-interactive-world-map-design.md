# Interactive World Map for Vietnamese Geography Teachers — Design (v1)

**Date:** 2026-06-17
**Status:** Approved for planning

## Purpose

A React web app providing an interactive world map for Vietnamese geography/geology
teachers (lop 10) to use in the classroom. It must be dynamic, informative, support
multiple languages (Vietnamese / English / Dual), light & dark themes, toggleable
thematic map layers, click-to-zoom, and a Wikipedia/Wikidata information panel.

This document covers the **v1 (core)** deliverable. Three additional thematic layers
(ocean currents, climate zones, agriculture) are designed into the same framework and
added in follow-up iterations.

## Scope

### In scope for v1
- Fullscreen vector world map (react-leaflet) with **no raster tiles** — countries
  rendered from Natural Earth GeoJSON. No API keys, fully open-source, works offline.
- Vietnamese country labels by default, using Natural Earth's `name_vi` field.
- Click-to-zoom: clicking a country (or ocean region) smoothly zooms to fit its bounds.
- Layer Control panel with a layer **registry** so layers are data-driven.
  - **Two real layers shipped:** Political (base) and Tectonic Plates & volcanoes (overlay).
  - The other three layers (currents, climate, agriculture) appear in the design and
    registry but are implemented in later iterations.
- Wikipedia/Wikidata Information Panel: flag, common name, capital, population, and a
  Wikipedia intro extract for the selected feature.
- i18n via i18next: Tiếng Việt (default), English, and Song ngữ (Dual) modes covering
  UI, map labels, and the info panel.
- Light/Dark theme toggle.
- README with run instructions.

### Out of scope for v1 (designed, built later)
- Layer: Ocean Currents (warm/cold current arrows).
- Layer: Climate Zones / Temperature (colored regions).
- Layer: Global Agriculture/Industry (markers/heatmaps).
- Accounts, persistence beyond `localStorage`, backend services.

## Tech stack

| Concern        | Choice                                              |
|----------------|-----------------------------------------------------|
| Build/dev      | Vite + React (function components, hooks)           |
| Map            | react-leaflet (Leaflet.js)                          |
| Styling/theme  | Tailwind CSS (class-based dark mode) + CSS variables |
| i18n           | i18next + react-i18next                             |
| Data fetching  | native `fetch`                                      |
| Testing        | Vitest + React Testing Library                      |

CSS variables (e.g. `--map-land`, `--map-stroke`, `--panel-bg`) are toggled by the
`dark` class on `<html>` so Leaflet's non-Tailwind SVG themes alongside Tailwind UI.

## Architecture

```
App  — holds: theme, languageMode (vi|en|dual), selectedFeature, active layer state
├── Header        → language switcher (VI / EN / Dual) + theme toggle
├── LayerControl  → radio for base layer, checkboxes for overlays (from registry)
├── MapView (react-leaflet MapContainer, no TileLayer)
│   └── layers/
│       ├── PoliticalLayer  (GeoJSON countries: style, hover, click→select+zoom, labels)
│       └── TectonicLayer   (plate-boundary polylines + volcano point markers)
│       └── (registry slots: CurrentsLayer, ClimateLayer, AgricultureLayer — later)
└── InfoPanel     → flag / name / capital / population / extract; loading + error states
```

### Key modules
- `data/layers.js` — **layer registry**. Each entry:
  `{ id, labelKey, kind: 'base'|'overlay', component, dataUrl, enabledByDefault }`.
  Adding a future layer = add an entry + a component. LayerControl and MapView are both
  driven by this registry; neither hardcodes the layer list.
- `lib/wikidata.js` — pure functions: build SPARQL/entity query by Wikidata ID, parse
  flag (P41), capital (P36), population (P1082). Unit-tested.
- `lib/wikipedia.js` — pure functions: build REST summary URL for a given wiki language,
  parse `{ title, extract, thumbnail }`. Unit-tested.
- `lib/dualText.js` — pure helper: given `(vi, en, mode)` returns the display string
  (`vi`, `en`, or `"vi / en"`). Unit-tested.
- `hooks/useWikiInfo.js` — orchestrates Wikidata + Wikipedia fetches for the selected
  feature in the current language mode; exposes `{ data, loading, error, retry }`.
- `hooks/useGeoData.js` — fetches + caches a GeoJSON/JSON data file with error state.

### State management
Plain React Context — no Redux/Zustand at this size:
- `ThemeContext` — `theme`, `toggleTheme` (persisted to `localStorage`).
- `LanguageContext` — `mode` (`vi|en|dual`), `setMode` (persisted); wraps i18next.
- `SelectionContext` — `selectedFeature`, `setSelectedFeature`.

## Information Panel data strategy (the one upgrade over the original spec)

Natural Earth `admin-0` features carry `name_vi`, `name_en`, ISO codes, and a
`WIKIDATAID`. The panel uses a hybrid fetch keyed off `WIKIDATAID`:

- **Wikidata** → flag image (P41), capital (P36), population (P1082): reliable
  structured facts, language-independent.
- **Wikipedia REST summary** (`https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}`)
  → intro extract + thumbnail. Fetched for `vi`, `en`, or both (Dual mode).

Non-country regions (oceans, continents) carry curated `WIKIDATAID` + VI/EN names in a
shipped `oceans.json`, so they flow through the same panel logic.

## Data flow (click-to-zoom + panel)

1. User clicks a country polygon.
2. Handler calls `setSelectedFeature(feature.properties)` and
   `map.fitBounds(layer.getBounds(), { animate: true })`.
3. `InfoPanel` reacts to `selectedFeature`; `useWikiInfo` fetches by `WIKIDATAID` in the
   current language mode.
4. Panel renders flag, name, capital, population, extract. Closing the panel clears the
   selection (map view stays where it is).

## Theming

- `dark` class on `<html>` toggled by the theme button; drives Tailwind `dark:` and the
  CSS-variable palette consumed by Leaflet SVG styles.
- Light = bright educational map; Dark = dark land/water with light strokes & text.
- Persisted in `localStorage`; respects `prefers-color-scheme` on first load.

## i18n

- Resource bundles `i18n/locales/vi.json`, `en.json` for all UI strings.
- Map labels and panel names use `dualText(name_vi, name_en, mode)`.
- Wikipedia extract language follows mode; Dual stacks VI then EN.
- Language mode persisted in `localStorage`; default `vi`.

## Shipped data files (`public/data/`)
- `countries.geojson` — Natural Earth admin-0 (incl. `name_vi`, ISO, `WIKIDATAID`).
- `plates.geojson` — tectonic plate boundaries.
- `volcanoes.geojson` — volcano point locations.
- `oceans.json` — curated ocean/continent labels + Wikidata IDs (VI/EN).

## Error handling
- GeoJSON/JSON load failure → inline error in the affected layer; map still usable.
- Wikidata/Wikipedia fetch failure or missing page → panel shows a graceful "no data"
  message with a retry button; one source failing does not blank the other.
- Missing translation → fall back to `name_en`, then raw key.

## Testing strategy
Focused on the bug-prone pure logic, plus key panel states:
- Unit: `dualText`, `wikidata` parsing, `wikipedia` parsing, layer registry shape.
- Component: `InfoPanel` loading / error / data states with mocked `fetch`.
- Smoke: `App` renders without crashing.

## Open-source data sources
- Countries: Natural Earth `ne_50m_admin_0_countries` (public domain).
- Plates: Natural Earth / Peter Bird plate boundaries (public domain / open).
- Volcanoes: Natural Earth volcano points (public domain).

## Success criteria
- App boots with `npm install && npm run dev`, shows a Vietnamese-labeled world map.
- Clicking a country zooms to it and opens an info panel with flag/capital/population/extract.
- Language switch (VI/EN/Dual) updates UI, labels, and panel; theme toggle flips light/dark.
- Layer Control toggles Political and Tectonic layers; framework ready for the other three.
- README explains how to run and how to add a new layer.
