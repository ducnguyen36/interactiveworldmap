# Smooth Climate Borders — Design

**Date:** 2026-06-18
**Status:** Approved
**Builds on:** the interactive world map, branch `master`.

## Purpose
The Climate layer's polygons come from a 0.5° grid, so their borders are blocky
stair-steps. Make them look like smooth, natural areas.

## Approach
Smooth the climate polygons **at data-prep time** (in `scripts/fetch-data.mjs`) so the
shipped `public/data/climate.geojson` already has smooth borders. Zero runtime cost; the
`ClimateLayer` component is unchanged (it just renders smoother geometry).

## Pipeline (per climate feature, in `trimClimate`)
1. **Simplify** the staircase with Turf `simplify` (small tolerance, e.g. `0.2`,
   `highQuality: true`) — collapses redundant 0.5° grid steps and keeps the file small.
2. **Chaikin corner-cutting** with Turf `polygonSmooth` (`iterations: 2`) — rounds square
   corners into smooth curves.
3. Reattach `{ CODE }` to the smoothed feature. On any per-feature error, fall back to the
   original geometry (keep `{ CODE }`), so no zone is dropped.

`@turf/simplify` and `@turf/polygon-smooth` are added as **devDependencies** — used only by
the Node build script, never imported by `src/`, so the browser bundle is unaffected.

## Constraints / trade-offs
- **File size:** Chaikin adds vertices; the simplify step counters it. Tune
  tolerance/iterations so `climate.geojson` stays ≲ ~1.5–2 MB; report the final size.
- **Feature count preserved:** the map is 1 input feature → 1 smoothed feature; the output
  must keep ~2,259 features (no zones lost).
- **Hairline border slivers:** polygons are smoothed independently, so shared borders may
  not match perfectly → possible faint gaps at 0.8 fill opacity. Check live; if visible,
  mask with a thin same-color stroke on the climate polygons (small `ClimateLayer` style
  tweak). Otherwise leave `ClimateLayer` untouched.

## Testing
- Build-time data transform (no app logic): verify by re-running the script and checking
  the output is valid GeoJSON, feature count ≈ 2,259, every feature still has `CODE`, and
  file size within target. Then a live browser check that borders look smooth and zones
  still color/click/highlight correctly.
- Existing test suite stays green (no `src/` logic changed unless the sliver-mask tweak is
  needed).

## Success criteria
- Climate zone borders render as smooth curves, not square steps.
- All zones present and still colored by Köppen class; click-to-highlight + zoom still work.
- `climate.geojson` within the size target; `npm run build` clean; tests green.
