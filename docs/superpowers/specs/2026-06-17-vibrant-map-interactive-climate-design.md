# Vibrant Map + Interactive Climate — Design

**Date:** 2026-06-17
**Status:** Approved for planning
**Builds on:** the interactive world map (v1 + v2 + layer details), branch `master`.

## Purpose

Two enhancements:
1. **Vibrant political map** — color countries with a distinct-neighbor palette (Natural
   Earth `MAPCOLOR7`) so the base map looks colorful like a classroom political map,
   instead of one flat land color.
2. **Interactive climate layer** — make Köppen climate zones clickable: clicking a zone
   highlights it and opens the info panel with that climate type's description.

## Scope

### In scope
- Add `MAPCOLOR7` to the shipped country data; color each country from a vibrant 7-color
  palette in `PoliticalLayer`.
- Make `ClimateLayer` interactive: hover + click highlight; click selects a `climate`
  feature and shows the Köppen type's Wikipedia description.
- Reorder the layer registry so Climate renders just above the political base (below the
  line/marker overlays), keeping currents/volcano/agriculture markers visible & clickable.
- Drop the now-unreachable "Climate of {country}" sub-section from `CountryLayerFacts`.
- New pure helpers + unit tests; i18n as needed.

### Out of scope (YAGNI)
- Re-coloring by continent or runtime hashing (we use MAPCOLOR7).
- Muting/recoloring the political layer when climate is on (climate at ~0.8 opacity covers
  it; no cross-layer coordination needed).
- Per-zone legend changes (the existing climate legend swatches stay).

## 1. Vibrant political map

- `scripts/fetch-data.mjs`: add `'MAPCOLOR7'` to the `KEEP` field list and re-run so
  `countries.geojson` carries it (integer 1–7; Natural Earth guarantees adjacent countries
  differ). Verify the field is present after re-fetch.
- New `src/lib/mapColor.js`: `mapColor(n)` → hex from a fixed vibrant palette:
  `1 #e57373, 2 #81c784, 3 #64b5f6, 4 #ffb74d, 5 #ba68c8, 6 #4db6ac, 7 #fff176`;
  fallback `#cfd8dc` for missing/0. Pure, unit-tested.
- `PoliticalLayer`: in the `style` function set `fillColor: mapColor(p.MAPCOLOR7)` (keep
  `fillOpacity: 1`, `weight: 0.5`, `className: 'country'`).
- `src/index.css`: remove the `fill` declaration from `.country` so the per-feature
  `fillColor` is used (CSS rules override SVG presentation attributes, so the flat fill must
  go). Keep `.country:hover { fill: var(--map-land-hover) }` and `.country-selected`
  (hover/selected intentionally override the vibrant color for feedback). The themed land
  CSS var stays for other uses.
- Theme: one palette for both light and dark (vibrant mid-tones read on both ocean colors).

## 2. Interactive climate layer

### Registry reorder
`LAYERS` order becomes: `political` (base), `climate`, `tectonic`, `currents`,
`agriculture`. Climate, rendered first among overlays, sits beneath the line/marker
overlays so those stay on top (visible + clickable); climate fills the land below them.

### ClimateLayer
- Remove `interactive: false`; style: `fillColor: climateClass(CODE).color`,
  `fillOpacity: 0.8`, `weight: 0`.
- `useSelection()`; track the highlighted layer in a ref.
- `onEachFeature`:
  - hover: `mouseover` raises the polygon (e.g. `weight: 1`, `color: #333`, opacity bump);
    `mouseout` resets via the GeoJSON ref (unless it's the clicked one).
  - click: reset the previously-clicked layer's style, apply a highlight style
    (`weight: 2`, `color: #111`, `fillOpacity: 0.9`) to this one, store it in the ref, and
    `setSelected({ kind: 'climate', code: feature.properties.CODE })`.
- Because climate now covers the land and is interactive, country click-through is disabled
  while Climate is on (accepted).

### Köppen type → article (new pure helper)
`src/lib/climate.js` gains `koppenArticle(code)` → `{ vi: string[], en: string[] }` of
Wikipedia title candidates for the climate *type*, mapped by code prefix:

| code prefix | English article |
|---|---|
| Af | Tropical rainforest climate |
| Am | Tropical monsoon climate |
| Aw, As | Tropical savanna climate |
| BW* | Desert climate |
| BS* | Semi-arid climate |
| Cf a | Humid subtropical climate |
| Cw a | Humid subtropical climate |
| Cs* | Mediterranean climate |
| Cf b/c, Cw b/c | Oceanic climate |
| Df a/b, Dw a/b, Ds a/b | Humid continental climate |
| Df c/d, Dw c/d, Ds c/d | Subarctic climate |
| ET | Tundra |
| EF | Ice cap climate |
| (other/unknown) | Köppen climate classification |

Each returns `en: [<specific>, 'Köppen climate classification']` (fallback) and
`vi: [<specific-vi-if-known-else the general vi title>]`. Vietnamese candidates are
best-effort; the existing English fallback in `useWikiSummary` covers gaps. Pure,
unit-tested (a few representative codes + the unknown fallback).

### featureWikiTitles
Add a `climate` case: `featureWikiTitles({ kind:'climate', code }, null)` returns
`koppenArticle(code)`.

### InfoPanel — `climate` kind
- `useWikiSummary` is already called for non-country kinds; it now also covers `climate`.
- Header: `dualText(<group name VI>, <group name EN>, mode)` + the raw code, e.g.
  "Nhiệt đới (Af) / Tropical (Af)". Group name comes from `climateClass(code).group`
  (A–E) mapped to the existing `legend.climateA..E` strings (strip the "(A)" suffix or
  reuse as-is). Implementation: a small `climateGroupKey(group)` → `legend.climate{group}`.
- Body: the Köppen-type Wikipedia extract via `WikiExtracts` (loading / noData / retry as
  for other feature kinds).

### CountryLayerFacts
Remove the climate sub-section and its `useWikiSummary(climateTitles…)` call (now
unreachable, since climate intercepts country clicks when active). Keep agriculture
(products), tectonic (volcano count), and the currents note. `climateTitles` may remain in
`featureTitles.js` (unused) or be removed — remove it and its test to avoid dead code.

## Data flow

Unchanged structurally. New selection kind `climate` flows: ClimateLayer click →
`setSelected({kind:'climate', code})` → InfoPanel branches on kind → `featureWikiTitles`
→ `useWikiSummary` → `WikiExtracts`. Highlight state lives in ClimateLayer via a ref
(mirrors PoliticalLayer's selected-element pattern).

## Error handling & edge cases
- Missing `MAPCOLOR7` on a feature → `mapColor` fallback color.
- Unknown Köppen code → `koppenArticle` returns the general "Köppen climate classification"
  article; group falls back to `?` (no group label shown).
- Re-clicking a different zone resets the prior highlight; closing the panel leaves the last
  highlight (acceptable) — optional: clear highlight when selection clears (nice-to-have,
  include if cheap via an effect watching `selected`).
- Climate + currents both on: currents lines/markers render above climate and stay
  clickable; climate handles clicks elsewhere.

## Testing
- Unit: `mapColor` (1–7 + fallback); `koppenArticle` (Af, BWh, Cfb, Dfc, ET, unknown);
  `featureWikiTitles` climate case; `climateClass` unchanged.
- Update `CountryLayerFacts.test.jsx`: remove the climate-extract assertion; keep
  agriculture + volcano-count tests.
- Update `InfoPanel.test.jsx`: add a `climate` selection test (header shows code + group,
  extract renders via mocked `useWikiSummary`).
- Update/keep `featureTitles.test.js` (drop `climateTitles` test if removed; add climate
  case). Full suite stays green.
- Layer visuals (vibrant colors, climate highlight) verified live in the browser.

## Success criteria
- Countries show varied vibrant colors with no two neighbors alike.
- Turning on Climate shows the colored zones; hovering highlights a zone; clicking a zone
  outlines it and the panel shows that climate type's name + Wikipedia description.
- Switching the previously-clicked zone resets its highlight.
- Currents/volcano/agriculture markers remain clickable with Climate on.
- VI/EN/Dual applies to the climate panel; English fallback when no VI article.
- Tests green; `npm run build` clean.
