# Info Panel — Layer Details Design

**Date:** 2026-06-17
**Status:** Approved for planning
**Builds on:** v1 + v2 (interactive world map), branch `feature/interactive-world-map`.

## Purpose

Enrich the information panel beyond basic country facts so it also surfaces layer-relevant
information. Two complementary capabilities (user chose "both"):
1. **Per-country layer facts** — clicking a country adds, under the basic info, a section
   summarizing the active overlays for that country.
2. **Clickable layer features** — clicking a map feature (ocean current, volcano,
   agriculture marker) opens the panel showing that feature's own details.

## Scope

### In scope
- Discriminated selection objects (`kind`) for country / current / volcano / commodity.
- InfoPanel branches on `kind`: country view (existing + new facts section) vs feature view.
- `CountryLayerFacts` section: Agriculture (commodities for the country), Tectonic (volcano
  count within country bounds), Climate/Currents (short "see map" notes).
- Clickable currents, volcanoes, agriculture markers (set a feature selection).
- Two pure helpers + unit tests; i18n strings; App wiring.

### Out of scope (YAGNI)
- Making the climate layer clickable (it must stay non-interactive so country clicks pass
  through). Climate is represented via the legend + the country facts note.
- Precise point-in-polygon volcano counting (bbox approximation is sufficient).
- New external data fetches — reuse existing `agriculture.json` and `volcanoes.geojson`.

## Selection model

`SelectionContext` keeps the same `{ selected, setSelected }` API; only the object shape
gains a discriminator. `kind` defaults to `'country'` when absent (back-compat with existing
tests/behavior).

| kind | set by | shape |
|------|--------|-------|
| country | `PoliticalLayer` click | `{ kind:'country', wikidata, iso2, nameVi, nameEn, population, bounds }` |
| current | `CurrentsLayer` click | `{ kind:'current', nameVi, nameEn, type }` |
| volcano | `TectonicLayer` volcano click | `{ kind:'volcano', name }` |
| commodity | `AgricultureLayer` marker click | `{ kind:'commodity', vi, en, icon, iso2 }` |

`bounds` is a plain object `{ south, west, north, east }` derived from Leaflet
`layer.getBounds()`. Feature clicks only call `setSelected(...)` — they do NOT zoom (only
country clicks zoom, unchanged).

Layer render order already puts overlays above the base country layer, so feature clicks
hit the feature, not the country beneath. Climate is `interactive:false`, so its clicks
pass through to the country (unchanged).

## Components

### InfoPanel (modified)
- Reads `feature = injectedSelection ?? selected`; `kind = feature.kind || 'country'`.
- `useWikiInfo` is called with the feature ONLY when `kind === 'country'` (else `null`), so
  feature selections trigger no Wikipedia/Wikidata fetch. The hook call stays unconditional
  (passing `null`) to respect the rules of hooks.
- **country**: existing header + flag/capital/population/extract, then
  `<CountryLayerFacts iso2={feature.iso2} bounds={feature.bounds} activeOverlayIds={…} />`.
- **current**: name (`dualText`) + warm/cold label (`legend.warmCurrent`/`legend.coldCurrent`).
- **volcano**: name + `legend.volcano` label.
- **commodity**: icon + name (`dualText(vi,en)`) + `panel.majorProducer` line.
- Close button (`×`) clears selection — unchanged.
- New prop `activeOverlayIds` (default `new Set()`), passed from App.

### CountryLayerFacts (new)
- Props: `iso2`, `bounds`, `activeOverlayIds`.
- Loads `/data/agriculture.json` and `/data/volcanoes.geojson` via `useGeoData`
  (unconditional hooks; data is cached after first load). Renders conditionally on
  `activeOverlayIds`.
- Renders a titled section (`panel.layerDetails`) containing, for each active overlay:
  - agriculture → `panel.agricultureProducts` + the commodity icons/names from
    `commoditiesForCountry(agData, iso2)` mapped through `COMMODITIES` (nothing if none).
  - tectonic → `panel.volcanoes` + `volcanoCountInBounds(volcanoData, bounds)`.
  - climate → `panel.climateNote`.
  - currents → `panel.currentsNote`.
- Returns `null` if no active overlay produces a line.

## Pure helpers (`src/lib/`, unit-tested)

```
commoditiesForCountry(agData, iso2) -> string[]   // commodity ids present for that iso2
volcanoCountInBounds(volcanoData, bounds) -> number  // points with lng in [west,east], lat in [south,north]
```
`agData` is the parsed `agriculture.json` (`{ commodityId: [{iso2, coord}] }`).
`volcanoData` is the parsed `volcanoes.geojson` FeatureCollection (Point geometries, `[lng,lat]`).

## Layer component changes
- `PoliticalLayer`: click handler adds `kind:'country'` and `bounds` (from `layer.getBounds()`).
- `CurrentsLayer`: GeoJSON `onEachFeature` adds a `click` handler → `setSelected({kind:'current', …})`. Uses `useSelection()`.
- `TectonicLayer`: volcano `onEachFeature` adds a `click` → `setSelected({kind:'volcano', name})`. Uses `useSelection()`.
- `AgricultureLayer`: each `Marker` gets an `eventHandlers={{ click: () => setSelected({kind:'commodity', …}) }}`. Uses `useSelection()`.

## i18n (added to both vi.json and en.json)
- `panel.layerDetails` — section title ("Thông tin theo lớp" / "Layer details")
- `panel.agricultureProducts` — ("Nông sản chính" / "Major agricultural products")
- `panel.volcanoes` — ("Số núi lửa" / "Volcanoes")
- `panel.climateNote` — ("Xem các đới khí hậu trên bản đồ." / "See climate zones on the map.")
- `panel.currentsNote` — ("Xem các dòng biển trên bản đồ." / "See ocean currents on the map.")
- `panel.majorProducer` — ("Nước sản xuất lớn" / "Major producer")
- `panel.featureType` — ("Loại" / "Type")
Feature warm/cold and volcano labels reuse `legend.warmCurrent`/`legend.coldCurrent`/`legend.volcano`.

## Error handling & edge cases
- Antimeridian-crossing countries (Russia, Fiji, USA) yield loose bounds → volcano count is
  approximate. Acceptable for a classroom tool; documented in code comment.
- Missing/zero data → the corresponding line is omitted (or shows 0 for volcanoes).
- Feature selections never call the wiki APIs, so no network dependency for them.
- `activeOverlayIds` defaults to an empty Set → InfoPanel without the prop (existing tests)
  renders no facts section, preserving current behavior.

## Testing
- Unit: `commoditiesForCountry` (country with several commodities, country with none, dedupe),
  `volcanoCountInBounds` (points inside/outside a bbox, empty data).
- Component: InfoPanel renders a current-feature view (name + warm label); renders the
  country facts section (agriculture products + volcano count) with mocked data + active
  overlays; renders nothing extra when no overlays active.
- Full suite stays green (current 37 + new).

## Success criteria
- Clicking a country with overlays active shows a "Layer details" section: agricultural
  products and/or volcano count and/or climate/currents notes, matching the active overlays.
- Clicking an ocean current shows its name + warm/cold; clicking a volcano shows its name;
  clicking an agriculture marker shows the commodity + producer country.
- Language switching (VI/EN/Dual) applies to all the new panel text.
- Tests green; `npm run build` clean.
