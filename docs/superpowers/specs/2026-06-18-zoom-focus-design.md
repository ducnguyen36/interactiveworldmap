# Zoom-to-Focus on Click (+ zoom back out on close) — Design

**Date:** 2026-06-18
**Status:** Approved
**Builds on:** the interactive world map, branch `master`.

## Purpose
Clicking any feature (country, climate zone, ocean current, volcano, agriculture marker)
should zoom/focus the map on it. Closing the info panel (×) animates the map back to the
view it had before you started clicking. Make the zoom stronger/more noticeable.

## Approach
Centralize all map zoom in a single `MapController` component rendered inside the Leaflet
map, driven by the current selection. Each feature's click handler records *where to focus*
on the selection object; the controller performs the zoom and the zoom-back-out. (Feature
highlights stay in their own layers as today.)

## Selection `focus` field
Every selection gains a `focus`:
- Areas/lines/countries → `focus: { bounds: { south, west, north, east } }`
- Points (volcano, commodity) → `focus: { center: [lat, lng] }`

Set by:
- `PoliticalLayer` (country) — `focus.bounds` from `layer.getBounds()`; its existing
  `bounds` field (used by CountryLayerFacts) is reused. Its inline `fitBounds` + `useMap`
  are **removed** (the controller now zooms).
- `ClimateLayer` (zone) — `focus.bounds` from `e.target.getBounds()`.
- `CurrentsLayer` (line) — `focus.bounds` from `layer.getBounds()`.
- `TectonicLayer` (volcano) — `focus.center` from `layer.getLatLng()`.
- `AgricultureLayer` (commodity) — `focus.center` from `loc.coord`.

A pure helper `boundsToObj(leafletBounds)` → `{ south, west, north, east }` (unit-tested)
is shared by the bounds-based layers.

## MapController (new, rendered in MapView inside MapContainer)
Uses `useMap()` + `useSelection()`; keeps a `savedView` ref. In an effect on `selected`:
- **Select (selected has focus):** if `savedView` is empty, save `{ center, zoom }` of the
  current view; then zoom — `fitBounds([[s,w],[n,e]], { animate:true, maxZoom:6, padding:[20,20] })`
  for `focus.bounds`, or `flyTo(center, Math.max(map.getZoom(), 6), { animate:true })` for
  `focus.center`.
- **Deselect (selected null) with a saved view:** `flyTo(savedView.center, savedView.zoom,
  { animate:true })` then clear `savedView`.
- Feature→feature keeps the original `savedView`, so × always returns to the pre-exploration
  view.

## Stronger zoom
- Bounds: `maxZoom 6` (up from the old country value of 5), padding `[20,20]`.
- Points: `flyTo` to zoom 6, never zooming out if already closer (`Math.max(getZoom(),6)`).
- Map `maxZoom` stays 7, so 6 is a close, noticeable focus.

## Edge cases
- Manual pan/zoom while a feature is selected, then ×: restores the saved pre-selection
  view (the manual adjustment is discarded — acceptable).
- Huge countries (e.g. Russia) are bounds-limited; `maxZoom 6` can't crop them — they frame
  to fit (inherent, acceptable).
- Re-clicking the same feature: selection identity changes each click, so the effect re-runs
  and re-zooms; `savedView` is preserved.

## Testing
- Unit: `boundsToObj` (mock Leaflet bounds with get{South,West,North,East}).
- MapController + layer zoom are Leaflet behaviors → verified live in the browser.
- Existing 63 tests stay green (InfoPanel ignores the extra `focus` field; the `×` button
  already calls `setSelected(null)`).

## Success criteria
- Clicking a country/climate zone/current zooms to fit it (≈ zoom 6 for small/medium);
  clicking a volcano/crop marker flies to it at zoom ≥ 6.
- Clicking × animates the map back to the view from before the first click.
- Tests green; `npm run build` clean.
