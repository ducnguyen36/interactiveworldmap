# 3D Globe (Phase 1: globe + touch foundation) — Design

**Date:** 2026-06-18
**Status:** Approved
**Builds on:** the interactive world map (react-leaflet), branch `master`.

## Purpose
Turn the flat 2D map into an **interactive 3D globe** that works great on a TV touchscreen
and an iPad, as the foundation for a geography teaching tool. Phase 1 ports all current
features to the globe and makes the UI touch-first/kiosk-ready. Educational content
(lessons, quizzes) is Phase 2 — out of scope here.

## Engine & approach
- **MapLibre GL JS** with `projection: 'globe'`, via **`react-map-gl` (maplibre binding)** for
  React-idiomatic `<Source>/<Layer>/<Marker>`. No map tiles, no API key — the globe is
  drawn purely from our existing GeoJSON. Built-in, hardware-accelerated touch gives
  spin/pinch/tap for free (works on iPad Safari and touch TVs).
- Add deps: `maplibre-gl`, `react-map-gl`. Remove `react-leaflet` + `leaflet` once migrated.

## Architecture

### Base style
A minimal MapLibre style object:
- `version: 8`, `sources: {}`, one `background` layer painted with the themed ocean color.
- `glyphs: <BASE_URL>glyphs/{fontstack}/{range}.pbf` for label text (see Labels).
- No `sprite` (icons are HTML markers).
Globe is enabled in `onLoad`: `map.setProjection({ type: 'globe' })`.

### Data sources (react-map-gl `<Source>`)
One `geojson` source per data file, URL resolved against `import.meta.env.BASE_URL`
(helper `dataUrl(path)`), with **`generateId: true`** so `feature-state` (hover/selected)
has stable per-feature ids:
`countries`, `climate`, `currents`, `plates`, `volcanoes`, `oceans` (built from
`oceans.json` points).

### Layers (driven by the existing registry `src/data/layers.js`)
The registry stays the single source of truth; each entry now declares its MapLibre layer
spec(s) instead of a Leaflet component. `MapView` renders the active layers' `<Layer>`s.
- **political** (base): `fill` layer, `fill-color` = `match` on `MAPCOLOR7` → the `mapColor`
  palette; plus a thin `line` border layer. Interactive.
- **climate**: `fill` layer, `fill-color` = `match` on the first letter of `CODE` → the
  `climateClass` palette; `fill-opacity` 0.8. Interactive.
- **currents**: `line` layer, `line-color` = `match` on `type` (warm/cold, fixed hexes);
  a small `symbol`/line arrow for direction. Interactive.
- **tectonic**: plate `line` layer + volcano `circle` layer. Volcano interactive.
- **agriculture**: HTML `<Marker>`s (commodity emoji) — see Labels/Icons.

Color expressions are generated from the existing pure palettes (`mapColor`, `climateClass`)
so there is one source of truth for colors. New helper `src/lib/mapExpressions.js` builds the
`match` expressions (unit-tested — pure).

### Colors & theme
- Theme-independent layer colors (political MAPCOLOR7, climate classes, warm/cold currents,
  plate/volcano) are literals in the expressions.
- Theme-sensitive paints — **ocean background, country borders, label text/halo** — are
  updated on theme change via `map.setPaintProperty(...)` (a small effect keyed on theme).

### Selection, info panel, zoom
- **Hit-test:** `<Map interactiveLayerIds={[...active interactive fill/line/circle layer ids]}
  onClick={handleClick}>`; `e.features[0]` (topmost) → map to a selection object of the
  existing `kind`s (`country`/`climate`/`current`/`volcano`), with a `focus`
  (`{ bounds }` from the feature geometry, or `{ center }` for volcano). Agriculture markers
  set `{ kind:'commodity', … }` via their own `onClick`.
- Downstream is **reused unchanged**: `SelectionContext`, `InfoPanel`, Wikipedia/Wikidata,
  i18n, flags, `CountryLayerFacts`.
- **Zoom-to-focus + zoom-back-out** (`MapController`) is reimplemented on the MapLibre API:
  on select save the view once and `map.fitBounds(bbox, { maxZoom: 6, padding, duration })`
  (bounds focus) or `map.flyTo({ center, zoom: max(zoom,6) })` (center focus); on deselect
  fly back to the saved view. New pure helper `src/lib/geojsonBounds.js`
  (`geojsonBounds(geometry) → { south, west, north, east }`) replaces `boundsToObj`
  (which is Leaflet-specific and retires). Unit-tested.
- **Hover/selected highlight:** MapLibre `feature-state`. Paint uses
  `['case', ['boolean',['feature-state','selected'],false], sel, ['boolean',['feature-state','hover'],false], hover, base]`.
  Track `{ source, id }` of the currently selected/hovered feature to clear it. Touch has no
  hover, so tap sets `selected`; this is fine.

### Labels & icons
- **Country + ocean labels:** MapLibre `symbol` layers (auto-placed at polygon centroids /
  ocean points, with globe occlusion + collision for free). `text-field` = dual expression
  (`NAME_VI` / `NAME_EN` / `"vi / en"` by language mode; rebuilt on mode change). Country
  labels filtered to `LABELRANK <= 2`. Requires bundled glyphs:
  **`public/glyphs/Noto Sans Regular/{range}.pbf`** for ranges `0-255` and `7680-7935`
  (Latin + Vietnamese diacritics), from the openmaptiles/fonts set (OFL). A one-time
  `scripts/fetch-glyphs.mjs` downloads them; committed.
- **Agriculture commodity icons + arrows:** HTML `<Marker>`s (emoji render natively; glyphs
  can't). On a globe, markers on the far side are hidden by a **backside cull**: a marker at
  `[lng,lat]` is shown only when its great-circle distance from the current map center is
  `< 90°` (helper `isFrontFacing(center, point)`, unit-tested). Agriculture markers are also
  clickable (set the commodity selection).

### Touch / TV + iPad UX
- MapLibre gestures enabled: drag-rotate (spin the globe), touch pinch-zoom/rotate, tap.
  `cooperativeGestures` off (kiosk full control). Double-tap zoom on.
- **Responsive, touch-first pass** on the existing panels: larger tap targets (min ~44px),
  bigger fonts/controls on large screens, and a layout that reflows on small/portrait
  (iPad): `LayerControl` and `Legend` collapse into toggleable drawers; `InfoPanel` becomes a
  bottom sheet on narrow/portrait screens, side panel on wide. A **fullscreen** toggle in the
  header (Fullscreen API) for kiosk use. No hover-only affordances remain (hover is an
  enhancement; tap is the primary path).

### Cleanup
- Remove `react-leaflet`, `leaflet`, the Leaflet CSS import, and Leaflet-only helpers
  (`boundsToObj`) after the migration. `useGeoData` stays (still used by `CountryLayerFacts`
  and the commodity country-name lookup). The `.country`/climate/etc. Leaflet CSS classes are
  replaced by MapLibre paint.

## Reuse (unchanged)
All pure libs (`dualText`, `mapColor`, `climateClass`, `koppenArticle`, `featureTitles`,
`countryFacts`, `wikipedia`, `wikidata`, `commodities`), hooks (`useWikiInfo`,
`useWikiSummary`, `useGeoData`), contexts (Theme/Language/Selection), `InfoPanel`,
`CountryLayerFacts`, `WikiExtracts`, `Header` (extended), `Legend`, `LayerControl`
(restyled), i18n, and all data files.

## Testing
- **Unit (pure, new):** `mapExpressions` (correct match expressions from the palettes),
  `geojsonBounds` (bbox of Polygon/MultiPolygon/Point/LineString), `isFrontFacing`
  (front vs back hemisphere).
- **Existing suite stays green:** the map-engine swap doesn't touch the pure libs/hooks; the
  `App` smoke test mocks `MapView`; `InfoPanel`/`CountryLayerFacts`/registry tests keep
  passing (registry entries gain map-layer specs but keep `id/labelKey/kind/legend`).
  `layers.test.js` updated to assert the new spec shape instead of `component`.
- **On-device / manual:** the globe itself (rendering, spin/pinch/tap, labels, selection,
  zoom, touch panels, fullscreen) is verified by the user on a TV/iPad and desktop browser
  (the in-app preview tool is unavailable this session). Build must be clean.

## Sequencing (so it's demoable partway)
1. Deps + base globe (spinnable empty globe, themed ocean).
2. Pure helpers (`mapExpressions`, `geojsonBounds`, `isFrontFacing`) + registry spec shape.
3. Political layer (fill+border+labels) + hit-test selection → existing info panel.
4. MapController zoom-to-focus + zoom-back-out on the globe.
5. Remaining overlays (climate, currents, tectonic, agriculture) + Legend + LayerControl wired.
6. Feature-state hover/selected highlight; theme-reactive paints.
7. Touch-first/responsive/kiosk UX pass + fullscreen.
8. Remove Leaflet; final cleanup.

## Risks / mitigations
- **Glyphs:** if the bundled Noto glyph ranges misrender Vietnamese, fall back to HTML
  `<Marker>` country labels (with the same backside cull) — a known alternative.
- **Bundle/size:** `maplibre-gl` ≈ 200 KB gz (acceptable); climate GeoJSON (2.2 MB) renders
  fine as a fill source.
- **iPad Safari / TV WebGL:** MapLibre targets WebGL2/1; both supported. Stays a web app —
  the deployed URL runs in each device's browser.
- **Verification gap:** no in-session live preview; rely on green build/tests + user
  on-device check. Keep changes incremental and reversible per the sequencing.

## Success criteria
- A spinnable 3D globe (touch: drag-spin, pinch-zoom, tap) rendering all current layers from
  our GeoJSON, with Vietnamese labels.
- Tapping a country/zone/current/volcano/crop opens the existing info panel and flies the
  globe to focus it; closing flies back.
- Layer toggles, legend, language (VI/EN/Dual), light/dark, and flags all work.
- Touch-friendly on TV + iPad (large targets, reflowing panels, fullscreen).
- `npm run build` clean; unit tests green; `react-leaflet`/`leaflet` removed.
